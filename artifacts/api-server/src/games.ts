import { Message, EmbedBuilder, MessageReaction, User } from "discord.js";
import OpenAI from "openai";
import { logger } from "./lib/logger";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .trim();
}

type DiscordChannel = {
  id: string;
  send: (content: unknown) => Promise<Message>;
  sendTyping: () => Promise<void>;
  awaitMessages: (opts: {
    filter: (m: Message) => boolean;
    max: number;
    time: number;
    errors: string[];
  }) => Promise<Map<string, Message>>;
};

function toSendable(ch: Message["channel"]): DiscordChannel | null {
  if ("send" in ch && "awaitMessages" in ch) return ch as unknown as DiscordChannel;
  return null;
}

// ─────────────────────────────────────────
// MINESWEEPER
// ─────────────────────────────────────────

const NUM_EMOJIS = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

type MineDiff = "easy" | "medium" | "hard";
const MINE_CONFIGS: Record<MineDiff, { rows: number; cols: number; mines: number }> = {
  easy:   { rows: 8,  cols: 8,  mines: 10 },
  medium: { rows: 9,  cols: 9,  mines: 15 },
  hard:   { rows: 10, cols: 10, mines: 20 },
};

export function playMinesweeper(message: Message, diffArg?: string): string | null {
  const diff: MineDiff = (["easy", "medium", "hard"].includes(diffArg ?? "") ? diffArg : "medium") as MineDiff;
  const { rows, cols, mines } = MINE_CONFIGS[diff];

  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false) as boolean[]);
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!grid[r][c]) { grid[r][c] = true; placed++; }
  }

  const neighbors = (r: number, c: number): number => {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr; const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc]) n++;
      }
    return n;
  };

  const diffLabel: Record<MineDiff, string> = { easy: "🟢 Easy", medium: "🟡 Medium", hard: "🔴 Hard" };
  const lines: string[] = [
    `💣 **Minesweeper** — ${diffLabel[diff]} | ${rows}×${cols} — ${mines} mines`,
    `Click the spoilers to reveal the cells!\n`,
  ];

  for (let r = 0; r < rows; r++) {
    lines.push(
      Array.from({ length: cols }, (_, c) =>
        `||${grid[r][c] ? "💣" : NUM_EMOJIS[neighbors(r, c)]}||`
      ).join("")
    );
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────
// GEOGUESSR
// ─────────────────────────────────────────

interface Country {
  name: string;
  aliases: string[];
  flag: string;
  landmark: string;
  landmarkName: string;
  hints: string[];
}

const COUNTRIES: Country[] = [
  {
    name: "France", aliases: ["france"], flag: "🇫🇷",
    landmark: "Eiffel_Tower", landmarkName: "Eiffel Tower",
    hints: [
      "This country covers about 551,000 km² and lies in Western Europe.",
      "Its official language is spoken by over 300 million people worldwide.",
      "It borders Spain, Italy, Switzerland, Germany, Belgium, and Luxembourg.",
      "It is world-famous for its cuisine, wines, and fashion industry.",
      "Its capital is one of the most visited cities on Earth.",
      "Its capital city is Paris. 🗼",
    ],
  },
  {
    name: "Japan", aliases: ["japan", "japon"], flag: "🇯🇵",
    landmark: "Mount_Fuji", landmarkName: "Mount Fuji",
    hints: [
      "This country is an archipelago of over 6,800 islands in the Pacific.",
      "It is one of the world's largest economies, famous for its car industry.",
      "Its cuisine includes sushi, ramen, and tempura.",
      "Samurai and ninja are part of its legendary history.",
      "Its highest peak is a snow-capped volcano and a national symbol.",
      "Its capital is Tokyo. 🗾",
    ],
  },
  {
    name: "Brazil", aliases: ["brazil", "brasil"], flag: "🇧🇷",
    landmark: "Christ_the_Redeemer_(statue)", landmarkName: "Christ the Redeemer",
    hints: [
      "This is the largest country in South America, covering 8.5 million km².",
      "It is home to the world's largest tropical rainforest.",
      "Its official language is Portuguese.",
      "Its carnival is one of the most famous celebrations in the world.",
      "It has won the FIFA World Cup a record 5 times.",
      "Its capital is Brasília, but Rio de Janeiro is its most iconic city. 🗿",
    ],
  },
  {
    name: "Australia", aliases: ["australia"], flag: "🇦🇺",
    landmark: "Sydney_Opera_House", landmarkName: "Sydney Opera House",
    hints: [
      "This country is both a nation and an entire continent in the Southern Hemisphere.",
      "It is surrounded by the Indian and Pacific Oceans.",
      "It is home to kangaroos, koalas, and wombats.",
      "The Great Barrier Reef lies off its northeastern coast.",
      "Its most populous city is Sydney, which is not its capital.",
      "Its capital is Canberra. 🦘",
    ],
  },
  {
    name: "Germany", aliases: ["germany", "deutschland"], flag: "🇩🇪",
    landmark: "Brandenburg_Gate", landmarkName: "Brandenburg Gate",
    hints: [
      "This country has the largest economy in Europe.",
      "It is famous for its beer, pretzels, and Oktoberfest festival.",
      "It shares borders with 9 countries including France, Austria, and Poland.",
      "The fall of its famous Wall in 1989 marked its reunification.",
      "It has won the FIFA World Cup 4 times.",
      "Its capital is Berlin. 🏰",
    ],
  },
  {
    name: "Argentina", aliases: ["argentina"], flag: "🇦🇷",
    landmark: "Perito_Moreno_Glacier", landmarkName: "Perito Moreno Glacier",
    hints: [
      "This is the 8th largest country in the world by area.",
      "Its official language is Spanish.",
      "It is renowned for its vast pampas, beef, and Malbec wine.",
      "The tango dance originated in its streets.",
      "It is the home country of Lionel Messi and Diego Maradona.",
      "Its capital is Buenos Aires. 💃",
    ],
  },
  {
    name: "Egypt", aliases: ["egypt"], flag: "🇪🇬",
    landmark: "Great_Pyramid_of_Giza", landmarkName: "Great Pyramid of Giza",
    hints: [
      "This country lies in northeastern Africa, on both the Mediterranean and Red Sea.",
      "It is crossed by the longest river in the world.",
      "It is the site of one of the oldest civilizations in human history.",
      "It contains one of the Seven Wonders of the Ancient World still standing today.",
      "The Sphinx and the pyramids of Giza are located here.",
      "Its capital is Cairo. 🏺",
    ],
  },
  {
    name: "Mexico", aliases: ["mexico"], flag: "🇲🇽",
    landmark: "Chichen_Itza", landmarkName: "Chichen Itza",
    hints: [
      "This country is in North America, just south of the United States.",
      "It is the most populous Spanish-speaking country in the world.",
      "Tacos, guacamole, and enchiladas originated here.",
      "The Aztec and Maya civilizations flourished on its territory.",
      "Its capital is one of the largest megacities on Earth.",
      "Its capital is Mexico City. 🌮",
    ],
  },
  {
    name: "India", aliases: ["india"], flag: "🇮🇳",
    landmark: "Taj_Mahal", landmarkName: "Taj Mahal",
    hints: [
      "This country became the world's most populous nation in 2023.",
      "It has over 20 officially recognized languages.",
      "It is known for curry, yoga, and Bollywood.",
      "It borders China, Pakistan, Bangladesh, Nepal, and Bhutan.",
      "One of the Seven Wonders of the World is located here.",
      "Its capital is New Delhi. 🐘",
    ],
  },
  {
    name: "Canada", aliases: ["canada"], flag: "🇨🇦",
    landmark: "Niagara_Falls", landmarkName: "Niagara Falls",
    hints: [
      "This is the 2nd largest country in the world by area.",
      "It has two official languages: English and French.",
      "It shares the world's longest international border with its southern neighbor.",
      "It is famous for maple syrup, hockey, and its vast wilderness.",
      "Its major cities include Toronto, Montreal, and Vancouver.",
      "Its capital is Ottawa. 🍁",
    ],
  },
  {
    name: "South Korea", aliases: ["south korea", "korea", "south-korea"], flag: "🇰🇷",
    landmark: "Gyeongbokgung", landmarkName: "Gyeongbokgung Palace",
    hints: [
      "This country occupies the southern half of a peninsula in East Asia.",
      "It has been separated from its northern neighbor by the DMZ since 1953.",
      "It is the birthplace of K-Pop, K-Drama, and kimchi.",
      "It is home to global brands like Samsung, LG, and Hyundai.",
      "North Korea lies directly to its north.",
      "Its capital is Seoul. 🎵",
    ],
  },
  {
    name: "Italy", aliases: ["italy"], flag: "🇮🇹",
    landmark: "Colosseum", landmarkName: "Colosseum",
    hints: [
      "This country is shaped like a boot, jutting into the Mediterranean Sea.",
      "It contains the world's smallest nation (the Vatican).",
      "Pizza, pasta, risotto, and tiramisu were all invented here.",
      "The Roman Empire originated on its territory.",
      "The Colosseum, Venice, and the Leaning Tower of Pisa are found here.",
      "Its capital is Rome. 🍕",
    ],
  },
  {
    name: "Spain", aliases: ["spain", "espana"], flag: "🇪🇸",
    landmark: "Sagrada_Família", landmarkName: "Sagrada Família",
    hints: [
      "This country occupies the Iberian Peninsula in southwestern Europe.",
      "It is the 4th largest economy in the Eurozone.",
      "Paella, tapas, and sangria originated here.",
      "Bullfighting and flamenco are part of its cultural heritage.",
      "It borders France, Portugal, Andorra, and Morocco (via enclaves).",
      "Its capital is Madrid. 🐂",
    ],
  },
  {
    name: "Russia", aliases: ["russia"], flag: "🇷🇺",
    landmark: "Saint_Basil's_Cathedral", landmarkName: "Saint Basil's Cathedral",
    hints: [
      "This is the largest country in the world, spanning 11 time zones.",
      "It stretches from Eastern Europe all the way to the Pacific Ocean.",
      "Lake Baikal, the world's deepest lake, is located here.",
      "Its literary giants include Tolstoy, Dostoevsky, and Chekhov.",
      "It is the world's largest natural gas producer.",
      "Its capital is Moscow. ❄️",
    ],
  },
  {
    name: "China", aliases: ["china"], flag: "🇨🇳",
    landmark: "Great_Wall_of_China", landmarkName: "Great Wall of China",
    hints: [
      "This country had the world's largest population for centuries, with 1.4 billion people.",
      "It is the world's 2nd largest economy and biggest exporter.",
      "The longest man-made structure in the world is located here.",
      "It shares borders with 14 countries — a world record.",
      "The giant panda, its national symbol, is found nowhere else in the wild.",
      "Its capital is Beijing. 🐉",
    ],
  },
  {
    name: "Portugal", aliases: ["portugal"], flag: "🇵🇹",
    landmark: "Belém_Tower", landmarkName: "Belém Tower",
    hints: [
      "This small country sits at the westernmost tip of mainland Europe.",
      "It borders only one other country — Spain.",
      "It founded the largest maritime empire in history during the 15th century.",
      "Fado, its traditional music, is recognized by UNESCO.",
      "Brazil, Angola, and Mozambique speak its official language.",
      "Its capital is Lisbon. 🎸",
    ],
  },
  {
    name: "Sweden", aliases: ["sweden", "sverige"], flag: "🇸🇪",
    landmark: "Stockholm_City_Hall", landmarkName: "Stockholm City Hall",
    hints: [
      "This country is the largest in Scandinavia by area.",
      "It shares the Scandinavian Peninsula with its western neighbor.",
      "ABBA, IKEA, and Spotify all originated here.",
      "It consistently ranks among the world's highest quality of life countries.",
      "The midnight sun is visible in its northern regions in summer.",
      "Its capital is Stockholm. ❄️",
    ],
  },
  {
    name: "Morocco", aliases: ["morocco", "maroc"], flag: "🇲🇦",
    landmark: "Hassan_II_Mosque", landmarkName: "Hassan II Mosque",
    hints: [
      "This country is in northwest Africa, bordering the Mediterranean Sea and Atlantic Ocean.",
      "It is separated from Europe by only 14 km (the Strait of Gibraltar).",
      "Part of its territory is covered by the Sahara Desert.",
      "The souks of Marrakech and the medina of Fes are world-famous.",
      "Couscous, tagine, and mint tea are national specialties.",
      "Its capital is Rabat. 🏜️",
    ],
  },
  {
    name: "Greece", aliases: ["greece", "grece", "hellas"], flag: "🇬🇷",
    landmark: "Parthenon", landmarkName: "Parthenon",
    hints: [
      "This country is the birthplace of democracy and Western philosophy.",
      "It has over 6,000 islands, 227 of which are inhabited.",
      "It is located in southern Europe, in the Mediterranean Sea.",
      "The Olympic Games were invented here in antiquity.",
      "The Acropolis and the Parthenon overlook its capital city.",
      "Its capital is Athens. 🏛️",
    ],
  },
  {
    name: "Turkey", aliases: ["turkey", "turkiye"], flag: "🇹🇷",
    landmark: "Hagia_Sophia", landmarkName: "Hagia Sophia",
    hints: [
      "This country straddles Europe and Asia, existing on two continents.",
      "It is bordered by the Black Sea, Aegean Sea, and Mediterranean Sea.",
      "It is the world's largest producer of hazelnuts.",
      "Cappadocia, with its unique rock formations and hot air balloons, is found here.",
      "The Blue Mosque and Hagia Sophia are in its largest city.",
      "Its capital is Ankara, but Istanbul is its most populous city. 🕌",
    ],
  },
  {
    name: "Nigeria", aliases: ["nigeria"], flag: "🇳🇬",
    landmark: "Zuma_Rock", landmarkName: "Zuma Rock",
    hints: [
      "This is the most populous country in Africa with over 220 million people.",
      "It is located in West Africa, bordering the Gulf of Guinea.",
      "It is Africa's largest oil producer.",
      "Its film industry, Nollywood, is the 3rd largest in the world.",
      "It borders Niger, Chad, Cameroon, and Benin.",
      "Its capital is Abuja. 🌍",
    ],
  },
  {
    name: "United States", aliases: ["usa", "us", "united states", "america", "united states of america", "us of america"], flag: "🇺🇸",
    landmark: "Statue_of_Liberty", landmarkName: "Statue of Liberty",
    hints: [
      "This country is the 3rd largest in the world by both area and population.",
      "It is a federation of 50 states.",
      "Hollywood, Silicon Valley, and Wall Street are all located here.",
      "It is bordered by Canada to the north and Mexico to the south.",
      "The Grand Canyon, Yellowstone, and many iconic landmarks are found here.",
      "Its capital is Washington D.C. 🗽",
    ],
  },
];

type GeoDifficulty = "easy" | "medium" | "hard";

interface GeoGame {
  country: Country;
  hintIndex: number;
  imageUrl: string | null;
}

const activeGeoGames = new Map<string, GeoGame>();

const GEO_DIFFICULTY_CONFIG: Record<GeoDifficulty, { totalHints: number; showImage: boolean; label: string }> = {
  easy: { totalHints: 6, showImage: true, label: "Easy" },
  medium: { totalHints: 4, showImage: false, label: "Medium" },
  hard: { totalHints: 2, showImage: false, label: "Hard" },
};

function parseGeoDifficulty(arg?: string): GeoDifficulty {
  const normalized = normalize(arg ?? "");
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") return normalized;
  return "easy";
}

async function fetchLandmarkImage(wikiTitle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
      { headers: { "User-Agent": "DiscordBot/1.0 (educational project)" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { thumbnail?: { source: string } };
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

export async function playGeoguessr(message: Message, difficultyArg?: string): Promise<void> {
  const channel = toSendable(message.channel);
  if (!channel) return;

  if (activeGeoGames.has(channel.id)) {
    await channel.send("🌍 A GeoGuessr game is already running here! Type `!geo stop` to end it first.");
    return;
  }

  const difficulty = parseGeoDifficulty(difficultyArg);
  const difficultyConfig = GEO_DIFFICULTY_CONFIG[difficulty];

  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const imageUrl = await fetchLandmarkImage(country.landmark);
  const game: GeoGame = { country, hintIndex: 0, imageUrl };
  activeGeoGames.set(channel.id, game);

  const TOTAL_HINTS = Math.min(country.hints.length, difficultyConfig.totalHints);
  const MAX_SCORE = TOTAL_HINTS + 1;

  const sendStartMessage = async () => {
    if (difficultyConfig.showImage && imageUrl) {
      const embed = new EmbedBuilder()
        .setTitle(`🌍 GEOGUESSR — ${difficultyConfig.label} mode`)
        .setDescription(
          `📸 *${country.landmarkName}* — Where in the world is this?\n\n` +
          `Type the **country name** to guess, or \`!geo stop\` to give up.\n` +
          `_You have ${TOTAL_HINTS} text clue${TOTAL_HINTS > 1 ? "s" : ""} available if you get stuck._`
        )
        .setImage(imageUrl)
        .setColor(0x2ecc71)
        .setFooter({ text: `Mode: ${difficultyConfig.label} | ${TOTAL_HINTS} clues available` });
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(
        `🌍 **GEOGUESSR — ${difficultyConfig.label} mode**\n\n` +
        `📌 *Hint 1/${TOTAL_HINTS}:* ${country.hints[0]}\n\n` +
        `Type the **country name** below, or \`!geo stop\` to give up.`
      );
      game.hintIndex = 1;
    }
  };

  await sendStartMessage();

  try {
    while (true) {
      const collected = await (message.channel as unknown as {
        awaitMessages: (opts: {
          filter: (m: Message) => boolean;
          max: number;
          time: number;
          errors: string[];
        }) => Promise<Map<string, Message>>;
      }).awaitMessages({
        filter: (m: Message) => !m.author.bot,
        max: 1,
        time: 60000,
        errors: ["time"],
      });

      const reply = [...collected.values()][0];
      if (!reply) break;

      const text = reply.content.trim();

      if (normalize(text) === "!geo stop" || normalize(text) === "geo stop") {
        await channel.send(`🏳️ Game over! The answer was **${country.name}** ${country.flag}`);
        break;
      }

      if (isCorrectGuess(text, country)) {
        const hintsUsed = game.hintIndex;
        const score = MAX_SCORE - hintsUsed;
        const stars = "⭐".repeat(Math.max(1, score));
        const label =
          hintsUsed === 0
            ? "from the photo alone — incredible!"
            : `after ${hintsUsed} text clue${hintsUsed > 1 ? "s" : ""}`;
        await channel.send(
          `✅ **${reply.author.displayName}** got it! It was **${country.name}** ${country.flag}\n` +
          `Found ${label} — Score: ${stars} (${score}/${MAX_SCORE})`
        );
        break;
      }

      // Wrong guess
      const nextHintIndex = game.hintIndex;
      if (nextHintIndex >= TOTAL_HINTS) {
        await channel.send(
          `❌ Wrong! No more hints available.\nThe answer was **${country.name}** ${country.flag} — Better luck next time!`
        );
        break;
      } else {
        await channel.send(
          `❌ Wrong! Here's clue **${nextHintIndex + 1}/${TOTAL_HINTS}**:\n\n` +
          `📌 *${country.hints[nextHintIndex]}*`
        );
        game.hintIndex++;
      }
    }
  } catch {
    await channel.send(`⏱️ Time's up! The answer was **${country.name}** ${country.flag}`);
  } finally {
    activeGeoGames.delete(channel.id);
  }
}

export function stopGeoguessr(channelId: string): boolean {
  return activeGeoGames.delete(channelId);
}

export function isGeoActive(channelId: string): boolean {
  return activeGeoGames.has(channelId);
}

function isCorrectGuess(guess: string, country: Country): boolean {
  const norm = normalize(guess);
  return [country.name, ...country.aliases].some((n) => normalize(n) === norm);
}

// ─────────────────────────────────────────
// TRIVIA
// ─────────────────────────────────────────

const CHOICES = ["A", "B", "C", "D"];
const activeTriviaGames = new Set<string>();

export async function playTrivia(message: Message, openai: OpenAI): Promise<void> {
  const channel = toSendable(message.channel);
  if (!channel) return;

  if (activeTriviaGames.has(channel.id)) {
    await channel.send("🧠 A trivia game is already running here!");
    return;
  }

  activeTriviaGames.add(channel.id);

  try {
    await channel.sendTyping();

    const gen = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a trivia question generator. Generate ONE interesting general knowledge question in English with 4 choices (A, B, C, D) and exactly one correct answer.
Respond ONLY with this JSON:
{
  "question": "...",
  "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "answer": "A",
  "explanation": "..."
}`,
        },
        { role: "user", content: "Generate a varied and interesting trivia question." },
      ],
    });

    const raw = gen.choices[0]?.message?.content ?? "{}";
    let data: { question: string; choices: Record<string, string>; answer: string; explanation: string };

    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      await channel.send("❌ Couldn't generate the question. Try again!");
      return;
    }

    const { question, choices, answer, explanation } = data;
    if (!question || !choices || !answer) {
      await channel.send("❌ The generated question was invalid. Try again!");
      return;
    }

    const choicesText = CHOICES.filter((c) => choices[c])
      .map((c) => `**${c}.** ${choices[c]}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🧠 TRIVIA — Be the first to answer!")
      .setDescription(`❓ **${question}**\n\n${choicesText}\n\n_Reply with **A**, **B**, **C**, or **D** — 30 seconds!_ ⏱️`)
      .setColor(0x9b59b6);

    await channel.send({ embeds: [embed] });

    const correctLetter = answer.toUpperCase();
    const respondents = new Set<string>();
    let winner: { user: string } | null = null;

    try {
      const collected = await (message.channel as unknown as {
        awaitMessages: (opts: {
          filter: (m: Message) => boolean;
          max: number;
          time: number;
          errors: string[];
        }) => Promise<Map<string, Message>>;
      }).awaitMessages({
        filter: (m: Message) => !m.author.bot && /^[abcdABCD]$/.test(m.content.trim()),
        max: 20,
        time: 30000,
        errors: ["time"],
      });

      for (const [, msg] of collected) {
        if (respondents.has(msg.author.id)) continue;
        respondents.add(msg.author.id);
        const letter = msg.content.trim().toUpperCase();
        if (letter === correctLetter && !winner) {
          winner = { user: msg.author.displayName };
          break;
        } else if (letter !== correctLetter) {
          await channel.send(`❌ **${msg.author.displayName}** — Wrong answer!`);
        }
      }
    } catch {
      // Timeout — no valid response
    }

    const correctText = choices[correctLetter] ?? "";
    if (winner) {
      await channel.send(
        `✅ **${winner.user}** got it right! The answer was **${correctLetter}. ${correctText}**\n\n💡 ${explanation}`
      );
    } else {
      await channel.send(
        `⏱️ Time's up! The answer was **${correctLetter}. ${correctText}**\n\n💡 ${explanation}`
      );
    }
  } catch (err) {
    logger.error({ err }, "Trivia error");
    await channel.send("❌ An error occurred during the trivia game!");
  } finally {
    activeTriviaGames.delete(channel.id);
  }
}

// ─────────────────────────────────────────
// GUESS NUMBER
// ─────────────────────────────────────────

const activeGuessingGames = new Set<string>();

export async function playGuessNumber(message: Message): Promise<void> {
  const channel = toSendable(message.channel);
  if (!channel) return;

  if (activeGuessingGames.has(channel.id)) {
    await channel.send("❌ A guessing game is already running in this channel!");
    return;
  }

  activeGuessingGames.add(channel.id);

  try {
    const secretNumber = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;
    const maxAttempts = 10;
    let guessed = false;

    const embed = new EmbedBuilder()
      .setTitle("🎮 GUESS THE NUMBER")
      .setDescription(
        `I've thought of a number between **1** and **100**.\n` +
        `You have **${maxAttempts} attempts** to guess it! 🎯\n\n` +
        `Reply with your guess (just the number).`
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embed] });

    try {
      while (attempts < maxAttempts && !guessed) {
        const collected = await (message.channel as unknown as {
          awaitMessages: (opts: {
            filter: (m: Message) => boolean;
            max: number;
            time: number;
            errors: string[];
          }) => Promise<Map<string, Message>>;
        }).awaitMessages({
          filter: (m: Message) => {
            if (m.author.bot) return false;
            const guess = parseInt(m.content.trim());
            return !isNaN(guess) && guess >= 1 && guess <= 100;
          },
          max: 1,
          time: 60000,
          errors: ["time"],
        });

        const msg = collected.values().next().value as Message | undefined;
        if (!msg) break;

        const guess = parseInt(msg.content.trim());
        attempts++;

        if (guess === secretNumber) {
          guessed = true;
          const resultEmbed = new EmbedBuilder()
            .setTitle("🎉 YOU WON!")
            .setDescription(
              `**${msg.author.displayName}** found the number in **${attempts}** attempt${attempts > 1 ? "s" : ""}! 🏆`
            )
            .setColor(0x2ecc71);
          await channel.send({ embeds: [resultEmbed] });
        } else {
          const hint = guess < secretNumber ? "📈 **Higher!**" : "📉 **Lower!**";
          const remaining = maxAttempts - attempts;
          await channel.send(
            `${hint} (${remaining} attempt${remaining !== 1 ? "s" : ""} left)`
          );
        }
      }

      if (!guessed) {
        const loseEmbed = new EmbedBuilder()
          .setTitle("😢 GAME OVER!")
          .setDescription(`The number was **${secretNumber}**.\n\nBetter luck next time! 🍀`)
          .setColor(0xe74c3c);
        await channel.send({ embeds: [loseEmbed] });
      }
    } catch (err) {
      if ((err as any)?.code === "INTERACTION_COLLECTOR_ERROR") {
        await channel.send("⏱️ Time's up! Game over!");
      } else {
        throw err;
      }
    }
  } catch (err) {
    logger.error({ err }, "GuessNumber error");
    await channel.send("❌ An error occurred during the guessing game!");
  } finally {
    activeGuessingGames.delete(channel.id);
  }
}

// ─────────────────────────────────────────
// CONNECT 4
// ─────────────────────────────────────────

const CONNECT4_ROWS = 6;
const CONNECT4_COLS = 7;
const CONNECT4_TOKENS = ["⚪", "🔴", "🟡"] as const;
const CONNECT4_COL_EMOJIS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣"] as const;

type C4Lang = "en" | "fr" | "es";

const C4_T = {
  en: {
    fieldName: "Board",
    soloTitle: "🔴 Connect4 — Solo Mode",
    pvpTitle: (p1: string, p2: string) => `🎮 Connect4 — ${p1} 🔴 vs 🟡 ${p2}`,
    soloDesc: "You play as 🔴 red. React with 1️⃣–7️⃣ to drop a token. The bot responds automatically.\nTip: `!connect4 stop` to end the game.",
    pvpDesc: (tt: string, tn: string) => `Let's go! ${tt} **${tn}** goes first — react with 1️⃣–7️⃣.\n\`!connect4 stop\` to quit.`,
    turnTitle: (tt: string, tn: string) => `🔁 Your turn, **${tn}**!`,
    turnDesc: (actor: string, col: number) => `${actor} played column **${col}**.\nReact with 1️⃣–7️⃣ to drop your token.`,
    win: (t: string, n: string) => `🏆 ${t} **${n} wins!** Congratulations!`,
    draw: "🤝 **It's a draw!** The board is full.",
    timeout: "⏱️ **Time's up!** Game ended due to inactivity.",
    bot: "🤖 **Bot**",
    footer: "Type !connect4 solo or !connect4 test to start a new game.",
  },
  fr: {
    fieldName: "Plateau",
    soloTitle: "🔴 Connect4 — Mode Solo",
    pvpTitle: (p1: string, p2: string) => `🎮 Connect4 — ${p1} 🔴 vs 🟡 ${p2}`,
    soloDesc: "Tu joues en rouge 🔴. Réagis avec 1️⃣–7️⃣ pour poser un jeton. Le bot répond automatiquement.\nAstuce : `!connect4 stop` pour terminer la partie.",
    pvpDesc: (tt: string, tn: string) => `C'est parti ! ${tt} **${tn}** commence — réagis avec 1️⃣–7️⃣.\n\`!connect4 stop\` pour quitter.`,
    turnTitle: (tt: string, tn: string) => `🔁 À ton tour, **${tn}** !`,
    turnDesc: (actor: string, col: number) => `${actor} a joué en colonne **${col}**.\nRéagis avec 1️⃣–7️⃣ pour poser ton jeton.`,
    win: (t: string, n: string) => `🏆 ${t} **${n} a gagné !** Félicitations !`,
    draw: "🤝 **Match nul !** Le plateau est plein.",
    timeout: "⏱️ **Temps écoulé !** La partie s'est terminée faute d'activité.",
    bot: "🤖 **Bot**",
    footer: "Type !connect4 solo or !connect4 test to start a new game.",
  },
  es: {
    fieldName: "Tablero",
    soloTitle: "🔴 Connect4 — Modo Solo",
    pvpTitle: (p1: string, p2: string) => `🎮 Connect4 — ${p1} 🔴 vs 🟡 ${p2}`,
    soloDesc: "Juegas con rojo 🔴. Reacciona con 1️⃣–7️⃣ para colocar una ficha. El bot responde automáticamente.\nConsejo: `!connect4 stop` para terminar la partida.",
    pvpDesc: (tt: string, tn: string) => `¡Vamos! ${tt} **${tn}** empieza — reacciona con 1️⃣–7️⃣.\n\`!connect4 stop\` para salir.`,
    turnTitle: (tt: string, tn: string) => `🔁 ¡Tu turno, **${tn}**!`,
    turnDesc: (actor: string, col: number) => `${actor} jugó en la columna **${col}**.\nReacciona con 1️⃣–7️⃣ para colocar tu ficha.`,
    win: (t: string, n: string) => `🏆 ${t} **¡${n} gana!** ¡Felicitaciones!`,
    draw: "🤝 **¡Empate!** El tablero está lleno.",
    timeout: "⏱️ **¡Tiempo agotado!** La partida terminó por inactividad.",
    bot: "🤖 **Bot**",
    footer: "Type !connect4 solo or !connect4 test to start a new game.",
  },
} as const;

type Connect4Game = {
  board: number[][];
  mode: "solo" | "pvp";
  player1: { id: string; name: string };
  player2: { id: string; name: string } | null;
  currentTurn: 1 | 2;
  lastMove?: { col: number; byBot: boolean };
  lang: C4Lang;
};

const activeConnect4Games = new Map<string, Connect4Game>();

function renderConnect4Board(board: number[][]): string {
  const header = CONNECT4_COL_EMOJIS.join(" ");
  const body = board.map((row) => row.map((cell) => CONNECT4_TOKENS[cell]).join(" ")).join("\n");
  return `\`\`\`\n${header}\n${body}\n\`\`\``;
}

function getDropRow(board: number[][], col: number): number {
  for (let row = CONNECT4_ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

function isBoardFull(board: number[][]): boolean {
  return board[0].every((cell) => cell !== 0);
}

function checkConnect4(board: number[][], token: number): boolean {
  for (let row = 0; row < CONNECT4_ROWS; row++) {
    for (let col = 0; col < CONNECT4_COLS; col++) {
      if (board[row][col] !== token) continue;
      const directions = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }];
      for (const { dr, dc } of directions) {
        let count = 0;
        for (let step = 0; step < 4; step++) {
          const r = row + dr * step, c = col + dc * step;
          if (r < 0 || r >= CONNECT4_ROWS || c < 0 || c >= CONNECT4_COLS) break;
          if (board[r][c] !== token) break;
          count++;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
}

function findWinningColumn(board: number[][], token: number): number | null {
  for (let col = 0; col < CONNECT4_COLS; col++) {
    const row = getDropRow(board, col);
    if (row === -1) continue;
    board[row][col] = token;
    const won = checkConnect4(board, token);
    board[row][col] = 0;
    if (won) return col;
  }
  return null;
}

function chooseBotColumn(board: number[][]): number {
  const win = findWinningColumn(board, 2);
  if (win !== null) return win;
  const block = findWinningColumn(board, 1);
  if (block !== null) return block;
  for (const col of [3, 2, 4, 1, 5, 0, 6]) {
    if (getDropRow(board, col) !== -1) return col;
  }
  return -1;
}

function buildConnect4Embed(game: Connect4Game, status?: string): EmbedBuilder {
  const t = C4_T[game.lang];
  const p1 = game.player1.name;
  const p2name = game.player2?.name ?? "Bot";
  const isSolo = game.mode === "solo";
  const turnToken = game.currentTurn === 1 ? "🔴" : "🟡";
  const turnName = game.currentTurn === 1 ? p1 : p2name;

  let title: string;
  let description: string;
  let color: number;

  if (status) {
    title = status.trim();
    description = isSolo
      ? `🔴 **${p1}** vs 🤖 **Bot**`
      : `🔴 **${p1}** vs 🟡 **${p2name}**`;
    color = 0x95a5a6;
  } else if (game.lastMove) {
    const { col, byBot } = game.lastMove;
    const prevToken = game.currentTurn === 2 ? "🔴" : "🟡";
    const prevName = game.currentTurn === 2 ? p1 : p2name;
    const actor = byBot ? t.bot : `${prevToken} **${prevName}**`;
    title = t.turnTitle(turnToken, turnName);
    description = t.turnDesc(actor, col + 1);
    color = game.currentTurn === 1 ? 0xe74c3c : 0xf1c40f;
  } else {
    title = isSolo ? t.soloTitle : t.pvpTitle(p1, p2name);
    description = isSolo ? t.soloDesc : t.pvpDesc(turnToken, turnName);
    color = 0xf39c12;
  }

  const footerText = isSolo ? t.footer : `🔴 ${p1} vs 🟡 ${p2name}`;

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .addFields({ name: t.fieldName, value: renderConnect4Board(game.board), inline: false })
    .setColor(color)
    .setFooter({ text: footerText });
}

export async function playConnect4(message: Message, args: string[]): Promise<void> {
  const channel = toSendable(message.channel);
  if (!channel) return;

  const tokens = args.map((a) => a.toLowerCase().trim()).filter(Boolean);

  // ── Language detection (fr / es / en default) ─────────────────────────────
  const lang: C4Lang = tokens.includes("fr") ? "fr" : tokens.includes("es") ? "es" : "en";
  const keywords = tokens.filter((t) => t !== "fr" && t !== "es" && t !== "en");

  const active = activeConnect4Games.get(channel.id);

  // ── Stop ──────────────────────────────────────────────────────────────────
  if (keywords.includes("stop")) {
    if (!active) {
      await channel.send("🤷 No Connect4 game in progress here. Start one with `!connect4 solo` or `!connect4 test`.");
      return;
    }
    activeConnect4Games.delete(channel.id);
    await channel.send("⛔ Connect4 game stopped. Start again anytime with `!connect4 test`!");
    return;
  }

  if (active) {
    await channel.send("⚠️ A Connect4 game is already running here! Use `!connect4 stop` to end it.");
    return;
  }

  // ── Determine mode & players ──────────────────────────────────────────────
  const mention = message.mentions.users.first();
  let player2: { id: string; name: string } | null = null;
  let mode: "solo" | "pvp" = "solo";

  if (mention) {
    if (mention.bot) {
      await channel.send("❌ You can't challenge a bot! Use `!connect4 solo` or `!connect4 test` to play against me.");
      return;
    }
    if (mention.id === message.author.id) {
      await channel.send("❌ You can't challenge yourself!");
      return;
    }
    mode = "pvp";
    const member = (message as Message).guild?.members.cache.get(mention.id);
    player2 = { id: mention.id, name: member?.displayName ?? mention.username };
  }

  const authorMember = (message as Message).guild?.members.cache.get(message.author.id);
  const player1 = { id: message.author.id, name: authorMember?.displayName ?? message.author.username };

  const board: number[][] = Array.from({ length: CONNECT4_ROWS }, () => Array(CONNECT4_COLS).fill(0));
  const game: Connect4Game = { board, mode, player1, player2, currentTurn: 1, lang };
  activeConnect4Games.set(channel.id, game);

  // ── Send initial game message ──────────────────────────────────────────────
  const gameMsg = await (channel as { send: (opts: unknown) => Promise<Message> }).send({
    embeds: [buildConnect4Embed(game)],
  });

  // Add number reactions (small delay to avoid rate limit)
  for (const emoji of CONNECT4_COL_EMOJIS) {
    await gameMsg.react(emoji).catch(() => null);
    await new Promise((r) => setTimeout(r, 250));
  }

  // ── Reaction collector ─────────────────────────────────────────────────────
  const collector = (gameMsg as unknown as {
    createReactionCollector: (opts: {
      filter: (r: MessageReaction, u: User) => boolean;
      time: number;
    }) => {
      on: (event: string, cb: (r: MessageReaction, u: User) => void) => void;
      stop: (reason?: string) => void;
    };
  }).createReactionCollector({
    filter: (reaction: MessageReaction, user: User) => {
      if (user.bot) return false;
      return (CONNECT4_COL_EMOJIS as readonly string[]).includes(reaction.emoji.name ?? "");
    },
    time: 10 * 60 * 1000,
  });

  const doMove = async (colIndex: number, userId: string): Promise<"continue" | "end"> => {
    const g = activeConnect4Games.get(channel.id);
    if (!g) return "end";

    const expectedId = g.currentTurn === 1 ? g.player1.id : g.player2?.id ?? null;
    if (expectedId !== null && userId !== expectedId) return "continue";

    const row = getDropRow(g.board, colIndex);
    if (row === -1) return "continue";

    const token = g.currentTurn;
    g.board[row][colIndex] = token;
    g.lastMove = { col: colIndex, byBot: userId === "bot" };

    if (checkConnect4(g.board, token)) {
      const winnerName = token === 1 ? g.player1.name : (g.player2?.name ?? "Bot");
      const winnerToken = token === 1 ? "🔴" : "🟡";
      await gameMsg
        .edit({ embeds: [buildConnect4Embed(g, C4_T[g.lang].win(winnerToken, winnerName))] })
        .catch(() => null);
      activeConnect4Games.delete(channel.id);
      collector.stop("win");
      return "end";
    }

    if (isBoardFull(g.board)) {
      await gameMsg
        .edit({ embeds: [buildConnect4Embed(g, C4_T[g.lang].draw)] })
        .catch(() => null);
      activeConnect4Games.delete(channel.id);
      collector.stop("draw");
      return "end";
    }

    g.currentTurn = g.currentTurn === 1 ? 2 : 1;
    return "continue";
  };

  collector.on("collect", async (reaction: MessageReaction, user: User) => {
    const g = activeConnect4Games.get(channel.id);
    if (!g) { collector.stop(); return; }

    const emojiName = reaction.emoji.name ?? "";
    const colIndex = (CONNECT4_COL_EMOJIS as readonly string[]).indexOf(emojiName);
    if (colIndex === -1) return;

    await (reaction.users as unknown as { remove: (id: string) => Promise<void> })
      .remove(user.id)
      .catch(() => null);

    const expectedId = g.currentTurn === 1 ? g.player1.id : g.player2?.id ?? null;
    if (expectedId !== null && user.id !== expectedId) return;

    const result = await doMove(colIndex, user.id);
    if (result === "end") return;

    const g2 = activeConnect4Games.get(channel.id);
    if (!g2) return;

    await gameMsg.edit({ embeds: [buildConnect4Embed(g2)] }).catch(() => null);

    // Bot turn in solo mode
    if (g2.mode === "solo" && g2.currentTurn === 2) {
      await new Promise((r) => setTimeout(r, 800));
      const botCol = chooseBotColumn(g2.board);
      if (botCol === -1) return;
      const botResult = await doMove(botCol, "bot");
      if (botResult === "end") return;
      const g3 = activeConnect4Games.get(channel.id);
      if (g3) await gameMsg.edit({ embeds: [buildConnect4Embed(g3)] }).catch(() => null);
    }
  });

  collector.on("end", async (_: unknown, reason: string) => {
    if (reason === "time") {
      const g = activeConnect4Games.get(channel.id);
      if (g) {
        activeConnect4Games.delete(channel.id);
        await gameMsg
          .edit({ embeds: [buildConnect4Embed(g, C4_T[g.lang].timeout)] })
          .catch(() => null);
      }
    }
  });
}
