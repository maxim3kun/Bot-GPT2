import { authorizeAudioStream } from "./audio-playback-state.js";
export type PlaybackAuthorization = () => Promise<boolean>;
export interface QueuedTrack { url: string; authorize?: PlaybackAuthorization }
const checks = new WeakMap<string[], Array<PlaybackAuthorization | undefined>>();
const playing = new WeakMap<object, PlaybackAuthorization>();
function contexts(queue: string[]) {
  let value = checks.get(queue);
  if (!value) { value = Array(queue.length).fill(undefined); checks.set(queue, value); }
  return value;
}
/** Keep per-entry authority aligned, including duplicate URLs. Relative queue edits must use these helpers. */
export function enqueueAuthorizedTrack(queue: string[], url: string, authorize?: PlaybackAuthorization, front = false) {
  const bound = contexts(queue);
  if (front) { queue.unshift(url); bound.unshift(authorize); }
  else { queue.push(url); bound.push(authorize); }
}
export function removeAuthorizedTrack(queue: string[], index = 0): QueuedTrack | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= queue.length) return;
  const bound = contexts(queue), url = queue.splice(index, 1)[0]!;
  return { url, authorize: bound.splice(index, 1)[0] };
}
export function playingTrackAuthorization(state: object) { return playing.get(state); }
export function setPlayingTrackAuthorization(state: object, authorize?: PlaybackAuthorization) {
  if (authorize) playing.set(state, authorize); else playing.delete(state);
}
/** The final check is after metadata/network work and before the synchronous player operation. */
export async function playAuthorizedQueuedStream<S extends { destroy(): unknown }, T>(
  track: QueuedTrack, stream: S, prepare: () => Promise<T>, play: (stream: S, metadata: T) => void,
): Promise<{ played: false } | { played: true; metadata: T }> {
  try {
    if (!await authorizeAudioStream(stream, track.authorize)) return { played: false };
    const metadata = await prepare();
    if (!await authorizeAudioStream(stream, track.authorize)) return { played: false };
    play(stream, metadata);
    return { played: true, metadata };
  } catch (err) { stream.destroy(); throw err; }
}
