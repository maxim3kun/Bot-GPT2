import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
export const fixture = {
  sent: [] as any[], streams: [] as PassThrough[], duringInfo: null as null | (() => void),
  reset() { this.sent = []; this.streams = []; this.duringInfo = null; },
  stream() { const stream = new PassThrough(); this.streams.push(stream); return stream; },
  async info() { this.duringInfo?.(); return { title: "Queued song", duration: 90, thumbnail: null }; },
};
export class Player extends EventEmitter {
  state = { status: "idle" }; plays = 0; nextStatus = "playing";
  play() { this.plays++; this.state.status = this.nextStatus; }
  stop() { this.state.status = "idle"; return true; }
}
export function state(guild: string) {
  return { player: new Player(), stationKey: null, youtubeTitle: "Current song", youtubeUrl: "current",
    queue: [] as string[], queueMessages: [] as any[], queueName: null, volume: 1,
    notifyChannel: { send: async (payload: unknown) => { fixture.sent.push(payload); return response(); } },
    guildId: guild, idleTimer: null, nowPlayingMsg: null, paused: false };
}
export function response() { return { edit: async () => response(), delete: async () => {} }; }
export const message = (guild: string) => ({
  guildId: guild, author: { id: "member" }, member: { voice: { channel: { id: "voice" } } },
  channel: { send: async (payload: unknown) => { fixture.sent.push(payload); return response(); } }, reply: async () => response(),
});
