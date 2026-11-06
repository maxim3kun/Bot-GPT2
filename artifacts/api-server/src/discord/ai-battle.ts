import type { Client, Message } from "discord.js";
import type OpenAI from "openai";
import { incrementGroqCalls } from "../lib/bot-stats.js";
import { isSendable, type SendableChannel } from "./message-utils.js";

export const activeBattles = new Set<string>();
export const stoppedBattles = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAiBattle(
  topic: string,
  channel: SendableChannel,
  openai: OpenAI,
  bot1Name: string,
  bot2Client: Client,
): Promise<void> {
  const rounds = 3;
  const bot2Channel = await bot2Client.channels.fetch(channel.id).catch(() => null);

  if (!bot2Channel || !isSendable(bot2Channel as Message["channel"])) {
    await channel.send("❌ Bot 2 is not in this channel or not ready. Make sure to invite it to the server!");
    return;
  }

  const bot2SendableChannel = bot2Channel as unknown as SendableChannel;
  const bot2Name = bot2Client.user?.username ?? "Challenger";
  const channelId = channel.id;

  await channel.send(
    `⚔️ **AI BATTLE** ⚔️\n\n**Topic:** ${topic}\n\n` +
    `🔵 **${bot1Name}** argues **FOR**\n` +
    `🔴 **${bot2Name}** argues **AGAINST**\n\n` +
    "3 rounds — one message every ~40s. Type `!ai stop` to end. 🥊",
  );

  await sleep(3000);

  const battleHistory: { role: "user" | "assistant"; content: string }[] = [];
  const systemFor = `You are ${bot1Name}, a passionate and eloquent AI debater. Argue STRONGLY FOR: "${topic}". Write 150-200 words. Use vivid language, concrete examples, end with a provocative question for your opponent. Respond in the same language as the topic.`;
  const systemAgainst = `You are ${bot2Name}, a sharp and confident AI debater. Argue STRONGLY AGAINST: "${topic}". Write 150-200 words. Tear down your opponent's arguments with logic and wit, use real-world examples, end with a strong closing statement. Respond in the same language as the topic.`;

  for (let round = 1; round <= rounds; round++) {
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped after round ${round - 1}.**`);
      stoppedBattles.delete(channelId);
      return;
    }

    await channel.sendTyping();
    const forPrompt = round === 1
      ? `Opening argument FOR: "${topic}". Write 150-200 words.`
      : `Round ${round}: respond to your opponent and reinforce your position. Write 150-200 words.`;
    battleHistory.push({ role: "user", content: forPrompt });

    const forResponse = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemFor }, ...battleHistory],
    });

    incrementGroqCalls();
    const forArg = forResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "assistant", content: forArg });
    await channel.send(`🔵 **${bot1Name}** — Round ${round}:\n\n${forArg}`);

    await sleep(20000);
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped mid-round ${round}.**`);
      stoppedBattles.delete(channelId);
      return;
    }
    await bot2SendableChannel.sendTyping();
    await sleep(20000);

    const againstPrompt = `Round ${round}: counter ${bot1Name}'s argument: "${forArg}". Write 150-200 words.`;
    const againstHistory = [...battleHistory, { role: "user" as const, content: againstPrompt }];
    const againstResponse = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemAgainst }, ...againstHistory],
    });

    incrementGroqCalls();
    const againstArg = againstResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "user", content: againstArg });
    await bot2SendableChannel.send(`🔴 **${bot2Name}** — Round ${round}:\n\n${againstArg}`);

    if (round < rounds) {
      await sleep(20000);
      if (stoppedBattles.has(channelId)) {
        await channel.send(`🛑 **Battle stopped after round ${round}.**`);
        stoppedBattles.delete(channelId);
        return;
      }
      await channel.sendTyping();
      await sleep(20000);
    }
  }

  const verdictResponse = await openai.chat.completions.create({
    model: "openai/gpt-oss-20b",
    max_completion_tokens: 200,
    messages: [
      {
        role: "system",
        content: `You are a dramatic debate judge. Declare a winner between ${bot1Name} (FOR) and ${bot2Name} (AGAINST) on the topic "${topic}". Be theatrical and funny. Max 100 words. Respond in the same language as the debate.`,
      },
      { role: "user", content: `The debate is over. Who won?\n\n${battleHistory.map((message) => message.content).join("\n\n")}` },
    ],
  });

  incrementGroqCalls();
  const verdict = verdictResponse.choices[0]?.message?.content ?? "It's a tie!";
  await sleep(2000);
  await channel.send(`🏆 **VERDICT** 🏆\n\n${verdict}`);
}
