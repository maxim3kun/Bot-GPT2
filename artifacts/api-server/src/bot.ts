import { Client, GatewayIntentBits, Message } from "discord.js";
import OpenAI from "openai";
import { logger } from "./lib/logger";

const PREFIX = "!";

const COMPLIMENTS = [
  "You are absolutely amazing! ✨",
  "Your smile lights up the room! ☀️",
  "You are a truly extraordinary person! 🌟",
  "You have a unique and precious talent! 💎",
  "The world is better because of you! 🌈",
  "You are brave and inspiring! 🦁",
  "Your creativity knows no limits! 🎨",
  "You are a deeply kind person! 💖",
  "You deserve all the happiness in the world! 🌸",
  "Your efforts make a real difference! 💪",
];

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything! 😂",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I told my wife she was drawing her eyebrows too high. She looked surprised! 😄",
  "Why don't skeletons fight each other? They don't have the guts! 💀",
  "What do you call a fish without eyes? A fsh! 🐟",
  "Why can't you give Elsa a balloon? Because she'll let it go! 🎈",
  "What do you call cheese that isn't yours? Nacho cheese! 🧀",
  "Why did the math book look so sad? Because it had too many problems! 📚",
  "What do you call a fake noodle? An impasta! 🍝",
  "Why did the bicycle fall over? Because it was two-tired! 🚲",
];

const ENCOURAGEMENTS = [
  "You can do it, I believe in you! 💪",
  "Every great journey begins with a single step. Keep going! 🚀",
  "You are stronger than you think! 🦸",
  "Today's difficulties are tomorrow's successes! 🌟",
  "Never give up! Perseverance always leads to victory! 🏆",
  "You're moving forward — even small steps count! 👣",
  "Keep believing in yourself, you're doing great! 🎯",
  "Even stars need darkness to shine. Hang in there! ⭐",
  "You've already overcome so many obstacles. You'll get through this one too! 🌈",
  "Take care of yourself and keep going at your own pace! 🌺",
];

const EIGHT_BALL_RESPONSES = [
  "Yes, absolutely! ✅",
  "It is certain! 🎯",
  "Without a doubt! 💯",
  "Yes, I think so! 👍",
  "Signs point to yes! 🔮",
  "Probably! 🤔",
  "Outlook looks good! 🌟",
  "Maybe... try again! 🎲",
  "I'm not sure... 😕",
  "Outlook not so good! 😬",
  "Probably not! 👎",
  "No, certainly not! ❌",
  "My sources say no! 🚫",
  "Very doubtful! 🌫️",
  "Ask again later! ⏳",
];

const HUGS = [
  "Here's a huge virtual hug for you! 🤗💕",
  "Sending you warmth and love! 🫂✨",
  "A big hug just for you! 🐻💖",
  "Here, take this well-deserved hug! 🤗🌸",
  "A soft and cozy hug, just for you! 🧸💝",
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type ChatMessage = { role: "user" | "assistant"; content: string };

const conversationHistory = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 20;

function getHistory(channelId: string): ChatMessage[] {
  if (!conversationHistory.has(channelId)) conversationHistory.set(channelId, []);
  return conversationHistory.get(channelId)!;
}

function addToHistory(channelId: string, role: "user" | "assistant", content: string): void {
  const history = getHistory(channelId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

function isBotMentioned(message: Message, botId: string): boolean {
  if (message.mentions.users.has(botId)) return true;
  return new RegExp(`<@!?${botId}>`).test(message.content);
}

function stripMentions(content: string): string {
  return content.replace(/<@!?\d+>/g, "").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SendableChannel = { id: string; send: (...args: unknown[]) => Promise<unknown>; sendTyping: () => Promise<void> };

function isSendable(channel: unknown): channel is SendableChannel {
  return typeof channel === "object" && channel !== null && "send" in channel && "sendTyping" in channel;
}

const activeBattles = new Set<string>();
const stoppedBattles = new Set<string>();

async function runAiBattle(
  topic: string,
  channel: SendableChannel,
  openai: OpenAI,
  bot1Name: string,
  bot2Client: Client
): Promise<void> {
  const ROUNDS = 3;
  const bot2Channel = await bot2Client.channels.fetch(channel.id).catch(() => null);

  if (!bot2Channel || !isSendable(bot2Channel as Message["channel"])) {
    await channel.send("❌ Bot 2 is not in this channel or not ready. Make sure to invite it to the server!");
    return;
  }

  const bot2SendableChannel = bot2Channel as unknown as SendableChannel;
  const bot2Name = bot2Client.user?.username ?? "Challenger";

  const channelId = channel.id;

  await channel.send(
    `⚔️ **AI BATTLE** ⚔️\n\n` +
    `**Topic:** ${topic}\n\n` +
    `🔵 **${bot1Name}** will argue **FOR**\n` +
    `🔴 **${bot2Name}** will argue **AGAINST**\n\n` +
    `3 rounds — one message every ~40 seconds.\nType \`!ai stop\` to end the battle early. 🥊`
  );

  await sleep(3000);

  const battleHistory: { role: "user" | "assistant"; content: string }[] = [];

  const systemFor = `You are ${bot1Name}, a passionate and eloquent AI debater. Your role is to argue STRONGLY FOR the following topic: "${topic}". Write a convincing argument of 150 to 200 words. Use vivid language, concrete examples, and end with a provocative rhetorical question or challenge aimed at your opponent. Respond in the same language as the topic.`;
  const systemAgainst = `You are ${bot2Name}, a sharp and confident AI debater. Your role is to argue STRONGLY AGAINST the following topic: "${topic}". Write a convincing counter-argument of 150 to 200 words. Tear down your opponent's points with logic and wit, use real-world examples, and end with a strong closing statement. Respond in the same language as the topic.`;

  for (let round = 1; round <= ROUNDS; round++) {
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped after round ${round - 1}.**`);
      stoppedBattles.delete(channelId);
      return;
    }

    // Bot 1 argues FOR — show typing for ~10s to feel natural
    await channel.sendTyping();
    const forPrompt = round === 1
      ? `Make your opening argument FOR: "${topic}". Write 150 to 200 words.`
      : `Round ${round}: respond to your opponent's last argument and reinforce your position. Write 150 to 200 words.`;

    battleHistory.push({ role: "user", content: forPrompt });

    const forResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemFor }, ...battleHistory],
    });

    const forArg = forResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "assistant", content: forArg });

    await channel.send(`🔵 **${bot1Name}** — Round ${round}:\n\n${forArg}`);

    // Pause before bot 2 replies (~40s), refresh typing mid-wait
    await sleep(20000);
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped mid-round ${round}.**`);
      stoppedBattles.delete(channelId);
      return;
    }
    await bot2SendableChannel.sendTyping();
    await sleep(20000);

    // Bot 2 argues AGAINST
    const againstPrompt = `Round ${round}: counter ${bot1Name}'s argument: "${forArg}". Write 150 to 200 words.`;
    const againstHistory = battleHistory.map((m) => ({ ...m }));
    againstHistory.push({ role: "user", content: againstPrompt });

    const againstResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemAgainst }, ...againstHistory],
    });

    const againstArg = againstResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "user", content: againstArg });

    await bot2SendableChannel.send(`🔴 **${bot2Name}** — Round ${round}:\n\n${againstArg}`);

    // Pause before next round
    if (round < ROUNDS) {
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

  // Verdict
  const verdictResponse = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 200,
    messages: [
      {
        role: "system",
        content: `You are a dramatic debate judge. Declare a winner between ${bot1Name} (FOR) and ${bot2Name} (AGAINST) on the topic "${topic}". Be theatrical and funny. Max 100 words. Respond in the same language as the debate.`,
      },
      { role: "user", content: `The debate is over. Who won?\n\n${battleHistory.map((m) => m.content).join("\n\n")}` },
    ],
  });

  const verdict = verdictResponse.choices[0]?.message?.content ?? "It's a tie!";
  await sleep(2000);
  await channel.send(`🏆 **VERDICT** 🏆\n\n${verdict}`);
}

export function startBot(): void {
  const token = process.env["DISCORD_TOKEN"];
  const token2 = process.env["DISCORD_TOKEN_2"];
  const groqKey = process.env["GROQ_API_KEY"];

  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  const openai = groqKey
    ? new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" })
    : null;

  if (!openai) logger.warn("GROQ_API_KEY not set — AI features will be disabled");

  // Main bot (bot 1)
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  // Second bot (bot 2) for AI battle
  let client2: Client | null = null;
  if (token2) {
    client2 = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    client2.once("clientReady", () => {
      logger.info({ tag: client2!.user?.tag }, "Bot 2 connected");
    });
    client2.login(token2).catch((err) => {
      logger.error({ err }, "Failed to connect bot 2");
    });
  } else {
    logger.warn("DISCORD_TOKEN_2 not set — !ai battle will be disabled");
  }

  client.once("clientReady", () => {
    logger.info({ tag: client.user?.tag, id: client.user?.id }, "Discord bot connected");
  });

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;

    const botId = client.user?.id ?? "";
    const content = message.content;

    logger.info({ content, botId, mentioned: isBotMentioned(message, botId) }, "Message received");

    // --- /image command ---
    if (content.startsWith("/image ") || content.startsWith("!image ")) {
      const prompt = content.slice(content.indexOf(" ") + 1).trim();
      if (!prompt) {
        await message.reply("🎨 Give me a description! e.g. `/image a sunset over Paris`");
        return;
      }
      const hfToken = process.env["HUGGINGFACE_TOKEN"];
      if (!hfToken) {
        await message.reply("❌ Image generation is not configured.");
        return;
      }
      try {
        const waitMsg = await message.reply("🎨 Generating your image, please wait...");
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt }),
          }
        );
        if (!response.ok) {
          const err = await response.text();
          logger.error({ err, status: response.status }, "HuggingFace image error");
          await waitMsg.edit("❌ Failed to generate the image. Try again later!");
          return;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await waitMsg.delete();
        if (isSendable(message.channel)) {
          await message.channel.send({ content: `🖼️ **${prompt}**`, files: [{ attachment: buffer, name: "image.png" }] });
        }
      } catch (err) {
        logger.error({ err }, "Error generating image");
        await message.reply("❌ Failed to generate the image. Try again!");
      }
      return;
    }

    // --- @mention → AI chat ---
    if (botId && isBotMentioned(message, botId) && openai) {
      const userText = stripMentions(content);
      if (!userText) {
        await message.reply("Hey! 👋 Mention me with a message and I'll do my best to help you!");
        return;
      }
      try {
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
        const response = await openai.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_completion_tokens: 1024,
          messages: [
            { role: "system", content: "You are a friendly, helpful, and cheerful Discord bot. Keep your answers concise and conversational. Use a warm, casual tone. You can use emojis sparingly. Never break character. Respond in the same language the user writes in." },
            ...getHistory(message.channelId),
          ],
        });
        const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't think of a response! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
      } catch (err) {
        logger.error({ err }, "Error calling Groq API");
        await message.reply("Oops, something went wrong while thinking! 😅 Try again in a moment.");
      }
      return;
    }

    // --- !prefix commands ---
    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    try {
      switch (command) {
        case "say": {
          const text = args.join(" ");
          if (!text) {
            await message.reply("❓ Tell me what to say! e.g. `!say Hello everyone`");
          } else {
            await message.delete();
            if (isSendable(message.channel)) await message.channel.send(text);
          }
          break;
        }

        case "bonjour":
        case "salut":
        case "hello":
        case "hi": {
          await message.reply(`Hello ${message.author.displayName}! 👋 Great to see you here! How are you doing? 😊`);
          break;
        }

        case "compliment": {
          await message.reply(`${message.author.displayName}, ${getRandom(COMPLIMENTS)}`);
          break;
        }

        case "joke": {
          await message.reply(getRandom(JOKES));
          break;
        }

        case "encouragement":
        case "cheer": {
          await message.reply(`${message.author.displayName}, ${getRandom(ENCOURAGEMENTS)}`);
          break;
        }

        case "hug": {
          await message.reply(`${message.author.displayName}, ${getRandom(HUGS)}`);
          break;
        }

        case "8ball": {
          const question = args.join(" ");
          if (!question) {
            await message.reply("🎱 Ask me a question! e.g. `!8ball Will today be a good day?`");
          } else {
            await message.reply(`🎱 **Question:** ${question}\n**Answer:** ${getRandom(EIGHT_BALL_RESPONSES)}`);
          }
          break;
        }

        case "dice":
        case "roll": {
          const faces = parseInt(args[0] ?? "6");
          const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
          const result = Math.floor(Math.random() * nb) + 1;
          await message.reply(`🎲 You rolled a ${nb}-sided die and got: **${result}**!`);
          break;
        }

        case "conspiracy": {
          if (!openai) { await message.reply("❌ AI is not configured."); break; }
          try {
            const topic = args.join(" ").trim();
            if (isSendable(message.channel)) await message.channel.sendTyping();
            const prompt = topic
              ? `Generate a short, absurd and funny conspiracy theory about: "${topic}". Keep it under 200 words. Be creative, dramatic and ridiculous. Start directly with the theory.`
              : `Generate a short, absurd and funny random conspiracy theory. Keep it under 200 words. Be creative, dramatic and ridiculous. Start directly with the theory.`;
            const response = await openai.chat.completions.create({
              model: "llama-3.1-8b-instant",
              max_completion_tokens: 300,
              messages: [
                { role: "system", content: "You are a dramatic conspiracy theory generator. Always write in the language the user used in their message. If no topic is given, use English. Be creative, funny and absurd — never harmful." },
                { role: "user", content: prompt },
              ],
            });
            const theory = response.choices[0]?.message?.content ?? "The truth is too dangerous to reveal... 🤫";
            await message.reply(`🕵️ **CONSPIRACY UNLOCKED** 🕵️\n\n${theory}`);
          } catch (err) {
            logger.error({ err }, "Error generating conspiracy");
            await message.reply("❌ The government blocked this conspiracy. Try again!");
          }
          break;
        }

        case "ai": {
          const subcommand = args.shift()?.toLowerCase();

          if (subcommand === "stop") {
            if (!activeBattles.has(message.channelId)) {
              await message.reply("🤷 No battle is running in this channel.");
            } else {
              stoppedBattles.add(message.channelId);
              await message.reply("🛑 Stopping the battle after the current message...");
            }
            break;
          }

          if (subcommand !== "battle") break;

          if (!openai) { await message.reply("❌ AI is not configured."); break; }
          if (!client2) { await message.reply("❌ Bot 2 is not connected. Add `DISCORD_TOKEN_2` to the secrets."); break; }
          if (!isSendable(message.channel)) break;

          const topic = args.join(" ").trim() || "Is pineapple on pizza acceptable?";

          if (activeBattles.has(message.channelId)) {
            await message.reply("⚔️ A battle is already happening in this channel! Type `!ai stop` to end it.");
            break;
          }

          activeBattles.add(message.channelId);
          const bot1Name = client.user?.username ?? "Defender";

          runAiBattle(topic, message.channel, openai, bot1Name, client2)
            .catch(async (err) => {
              logger.error({ err }, "Error during AI battle");
              await message.reply("❌ The battle crashed unexpectedly!");
            })
            .finally(() => {
              activeBattles.delete(message.channelId);
              stoppedBattles.delete(message.channelId);
            });

          break;
        }

        case "help": {
          await message.reply(
            `📖 **Available commands:**\n\n` +
            `\`@bot <message>\` — Chat with me as an AI! 🤖\n` +
            `\`/image <description>\` — Generate an image 🎨\n` +
            `\`!say <message>\` — I'll say it for you (and delete your message)\n` +
            `\`!hello\` — I'll welcome you warmly\n` +
            `\`!compliment\` — Get a heartfelt compliment 💖\n` +
            `\`!joke\` — Hear a good joke 😄\n` +
            `\`!encouragement\` — Get a motivating message 💪\n` +
            `\`!hug\` — Receive a virtual hug 🤗\n` +
            `\`!8ball <question>\` — Ask the magic 8-ball 🎱\n` +
            `\`!dice [faces]\` — Roll a die (e.g. \`!dice 20\`) 🎲\n` +
            `\`!conspiracy [topic]\` — Generate a wild conspiracy theory 🕵️\n` +
            `\`!ai battle [topic]\` — Watch two AIs fight it out ⚔️\n` +
            `\`!ai stop\` — Stop an ongoing AI battle 🛑`
          );
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error({ err, command }, "Error handling command");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to connect to Discord");
  });
}
