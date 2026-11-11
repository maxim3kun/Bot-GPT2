export interface SearchActor { userId: string; guildId: string | null; channelId: string; messageId: string }
export interface SearchBinding { userId: string; guildId: string | null; channelId: string; messageId: string; expiresAt: number }
export function searchActorAllowed(binding: SearchBinding | undefined, actor: SearchActor, now = Date.now()) {
  return Boolean(binding && now < binding.expiresAt && binding.userId === actor.userId && binding.guildId === actor.guildId
    && binding.channelId === actor.channelId && binding.messageId === actor.messageId);
}
