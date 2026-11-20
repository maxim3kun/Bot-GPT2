export type RoomActivity =
  | 'walking-to-window'
  | 'looking-out-window'
  | 'walking-to-desk'
  | 'checking-plant'
  | 'playing-at-desk'
  | 'stretching'
  | 'attending';

export interface RoomActivitySnapshot {
  activity: RoomActivity;
  targetProgress: number;
  seated: false;
}

// Slightly longer traversals leave room for the feet to settle naturally.
export const ROOM_WALK_DURATION_SECONDS = 3.2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Runs a small bedroom routine. Walking only ends at an intentional activity
 * (desk or window); talking does not interrupt the routine.
 */
export function createRoomAutonomy(random: () => number = Math.random) {
  const unit = () => {
    const value = random();
    return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0;
  };
  const duration = (min: number, max: number) => min + unit() * (max - min);

  let activity: RoomActivity = 'playing-at-desk';
  let targetProgress = 0;
  let timeRemaining = duration(7, 12);
  let wasEngaged = false;
  let resumeActivity: RoomActivity = activity;
  let resumeTimeRemaining = timeRemaining;

  const snapshot = (): RoomActivitySnapshot => ({ activity, targetProgress, seated: false });
  const isWalking = (candidate: RoomActivity) =>
    candidate === 'walking-to-window' || candidate === 'walking-to-desk';

  return {
    update(
      deltaSeconds: number,
      pageHidden: boolean,
      motionEnabled: boolean,
      currentProgress: number,
    ): RoomActivitySnapshot {
      const delta = Number.isFinite(deltaSeconds) ? clamp(deltaSeconds, 0, 0.05) : 0;
      const position = Number.isFinite(currentProgress) ? clamp(currentProgress, 0, 1) : 0;

      if (pageHidden) {
        if (!wasEngaged) {
          resumeActivity = activity;
          resumeTimeRemaining = timeRemaining;
        }
        wasEngaged = true;
        activity = 'attending';
        targetProgress = position;
        return snapshot();
      }

      if (wasEngaged) {
        wasEngaged = false;
        activity = resumeActivity;
        targetProgress = resumeActivity === 'walking-to-window'
          ? 1
          : resumeActivity === 'walking-to-desk'
            ? 0
            : position;
        timeRemaining = resumeTimeRemaining;
        return snapshot();
      }

      if (!motionEnabled) return snapshot();

      if (isWalking(activity)) {
        if (Math.abs(position - targetProgress) > 0.001) return snapshot();
        if (activity === 'walking-to-window') {
          activity = 'looking-out-window';
          targetProgress = 1;
          timeRemaining = duration(5, 9);
        } else if (activity === 'walking-to-desk') {
          activity = 'checking-plant';
          targetProgress = 0;
          timeRemaining = duration(4, 7);
        } else {
          activity = 'playing-at-desk';
          targetProgress = 0;
          timeRemaining = duration(7, 12);
        }
        return snapshot();
      }

      timeRemaining -= delta;
      if (timeRemaining > 0) return snapshot();

      if (activity === 'looking-out-window') {
        activity = 'walking-to-desk';
      } else if (activity === 'checking-plant') {
        activity = 'playing-at-desk';
      } else if (activity === 'stretching') {
        activity = 'walking-to-window';
      } else if (unit() < 0.4) {
        activity = 'stretching';
      } else {
        activity = 'walking-to-window';
      }
      targetProgress = activity === 'walking-to-window' ? 1 : 0;
      if (activity === 'stretching') timeRemaining = duration(3.5, 5.5);
      else if (activity === 'playing-at-desk') timeRemaining = duration(7, 12);
      else timeRemaining = 0;

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
        && activity !== 'walking-to-desk'
      ) {
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
      // Quintic minimum-jerk easing has zero velocity and acceleration at
      // both ends, reducing the visible lurch when a walk starts or stops.
      const eased = t * t * t * (t * (t * 6 - 15) + 10);
      return startProgress + (targetProgress - startProgress) * eased;
    },
  };
}
