export type RoomActivity =
  | 'working'
  | 'stretching'
  | 'walking-to-window'
  | 'looking-out-window'
  | 'walking-to-desk'
  | 'attending';

export interface RoomActivitySnapshot {
  activity: RoomActivity;
  targetProgress: number;
}

type ActivityPlan = 'work' | 'stretch' | 'window-break';

const WALK_DURATION_SECONDS = 4.4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

  let activity: RoomActivity = 'working';
  let targetProgress = 0;
  let timeRemaining = duration(8, 13);
  let lastPlan: ActivityPlan = 'work';
  let wasEngaged = false;
  let returnToDeskAfterInteraction = false;

  const chooseNextPlan = () => {
    const plans: ActivityPlan[] = ['work', 'stretch', 'window-break'];
    const alternatives = plans.filter((plan) => plan !== lastPlan);
    const nextPlan = alternatives[Math.floor(unit() * alternatives.length)]!;
    lastPlan = nextPlan;

    if (nextPlan === 'work') {
      activity = 'working';
      targetProgress = 0;
      timeRemaining = duration(8, 16);
      return;
    }
    if (nextPlan === 'stretch') {
      activity = 'stretching';
      targetProgress = 0;
      timeRemaining = duration(3, 5);
      return;
    }

    activity = 'walking-to-window';
    targetProgress = 1;
    timeRemaining = WALK_DURATION_SECONDS;
  };

  const snapshot = (): RoomActivitySnapshot => ({ activity, targetProgress });

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
          activity = 'working';
          targetProgress = position;
          lastPlan = 'work';
          timeRemaining = duration(8, 13);
          return snapshot();
        }
        if (position > 0.04 || returnToDeskAfterInteraction) {
          activity = 'walking-to-desk';
          targetProgress = 0;
          timeRemaining = Math.max(1.4, WALK_DURATION_SECONDS * position);
          returnToDeskAfterInteraction = false;
          return snapshot();
        }
        returnToDeskAfterInteraction = false;
        chooseNextPlan();
        return snapshot();
      }

      if (!motionEnabled) {
        // Keep the current position while reduced motion is enabled.
        return { activity, targetProgress: position };
      }
      if (returnToDeskAfterInteraction) {
        returnToDeskAfterInteraction = false;
        activity = 'walking-to-desk';
        targetProgress = 0;
        timeRemaining = Math.max(1.4, WALK_DURATION_SECONDS * position);
        return snapshot();
      }

      timeRemaining -= delta;
      if (timeRemaining <= 0) {
        if (activity === 'walking-to-window') {
          activity = 'looking-out-window';
          targetProgress = 1;
          timeRemaining = duration(4, 8);
        } else if (activity === 'looking-out-window') {
          activity = 'walking-to-desk';
          targetProgress = 0;
          timeRemaining = WALK_DURATION_SECONDS;
        } else {
          chooseNextPlan();
        }
      }

      return snapshot();
    },
  };
}
