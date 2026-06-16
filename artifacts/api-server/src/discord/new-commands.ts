import { Message, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getLang, setLang, GuildLang } from "./lang-store.js";

const VALID_LANGS: GuildLang[] = ["en", "fr", "es"];

const LANG_LABELS: Record<GuildLang, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  es: "🇪🇸 Español",
};

// ── !new setlang ──────────────────────────────────────────────────────────────

async function handleSetLang(message: Message, args: string[], prefix: string): Promise<void> {
  const isAdmin =
    message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
    message.member?.permissions.has(PermissionFlagsBits.ManageGuild);

  const guildId = message.guildId;
  if (!guildId) {
    await message.reply("❌ This command can only be used in a server.");
    return;
  }

  const currentLang = getLang(guildId);

  if (!args[0]) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🌐 Server Language")
      .setDescription(
        `Current language: **${LANG_LABELS[currentLang]}**\n\n` +
        `To change it (admin only):\n` +
        `\`${prefix}new setlang en\` — 🇬🇧 English\n` +
        `\`${prefix}new setlang fr\` — 🇫🇷 Français\n` +
        `\`${prefix}new setlang es\` — 🇪🇸 Español`,
      );
    await message.reply({ embeds: [embed] });
    return;
  }

  if (!isAdmin) {
    await message.reply("🔒 Only admins can change the server language. (**Manage Server** permission required)");
    return;
  }

  const input = args[0].toLowerCase() as GuildLang;
  if (!VALID_LANGS.includes(input)) {
    await message.reply(`❌ Invalid language. Use \`${prefix}new setlang en\`, \`fr\` or \`es\`.`);
    return;
  }

  if (input === currentLang) {
    await message.reply(`ℹ️ The server language is already set to **${LANG_LABELS[input]}**.`);
    return;
  }

  setLang(guildId, input);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Language updated")
    .setDescription(`Server language is now **${LANG_LABELS[input]}**.\n\nCommands that support localisation will default to this language.`);
  await message.reply({ embeds: [embed] });
}

// ── !new help ─────────────────────────────────────────────────────────────────

async function handleNewHelp(message: Message, prefix: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🆕 New Commands (beta)")
    .setDescription(`These commands are in testing. Access them with \`${prefix}new <command>\`.\n\u200b`)
    .addFields({
      name: "🌐 Language",
      value:
        `\`${prefix}new setlang [en|fr|es]\` — View or set the server's default language`,
    });
  await message.reply({ embeds: [embed] });
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleNewCommand(message: Message, args: string[], prefix: string): Promise<void> {
  const sub = args.shift()?.toLowerCase();

  switch (sub) {
    case "setlang":
    case "setlanguage":
    case "lang":
    case "language":
      await handleSetLang(message, args, prefix);
      break;

    case undefined:
    case "help":
      await handleNewHelp(message, prefix);
      break;

    default:
      await message.reply(`❓ Unknown new command \`${sub}\`. Use \`${prefix}new help\` to see available ones.`);
  }
}
