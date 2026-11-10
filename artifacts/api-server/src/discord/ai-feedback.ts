import type { Client, ClientEvents, Message } from "discord.js";
import { logger } from "../lib/logger.js";
import { createOrderedEventQueue, reactionVote } from "./ai-observability-policy.js";
import { feedbackKey, recordDiagnosticMetadata, registerResponseIds, responseCollection, storeVote, voteCollection, type ResponseMetadata } from "./ai-observability-store.js";
import { replyFeedbackPlan } from "./ai-feedback-policy.js";

type Reaction = ClientEvents["messageReactionAdd"][0];
type Reactor = ClientEvents["messageReactionAdd"][1];
const queueEvent = createOrderedEventQueue();

export function createFeedbackTracker(register = registerResponseIds) {
  return async (messages: Message[], kind: ResponseMetadata["kind"], question = ""): Promise<void> => {
  if (!messages.length) return;
  const plan = replyFeedbackPlan(kind, messages.reduce((sum, message) => sum + message.content.length, 0), question);
  if (!plan.register) return;
  try { await register(messages.map((message) => message.id), kind); }
  catch (error) {
    recordDiagnosticMetadata("feedback", error);
    logger.warn({ kind }, "AI feedback unavailable: reply metadata could not be registered");
    return;
  }
  if (!plan.seed) return;
  // Only the first chunk is seeded; manually reacting to other chunks still counts once per answer.
  for (const emoji of ["👍", "👎"]) {
    try { await messages[0]!.react(emoji); }
    catch (error) {
      recordDiagnosticMetadata("feedback", error);
      logger.warn({ kind }, "Cannot add rating reactions; check Add Reactions and Read Message History permissions");
      break;
    }
  }
  };
}
export const trackAiReplies = createFeedbackTracker();

export function createPersonaControlSeeder(
  register = registerResponseIds,
) {
  return async (message: Message): Promise<void> => {
    try {
      await register([message.id], "bot");
      await message.react("🎭");
    } catch (error) {
      recordDiagnosticMetadata("feedback", error);
      logger.warn("Cannot add persona control reaction; check Add Reactions and Read Message History permissions");
    }
  };
}

export const seedAiPersonaControl = createPersonaControlSeeder();

async function feedbackEvent(reaction: Reaction, user: Reactor, removed: boolean, at: Date): Promise<void> {
  const vote = reactionVote(reaction.emoji.name);
  if (user.partial) user = await user.fetch();
  if (!vote || user.bot) return;
  const metadata = await responseCollection()?.findOne({ _id: reaction.message.id, expiresAt: { $gt: new Date() } });
  if (!metadata) return;
  // Ignore new persona votes, including replies registered before this policy changed.
  if (metadata.kind !== "bot" && !removed) return;
  if (!removed) { await storeVote(metadata, user.id, vote, at); return; }
  const collection = voteCollection();
  if (!collection) throw new Error("Feedback storage unavailable");
  // Keep each active emoji separately; aggregation picks the latest remaining one.
  await collection.deleteOne({ _id: `${feedbackKey(metadata._id, user.id)}:${vote}` });
}

export function registerAiFeedback(client: Client): void {
  const failed = (error: unknown) => {
    recordDiagnosticMetadata("feedback", error);
    logger.warn("Could not persist AI reaction feedback");
  };
  client.on("messageReactionAdd", (reaction, user) => {
    const at = new Date();
    void queueEvent(reaction.message.id, () => feedbackEvent(reaction, user, false, at)).catch(failed);
  });
  client.on("messageReactionRemove", (reaction, user) => {
    const at = new Date();
    void queueEvent(reaction.message.id, () => feedbackEvent(reaction, user, true, at)).catch(failed);
  });
  client.on("messageReactionRemoveAll", (message) => {
    void queueEvent(message.id, async () => {
      const metadata = await responseCollection()?.findOne({ _id: message.id });
      if (metadata) await voteCollection()?.deleteMany({ messageId: metadata._id });
    }).catch(failed);
  });
  client.on("messageReactionRemoveEmoji", (reaction) => {
    const vote = reactionVote(reaction.emoji.name);
    if (!vote) return;
    void queueEvent(reaction.message.id, async () => {
      const collection = voteCollection();
      if (!collection) throw new Error("Feedback storage unavailable");
      await collection.deleteMany({ messageId: reaction.message.id, vote });
    }).catch(failed);
  });
}
