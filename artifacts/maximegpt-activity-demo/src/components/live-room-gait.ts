export const ROOM_WALK_CYCLE_SECONDS = 1.25;

export interface RoomWalkPose {
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftFoot: number;
  rightFoot: number;
  leftArmSwing: number;
  rightArmSwing: number;
  bodyBob: number;
  torsoTwist: number;
}

const TWO_PI = Math.PI * 2;

/**
 * Small, opposing joint movements for a relaxed walk. Arm abduction is
 * intentionally left to the avatar's neutral pose rather than a mismatched clip.
 */
export function getRoomWalkPose(seconds: number): RoomWalkPose {
  const cycle = ((seconds % ROOM_WALK_CYCLE_SECONDS) + ROOM_WALK_CYCLE_SECONDS)
    % ROOM_WALK_CYCLE_SECONDS;
  const phase = TWO_PI * cycle / ROOM_WALK_CYCLE_SECONDS;
  const stride = Math.sin(phase);
  const leftLift = Math.max(0, -Math.cos(phase));
  const rightLift = Math.max(0, Math.cos(phase));

  return {
    leftHip: stride * 0.28,
    rightHip: -stride * 0.28,
    leftKnee: leftLift * 0.42,
    rightKnee: rightLift * 0.42,
    leftFoot: -leftLift * 0.15,
    rightFoot: -rightLift * 0.15,
    leftArmSwing: -stride * 0.12,
    rightArmSwing: stride * 0.12,
    bodyBob: (1 - Math.cos(phase * 2)) * 0.004,
    torsoTwist: -stride * 0.025,
  };
}
