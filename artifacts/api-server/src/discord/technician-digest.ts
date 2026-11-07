import type { Client } from "discord.js";
import { logger } from "../lib/logger.js";
import { deliverDiagnosticOnce, dueDiagnosticSlot } from "./ai-observability-policy.js";
import { deliveryCollection, diagnosticSummary, flushDiagnosticEvents, initializeObservability } from "./ai-observability-store.js";

// Explicitly requested recipient; never inferred from a display name.
const DIAGNOSTIC_OWNER_ID = "562005937884233730";
let started = false;
let inFlight = false;

export function startTechnicianDigest(client: Client): void {
  if (started) return;
  started = true;
  async function tick() {
    if (inFlight || !client.isReady()) return;
    inFlight = true;
    try {
      await initializeObservability();
      await flushDiagnosticEvents();
      const slot = dueDiagnosticSlot(new Date());
      if (!slot) return;
      const collection = deliveryCollection();
      if (!collection) throw new Error("Diagnostic storage unavailable");
      const format = (date: Date) => date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
      const summary = await diagnosticSummary(slot.since, slot.until);
      const body = summary.length > 1_700 ? `${summary.slice(0, 1_660)}\n(Résumé abrégé.)` : summary;
      const result = await deliverDiagnosticOnce(
        async () => {
          try {
            await collection.insertOne({
              _id: slot.key, status: "attempting", at: new Date(),
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60_000),
            });
            return true;
          } catch (error) {
            if ((error as { code?: number }).code === 11000) return false;
            throw error;
          }
        },
        async () => {
          const owner = await client.users.fetch(DIAGNOSTIC_OWNER_ID);
          const sent = await owner.send({
            content: `**Diagnostic MaximeGPT — ${slot.key.endsWith(":9") ? "matin" : "soir"}**\nDu ${format(slot.since)} au ${format(slot.until)} (Paris)\n\n${body}`,
            allowedMentions: { parse: [] },
          });
          return sent.id;
        },
        async (status, messageId) => {
          await collection.updateOne({ _id: slot.key }, { $set: { status, ...(messageId ? { messageId } : {}) } });
        },
      );
      if (result === "failed") logger.error({ slot: slot.key }, "Technician DM failed; check recipient DM settings. No repeated send in this slot.");
      else if (result === "sent") logger.info({ slot: slot.key }, "Technician diagnostic DM sent");
    } catch {
      logger.warn("Technician digest unavailable: check diagnostic storage and Discord connectivity");
    } finally { inFlight = false; }
  }
  void tick();
  setInterval(() => { void tick(); }, 60_000).unref();
  logger.info({ hours: [9, 21], timeZone: "Europe/Paris" }, "Technician private digest scheduler started");
}
