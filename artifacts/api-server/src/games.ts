import { Message } from "discord.js";
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

type SendableChannel = {
  id: string;
  send: (content: unknown) => Promise<Message>;
  sendTyping: () => Promise<void>;
  awaitMessages: (opts: unknown) => Promise<Map<string, Message>>;
};

function toSendable(ch: Message["channel"]): SendableChannel | null {
  if ("send" in ch && "awaitMessages" in ch) return ch as unknown as SendableChannel;
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

  const diffLabel: Record<MineDiff, string> = { easy: "🟢 Facile", medium: "🟡 Moyen", hard: "🔴 Difficile" };
  const lines: string[] = [
    `💣 **Minesweeper** — ${diffLabel[diff]} | ${rows}×${cols} — ${mines} mines`,
    `Clique sur les spoilers pour révéler les cases !\n`,
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
  hints: string[];
}

const COUNTRIES: Country[] = [
  {
    name: "France", aliases: ["france"], flag: "🇫🇷",
    hints: [
      "Ce pays est en Europe occidentale et a une superficie d'environ 551 000 km².",
      "Sa langue officielle est utilisée par plus de 300 millions de personnes dans le monde.",
      "Il borde l'Espagne, l'Italie, la Suisse, l'Allemagne, la Belgique et le Luxembourg.",
      "Il est connu pour sa gastronomie, ses vins et son art de vivre.",
      "Sa capitale est l'une des villes les plus visitées au monde.",
      "Sa capitale est Paris. 🗼",
    ],
  },
  {
    name: "Japon", aliases: ["japan", "japon"], flag: "🇯🇵",
    hints: [
      "C'est un archipel de plus de 6 800 îles en Asie du Pacifique.",
      "Ce pays est l'une des plus grandes économies mondiales avec une forte industrie automobile.",
      "Sa cuisine comprend les sushis, les ramen et les tempuras.",
      "Les samouraïs et les ninjas font partie de son histoire légendaire.",
      "Le mont Fuji est son point culminant et un symbole national.",
      "Sa capitale est Tokyo. 🗾",
    ],
  },
  {
    name: "Brésil", aliases: ["brazil", "bresil", "brasil", "brésil"], flag: "🇧🇷",
    hints: [
      "C'est le plus grand pays d'Amérique du Sud, avec une superficie de 8,5 millions de km².",
      "Il abrite la plus grande forêt tropicale du monde.",
      "Sa langue officielle est le portugais.",
      "Le carnaval de sa ville la plus célèbre est mondialement connu.",
      "Il a remporté la Coupe du Monde de football 5 fois.",
      "Sa capitale est Brasília. Le Christ Rédempteur domine Rio de Janeiro. 🗿",
    ],
  },
  {
    name: "Australie", aliases: ["australia", "australie"], flag: "🇦🇺",
    hints: [
      "C'est à la fois un pays et un continent entier dans l'hémisphère sud.",
      "Il est entouré par l'océan Indien et l'océan Pacifique.",
      "On y trouve des kangourous, des koalas et des wombats.",
      "La Grande Barrière de Corail se trouve au large de ses côtes.",
      "Sa ville la plus peuplée est Sydney, non sa capitale.",
      "Sa capitale est Canberra. 🦘",
    ],
  },
  {
    name: "Allemagne", aliases: ["germany", "deutschland", "allemagne"], flag: "🇩🇪",
    hints: [
      "Ce pays est la plus grande économie d'Europe.",
      "Il est célèbre pour sa bière, sa choucroute et l'Oktoberfest.",
      "Il borde 9 pays : France, Autriche, Suisse, Pologne, etc.",
      "La chute du Mur en 1989 a marqué sa réunification.",
      "Il a remporté la Coupe du Monde de football 4 fois.",
      "Sa capitale est Berlin. 🏰",
    ],
  },
  {
    name: "Argentine", aliases: ["argentina", "argentine"], flag: "🇦🇷",
    hints: [
      "C'est le 8e plus grand pays du monde par superficie.",
      "Sa langue officielle est l'espagnol.",
      "Il est réputé pour ses pampas, son bœuf et son vin Malbec.",
      "Le tango est né dans ses rues.",
      "C'est le pays natal de Lionel Messi et Diego Maradona.",
      "Sa capitale est Buenos Aires. 💃",
    ],
  },
  {
    name: "Égypte", aliases: ["egypt", "egypte", "égypte"], flag: "🇪🇬",
    hints: [
      "Ce pays se trouve au nord-est de l'Afrique, sur la mer Méditerranée et la mer Rouge.",
      "Il est traversé par le plus long fleuve du monde.",
      "C'est l'une des plus anciennes civilisations de l'humanité.",
      "Il compte l'une des sept merveilles du monde antique encore debout.",
      "Le Sphinx et les pyramides de Gizeh y sont situés.",
      "Sa capitale est Le Caire. 🏺",
    ],
  },
  {
    name: "Mexique", aliases: ["mexico", "mexique"], flag: "🇲🇽",
    hints: [
      "Ce pays est en Amérique du Nord, au sud des États-Unis.",
      "C'est le pays hispanophone le plus peuplé du monde.",
      "Les tacos, les guacamoles et les enchiladas y sont nés.",
      "Les civilisations aztèques et mayas y ont prospéré.",
      "Sa capitale est l'une des plus grandes mégalopoles du monde.",
      "Sa capitale est Mexico. 🌮",
    ],
  },
  {
    name: "Inde", aliases: ["india", "inde"], flag: "🇮🇳",
    hints: [
      "C'est le pays le plus peuplé du monde depuis 2023.",
      "Il compte plus de 20 langues officielles reconnues.",
      "Il est connu pour le curry, le yoga et Bollywood.",
      "Il borde la Chine, le Pakistan, le Bangladesh, le Népal et le Bhoutan.",
      "Le Taj Mahal, l'une des merveilles du monde, s'y trouve.",
      "Sa capitale est New Delhi. 🐘",
    ],
  },
  {
    name: "Canada", aliases: ["canada"], flag: "🇨🇦",
    hints: [
      "C'est le 2e plus grand pays du monde par superficie.",
      "Il a deux langues officielles : l'anglais et le français.",
      "Il partage la plus longue frontière internationale du monde avec son voisin du sud.",
      "Il est réputé pour ses érables, son sirop d'érable et ses grandes forêts.",
      "Ses villes majeures incluent Toronto, Montréal et Vancouver.",
      "Sa capitale est Ottawa. 🍁",
    ],
  },
  {
    name: "Corée du Sud", aliases: ["south korea", "coree du sud", "corée du sud", "korea", "south-korea"], flag: "🇰🇷",
    hints: [
      "Ce pays est une péninsule en Asie de l'Est, entouré de mer sur trois côtés.",
      "Il est séparé de son voisin du nord par la DMZ depuis 1953.",
      "C'est le pays d'origine du K-Pop, du K-Drama et du Kimchi.",
      "C'est l'une des économies les plus développées d'Asie (Samsung, LG, Hyundai).",
      "La Corée du Nord est juste au-dessus de lui.",
      "Sa capitale est Séoul. 🎵",
    ],
  },
  {
    name: "Italie", aliases: ["italy", "italie"], flag: "🇮🇹",
    hints: [
      "Ce pays a une forme de botte dans la mer Méditerranée.",
      "Il abrite la plus petite nation du monde (Vatican).",
      "Pizza, pâtes, risotto et tiramisu y sont nés.",
      "L'Empire romain y a pris naissance.",
      "Le Colisée, Venise et la Tour de Pise s'y trouvent.",
      "Sa capitale est Rome. 🍕",
    ],
  },
  {
    name: "Espagne", aliases: ["spain", "espagne"], flag: "🇪🇸",
    hints: [
      "Ce pays est dans le sud-ouest de l'Europe, sur la péninsule ibérique.",
      "C'est la 4e plus grande économie de la zone euro.",
      "La paella, les tapas et la sangria y sont nés.",
      "La corrida et le flamenco font partie de sa culture.",
      "Il borde la France, le Portugal, Andorre et le Maroc (via Ceuta et Melilla).",
      "Sa capitale est Madrid. 🐂",
    ],
  },
  {
    name: "Russie", aliases: ["russia", "russie"], flag: "🇷🇺",
    hints: [
      "C'est le plus grand pays du monde, couvrant 11 fuseaux horaires.",
      "Il s'étend de l'Europe jusqu'au Pacifique.",
      "Le lac Baïkal, le plus profond du monde, s'y trouve.",
      "Sa littérature inclut Tolstoï, Dostoïevski et Tchekhov.",
      "Il est le plus grand producteur mondial de gaz naturel.",
      "Sa capitale est Moscou. Le Kremlin est son symbole. 🏔️",
    ],
  },
  {
    name: "Chine", aliases: ["china", "chine"], flag: "🇨🇳",
    hints: [
      "C'est le pays le plus peuplé de la planète (jusqu'en 2023) avec 1,4 milliard d'habitants.",
      "C'est la 2e économie mondiale et le plus grand exportateur.",
      "La Grande Muraille, la plus longue structure du monde, s'y trouve.",
      "Il borde 14 pays, record mondial.",
      "Le panda géant, symbole national, ne vit qu'ici à l'état sauvage.",
      "Sa capitale est Pékin (Beijing). 🐉",
    ],
  },
  {
    name: "Portugal", aliases: ["portugal"], flag: "🇵🇹",
    hints: [
      "Ce pays est à l'extrême ouest de l'Europe continentale.",
      "Il borde uniquement l'Espagne à l'est et au nord.",
      "C'est le fondateur du plus grand empire maritime de l'histoire au XVe siècle.",
      "Le fado est son genre musical emblématique, reconnu par l'UNESCO.",
      "Le Brésil, l'Angola et le Mozambique parlent sa langue.",
      "Sa capitale est Lisbonne. 🎸",
    ],
  },
  {
    name: "Suède", aliases: ["sweden", "suede", "suède"], flag: "🇸🇪",
    hints: [
      "Ce pays est le plus grand de Scandinavie par superficie.",
      "Il partage la péninsule scandinave avec la Norvège.",
      "ABBA, IKEA et Spotify y ont vu le jour.",
      "C'est l'un des pays avec le plus haut niveau de vie au monde.",
      "Le soleil de minuit y est visible en été dans le nord.",
      "Sa capitale est Stockholm. ❄️",
    ],
  },
  {
    name: "Maroc", aliases: ["morocco", "maroc"], flag: "🇲🇦",
    hints: [
      "Ce pays est au nord-ouest de l'Afrique, bordant la mer Méditerranée et l'Atlantique.",
      "Il est séparé de l'Europe par seulement 14 km (détroit de Gibraltar).",
      "Le désert du Sahara occupe une partie de son territoire.",
      "Le souk de Marrakech et la médina de Fès sont mondialement connus.",
      "Le couscous, le tajine et le thé à la menthe y sont des spécialités.",
      "Sa capitale est Rabat. 🏜️",
    ],
  },
  {
    name: "Grèce", aliases: ["greece", "grece", "grèce"], flag: "🇬🇷",
    hints: [
      "Ce pays est le berceau de la démocratie et de la philosophie occidentale.",
      "Il compte plus de 6 000 îles, dont 227 habitées.",
      "Il est en Europe du Sud, dans la mer Méditerranée.",
      "Les Jeux Olympiques y ont été inventés dans l'Antiquité.",
      "L'Acropole et le Parthénon dominent sa capitale.",
      "Sa capitale est Athènes. 🏛️",
    ],
  },
  {
    name: "Turquie", aliases: ["turkey", "turquie"], flag: "🇹🇷",
    hints: [
      "Ce pays est à la croisée de l'Europe et de l'Asie, sur deux continents.",
      "Il borde la mer Noire, la mer Égée et la mer Méditerranée.",
      "C'est le premier producteur mondial de noisettes.",
      "La cappadoce, avec ses formations rocheuses uniques, s'y trouve.",
      "La Grande Mosquée bleue et Sainte-Sophie sont dans sa plus grande ville.",
      "Sa capitale est Ankara, mais Istanbul est sa ville la plus peuplée. 🕌",
    ],
  },
  {
    name: "Nigeria", aliases: ["nigeria"], flag: "🇳🇬",
    hints: [
      "C'est le pays le plus peuplé d'Afrique avec plus de 220 millions d'habitants.",
      "Il est en Afrique de l'Ouest, bordant le golfe de Guinée.",
      "C'est le plus grand producteur de pétrole d'Afrique.",
      "Nollywood, son industrie cinématographique, est la 3e mondiale.",
      "Il borde le Niger, le Tchad, le Cameroun et le Bénin.",
      "Sa capitale est Abuja. 🌍",
    ],
  },
  {
    name: "États-Unis", aliases: ["usa", "united states", "us", "america", "etats-unis", "etats unis", "états-unis", "états unis", "amerique"], flag: "🇺🇸",
    hints: [
      "C'est le 3e plus grand pays du monde par superficie et population.",
      "Il compte 50 états et est une fédération.",
      "Hollywood, la Silicon Valley et Wall Street s'y trouvent.",
      "Il est bordé au nord par le Canada et au sud par le Mexique.",
      "La Statue de la Liberté, le Grand Canyon et Yellowstone sont dans ce pays.",
      "Sa capitale est Washington D.C. 🗽",
    ],
  },
];

interface GeoGame {
  country: Country;
  hintIndex: number;
  attempts: number;
}

const activeGeoGames = new Map<string, GeoGame>();

export async function playGeoguessr(message: Message): Promise<void> {
  const channel = toSendable(message.channel);
  if (!channel) return;

  if (activeGeoGames.has(channel.id)) {
    await channel.send("🌍 Une partie de GeoGuessr est déjà en cours ici ! Tape `!geo stop` pour l'abandonner.");
    return;
  }

  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const game: GeoGame = { country, hintIndex: 0, attempts: 0 };
  activeGeoGames.set(channel.id, game);

  const sendHint = async (hint: string, hintNum: number) => {
    await channel.send(
      `🌍 **GEOGUESSR** — Indice ${hintNum}/${country.hints.length}\n\n` +
      `📌 *${hint}*\n\n` +
      `Quel est ce pays ? _(Tape ton pays ou \`!geo stop\` pour abandonner)_`
    );
  };

  await sendHint(country.hints[0], 1);
  game.hintIndex = 1;

  try {
    while (game.hintIndex <= country.hints.length) {
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
        await channel.send(`🏳️ Partie abandonnée ! C'était **${country.name}** ${country.flag}`);
        break;
      }

      if (isCorrectGuess(text, country)) {
        const hintsUsed = game.hintIndex;
        const stars = "⭐".repeat(Math.max(1, country.hints.length + 1 - hintsUsed));
        await channel.send(
          `✅ **Bravo ${reply.author.displayName} !** C'était bien **${country.name}** ${country.flag}\n` +
          `Tu as trouvé en **${hintsUsed} indice${hintsUsed > 1 ? "s" : ""}** — Score : ${stars}`
        );
        break;
      }

      // Wrong guess
      game.attempts++;
      if (game.hintIndex >= country.hints.length) {
        // No more hints
        await channel.send(
          `❌ Raté ! Plus d'indices disponibles.\nC'était **${country.name}** ${country.flag} — Dommage !`
        );
        break;
      } else {
        await channel.send(`❌ Pas tout à fait... Voici un nouvel indice !`);
        await sendHint(country.hints[game.hintIndex], game.hintIndex + 1);
        game.hintIndex++;
      }
    }
  } catch {
    // Timeout
    await channel.send(
      `⏱️ Temps écoulé ! C'était **${country.name}** ${country.flag}`
    );
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

const LETTER_EMOJIS: Record<string, string> = { a: "🅰️", b: "🅱️", c: "🌊", d: "🅳" };
const CHOICES = ["A", "B", "C", "D"];

const activeTriviaGames = new Set<string>();

export async function playTrivia(message: Message, openai: OpenAI): Promise<void> {
  const channel = toSendable(message.channel);
  if (!channel) return;

  if (activeTriviaGames.has(channel.id)) {
    await channel.send("🧠 Une partie de trivia est déjà en cours ici !");
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
          content: `Tu es un générateur de questions de quiz. Génère UNE question de culture générale en français avec 4 choix (A, B, C, D) et une seule bonne réponse.
Réponds uniquement avec ce JSON :
{
  "question": "...",
  "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "answer": "A",
  "explanation": "..."
}`,
        },
        { role: "user", content: "Génère une question de trivia variée et intéressante." },
      ],
    });

    const raw = gen.choices[0]?.message?.content ?? "{}";
    let data: { question: string; choices: Record<string, string>; answer: string; explanation: string };

    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      await channel.send("❌ Impossible de générer la question. Réessaie !");
      return;
    }

    const { question, choices, answer, explanation } = data;
    if (!question || !choices || !answer) {
      await channel.send("❌ La question générée est invalide. Réessaie !");
      return;
    }

    const choicesText = CHOICES.filter((c) => choices[c])
      .map((c) => `**${c}.** ${choices[c]}`)
      .join("\n");

    await channel.send(
      `🧠 **TRIVIA** — Sois le premier à répondre !\n\n` +
      `❓ ${question}\n\n${choicesText}\n\n` +
      `_Réponds avec **A**, **B**, **C** ou **D** — 30 secondes !_ ⏱️`
    );

    const correctLetter = answer.toUpperCase();
    const respondents = new Set<string>();
    let winner: { user: string; letter: string } | null = null;

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
          winner = { user: msg.author.displayName, letter };
        } else if (letter !== correctLetter) {
          await channel.send(`❌ **${msg.author.displayName}** — Mauvaise réponse !`);
        }
        if (winner) break;
      }
    } catch {
      // Timeout — no valid response
    }

    const correctText = choices[correctLetter] ?? "";
    if (winner) {
      await channel.send(
        `✅ **${winner.user}** a trouvé ! La bonne réponse était **${correctLetter}. ${correctText}**\n\n` +
        `💡 ${explanation}`
      );
    } else {
      await channel.send(
        `⏱️ Temps écoulé ! La bonne réponse était **${correctLetter}. ${correctText}**\n\n` +
        `💡 ${explanation}`
      );
    }
  } catch (err) {
    logger.error({ err }, "Trivia error");
    await channel.send("❌ Une erreur est survenue pendant le trivia !");
  } finally {
    activeTriviaGames.delete(channel.id);
  }
}
