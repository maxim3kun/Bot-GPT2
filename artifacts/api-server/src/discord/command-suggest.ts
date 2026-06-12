import {
  type Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";

// ── Command registry ──────────────────────────────────────────────────────────

export interface CommandEntry {
  cmd: string;
  aliases?: string[];
  emoji: string;
  desc: string;
}

export const COMMANDS: CommandEntry[] = [
  { cmd: "hello",         aliases: ["bonjour", "salut", "hi"],          emoji: "👋",  desc: "Salutation" },
  { cmd: "say",                                                          emoji: "💬",  desc: "Répète un message" },
  { cmd: "compliment",                                                   emoji: "✨",  desc: "Compliment aléatoire" },
  { cmd: "joke",                                                         emoji: "😂",  desc: "Blague aléatoire" },
  { cmd: "encouragement", aliases: ["cheer"],                            emoji: "💪",  desc: "Mot d'encouragement" },
  { cmd: "hug",                                                          emoji: "🤗",  desc: "Câlin virtuel" },
  { cmd: "8ball",                                                        emoji: "🎱",  desc: "Boule magique" },
  { cmd: "dice",          aliases: ["roll"],                             emoji: "🎲",  desc: "Lance un dé" },
  { cmd: "conspiracy",                                                   emoji: "🕵️", desc: "Théorie du complot (IA)" },
  { cmd: "minesweeper",   aliases: ["mine"],                             emoji: "💣",  desc: "Démineur" },
  { cmd: "geo",                                                          emoji: "🌍",  desc: "GeoGuessr" },
  { cmd: "trivia",                                                       emoji: "🧠",  desc: "Quiz culture générale" },
  { cmd: "guessnumber",   aliases: ["guess"],                            emoji: "🔢",  desc: "Devine un nombre" },
  { cmd: "connect4",                                                     emoji: "🔴",  desc: "Puissance 4" },
  { cmd: "music",                                                        emoji: "🎵",  desc: "Génère une chanson (Suno)" },
  { cmd: "credits",                                                      emoji: "💰",  desc: "Crédits Suno restants" },
  { cmd: "radio",         aliases: ["r"],                                emoji: "📻",  desc: "Lance une radio en direct" },
  { cmd: "youtube",       aliases: ["yt", "y", "yb"],                   emoji: "▶️",  desc: "Joue une vidéo YouTube" },
  { cmd: "skip",                                                         emoji: "⏭️",  desc: "Passe à la piste suivante" },
  { cmd: "voteskip",      aliases: ["vs"],                               emoji: "🗳️",  desc: "Vote pour passer la piste" },
  { cmd: "queue",         aliases: ["q"],                                emoji: "📋",  desc: "Voir la file d'attente" },
  { cmd: "np",                                                           emoji: "🎶",  desc: "Piste en cours de lecture" },
  { cmd: "join",                                                         emoji: "🎤",  desc: "Rejoindre le salon vocal" },
  { cmd: "leave",                                                        emoji: "🚪",  desc: "Quitter le salon vocal" },
  { cmd: "voice",                                                        emoji: "🔊",  desc: "Commandes vocales (stop/resume)" },
  { cmd: "subtitles",                                                    emoji: "📝",  desc: "Activer/désactiver sous-titres" },
  { cmd: "karaoke",       aliases: ["k"],                                emoji: "🎤",  desc: "Mode karaoké" },
  { cmd: "shazam",                                                       emoji: "🎵",  desc: "Identifier la chanson en cours" },
  { cmd: "playlist",                                                     emoji: "📁",  desc: "Gérer les playlists" },
  { cmd: "ai",                                                           emoji: "🤖",  desc: "Battle IA entre deux bots" },
  { cmd: "image",                                                        emoji: "🖼️",  desc: "Générer une image IA" },
  { cmd: "help",          aliases: ["aide"],                             emoji: "❓",  desc: "Aide et liste des commandes" },
  { cmd: "guide",         aliases: ["instruction", "guia"],              emoji: "📖",  desc: "Guide de configuration modérateur" },
  { cmd: "birthday",      aliases: ["anniversaire"],                     emoji: "🎂",  desc: "Gérer les anniversaires" },
  { cmd: "poll",          aliases: ["sondage"],                          emoji: "📊",  desc: "Créer un sondage" },
  { cmd: "quest",                                                        emoji: "⚔️",  desc: "Système de quêtes" },
  { cmd: "prefix",                                                       emoji: "⚙️",  desc: "Changer le préfixe du bot" },
  { cmd: "balance",                                                      emoji: "🏦",  desc: "Voir le solde de crédits" },
];

// ── Fuzzy matching ────────────────────────────────────────────────────────────

function normalizeCmd(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

export function findClosestCommand(input: string): CommandEntry | null {
  const n = normalizeCmd(input);
  if (!n || n.length < 2) return null;

  let best: { entry: CommandEntry; score: number } | null = null;

  for (const entry of COMMANDS) {
    const names = [entry.cmd, ...(entry.aliases ?? [])].map(normalizeCmd);

    if (names.some(nm => nm === n)) return entry;

    if (names.some(nm => nm.includes(n) || n.includes(nm))) {
      if (!best || 0.9 > best.score) best = { entry, score: 0.9 };
      continue;
    }

    const minDist = Math.min(...names.map(nm => levenshtein(n, nm)));
    const shortest = Math.min(...names.map(nm => nm.length));
    const maxLen = Math.max(n.length, shortest);
    const similarity = 1 - minDist / maxLen;

    if ((similarity >= 0.55 || minDist <= 2) && (!best || similarity > best.score)) {
      best = { entry, score: similarity };
    }
  }

  return best?.entry ?? null;
}

// ── Button suggestion UI ──────────────────────────────────────────────────────

/**
 * Shows a fuzzy-match suggestion with a green "Oui" button.
 * Pass the pre-resolved `match` from findClosestCommand().
 * onConfirm() is called when the user clicks "Oui".
 */
export async function suggestCommand(
  message: Message,
  wrongCmd: string,
  prefix: string,
  match: CommandEntry,
  onConfirm: () => Promise<void>,
): Promise<void> {
  const correctedCmd = `${prefix}${match.cmd}`;
  const yesId = `cmdsuggest_yes_${message.id}`;
  const noId  = `cmdsuggest_no_${message.id}`;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(yesId)
      .setLabel(`✅  Yes, run ${correctedCmd}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(noId)
      .setLabel("No")
      .setStyle(ButtonStyle.Secondary),
  );

  const reply = await message.reply({
    content:
      `❓ Unknown command \`${prefix}${wrongCmd}\`.\n` +
      `Did you mean ${match.emoji} **\`${correctedCmd}\`** — *${match.desc}*?`,
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === message.author.id,
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    await interaction.deferUpdate();
    if (interaction.customId === yesId) {
      await reply.edit({
        content: `▶️ Lancement de \`${correctedCmd}\`…`,
        components: [],
      });
      try {
        await onConfirm();
      } catch {
        await reply.edit({
          content: `❌ Une erreur s'est produite pour \`${correctedCmd}\`.`,
          components: [],
        }).catch(() => null);
      }
    } else {
      await reply.edit({ content: "❌ Annulé.", components: [] });
    }
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await reply.edit({ components: [] }).catch(() => null);
    }
  });

  return true;
}
