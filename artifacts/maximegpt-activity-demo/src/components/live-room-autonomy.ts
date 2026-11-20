export type RoomActivity =
  | 'walking-to-window'
  | 'looking-out-window'
  | 'walking-to-desk'
  | 'walking-to-bed'
  | 'walking-from-bed'
  | 'falling-asleep'
  | 'sleeping'
  | 'waking-up'
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
const BEDTIME_HOUR = 23;
const WAKE_HOUR = 7;

function isSleepTime(now: Date): boolean {
  const hour = now.getHours();
  return hour >= BEDTIME_HOUR || hour < WAKE_HOUR;
}

function secondsUntilWake(now: Date): number {
  const wake = new Date(now);
  wake.setHours(WAKE_HOUR, 0, 0, 0);
  if (wake.getTime() <= now.getTime()) wake.setDate(wake.getDate() + 1);
  return Math.max(1, (wake.getTime() - now.getTime()) / 1000);
}

function isWalking(candidate: RoomActivity): boolean {
  return candidate === 'walking-to-window'
    || candidate === 'walking-to-desk'
    || candidate === 'walking-to-bed'
    || candidate === 'walking-from-bed';
}

function isBedRoutine(candidate: RoomActivity): boolean {
  return candidate === 'walking-to-bed'
    || candidate === 'walking-from-bed'
    || candidate === 'falling-asleep'
    || candidate === 'sleeping'
    || candidate === 'waking-up';
}

function targetProgressForActivity(candidate: RoomActivity): number {
  return candidate === 'walking-to-window' || candidate === 'walking-to-bed' ? 1 : 0;
}

/**
 * Runs a small bedroom routine. Walking only ends at an intentional activity
 * (desk or window); talking does not interrupt the routine.
 */
export function createRoomAutonomy(
  random: () => number = Math.random,
  now: () => Date = () => new Date(),
) {
  const unit = () => {
    const value = random();
    return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0;
  };
  const duration = (min: number, max: number) => min + unit() * (max - min);

  let activity: RoomActivity = isSleepTime(now()) ? 'walking-to-bed' : 'playing-at-desk';
  let targetProgress = targetProgressForActivity(activity);
  let timeRemaining = activity === 'playing-at-desk' ? duration(7, 12) : 0;
  let wasEngaged = false;
  let resumeActivity: RoomActivity = activity;
  let resumeTimeRemaining = timeRemaining;

  const snapshot = (): RoomActivitySnapshot => ({ activity, targetProgress, seated: false });
  return {
    current(): RoomActivitySnapshot {
      return snapshot();
    },
    update(
      deltaSeconds: number,
      pageHidden: boolean,
      motionEnabled: boolean,
      currentProgress: number,
    ): RoomActivitySnapshot {
      const delta = Number.isFinite(deltaSeconds) ? clamp(deltaSeconds, 0, 0.05) : 0;
      const position = Number.isFinite(currentProgress) ? clamp(currentProgress, 0, 1) : 0;
      const localTime = now();

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
        targetProgress = isWalking(resumeActivity)
          ? targetProgressForActivity(resumeActivity)
          : position;
        timeRemaining = resumeActivity === 'sleeping'
          ? secondsUntilWake(localTime)
          : resumeTimeRemaining;
        return snapshot();
      }

      if (!motionEnabled) return snapshot();

      if (activity === 'sleeping' && !isSleepTime(localTime)) {
        activity = 'waking-up';
        targetProgress = 1;
        timeRemaining = duration(2, 3);
        return snapshot();
      }
      if (isSleepTime(localTime) && !isBedRoutine(activity) && !isWalking(activity)) {
        activity = 'walking-to-bed';
        targetProgress = 1;
        timeRemaining = 0;
        return snapshot();
      }

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
        } else if (activity === 'walking-to-bed') {
          activity = 'falling-asleep';
          targetProgress = 1;
          timeRemaining = duration(1.8, 2.8);
        } else if (activity === 'walking-from-bed') {
          activity = 'playing-at-desk';
          targetProgress = 0;
          timeRemaining = duration(7, 12);
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
      } else if (activity === 'falling-asleep') {
        activity = 'sleeping';
        targetProgress = 1;
        timeRemaining = secondsUntilWake(localTime);
      } else if (activity === 'sleeping') {
        activity = 'waking-up';
        targetProgress = 1;
        timeRemaining = duration(2, 3);
      } else if (activity === 'waking-up') {
        activity = 'walking-from-bed';
        targetProgress = 0;
        timeRemaining = 0;
      } else if (activity === 'stretching') {
        activity = 'walking-to-window';
      } else if (unit() < 0.4) {
        activity = 'stretching';
      } else {
        activity = 'walking-to-window';
      }
      targetProgress = targetProgressForActivity(activity);
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
      if (!isWalking(activity)) {
        previousActivity = undefined;
        return clamp(currentProgress, 0, 1);
      }

      if (activity !== previousActivity) {
        previousActivity = activity;
        startProgress = clamp(currentProgress, 0, 1);
        targetProgress = targetProgressForActivity(activity);
        duration = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * Math.abs(targetProgress - startProgress));
        elapsed = 0;
      }

      elapsed = Math.min(duration, elapsed + clamp(deltaSeconds, 0, 0.05));
      const t = elapsed / duration;
      // Quintic minimum-jerk easing has zero velocity and acceleration at
      // both ends, reducing the visible lurch when a walk starts or stops.
      const eased = t * t * t * (t * (t * 6 - 15) + 10);
      return clamp(startProgress + (targetProgress - startProgress) * eased, 0, 1);
    },
  };
}
