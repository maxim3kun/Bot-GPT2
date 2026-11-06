import { EmbedBuilder, type Message } from "discord.js";

const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export async function handlePollCommand(message: Message, args: string[]): Promise<void> {
  const raw = args.join(" ");
  const parts = raw.split("|").map((choice) => choice.trim()).filter(Boolean);
  if (parts.length < 3) {
    await message.reply("❌ Format: `!poll <question> | <choice1> | <choice2> ...` *(minimum 2 choices)*");
    return;
  }

  const question = parts[0]!;
  const choices = parts.slice(1, 10);
  const description = choices.map((choice, index) => `${POLL_EMOJIS[index]} ${choice}`).join("\n");
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(description)
    .setColor(0x5865f2)
    .setFooter({ text: `Poll by ${message.author.displayName ?? message.author.username}` });

  if (!message.channel.isSendable()) {
    await message.reply("❌ This channel does not support messages.");
    return;
  }

  const pollMessage = await message.channel.send({ embeds: [embed] });
  for (let index = 0; index < choices.length; index += 1) {
    await pollMessage.react(POLL_EMOJIS[index]!).catch(() => null);
  }
  await message.delete().catch(() => null);
}
