import { Collection, type ChatInputCommandInteraction, type GuildMember, type Message } from "discord.js";

/** Respect Discord's single initial acknowledgement, including deferred replies. */
export async function replyToSlash(
  interaction: ChatInputCommandInteraction,
  payload: Parameters<ChatInputCommandInteraction["editReply"]>[0],
): Promise<Message> {
  if (interaction.replied) return interaction.followUp(payload as Parameters<typeof interaction.followUp>[0]);
  if (interaction.deferred) return interaction.editReply(payload);
  await interaction.reply(payload as Parameters<typeof interaction.reply>[0]);
  return interaction.fetchReply();
}

/** Supply the real guild/client/user and preserve Message.reply's multi-message semantics. */
export function createSlashMessageAdapter(interaction: ChatInputCommandInteraction, member: GuildMember | null): Message {
  let pending: Promise<unknown> = Promise.resolve();
  return {
    id: interaction.id,
    guildId: interaction.guildId,
    guild: interaction.guild,
    channelId: interaction.channelId,
    channel: interaction.channel,
    client: interaction.client,
    author: interaction.user,
    member,
    content: "",
    createdTimestamp: interaction.createdTimestamp,
    createdAt: interaction.createdAt,
    attachments: interaction.options.resolved?.attachments ?? new Collection(),
    mentions: {
      users: interaction.options.resolved?.users ?? new Collection(),
      members: interaction.options.resolved?.members ?? new Collection(),
      roles: interaction.options.resolved?.roles ?? new Collection(),
      channels: interaction.options.resolved?.channels ?? new Collection(),
      repliedUser: null, everyone: false,
    },
    inGuild: () => interaction.guildId !== null,
    reply: (payload: Parameters<typeof interaction.editReply>[0]) => {
      const result = pending.then(() => replyToSlash(interaction, payload));
      pending = result.catch(() => undefined);
      return result;
    },
    delete: async () => undefined,
    react: async () => null,
  } as unknown as Message;
}
