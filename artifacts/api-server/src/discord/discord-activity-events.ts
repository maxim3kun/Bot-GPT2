export type ActivityAvatarMode = "idle" | "listening" | "thinking" | "speaking" | "paused";

export interface ActivityAvatarEvent {
  mode: ActivityAvatarMode;
  updatedAt: number;
  stop?: true;
  mouthLevel?: number;
}

type Listener = (event: ActivityAvatarEvent) => void;

const MAX_LISTENERS_PER_GUILD = 100;
const MAX_TRACKED_GUILDS = 5_000;
const listeners = new Map<string, Set<Listener>>();
const currentModes = new Map<string, ActivityAvatarEvent>();

function notifyListeners(guildId: string, event: ActivityAvatarEvent): void {
  for (const listener of listeners.get(guildId) ?? []) {
    try {
      listener(event);
    } catch {
      // A disconnected Activity must not interfere with voice playback.
    }
  }
}

export function getActivityAvatarEvent(guildId: string): ActivityAvatarEvent {
  return currentModes.get(guildId) ?? { mode: "idle", updatedAt: Date.now() };
}

export function publishActivityAvatarMode(guildId: string, mode: ActivityAvatarMode, stop = false): void {
  if (!guildId) return;
  const event: ActivityAvatarEvent = {
    mode,
    updatedAt: Date.now(),
    ...(stop ? { stop: true as const } : {}),
  };
  currentModes.set(guildId, event);
  notifyListeners(guildId, event);
  if (currentModes.size > MAX_TRACKED_GUILDS) {
    const oldest = [...currentModes.entries()]
      .filter(([id]) => !listeners.has(id))
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (const [id] of oldest.slice(0, currentModes.size - MAX_TRACKED_GUILDS)) {
      currentModes.delete(id);
    }
  }
}

export function publishActivityAvatarMouthLevel(guildId: string, mouthLevel: number): void {
  if (!guildId || !Number.isFinite(mouthLevel)) return;
  const current = getActivityAvatarEvent(guildId);
  if (current.mode !== "speaking") return;
  const event: ActivityAvatarEvent = {
    mode: current.mode,
    updatedAt: Date.now(),
    mouthLevel: Math.min(1, Math.max(0, mouthLevel)),
  };
  currentModes.set(guildId, event);
  notifyListeners(guildId, event);
}

export function hasActivityAvatarListeners(guildId: string): boolean {
  return (listeners.get(guildId)?.size ?? 0) > 0;
}

export function subscribeToActivityAvatar(
  guildId: string,
  listener: Listener,
): (() => void) | null {
  let guildListeners = listeners.get(guildId);
  if (!guildListeners) {
    guildListeners = new Set();
    listeners.set(guildId, guildListeners);
  }
  if (guildListeners.size >= MAX_LISTENERS_PER_GUILD) return null;
  guildListeners.add(listener);
  return () => {
    const current = listeners.get(guildId);
    current?.delete(listener);
    if (current?.size === 0) listeners.delete(guildId);
  };
}

export function clearActivityAvatarEventsForTests(): void {
  listeners.clear();
  currentModes.clear();
}
