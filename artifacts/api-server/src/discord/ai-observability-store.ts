import { createHash, randomUUID } from "node:crypto";
import { getBotTelemetryCollection } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { createSerializedFlush, diagnosticCategory, feedbackSummaryPipeline, type FeedbackVote } from "./ai-observability-policy.js";

const RETENTION_MS = 30 * 24 * 60 * 60_000;
export interface ResponseMetadata {
  _id: string; responseId: string; kind: "bot" | "persona"; at: Date; expiresAt: Date;
}
export interface VoteMetadata {
  _id: string; responseId: string; messageId: string; voterKey: string;
  kind: ResponseMetadata["kind"]; vote: FeedbackVote; at: Date; expiresAt: Date;
}
interface DiagnosticMetadata {
  _id: string; module: string; category: string; dependency?: string; count: number; at: Date; expiresAt: Date;
}
export interface DigestDelivery {
  _id: string; status: "attempting" | "sent" | "failed"; at: Date; expiresAt: Date; messageId?: string;
}

export const responseCollection = () => getBotTelemetryCollection<ResponseMetadata>("ai_response_registry");
export const voteCollection = () => getBotTelemetryCollection<VoteMetadata>("ai_response_feedback");
export const eventCollection = () => getBotTelemetryCollection<DiagnosticMetadata>("bot_diagnostic_events");
export const deliveryCollection = () => getBotTelemetryCollection<DigestDelivery>("bot_diagnostic_deliveries");

let initialized = false;
export async function initializeObservability(): Promise<void> {
  if (initialized) return;
  const collections = [responseCollection(), voteCollection(), eventCollection(), deliveryCollection()];
  if (collections.some((collection) => !collection)) throw new Error("Diagnostic storage unavailable");
  await Promise.all(collections.map((collection) => collection!.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })));
  await voteCollection()!.createIndex({ at: 1 });
  await eventCollection()!.createIndex({ at: 1 });
  initialized = true;
  await flushDiagnosticEvents();
  logger.info("AI feedback and diagnostic metadata storage initialized");
}

export function feedbackKey(responseId: string, userId: string): string {
  // Voters cannot be correlated across responses from the stored hash alone.
  return createHash("sha256").update(`${responseId}:${userId}`).digest("hex");
}

export async function registerResponseIds(ids: string[], kind: ResponseMetadata["kind"]): Promise<void> {
  const collection = responseCollection();
  if (!collection || !ids[0]) throw new Error("Feedback storage unavailable");
  const at = new Date();
  await collection.bulkWrite(ids.map((id) => ({ updateOne: {
    filter: { _id: id },
    update: { $setOnInsert: { responseId: ids[0]!, kind, at, expiresAt: new Date(at.getTime() + RETENTION_MS) } },
    upsert: true,
  } })));
}

export async function storeVote(metadata: ResponseMetadata, userId: string, vote: FeedbackVote, at = new Date()): Promise<void> {
  const collection = voteCollection();
  if (!collection) throw new Error("Feedback storage unavailable");
  await collection.updateOne({ _id: `${feedbackKey(metadata._id, userId)}:${vote}` }, {
    $set: {
      responseId: metadata.responseId, messageId: metadata._id, voterKey: feedbackKey(metadata.responseId, userId),
      kind: metadata.kind, vote, at, expiresAt: new Date(at.getTime() + RETENTION_MS),
    },
  }, { upsert: true });
}

const buffered = new Map<string, DiagnosticMetadata>();
let overflow = 0;
const serializeFlush = createSerializedFlush();

export function recordDiagnosticMetadata(module: string, error: unknown, dependency?: string): void {
  const at = new Date();
  const record: DiagnosticMetadata = {
    _id: randomUUID(), module: module.replace(/[^a-z0-9:_-]/gi, "").slice(0, 64) || "other",
    category: diagnosticCategory(error), count: 1, at, expiresAt: new Date(at.getTime() + RETENTION_MS),
    ...(dependency ? { dependency: dependency.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) } : {}),
  };
  if (buffered.size < 500) buffered.set(record._id, record);
  else overflow++;
  void flushDiagnosticEvents();
}

export function flushDiagnosticEvents(): Promise<void> {
  const collection = eventCollection();
  if (!collection) return Promise.resolve();
  return serializeFlush(async () => {
    try {
      for (const record of [...buffered.values()]) {
        await collection.replaceOne({ _id: record._id }, record, { upsert: true });
        buffered.delete(record._id);
      }
      const lost = overflow;
      if (lost) {
        const at = new Date();
        await collection.insertOne({
          _id: randomUUID(), module: "telemetry", category: "buffer_overflow", count: lost,
          at, expiresAt: new Date(at.getTime() + RETENTION_MS),
        });
        overflow -= lost;
      }
    } catch {
      logger.warn({ bufferedEvents: buffered.size, overflow }, "Diagnostic metadata could not be persisted; retry on next tick");
    }
  });
}

export async function diagnosticSummary(since: Date, until: Date): Promise<string> {
  const events = eventCollection(), votes = voteCollection();
  if (!events || !votes) throw new Error("Diagnostic storage unavailable");
  const range = { $gte: since, $lt: until };
  const [errors, ratings] = await Promise.all([
    events.aggregate<{ _id: { module: string; category: string; dependency?: string }; count: number }>([
      { $match: { at: range } },
      { $group: { _id: { module: "$module", category: "$category", dependency: "$dependency" }, count: { $sum: "$count" } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    votes.aggregate<{ _id: { kind: string; vote: number }; count: number }>(feedbackSummaryPipeline(since, until)).toArray(),
  ]);
  const total = errors.reduce((sum, item) => sum + item.count, 0);
  const categories: Record<string, string> = {
    rate_limit: "limite du fournisseur", permissions: "permissions/accès", timeout: "délai dépassé",
    network: "réseau", provider_unavailable: "fournisseur indisponible", storage: "stockage",
    generation_limit: "limite de génération atteinte", empty_response: "réponse vide", calculation_rejected: "calcul invalide refusé",
    operation_failed: "échec d’opération", unknown: "catégorie inconnue", buffer_overflow: "événements regroupés après saturation",
  };
  const lines = errors.slice(0, 8).map((item) => `• ${item._id.module}${item._id.dependency ? ` / ${item._id.dependency}` : ""} — ${categories[item._id.category] ?? "autre"} : ${item.count}`);
  const feedback = ["bot", "persona"].map((kind) => {
    const count = (vote: number) => ratings.find((item) => item._id.kind === kind && item._id.vote === vote)?.count ?? 0;
    return `• ${kind === "bot" ? "MaximeGPT" : "Personas"} : 👍 ${count(1)} · 👎 ${count(-1)}`;
  });
  const pendingWarning = buffered.size || overflow
    ? `\n⚠️ ${buffered.size + overflow} événement(s) encore en attente de persistance.`
    : "";
  return `**Erreurs suivies par le technicien : ${total}**\n${lines.join("\n") || "Aucune erreur enregistrée sur cette période."}${pendingWarning}${errors.length > 8 ? `\n… et ${errors.length - 8} autre(s) catégorie(s).` : ""}\n\n**Votes actifs ajoutés ou modifiés sur la période**\n${feedback.join("\n")}\nLes votes signalent les réponses à examiner ; ils ne réentraînent pas le modèle. Aucun texte de conversation n’est inclus.`;
}
