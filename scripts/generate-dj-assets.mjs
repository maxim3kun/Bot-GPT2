/**
 * Generates three DJ console images into artifacts/api-server/public/dj/
 *
 *  stopped.png   — static turntable, nothing spinning
 *  playing1.gif  — left vinyl spinning, right static
 *  playing2.gif  — both vinyls spinning
 *
 * Uses:  sharp (already in dependencies) + gif-encoder-2 (pure JS)
 * Run:   node scripts/generate-dj-assets.mjs
 */

import sharp from "sharp";
import GIFEncoder from "gif-encoder-2";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../artifacts/api-server/public/dj");

const W = 500;
const H = 200;
const FRAMES = 30;        // frames per full rotation (360 / 30 = 12° per frame)
const DELAY = 40;         // ms per frame → ~25 fps

// ── Turntable positions ───────────────────────────────────────────────────────
const DISC_R = 76;        // vinyl radius
const CY = 98;            // vertical center
const CX_L = 130;         // left disc horizontal center
const CX_R = 370;         // right disc horizontal center

// ── SVG helpers ───────────────────────────────────────────────────────────────

/** Concentric groove rings on the vinyl */
function grooves(cx, cy, r) {
  const rings = [];
  for (let rr = Math.floor(r * 0.92); rr > r * 0.40; rr -= 7) {
    rings.push(
      `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#1c1c1c" stroke-width="1.2"/>`
    );
  }
  return rings.join("\n");
}

/**
 * Full vinyl group at (cx, cy) rotated by `angleDeg`.
 * The small highlight dot on the label is what makes the spin visible.
 */
function vinylSVG(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const dotDist = r * 0.48;
  const dotX = +(cx + dotDist * Math.cos(rad)).toFixed(2);
  const dotY = +(cy + dotDist * Math.sin(rad)).toFixed(2);

  const shineX = +(cx - r * 0.28).toFixed(2);
  const shineY = +(cy - r * 0.32).toFixed(2);

  return `
  <!-- platter shadow -->
  <ellipse cx="${cx}" cy="${cy + r + 4}" rx="${r + 6}" ry="5" fill="#000" opacity="0.4"/>
  <!-- platter rim -->
  <circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="#232330" stroke="#2e2e42" stroke-width="1.5"/>
  <!-- vinyl disc -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0b0b"/>
  <!-- grooves -->
  ${grooves(cx, cy, r)}
  <!-- label circle -->
  <circle cx="${cx}" cy="${cy}" r="${+(r * 0.36).toFixed(1)}" fill="#b03030"/>
  <!-- label highlight dot (rotates) -->
  <circle cx="${dotX}" cy="${dotY}" r="${+(r * 0.075).toFixed(1)}" fill="#e05050" opacity="0.85"/>
  <!-- inner hub -->
  <circle cx="${cx}" cy="${cy}" r="${+(r * 0.14).toFixed(1)}" fill="#8b1a1a"/>
  <!-- spindle hole -->
  <circle cx="${cx}" cy="${cy}" r="${+(r * 0.038).toFixed(1)}" fill="#e8e8e8"/>
  <!-- specular shine -->
  <ellipse cx="${shineX}" cy="${shineY}" rx="${+(r * 0.13).toFixed(1)}" ry="${+(r * 0.065).toFixed(1)}" fill="white" opacity="0.06" transform="rotate(-35,${cx},${cy})"/>`;
}

/** Tonearm sitting above the disc */
function tonearmSVG(cx, cy, r) {
  const pivotX = cx + r + 14;
  const pivotY = cy - r + 5;
  const tipX = cx + r * 0.45;
  const tipY = cy - r * 0.28;
  return `
  <!-- tonearm pivot -->
  <circle cx="${pivotX}" cy="${pivotY}" r="7" fill="#444" stroke="#666" stroke-width="1"/>
  <!-- tonearm rod -->
  <line x1="${pivotX}" y1="${pivotY}" x2="${tipX}" y2="${tipY}" stroke="#5a5a5a" stroke-width="3" stroke-linecap="round"/>
  <!-- stylus cartridge -->
  <circle cx="${tipX}" cy="${tipY}" r="3.5" fill="#d4a017"/>`;
}

/** Full SVG frame for a given pair of rotation angles */
function frameSVG(angleLDeg, angleRDeg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1b1e"/>
      <stop offset="100%" stop-color="#141517"/>
    </linearGradient>
    <linearGradient id="mixer" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#222326"/>
      <stop offset="100%" stop-color="#1c1d1f"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Mixer surface at bottom -->
  <rect x="0" y="${H - 44}" width="${W}" height="44" fill="url(#mixer)"/>

  <!-- LED accent strip -->
  <rect x="0" y="${H - 46}" width="${W}" height="2" fill="#5865f2" opacity="0.7"/>

  <!-- Crossfader track -->
  <rect x="195" y="${H - 24}" width="110" height="4" rx="2" fill="#111" stroke="#333" stroke-width="1"/>
  <!-- Crossfader knob (centred) -->
  <rect x="242" y="${H - 30}" width="16" height="14" rx="3" fill="#3d4055" stroke="#5865f2" stroke-width="1"/>

  <!-- Left fader -->
  <rect x="88" y="${H - 38}" width="4" height="28" rx="2" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
  <rect x="85" y="${H - 26}" width="10" height="8" rx="2" fill="#4a4f6e"/>

  <!-- Right fader -->
  <rect x="408" y="${H - 38}" width="4" height="28" rx="2" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
  <rect x="405" y="${H - 26}" width="10" height="8" rx="2" fill="#4a4f6e"/>

  <!-- EQ knobs (3 per side) -->
  ${[60, 75, 90].map(x => `<circle cx="${x}" cy="${H - 10}" r="5" fill="#2e2e42" stroke="#444" stroke-width="1"/>`).join("")}
  ${[440, 425, 410].map(x => `<circle cx="${x}" cy="${H - 10}" r="5" fill="#2e2e42" stroke="#444" stroke-width="1"/>`).join("")}

  <!-- Left turntable -->
  ${vinylSVG(CX_L, CY, DISC_R, angleLDeg)}
  ${tonearmSVG(CX_L, CY, DISC_R)}

  <!-- Right turntable -->
  ${vinylSVG(CX_R, CY, DISC_R, angleRDeg)}
  ${tonearmSVG(CX_R, CY, DISC_R)}
</svg>`;
}

// ── Render one SVG string → raw RGBA Uint8ClampedArray ───────────────────────

async function svgToRGBA(svgString) {
  const buf = await sharp(Buffer.from(svgString))
    .resize(W, H)
    .ensureAlpha()
    .raw()
    .toBuffer();
  return new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength);
}

// ── Encode an array of RGBA frames into an animated GIF buffer ────────────────

async function encodeGIF(frames) {
  const encoder = new GIFEncoder(W, H, "octree", true);
  encoder.setDelay(DELAY);
  encoder.setRepeat(0);
  encoder.setQuality(10);
  encoder.start();

  for (const pixels of frames) {
    encoder.addFrame(pixels);
  }

  encoder.finish();
  return Buffer.from(encoder.out.getData());
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const stepDeg = 360 / FRAMES;

  console.log("🎨  Generating DJ console assets…");

  // ── stopped.png  (single static frame, angle = 0) ──────────────────────────
  const stoppedSVG = frameSVG(0, 0);
  const stoppedBuf = await sharp(Buffer.from(stoppedSVG))
    .resize(W, H)
    .png()
    .toBuffer();
  await writeFile(path.join(OUT_DIR, "stopped.png"), stoppedBuf);
  console.log("  ✅  stopped.png");

  // ── playing1.gif  (left spins, right is static at angle 0) ─────────────────
  const frames1 = [];
  for (let i = 0; i < FRAMES; i++) {
    const angle = i * stepDeg;
    frames1.push(await svgToRGBA(frameSVG(angle, 0)));
  }
  await writeFile(path.join(OUT_DIR, "playing1.gif"), await encodeGIF(frames1));
  console.log("  ✅  playing1.gif");

  // ── playing2.gif  (both spin, same phase so labels stay in sync) ────────────
  const frames2 = [];
  for (let i = 0; i < FRAMES; i++) {
    const angle = i * stepDeg;
    frames2.push(await svgToRGBA(frameSVG(angle, angle)));
  }
  await writeFile(path.join(OUT_DIR, "playing2.gif"), await encodeGIF(frames2));
  console.log("  ✅  playing2.gif");

  console.log(`\n🎛️  Assets saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌  Asset generation failed:", err);
  process.exit(1);
});
