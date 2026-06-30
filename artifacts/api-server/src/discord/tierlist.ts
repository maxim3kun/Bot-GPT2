import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message } from "discord.js";

const THEMES: Record<string, { name: string; emoji: string; items: string[] }> = {
  pokemon: {
    name: "Pokémon Gen 1", emoji: "⚡",
    items: ["Pikachu","Charizard","Mewtwo","Gengar","Blastoise","Venusaur","Eevee","Snorlax","Gyarados","Jolteon","Vaporeon","Flareon","Dragonite","Lapras","Alakazam","Arcanine","Machamp","Haunter","Onix","Articuno"],
  },
  anime: {
    name: "Anime Series", emoji: "🎌",
    items: ["Attack on Titan","Demon Slayer","Naruto","Dragon Ball Z","One Piece","My Hero Academia","Hunter x Hunter","Death Note","Fullmetal Alchemist","JoJo's Bizarre Adventure","Sword Art Online","Bleach","Tokyo Revengers","Chainsaw Man","Spy x Family","Vinland Saga","Re:Zero","Neon Genesis Evangelion","Cowboy Bebop","Steins;Gate"],
  },
  marvel: {
    name: "Marvel Heroes", emoji: "🦸",
    items: ["Spider-Man","Iron Man","Captain America","Thor","Black Panther","Doctor Strange","Hulk","Wolverine","Black Widow","Scarlet Witch","Ant-Man","Hawkeye","Vision","Falcon","Deadpool","Daredevil","Nick Fury","Gamora","Star-Lord","Loki"],
  },
  food: {
    name: "Foods", emoji: "🍕",
    items: ["Pizza","Sushi","Tacos","Burger","Pasta","Ramen","Fried Chicken","Ice Cream","Chocolate Cake","Burritos","Curry","Pad Thai","Croissant","Hot Dog","Steak","Cheesecake","Waffles","BBQ Ribs","Dim Sum","Pho"],
  },
  games: {
    name: "Video Games", emoji: "🎮",
    items: ["The Legend of Zelda: BOTW","Red Dead Redemption 2","GTA V","Minecraft","Elden Ring","God of War","The Witcher 3","Hollow Knight","Terraria","Dark Souls","Among Us","Fortnite","Stardew Valley","Portal 2","Hades","Celeste","Undertale","Cuphead","Sekiro","Cyberpunk 2077"],
  },
  movies: {
    name: "Movies", emoji: "🎬",
    items: ["The Shawshank Redemption","The Godfather","The Dark Knight","Pulp Fiction","Inception","The Matrix","Interstellar","Parasite","Avengers: Endgame","Star Wars: A New Hope","The Lord of the Rings","Spirited Away","Schindler's List","Fight Club","Forrest Gump","Goodfellas","The Silence of the Lambs","Whiplash","La La Land","Get Out"],
  },
};

const TIER_COLORS: Record<string, number> = { S: 0xff0000, A: 0xff7f00, B: 0xffff00, C: 0x00cc00, D: 0x0066ff };
const TIERS = ["S","A","B","C","D"] as const;
type Tier = typeof TIERS[number];

interface TierSession {
  theme: string;
  items: string[];
  index: number;
  tiers: Record<Tier, string[]>;
  tierId: string | null;    // message ID of the tier display
  promptId: string | null;  // message ID of the current prompt
  channelId: string;
}

const sessions = new Map<string, TierSession>();

function buildTierEmbed(session: TierSession): EmbedBuilder {
  const theme = THEMES[session.theme]!;
  const total = session.items.length;
  const done = session.index;
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${theme.emoji} ${theme.name} — Tier List`)
    .setDescription(`**${done}/${total}** items classified`);

  for (const tier of TIERS) {
    const items = session.tiers[tier];
    embed.addFields({
      name: `${tier} Tier`,
      value: items.length > 0 ? items.join(" • ") : "*empty*",
      inline: false,
    });
  }
  return embed;
}

function buildPromptEmbed(session: TierSession): EmbedBuilder {
  const item = session.items[session.index];
  const remaining = session.items.length - session.index - 1;
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`❓ Where does this go?`)
    .setDescription(`# **${item}**`)
    .setFooter({ text: `${remaining} items remaining after this` });
}

function buildTierButtons(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("tl:S").setLabel("S").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("tl:A").setLabel("A").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("tl:B").setLabel("B").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("tl:C").setLabel("C").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("tl:D").setLabel("D").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("tl:pass").setLabel("⏭️ Pass").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("tl:stop").setLabel("🛑 Stop").setStyle(ButtonStyle.Danger),
    ),
  ];
}

function buildFinalEmbed(session: TierSession): EmbedBuilder {
  const theme = THEMES[session.theme]!;
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🏆 ${theme.emoji} ${theme.name} — Final Tier List!`);

  for (const tier of TIERS) {
    const items = session.tiers[tier];
    embed.addFields({
      name: `${tier} Tier`,
      value: items.length > 0 ? items.join(", ") : "*none*",
      inline: false,
    });
  }
  return embed;
}

export async function startTierlist(message: Message, args: string[]): Promise<void> {
  if (!message.guildId) { await message.reply("❌ Server only."); return; }

  const themeKey = (args[0] ?? "").toLowerCase();
  const available = Object.keys(THEMES).join(", ");

  if (!themeKey || !THEMES[themeKey]) {
    await message.reply(
      `🎯 **Available themes:** ${available}\n` +
      `Usage: \`!tierlist <theme>\``,
    );
    return;
  }

  const theme = THEMES[themeKey]!;
  const items = [...theme.items].sort(() => Math.random() - 0.5);
  const session: TierSession = {
    theme: themeKey,
    items,
    index: 0,
    tiers: { S: [], A: [], B: [], C: [], D: [] },
    tierId: null,
    promptId: null,
    channelId: message.channelId,
  };

  const tierMsg = await message.reply({ embeds: [buildTierEmbed(session)], content: "" });
  session.tierId = tierMsg.id;

  if (message.channel && "send" in message.channel) {
    const promptMsg = await message.channel.send({ embeds: [buildPromptEmbed(session)], components: buildTierButtons() });
    session.promptId = promptMsg.id;
  }

  sessions.set(message.guildId, session);
}

export async function handleTierlistButton(
  interaction: import("discord.js").ButtonInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const session = sessions.get(guildId);
  if (!session) {
    await interaction.reply({ content: "❌ No active tier list. Start one with `!tierlist <theme>`.", ephemeral: true });
    return;
  }

  if (interaction.message.id !== session.promptId) {
    await interaction.reply({ content: "❌ This is not the current tier list prompt.", ephemeral: true });
    return;
  }

  const action = interaction.customId.split(":")[1] as Tier | "pass" | "stop";

  if (action === "stop") {
    sessions.delete(guildId);
    await interaction.update({ embeds: [buildFinalEmbed(session)], components: [] });
    return;
  }

  if (action !== "pass" && TIERS.includes(action as Tier)) {
    const item = session.items[session.index]!;
    session.tiers[action as Tier].push(item);
  }

  session.index++;

  if (session.index >= session.items.length) {
    sessions.delete(guildId);
    await interaction.update({ embeds: [buildFinalEmbed(session)], components: [] });
    return;
  }

  await interaction.update({ embeds: [buildPromptEmbed(session)], components: buildTierButtons() });

  try {
    const channel = interaction.channel;
    if (channel && "messages" in channel) {
      const tierMsg = await channel.messages.fetch(session.tierId!);
      await tierMsg.edit({ embeds: [buildTierEmbed(session)] });
    }
  } catch { /* ignore if tier message was deleted */ }
}
