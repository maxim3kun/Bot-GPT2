import { EmbedBuilder, Message, ChatInputCommandInteraction } from "discord.js";
import { logger } from "../lib/logger.js";

const LOCALE_STRINGS: Record<string, {
  notFound: string;
  errorTitle: string;
  errorDesc: string;
  noWord: string;
  meanings: string;
  examples: string;
  synonyms: string;
  phonetic: string;
}> = {
  fr: {
    notFound: "❌ Mot introuvable. Vérifie l'orthographe ou essaie en anglais.",
    errorTitle: "❌ Erreur",
    errorDesc: "Impossible de contacter le dictionnaire. Réessaie plus tard.",
    noWord: "📖 Donne-moi un mot ! Ex: `/define ephemeral`",
    meanings: "Définitions",
    examples: "Exemples",
    synonyms: "Synonymes",
    phonetic: "Phonétique",
  },
  es: {
    notFound: "❌ Palabra no encontrada. Comprueba la ortografía o inténtalo en inglés.",
    errorTitle: "❌ Error",
    errorDesc: "No se pudo contactar el diccionario. Inténtalo más tarde.",
    noWord: "📖 ¡Dame una palabra! Ej: `/define ephemeral`",
    meanings: "Definiciones",
    examples: "Ejemplos",
    synonyms: "Sinónimos",
    phonetic: "Fonética",
  },
  en: {
    notFound: "❌ Word not found. Check the spelling or try a different word.",
    errorTitle: "❌ Error",
    errorDesc: "Could not reach the dictionary API. Try again later.",
    noWord: "📖 Give me a word! e.g. `/define ephemeral`",
    meanings: "Meanings",
    examples: "Examples",
    synonyms: "Synonyms",
    phonetic: "Phonetic",
  },
};

function getLang(locale: string): keyof typeof LOCALE_STRINGS {
  if (locale.startsWith("fr")) return "fr";
  if (locale.startsWith("es")) return "es";
  return "en";
}

function getStrings(locale: string) {
  return LOCALE_STRINGS[getLang(locale)] ?? LOCALE_STRINGS["en"]!;
}

interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string; synonyms?: string[] }>;
    synonyms?: string[];
  }>;
}

export async function handleDefine(
  word: string,
  locale: string,
  reply: (opts: unknown) => Promise<unknown>,
): Promise<void> {
  const s = getStrings(locale);

  if (!word.trim()) {
    await reply(s.noWord);
    return;
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`,
    );

    if (res.status === 404) {
      await reply(s.notFound);
      return;
    }

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = (await res.json()) as DictEntry[];
    const entry = data[0];
    if (!entry) { await reply(s.notFound); return; }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📖 ${entry.word}`)
      .setURL(`https://www.merriam-webster.com/dictionary/${encodeURIComponent(entry.word)}`);

    if (entry.phonetic) {
      embed.addFields({ name: s.phonetic, value: entry.phonetic, inline: true });
    }

    for (const meaning of entry.meanings.slice(0, 3)) {
      const defs = meaning.definitions.slice(0, 2);
      const defText = defs
        .map((d, i) => {
          let text = `**${i + 1}.** ${d.definition}`;
          if (d.example) text += `\n> *"${d.example}"*`;
          return text;
        })
        .join("\n\n");

      embed.addFields({
        name: `_${meaning.partOfSpeech}_`,
        value: defText.slice(0, 1024),
        inline: false,
      });

      const allSynonyms = [
        ...(meaning.synonyms ?? []),
        ...defs.flatMap((d) => d.synonyms ?? []),
      ].slice(0, 5);
      if (allSynonyms.length) {
        embed.addFields({
          name: s.synonyms,
          value: allSynonyms.join(", "),
          inline: false,
        });
      }
    }

    embed.setFooter({ text: "Free Dictionary API • dictionaryapi.dev" });

    await reply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "Dictionary API error");
    await reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(s.errorTitle)
          .setDescription(s.errorDesc),
      ],
    });
  }
}
