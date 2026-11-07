type Collector = {
  on: (event: string, callback: (...args: any[]) => unknown) => void;
  stop: (reason: string) => void;
  emit: (event: string, ...args: any[]) => Promise<void>;
};

export const fixture = {
  blocked: false, admin: true, consent: "accepted", modelCalls: 0, fetches: 0,
  memberAvailable: true, voiceId: "voice", featureReadFails: false, handlerFails: false,
  flags: {} as Record<string, boolean>,
  features: {} as Record<string, boolean>,
  globalFeatures: {} as Record<string, boolean>,
  voiceType: "GuildVoice",
  botDenied: new Set<string>(), userDenied: new Set<string>(),
  handlers: [] as string[], replies: [] as unknown[], edits: [] as unknown[],
  privateReplies: [] as string[], collector: null as Collector | null,
  reset() {
    this.blocked = false; this.admin = true; this.consent = "accepted";
    this.modelCalls = 0; this.fetches = 0; this.memberAvailable = true;
    this.voiceId = "voice"; this.featureReadFails = false; this.handlerFails = false;
    this.flags = {}; this.features = {}; this.globalFeatures = {}; this.voiceType = "GuildVoice";
    this.botDenied.clear(); this.userDenied.clear();
    this.handlers = []; this.replies = []; this.edits = []; this.privateReplies = []; this.collector = null;
  },
};

export const features = () => ["ai_chat", "music", "radio", "minesweeper", "connect4"]
  .map((name) => ({ name, enabled: fixture.features[name] !== false }));
export const globals = () => features().map((feature) => ({
  ...feature, enabled: fixture.globalFeatures[feature.name] ?? feature.enabled,
}));

export async function handler(name: string, message: { reply: (content: string) => Promise<unknown> }) {
  fixture.handlers.push(name);
  if (fixture.handlerFails) throw Error("handler failed");
  await message.reply(name.startsWith("radio") ? "real radio result" : `real ${name} result`);
}

export class Builder {
  setCustomId() { return this; }
  setLabel() { return this; }
  setStyle() { return this; }
  addComponents() { return this; }
}

export const permissions = new Proxy({}, { get: (_, name) => String(name) });
const can = (denied: Set<string>) => ({ has: (flags: string | string[]) =>
  (Array.isArray(flags) ? flags : [flags]).every((flag) => !denied.has(flag)),
});

export function fakeMessage(dm = false) {
  const voice = () => ({
    id: fixture.voiceId,
    type: fixture.voiceType,
    permissionsFor: (member: { bot?: boolean }) => can(member.bot ? fixture.botDenied : fixture.userDenied),
  });
  const member = () => ({
    voice: { channelId: fixture.voiceId, channel: voice() },
    permissions: { has: () => fixture.admin },
  });
  const channel = {
    isThread: () => false,
    permissionsFor: (who: { bot?: boolean }) => can(who.bot ? fixture.botDenied : fixture.userDenied),
  };
  return {
    id: "request", guildId: dm ? null : "guild", channelId: "text",
    author: { id: "user" }, get member() { return dm ? null : member(); },
    channel,
    guild: dm ? null : {
      channels: { fetch: async () => { fixture.fetches++; return channel; } },
      members: {
        fetch: async () => { fixture.fetches++; return fixture.memberAvailable ? member() : null; },
        fetchMe: async () => { fixture.fetches++; return { bot: true, voice: { channelId: null } }; },
      },
    },
    reply: async (content: unknown) => {
      fixture.replies.push(content);
      return {
        edit: async (payload: unknown) => { fixture.edits.push(payload); },
        createMessageComponentCollector: () => {
          const callbacks = new Map<string, (...args: any[]) => unknown>();
          let ended = false;
          const collector: Collector = {
            on: (event, callback) => { callbacks.set(event, callback); },
            stop: (reason) => {
              if (ended) return;
              ended = true;
              void callbacks.get("end")?.([], reason);
            },
            emit: async (event, ...args) => { if (!ended) await callbacks.get(event)?.(...args); },
          };
          fixture.collector = collector;
          return collector;
        },
      };
    },
  };
}

export function fakeModel(name: string | null, args = {}) {
  return {
    chat: { completions: { create: async () => {
      fixture.modelCalls++;
      return { choices: [{ message: {
        content: "Invented provider success!",
        tool_calls: name ? [{ type: "function", function: { name, arguments: JSON.stringify(args) } }] : [],
      } }] };
    } } },
  };
}

export async function click(userId: string, action = "yes") {
  await fixture.collector?.emit("collect", {
    user: { id: userId }, channelId: "text", guildId: "guild",
    customId: `ai_cmd_${action}:request`,
    deferUpdate: async () => {},
    reply: async ({ content }: { content: string }) => { fixture.privateReplies.push(content); },
  });
}
