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
  audioFails: false, audio: new Map<string, any>(), custom: new Map<string, { name: string }>(),
  searches: [] as any[], botVoiceId: null as string | null,
  youtubeRequests: [] as { autoplay: boolean; authorize?: () => Promise<boolean> }[],
  reset() {
    this.blocked = false; this.admin = true; this.consent = "accepted";
    this.modelCalls = 0; this.fetches = 0; this.memberAvailable = true;
    this.voiceId = "voice"; this.featureReadFails = false; this.handlerFails = false;
    this.flags = {}; this.features = {}; this.globalFeatures = {}; this.voiceType = "GuildVoice";
    this.botDenied.clear(); this.userDenied.clear();
    this.handlers = []; this.replies = []; this.edits = []; this.privateReplies = []; this.collector = null;
    this.audio.clear(); this.custom.clear(); this.audioFails = false; this.botVoiceId = null; this.searches = [];
    this.youtubeRequests = [];
  },
};

export const features = () => ["ai_chat", "music", "radio", "youtube", "minesweeper", "connect4", "geoguessr", "trivia", "guesslogo"]
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
  setTitle() { return this; }
  setCustomId() { return this; }
  setLabel() { return this; }
  setStyle() { return this; }
  addComponents() { return this; }
}

export const permissions = new Proxy({}, { get: (_, name) => String(name) });
const can = (denied: Set<string>) => ({ has: (flags: string | string[]) =>
  (Array.isArray(flags) ? flags : [flags]).every((flag) => !denied.has(flag)),
});

let messageSequence = 0;
export function fakeMessage(dm = false) {
  const voice = () => ({
    id: fixture.voiceId,
    type: fixture.voiceType,
    permissionsFor: (member: { bot?: boolean }) => can(member.bot ? fixture.botDenied : fixture.userDenied),
  });
  const member = () => ({
    voice: { channelId: fixture.voiceId, channel: fixture.voiceId ? voice() : null },
    permissions: { has: () => fixture.admin },
  });
  const channel = {
    isThread: () => false,
    permissionsFor: (who: { bot?: boolean }) => can(who.bot ? fixture.botDenied : fixture.userDenied),
  };
  return {
    id: `request-${++messageSequence}`, guildId: dm ? null : "guild", channelId: "text",
    author: { id: "user" }, get member() { return dm ? null : member(); },
    channel,
    guild: dm ? null : {
      channels: { fetch: async () => { fixture.fetches++; return channel; } },
      members: {
        fetch: async () => { fixture.fetches++; return fixture.memberAvailable ? member() : null; },
        fetchMe: async () => { fixture.fetches++; return { bot: true, voice: { channelId: fixture.botVoiceId } }; },
      },
    },
    reply: async (content: unknown) => {
      fixture.replies.push(content);
      return {
        id: `reply-${++messageSequence}`,
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
export function audioState(status = "playing") {
  const state = { paused: status === "paused", youtubeTitle: "Confirmed song", stationKey: null, queue: ["next"],
    player: { state: { status }, pause() { if (fixture.audioFails) return false; this.state.status = "paused"; return true; },
      unpause() { if (fixture.audioFails) return false; this.state.status = "playing"; return true; } } };
  fixture.audio.set("guild", state); return state;
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
