import type { Message } from "discord.js";

export async function handleKoyaTestCommand(message: Message): Promise<void> {
  if (!message.guild) {
    await message.reply("❌ Cette commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const channel = message.channel;
  if (!channel.isSendable()) {
    await message.reply("❌ Impossible d’envoyer le test dans ce salon.");
    return;
  }

  const target = message.mentions.users.first() ?? message.author;

  await channel.send(`Koya kiss <@${target.id}>`);
  await message.reply(`✅ Commande Koya envoyée dans le salon pour **${target.username}**.`);
}
