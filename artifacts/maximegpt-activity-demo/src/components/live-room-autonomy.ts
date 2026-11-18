export type RoomActivity =
  | 'walking-to-window'
  | 'looking-out-window'
  | 'walking-to-desk'
  | 'attending';

export interface RoomActivitySnapshot {
  activity: RoomActivity;
  targetProgress: number;
  seated: false;
}

export const ROOM_WALK_DURATION_SECONDS = 1.9;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Keeps the ambient motion to one understandable route: desk, window, back.
 * The old scripted stretch and sitting poses did not fit this avatar's rig.
 */
export function createRoomAutonomy(random: () => number = Math.random) {
  const unit = () => {
    const value = random();
    return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0;
  };
  const duration = (min: number, max: number) => min + unit() * (max - min);

  let activity: RoomActivity = 'walking-to-window';
  let targetProgress = 1;
  let timeRemaining = ROOM_WALK_DURATION_SECONDS;
  let wasEngaged = false;

  const snapshot = (): RoomActivitySnapshot => ({ activity, targetProgress, seated: false });

  return {
    update(
      deltaSeconds: number,
      engaged: boolean,
      motionEnabled: boolean,
      currentProgress: number,
    ): RoomActivitySnapshot {
      const delta = Number.isFinite(deltaSeconds) ? clamp(deltaSeconds, 0, 0.05) : 0;
      const position = Number.isFinite(currentProgress) ? clamp(currentProgress, 0, 1) : 0;

      if (engaged) {
        wasEngaged = true;
        activity = 'attending';
        targetProgress = position;
        return snapshot();
      }

      if (wasEngaged) {
        wasEngaged = false;
        if (position > 0.04) {
          activity = 'walking-to-desk';
          targetProgress = 0;
          timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * position);
        } else {
          activity = 'attending';
          targetProgress = 0;
          timeRemaining = duration(6, 10);
        }
        return snapshot();
      }

      if (!motionEnabled) {
        activity = 'attending';
        targetProgress = position;
        return snapshot();
      }

      timeRemaining -= delta;
      if (timeRemaining > 0) return snapshot();

      if (activity === 'walking-to-window') {
        activity = 'looking-out-window';
        targetProgress = 1;
        timeRemaining = duration(4, 7);
      } else if (activity === 'looking-out-window') {
        activity = 'walking-to-desk';
        targetProgress = 0;
        timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * position);
      } else if (activity === 'walking-to-desk') {
        activity = 'attending';
        targetProgress = 0;
        timeRemaining = duration(6, 10);
      } else {
        activity = 'walking-to-window';
        targetProgress = 1;
        timeRemaining = ROOM_WALK_DURATION_SECONDS;
      }

      return snapshot();
    },
  };
}

export function createRoomRouteMotion() {
  let previousActivity: RoomActivity | undefined;
  let startProgress = 0;
  let targetProgress = 0;
  let duration = ROOM_WALK_DURATION_SECONDS;
  let elapsed = 0;

  return {
    update(activity: RoomActivity, deltaSeconds: number, currentProgress: number): number {
      if (activity !== 'walking-to-window' && activity !== 'walking-to-desk') {
        previousActivity = undefined;
        return clamp(currentProgress, 0, 1);
      }

      if (activity !== previousActivity) {
        previousActivity = activity;
        startProgress = clamp(currentProgress, 0, 1);
        targetProgress = activity === 'walking-to-window' ? 1 : 0;
        duration = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * Math.abs(targetProgress - startProgress));
        elapsed = 0;
      }

      elapsed = Math.min(duration, elapsed + clamp(deltaSeconds, 0, 0.05));
      const t = elapsed / duration;
      const eased = t * t * (3 - 2 * t);
      return startProgress + (targetProgress - startProgress) * eased;
    },
  };
}
