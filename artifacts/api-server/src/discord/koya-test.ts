import { Message, GuildMember } from "discord.js";

function normalizeMention(input: string): string | null {
  const cleaned = input.replace(/[<>@!]/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export async function handleKoyaTestCommand(message: Message, args: string[], prefix: string): Promise<void> {
  const guild = message.guild;
  if (!guild) {
    await message.reply("❌ Cette commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const members = guild.members.cache.filter((member) => !member.user.bot && member.id !== message.author.id).map((member) => member);
  if (members.length === 0) {
    await message.reply("❌ Aucun autre membre disponible pour tester le message Koya.");
    return;
  }

  const target = members[Math.floor(Math.random() * members.length)];

  const autonomousKoyaText = `Koya kiss <@${target.user.id}> 💋`;
  await message.channel.send(autonomousKoyaText);
  await message.reply(`✅ Test Koya lancé sur **${target.user.username}**.`);
}
