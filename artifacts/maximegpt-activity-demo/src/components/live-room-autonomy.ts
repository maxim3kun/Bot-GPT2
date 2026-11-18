export type RoomActivity =
  | 'walking-to-window'
  | 'looking-out-window'
  | 'walking-to-room-center'
  | 'looking-around'
  | 'walking-to-desk'
  | 'attending';

export interface RoomActivitySnapshot {
  activity: RoomActivity;
  targetProgress: number;
  seated: false;
}

export const ROOM_WALK_DURATION_SECONDS = 1.9;
export const ROOM_CENTER_PROGRESS = 0.39;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Chooses among safe stops on the room route. It selects destinations only;
 * the route controller handles the actual movement between them.
 */
export function createRoomAutonomy(random: () => number = Math.random) {
  const unit = () => {
    const value = random();
    return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0;
  };
  const duration = (min: number, max: number) => min + unit() * (max - min);

  let activity: RoomActivity = 'attending';
  let targetProgress = 0;
  let timeRemaining = duration(2, 4);
  let centerNext: 'window' | 'desk' = 'window';
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

      if (activity === 'walking-to-room-center') {
        activity = 'looking-around';
        targetProgress = ROOM_CENTER_PROGRESS;
        timeRemaining = duration(2, 4);
      } else if (activity === 'looking-around') {
        if (centerNext === 'window') {
          activity = 'walking-to-window';
          targetProgress = 1;
          timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * (1 - position));
        } else {
          activity = 'walking-to-desk';
          targetProgress = 0;
          timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * position);
        }
      } else if (activity === 'walking-to-window') {
        activity = 'looking-out-window';
        targetProgress = 1;
        timeRemaining = duration(4, 7);
      } else if (activity === 'looking-out-window') {
        activity = 'walking-to-room-center';
        targetProgress = ROOM_CENTER_PROGRESS;
        centerNext = 'desk';
        timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * Math.abs(position - ROOM_CENTER_PROGRESS));
      } else if (activity === 'walking-to-desk') {
        activity = 'attending';
        targetProgress = 0;
        timeRemaining = duration(6, 10);
      } else {
        activity = 'walking-to-room-center';
        targetProgress = ROOM_CENTER_PROGRESS;
        centerNext = 'window';
        timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * Math.abs(position - ROOM_CENTER_PROGRESS));
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
      if (
        activity !== 'walking-to-window'
        && activity !== 'walking-to-room-center'
        && activity !== 'walking-to-desk'
      ) {
        previousActivity = undefined;
        return clamp(currentProgress, 0, 1);
      }

      if (activity !== previousActivity) {
        previousActivity = activity;
        startProgress = clamp(currentProgress, 0, 1);
        targetProgress = activity === 'walking-to-window'
          ? 1
          : activity === 'walking-to-room-center'
            ? ROOM_CENTER_PROGRESS
            : 0;
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
