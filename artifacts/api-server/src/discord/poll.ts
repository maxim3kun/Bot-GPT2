import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export async function handlePollCommand(message: Message, args: string[], language = "en"): Promise<void> {
  const fr = language === "fr";
  const raw = args.join(" ");
  const parts = raw.split("|").map((choice) => choice.trim()).filter(Boolean);
  if (parts.length < 3 || parts.length > 10 || parts[0]!.length > 250 || parts.slice(1).some(choice => choice.length > 180)) {
    await message.reply(fr
      ? "Format : `/poll question:Ta question choices:Oui | Non` — 2 à 9 choix, 180 caractères par choix, question de 250 caractères maximum."
      : "Usage: `/poll question:Your question choices:Yes | No` — 2–9 choices, 180 characters per choice, question up to 250 characters.");
    return;
  }

  const question = parts[0]!;
  const choices = parts.slice(1, 10);
  const description = choices.map((choice, index) => `${POLL_EMOJIS[index]} ${choice}`).join("\n");
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(description)
    .setColor(0x5865f2)
    .setFooter({ text: `${fr ? "Sondage de" : "Poll by"} ${message.author.displayName ?? message.author.username}` });

  if (!message.channel.isSendable()) {
    await message.reply("❌ This channel does not support messages.");
    return;
  }
  if (message.guild && message.client.user && "permissionsFor" in message.channel
    && !message.channel.permissionsFor(message.client.user)?.has([PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions])) {
    await message.reply(fr
      ? "Il me manque la permission d’intégrer des liens ou d’ajouter des réactions pour créer ce sondage."
      : "I need Embed Links and Add Reactions permissions to create this poll.");
    return;
  }

  const pollMessage = await message.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  for (let index = 0; index < choices.length; index += 1) {
    await pollMessage.react(POLL_EMOJIS[index]!).catch(() => null);
  }
  if (message.deletable) await message.delete().catch(() => null);
}
