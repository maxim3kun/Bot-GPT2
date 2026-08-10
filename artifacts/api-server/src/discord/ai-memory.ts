import { randomUUID } from "crypto";
import { PermissionFlagsBits, type Message } from "discord.js";
import { getAiMemory, saveAiMemory, clearAiMemory, type AiMemoryEntry } from "../lib/db.js";
import { requireMemoryConsent } from "./ai-consent.js";

const SERVER_SCOPE = "server";
const MAX_MEMORY_TEXT = 500;

function scopeFor(message: Message): string {
  return message.guildId ?? "direct-message";
}

function formatEntries(entries: AiMemoryEntry[]): string {
  if (entries.length === 0) return "🧠 Je n’ai encore aucune mémoire enregistrée sur toi.";
  return [
    "🧠 **Ce que je mémorise sur toi (visible uniquement par toi)**",
    ...entries.map((entry, index) => `${index + 1}. ${entry.text}`),
    "",
    "Utilise `!ai forget <numéro>` ou `!ai forget all` pour supprimer.",
  ].join("\n");
}

async function addMemory(message: Message, text: string): Promise<void> {
  if (!text.trim()) {
    await message.reply("❓ Utilisation : `!ai remember <information à retenir>`");
    return;
  }
  if (!await requireMemoryConsent(message)) return;
  const entries = await getAiMemory(scopeFor(message), message.author.id);
  entries.push({ id: randomUUID(), text: text.trim().slice(0, MAX_MEMORY_TEXT), createdAt: new Date().toISOString() });
  const saved = await saveAiMemory(scopeFor(message), message.author.id, entries);
  if (!saved) {
    await message.reply("⚠️ La mémoire n’est pas disponible : MongoDB et `ENCRYPTION_KEY` sont nécessaires. Rien n’a été enregistré.");
    return;
  }
  await message.reply("✅ C’est enregistré. Tu peux consulter ta mémoire avec `!ai memory`.");
}

async function forgetMemory(message: Message, selector?: string): Promise<void> {
  const entries = await getAiMemory(scopeFor(message), message.author.id);
  if (entries.length === 0) {
    await message.reply("🧠 Ta mémoire est déjà vide.");
    return;
  }
  if (!selector || selector.toLowerCase() === "all" || selector.toLowerCase() === "tout") {
    await clearAiMemory(scopeFor(message), message.author.id);
    await message.reply("✅ Toute ta mémoire a été supprimée.");
    return;
  }
  const index = Number(selector) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
    await message.reply("❓ Indique un numéro valide (`!ai memory` pour les voir) ou `all`.");
    return;
  }
  entries.splice(index, 1);
  await saveAiMemory(scopeFor(message), message.author.id, entries);
  await message.reply("✅ Cette information a été oubliée.");
}

async function showMemory(message: Message): Promise<void> {
  const formatted = formatEntries(await getAiMemory(scopeFor(message), message.author.id));
  if (message.channel.isDMBased()) {
    await message.reply(formatted);
    return;
  }
  try {
    await message.author.send(formatted);
    await message.reply("✅ Je t’ai envoyé ta mémoire en message privé.");
  } catch {
    await message.reply("⚠️ Je ne peux pas t’envoyer de message privé. Active tes DM pour consulter ta mémoire sans l’exposer dans le salon.");
  }
}

export async function handleAiMemoryCommand(message: Message, args: string[]): Promise<boolean> {
  const commandArgs = [...args];
  const action = commandArgs.shift()?.toLowerCase();
  if (!action || action === "help") {
    await message.reply(
      "🧠 `!ai remember <information>` — demander à l’IA de retenir une information sur toi\n" +
      "`!ai memory` — voir uniquement ta mémoire\n" +
      "`!ai forget <numéro|all>` — supprimer une information ou toute ta mémoire\n" +
      "🔒 La mémoire est facultative, chiffrée et cloisonnée par serveur.",
    );
    return true;
  }
  if (action === "remember" || action === "rememberme" || action === "retient") {
    await addMemory(message, commandArgs.join(" "));
    return true;
  }
  if (action === "memory" || action === "memories" || action === "memoire" || action === "mémoire") {
    if (commandArgs[0]?.toLowerCase() === "reset") {
      const { setMemoryConsent } = await import("./ai-consent.js");
      await setMemoryConsent(message.author.id, "declined");
      await clearAiMemory(scopeFor(message), message.author.id);
      await message.reply("✅ Consentement mémoire retiré et mémoire supprimée.");
      return true;
    }
    await showMemory(message);
    return true;
  }
  if (action === "forget" || action === "oublie" || action === "oublier") {
    if (commandArgs[0]?.toLowerCase() === "reset") {
      const { setMemoryConsent } = await import("./ai-consent.js");
      await setMemoryConsent(message.author.id, "declined");
      await clearAiMemory(scopeFor(message), message.author.id);
      await message.reply("✅ Consentement mémoire retiré et mémoire supprimée.");
      return true;
    }
    await forgetMemory(message, commandArgs[0]);
    return true;
  }
  if (action === "server") {
    if (!message.guildId || !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("❌ Seuls les administrateurs du serveur peuvent gérer la mémoire commune.");
      return true;
    }
    const serverAction = commandArgs.shift()?.toLowerCase();
    if (serverAction === "remember" || serverAction === "retient") {
      const text = commandArgs.join(" ").trim();
      if (!text) {
        await message.reply("❓ Utilisation : `!ai server remember <information fiable sur le serveur>`");
        return true;
      }
      if (!await requireMemoryConsent(message)) return true;
      const entries = await getAiMemory(message.guildId, SERVER_SCOPE);
      entries.push({ id: randomUUID(), text: text.slice(0, MAX_MEMORY_TEXT), createdAt: new Date().toISOString() });
      const saved = await saveAiMemory(message.guildId, SERVER_SCOPE, entries);
      await message.reply(saved ? "✅ Information commune enregistrée." : "⚠️ MongoDB et `ENCRYPTION_KEY` sont nécessaires. Rien n’a été enregistré.");
      return true;
    }
    if (serverAction === "forget" || serverAction === "oublie") {
      await clearAiMemory(message.guildId, SERVER_SCOPE);
      await message.reply("✅ La mémoire commune du serveur a été supprimée.");
      return true;
    }
    await message.reply("❓ Utilisation : `!ai server remember <information>` ou `!ai server forget`.");
    return true;
  }
  return false;
}

export async function getAiPromptContext(guildId: string | null, userId: string): Promise<string> {
  if (!guildId) return "";
  const [userEntries, serverEntries] = await Promise.all([
    getAiMemory(guildId, userId),
    getAiMemory(guildId, SERVER_SCOPE),
  ]);
  const sections: string[] = [];
  if (serverEntries.length > 0) {
    sections.push(`Trusted server facts (provided by a server administrator):\n${serverEntries.map((e) => `- ${e.text}`).join("\n")}`);
  }
  if (userEntries.length > 0) {
    sections.push(`Facts this user explicitly asked you to remember. Use only to help this same user:\n${userEntries.map((e) => `- ${e.text}`).join("\n")}`);
  }
  return sections.length > 0
    ? `\n\nPersistent context from encrypted memory:\n${sections.join("\n\n")}\nNever reveal one user's private facts to another person.`
    : "";
}