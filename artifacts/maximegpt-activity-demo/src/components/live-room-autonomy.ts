export type RoomActivity =
  | 'sitting-down'
  | 'working-seated'
  | 'standing-up'
  | 'stretching'
  | 'walking-to-window'
  | 'looking-out-window'
  | 'walking-to-desk'
  | 'attending';

export interface RoomActivitySnapshot {
  activity: RoomActivity;
  targetProgress: number;
  seated: boolean;
}

type ActivityPlan = 'work' | 'stretch' | 'window-break';

export const ROOM_WALK_DURATION_SECONDS = 3.4;
export const ROOM_SIT_TRANSITION_SECONDS = 1.05;
export const ROOM_STAND_TRANSITION_SECONDS = 0.9;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Advances the avatar over the same interval as its looping walk clip.
 * Smooth acceleration and braking keep the feet from sliding against the floor.
 */
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

/**
 * Chooses from a small, local set of bedroom activities. It is intentionally
 * independent of AI output, storage, and network calls.
 */
export function createRoomAutonomy(random: () => number = Math.random) {
  const unit = () => {
    const value = random();
    return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0;
  };
  const duration = (min: number, max: number) => min + unit() * (max - min);

  let activity: RoomActivity = 'sitting-down';
  let targetProgress = 0;
  let timeRemaining = ROOM_SIT_TRANSITION_SECONDS;
  let seated = true;
  let lastPlan: ActivityPlan = 'work';
  let wasEngaged = false;
  let returnToDeskAfterInteraction = false;
  let activityAfterStanding: 'stretching' | 'walking-to-window' | undefined;

  const snapshot = (): RoomActivitySnapshot => ({ activity, targetProgress, seated });

  const beginSitting = () => {
    activity = 'sitting-down';
    seated = true;
    activityAfterStanding = undefined;
    timeRemaining = ROOM_SIT_TRANSITION_SECONDS;
  };

  const beginStanding = (next: 'stretching' | 'walking-to-window') => {
    activity = 'standing-up';
    seated = false;
    activityAfterStanding = next;
    timeRemaining = ROOM_STAND_TRANSITION_SECONDS;
  };

  const beginWorking = (min = 8, max = 16) => {
    activity = 'working-seated';
    seated = true;
    activityAfterStanding = undefined;
    targetProgress = 0;
    timeRemaining = duration(min, max);
  };

  const chooseNextPlan = () => {
    const plans: ActivityPlan[] = ['work', 'stretch', 'window-break'];
    const alternatives = plans.filter((plan) => plan !== lastPlan);
    const nextPlan = alternatives[Math.floor(unit() * alternatives.length)]!;
    lastPlan = nextPlan;

    if (nextPlan === 'work') {
      beginSitting();
      return;
    }
    if (nextPlan === 'stretch') {
      beginStanding('stretching');
      targetProgress = 0;
      return;
    }

    beginStanding('walking-to-window');
  };

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
        if (!wasEngaged) {
          returnToDeskAfterInteraction = position > 0.04
            || activity === 'walking-to-window'
            || activity === 'looking-out-window';
        }
        wasEngaged = true;
        activity = 'attending';
        targetProgress = position;
        return snapshot();
      }

      if (wasEngaged) {
        wasEngaged = false;
        returnToDeskAfterInteraction ||= position > 0.04;
        if (!motionEnabled) {
          activity = 'working-seated';
          seated = true;
          targetProgress = position;
          activityAfterStanding = undefined;
          lastPlan = 'work';
          timeRemaining = duration(8, 13);
          returnToDeskAfterInteraction = false;
          return snapshot();
        }
        if (position > 0.04 || returnToDeskAfterInteraction) {
          activity = 'walking-to-desk';
          seated = false;
          activityAfterStanding = undefined;
          targetProgress = 0;
          timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * position);
          returnToDeskAfterInteraction = false;
          return snapshot();
        }
        if (seated) {
          beginWorking(4, 8);
          return snapshot();
        }
        returnToDeskAfterInteraction = false;
        chooseNextPlan();
        return snapshot();
      }

      if (!motionEnabled) {
        // Keep the current position while reduced motion is enabled.
        if (activity === 'sitting-down') {
          beginWorking();
        } else if (activity === 'standing-up') {
          // Do not begin a walk or stretch when motion is reduced; settle at the desk.
          activityAfterStanding = undefined;
          beginWorking();
        }
        return { ...snapshot(), targetProgress: position };
      }
      if (returnToDeskAfterInteraction) {
        returnToDeskAfterInteraction = false;
        activity = 'walking-to-desk';
        targetProgress = 0;
        timeRemaining = Math.max(1.4, ROOM_WALK_DURATION_SECONDS * position);
        return snapshot();
      }

      timeRemaining -= delta;
      if (timeRemaining <= 0) {
        if (activity === 'sitting-down') {
          beginWorking();
        } else if (activity === 'standing-up') {
          const nextActivity = activityAfterStanding;
          activityAfterStanding = undefined;
          if (nextActivity === 'stretching') {
            activity = 'stretching';
            timeRemaining = duration(3, 5);
          } else if (nextActivity === 'walking-to-window') {
            activity = 'walking-to-window';
            targetProgress = 1;
            timeRemaining = ROOM_WALK_DURATION_SECONDS;
          } else {
            beginSitting();
          }
        } else if (activity === 'walking-to-window') {
          activity = 'looking-out-window';
          seated = false;
          targetProgress = 1;
          timeRemaining = duration(4, 8);
        } else if (activity === 'looking-out-window') {
          activity = 'walking-to-desk';
          seated = false;
          targetProgress = 0;
          timeRemaining = ROOM_WALK_DURATION_SECONDS;
        } else if (activity === 'walking-to-desk') {
          beginSitting();
        } else if (activity === 'stretching') {
          beginSitting();
        } else {
          chooseNextPlan();
        }
      }

      return snapshot();
    },
  };
}
