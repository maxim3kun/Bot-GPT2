/** Close a newly opened stream if delayed authorization fails, including exceptions. */
export async function authorizeAudioStream(stream: { destroy(): unknown }, authorize?: () => Promise<boolean>): Promise<boolean> {
  if (!authorize) return true;
  let allowed = false;
  try { allowed = await authorize(); } catch { /* Access must fail closed. */ }
  if (!allowed) stream.destroy();
  return allowed;
}
interface PlaybackState {
  paused: boolean; youtubeTitle: string | null; stationKey: string | null;
  player: { pause(): boolean; unpause(): boolean };
}
/** A request to the player is not a confirmed state change until it returns true. */
export function togglePlaybackState(state: PlaybackState | undefined): "paused" | "resumed" | "not_playing" {
  if (!state || !state.youtubeTitle && !state.stationKey) return "not_playing";
  const changed = state.paused ? state.player.unpause() : state.player.pause();
  if (!changed) return "not_playing";
  state.paused = !state.paused;
  return state.paused ? "paused" : "resumed";
}
