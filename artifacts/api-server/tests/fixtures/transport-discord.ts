import { EventEmitter } from "node:events";
import { PermissionFlagsBits, type Message, type MessageComponentInteraction } from "discord.js";

export interface RecordedPayload {
  content?: string;
  embeds: any[];
  components: { components: { custom_id?: string; url?: string; label?: string; disabled?: boolean }[] }[];
}
const record = (payload: any): RecordedPayload => structuredClone({
  content: payload.content, embeds: payload.embeds ?? [],
  components: (payload.components ?? []).map((row: any) => row.toJSON ? row.toJSON() : row),
});
export class FakeCollector extends EventEmitter {
  stopped = false;
  endWork: Promise<unknown> = Promise.resolve();
  async collect(interaction: MessageComponentInteraction, force = false) {
    if (!this.stopped || force) await Promise.all(this.listeners("collect").map(fn => fn(interaction)));
  }
  stop(reason: string) {
    if (this.stopped) return;
    this.stopped = true;
    this.endWork = Promise.all(this.listeners("end").map(fn => fn(new Map(), reason)));
  }
}
export class FakeCard {
  readonly collector = new FakeCollector();
  readonly payloads: RecordedPayload[];
  lifetime = 0;
  failNextEmbed = false;
  beforeEdit?: () => Promise<void>;
  constructor(readonly id: string, readonly owner: Message, payload: any) { this.payloads = [record(payload)]; }
  get last() { return this.payloads.at(-1)!; }
  edit = async (payload: any) => {
    await this.beforeEdit?.();
    if (this.failNextEmbed && payload.embeds?.length) { this.failNextEmbed = false; throw { code: 50013 }; }
    this.payloads.push(record(payload)); return this as unknown as Message;
  };
  createMessageComponentCollector = (options: { time: number }) => { this.lifetime = options.time; return this.collector; };
  custom(action: string) {
    return this.last.components.flatMap(r => r.components).find(c => c.custom_id?.endsWith(`:${action}`))?.custom_id;
  }
  interaction(action: string, overrides: Record<string, unknown> = {}) {
    const replies: any[] = []; let deferred = 0;
    const value = {
      customId: this.custom(action), user: { id: this.owner.author.id }, message: { id: this.id },
      guildId: this.owner.guildId, channelId: this.owner.channelId, isButton: () => true,
      reply: async (p: unknown) => { replies.push(p); },
      deferUpdate: async () => { deferred++; }, ...overrides,
    };
    return { value: value as unknown as MessageComponentInteraction, replies, get deferred() { return deferred; } };
  }
}
export function fakeDiscord(options: { userId?: string; guildId?: string | null; channelId?: string; embed?: boolean; failEmbed?: boolean } = {}) {
  const cards: FakeCard[] = [], replies: RecordedPayload[] = [], attempts: RecordedPayload[] = [];
  let failEmbed = options.failEmbed, beforeReply: (() => Promise<void>) | undefined;
  const message = {
    guildId: options.guildId === undefined ? "g" : options.guildId, channelId: options.channelId ?? "c",
    author: { id: options.userId ?? "u" }, client: { user: { id: "bot" } },
    channel: { isSendable: () => true, sendTyping: async () => undefined, isThread: () => false,
      permissionsFor: () => ({ has: (permission: unknown) => permission !== PermissionFlagsBits.EmbedLinks || options.embed !== false }) },
    reply: async (payload: any) => {
      attempts.push(record(payload)); await beforeReply?.();
      if (failEmbed && payload.embeds?.length) { failEmbed = false; throw { code: 50013 }; }
      replies.push(record(payload));
      const card = new FakeCard(`response-${cards.length}`, message as unknown as Message, payload);
      cards.push(card); return card as unknown as Message;
    },
  } as unknown as Message;
  return { message, cards, replies, attempts, setBeforeReply(fn: () => Promise<void>) { beforeReply = fn; } };
}
export const hasControls = (card: FakeCard) => card.last.components.some(r => r.components.some(c => c.custom_id));
