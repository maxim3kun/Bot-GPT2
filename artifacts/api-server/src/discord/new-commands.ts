import { Message, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getLang, setLang, GuildLang } from "./lang-store.js";
import { handleKoyaTestCommand } from "./koya-test.js";
import { addBetaTester, isBetaTester, listBetaTesters, removeBetaTester } from "../lib/db.js";

const VALID_LANGS: GuildLang[] = ["en", "fr", "es"];

const LANG_LABELS: Record<GuildLang, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  es: "🇪🇸 Español",
};

export async function canUseBetaCommands(userId: string, username?: string): Promise<boolean> {
  if (username?.toLowerCase() === "maxim3kun") return true;
  return await isBetaTester(userId);
}

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

export async function handleBetaCommand(message: Message, args: string[], prefix: string): Promise<void> {
  const isCreator = message.author.username.toLowerCase() === "maxim3kun";

  if (!isCreator) {
    const allowed = await canUseBetaCommands(message.author.id, message.author.username);
    if (!allowed) {
      await message.reply("🔒 This beta command is reserved for beta testers and the bot creator.");
      return;
    }
  }

  const sub = args.shift()?.toLowerCase();

  if (!sub || sub === "help" || sub === "status") {
    const testers = await listBetaTesters();
    const betaList = testers.length > 0 ? testers.map((t) => `• <@${t._id}>`).join("\n") : "• Aucun bêta testeur pour le moment";
    await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🧪 Beta access")
        .setDescription("Only beta testers and the bot creator can use beta features.")
        .addFields(
          { name: "Commands", value: `\`${prefix}beta list\`\n\`${prefix}beta add @user\`\n\`${prefix}beta remove @user\`` },
          { name: "Current beta testers", value: betaList },
        )],
    });
    return;
  }

  if (!isCreator) {
    await message.reply("🔒 Only the bot creator can manage beta access.");
    return;
  }

  if (sub === "list") {
    const testers = await listBetaTesters();
    if (testers.length === 0) {
      await message.reply("🧪 No beta tester is registered yet.");
      return;
    }
    await message.reply(`🧪 Beta testers (${testers.length}):\n${testers.map((t) => `• <@${t._id}>`).join("\n")}`);
    return;
  }

  if (sub === "add") {
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply("❌ Usage: `!beta add @user`");
      return;
    }
    const ok = await addBetaTester(target.id, message.author.id);
    await message.reply(ok ? `✅ <@${target.id}> has been added to the beta tester list.` : `ℹ️ <@${target.id}> is already in the beta tester list.`);
    return;
  }

  if (sub === "remove") {
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply("❌ Usage: `!beta remove @user`");
      return;
    }
    const ok = await removeBetaTester(target.id);
    await message.reply(ok ? `✅ <@${target.id}> has been removed from the beta tester list.` : `ℹ️ <@${target.id}> was not in the beta tester list.`);
    return;
  }

  await message.reply("❓ Usage: `!beta help` • `!beta list` • `!beta add @user` • `!beta remove @user`");
}

async function handleNewHelp(message: Message, prefix: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🆕 New Commands (beta)")
    .setDescription(`These commands are in testing. Access them with \`${prefix}new <command>\` and \`${prefix}beta\`.
\u200b`)
    .addFields(
      {
        name: "🧪 Beta access",
        value: `\`${prefix}beta\` — view beta status\n\`${prefix}beta add @user\` — creator only\n\`${prefix}beta list\` — beta testers`,
      },
      {
        name: "🎭 Koya test",
        value: `\`${prefix}new koya test\` — sends a temporary Koya reaction test in the current channel`,
      },
      {
        name: "🌐 Language",
        value: `\`${prefix}new setlang [en|fr|es]\` — View or set the server's default language`,
      },
    );
  await message.reply({ embeds: [embed] });
}

export async function handleNewCommand(message: Message, args: string[], prefix: string): Promise<void> {
  const allowed = await canUseBetaCommands(message.author.id, message.author.username);
  if (!allowed) {
    await message.reply("🔒 Beta access is required. Ask the bot creator to add you with `!beta add @user`.");
    return;
  }

  const sub = args.shift()?.toLowerCase();

  switch (sub) {
    case "setlang":
    case "setlanguage":
    case "lang":
    case "language":
      await handleSetLang(message, args, prefix);
      break;

    case "koya":
    case "koya-test":
    case "testkoya":
      await handleKoyaTestCommand(message, args, prefix);
      break;

    case undefined:
    case "help":
      await handleNewHelp(message, prefix);
      break;

    default:
      await message.reply(`❓ Unknown new command \`${sub}\`. Use \`${prefix}new help\` to see available ones.`);
  }
}
