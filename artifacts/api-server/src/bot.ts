import { Client, GatewayIntentBits, Message } from "discord.js";
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

export function startBot(): void {
  const token = process.env["DISCORD_TOKEN"];

  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("clientReady", () => {
    logger.info({ tag: client.user?.tag }, "Discord bot connected");
  });

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    try {
      switch (command) {
        case "say": {
          const text = args.join(" ");
          if (!text) {
            await message.reply("❓ Tell me what to say! e.g. `!say Hello everyone`");
          } else {
            await message.delete();
            if ("send" in message.channel) {
              await message.channel.send(text);
            }
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

        case "help": {
          await message.reply(
            `📖 **Available commands:**\n\n` +
            `\`!say <message>\` — I'll say it for you (and delete your message)\n` +
            `\`!hello\` — I'll welcome you warmly\n` +
            `\`!compliment\` — Get a heartfelt compliment 💖\n` +
            `\`!joke\` — Hear a good joke 😄\n` +
            `\`!encouragement\` — Get a motivating message 💪\n` +
            `\`!hug\` — Receive a virtual hug 🤗\n` +
            `\`!8ball <question>\` — Ask the magic 8-ball 🎱\n` +
            `\`!dice [faces]\` — Roll a die (e.g. \`!dice 20\`) 🎲`
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
