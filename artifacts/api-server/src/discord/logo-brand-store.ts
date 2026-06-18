import { logoBrandsCol, isDbReady, type LogoBrandMongoDoc } from "../lib/db.js";
import { HARDCODED_BRANDS, type LogoBrand } from "./logo-brands.js";
import { logger } from "../lib/logger.js";

export type { LogoBrandMongoDoc };

// ── In-memory cache ───────────────────────────────────────────────────────────

let _all: LogoBrandMongoDoc[] = [];
const _byTier = new Map<number, LogoBrandMongoDoc[]>();

function _rebuildTierMap(): void {
  _byTier.clear();
  for (const b of _all) {
    if (b.approved && !b.manualExclude) {
      const arr = _byTier.get(b.tier) ?? [];
      arr.push(b);
      _byTier.set(b.tier, arr);
    }
  }
}

/** Returns approved brands (OCR-validated) for the given tier numbers. */
export function getApprovedBrandsForTiers(tiers: (1 | 2 | 3)[]): LogoBrand[] {
  const out: LogoBrand[] = [];
  for (const t of tiers) {
    const arr = _byTier.get(t);
    if (arr) out.push(...(arr as unknown as LogoBrand[]));
  }
  return out;
}

/** All brands in the store (for testing pipeline). */
export function getAllStoreBrands(): LogoBrandMongoDoc[] {
  return _all;
}

/** Brands that have never been tested (lastTested === null). */
export function getUntestedBrands(): LogoBrandMongoDoc[] {
  return _all.filter((b) => b.lastTested === null);
}

/** All brands — for a forced re-test pass. */
export function getAllBrandsForRetest(): LogoBrandMongoDoc[] {
  return [..._all];
}

export interface LogoStoreStats {
  total: number;
  tested: number;
  untested: number;
  approved: number;
  textLogos: number;
  invalid: number;
}

export function getStoreStats(): LogoStoreStats {
  const total    = _all.length;
  const tested   = _all.filter((b) => b.lastTested !== null).length;
  const approved = _all.filter((b) => b.approved && !b.manualExclude).length;
  const textLogos = _all.filter((b) => b.hasTextLogo === true).length;
  const invalid  = _all.filter((b) => b.imageOk === false).length;
  return { total, tested, untested: total - tested, approved, textLogos, invalid };
}

// ── Initialisation ────────────────────────────────────────────────────────────

function _hardcodedToMongoDoc(b: LogoBrand): LogoBrandMongoDoc {
  return {
    _id: b.domain,
    name: b.name,
    aliases: b.aliases,
    domain: b.domain,
    category: b.category,
    country: b.country,
    tier: b.tier,
    hints: b.hints,
    textLogo: b.textLogo,
    imageOk: null,
    imageSizeBytes: null,
    hasTextLogo: b.textLogo ? true : null,
    detectedText: null,
    lastTested: null,
    manualExclude: false,
    approved: !b.textLogo,
    updatedAt: new Date(),
  };
}

export async function initLogoBrandStore(): Promise<void> {
  if (!isDbReady() || !logoBrandsCol) {
    // No MongoDB — fall back to in-memory hardcoded list
    _all = HARDCODED_BRANDS.map(_hardcodedToMongoDoc);
    _rebuildTierMap();
    logger.info({ count: _all.length }, "Logo brand store loaded (in-memory, no MongoDB)");
    return;
  }

  let docs = await logoBrandsCol.find({}).toArray();

  if (docs.length === 0) {
    // First run — seed from hardcoded list
    const toInsert = HARDCODED_BRANDS.map(_hardcodedToMongoDoc);
    try {
      await logoBrandsCol.insertMany(toInsert, { ordered: false });
      docs = toInsert;
      logger.info({ count: toInsert.length }, "Logo brand store seeded from hardcoded list");
    } catch (err) {
      logger.error({ err }, "Logo brand store seed failed — using in-memory fallback");
      docs = toInsert;
    }
  } else {
    // Merge: add any new brands from the hardcoded list that aren't already in MongoDB
    const existing = new Set(docs.map((d) => d._id));
    const newBrands = HARDCODED_BRANDS.filter((b) => !existing.has(b.domain));
    if (newBrands.length > 0) {
      const toInsert = newBrands.map(_hardcodedToMongoDoc);
      try {
        await logoBrandsCol.insertMany(toInsert, { ordered: false });
        docs.push(...toInsert);
        logger.info({ count: newBrands.length }, "Logo brand store: merged new hardcoded brands");
      } catch (err) {
        logger.warn({ err }, "Logo brand store: failed to merge new brands");
        docs.push(...toInsert);
      }
    }
  }

  _all = docs;
  _rebuildTierMap();
  logger.info({ total: _all.length }, "Logo brand store loaded from MongoDB");
}

// ── Add / Remove ──────────────────────────────────────────────────────────────

export async function addBrandToStore(brand: {
  domain: string;
  name: string;
  tier: 1 | 2 | 3;
  aliases?: string[];
  category?: string;
  country?: string;
  hints?: string[];
}): Promise<{ ok: boolean; reason?: string }> {
  const domain = brand.domain.toLowerCase().trim();
  if (_all.find((b) => b._id === domain)) {
    return { ok: false, reason: `\`${domain}\` already exists in the store.` };
  }

  const doc: LogoBrandMongoDoc = {
    _id: domain,
    name: brand.name,
    aliases: brand.aliases ?? [brand.name.toLowerCase()],
    domain,
    category: brand.category ?? "Brand",
    country: brand.country ?? "🌍",
    tier: brand.tier,
    hints: brand.hints ?? [],
    imageOk: null,
    imageSizeBytes: null,
    hasTextLogo: null,
    detectedText: null,
    lastTested: null,
    manualExclude: false,
    approved: true,
    updatedAt: new Date(),
  };

  _all.push(doc);
  _rebuildTierMap();

  if (logoBrandsCol) {
    try {
      await logoBrandsCol.insertOne(doc);
    } catch (err) {
      logger.error({ err, domain }, "addBrandToStore DB write failed");
    }
  }

  return { ok: true };
}

export async function removeBrandFromStore(domain: string): Promise<boolean> {
  const key = domain.toLowerCase().trim();
  const idx = _all.findIndex((b) => b._id === key);
  if (idx === -1) return false;

  _all.splice(idx, 1);
  _rebuildTierMap();

  if (logoBrandsCol) {
    await logoBrandsCol.deleteOne({ _id: key }).catch((err) =>
      logger.error({ err, domain: key }, "removeBrandFromStore DB delete failed"),
    );
  }

  return true;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function updateBrandTestResult(
  domain: string,
  result: {
    imageOk: boolean;
    imageSizeBytes: number;
    hasTextLogo: boolean;
    detectedText: string;
  },
): Promise<void> {
  const brand = _all.find((b) => b._id === domain);
  if (!brand) return;

  brand.imageOk        = result.imageOk;
  brand.imageSizeBytes = result.imageSizeBytes;
  brand.hasTextLogo    = result.hasTextLogo;
  brand.detectedText   = result.detectedText;
  brand.lastTested     = new Date();
  brand.approved       = result.imageOk && !result.hasTextLogo && !brand.manualExclude;
  brand.updatedAt      = new Date();

  _rebuildTierMap();

  if (logoBrandsCol) {
    await logoBrandsCol
      .updateOne(
        { _id: domain },
        {
          $set: {
            imageOk:        brand.imageOk,
            imageSizeBytes: brand.imageSizeBytes,
            hasTextLogo:    brand.hasTextLogo,
            detectedText:   brand.detectedText,
            lastTested:     brand.lastTested,
            approved:       brand.approved,
            updatedAt:      brand.updatedAt,
          },
        },
      )
      .catch((err) => logger.error({ err, domain }, "updateBrandTestResult DB write failed"));
  }
}

export async function setBrandApproval(
  domain: string,
  approved: boolean,
  manualExclude?: boolean,
): Promise<boolean> {
  const brand = _all.find((b) => b._id === domain);
  if (!brand) return false;

  brand.approved = approved;
  if (manualExclude !== undefined) brand.manualExclude = manualExclude;
  brand.updatedAt = new Date();

  _rebuildTierMap();

  if (logoBrandsCol) {
    await logoBrandsCol
      .updateOne(
        { _id: domain },
        {
          $set: {
            approved,
            ...(manualExclude !== undefined ? { manualExclude } : {}),
            updatedAt: brand.updatedAt,
          },
        },
      )
      .catch(() => null);
  }
  return true;
}
