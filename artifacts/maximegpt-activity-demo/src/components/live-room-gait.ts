export const ROOM_WALK_CYCLE_SECONDS = 1.9;

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
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * A deliberately restrained walk cycle for this specific VRM.
 * Phase is driven by route distance, not wall-clock time, so the steps stay
 * coupled to the character's movement through the room.
 */
export function getRoomWalkPose(seconds: number): RoomWalkPose {
  const cycle = ((seconds % ROOM_WALK_CYCLE_SECONDS) + ROOM_WALK_CYCLE_SECONDS)
    % ROOM_WALK_CYCLE_SECONDS;
  const phase = TWO_PI * cycle / ROOM_WALK_CYCLE_SECONDS;
  const stride = Math.sin(phase);
  const leftLift = Math.max(0, -Math.cos(phase));
  const rightLift = Math.max(0, Math.cos(phase));

  return {
    leftHip: stride * 0.16,
    rightHip: -stride * 0.16,
    leftKnee: leftLift * 0.2,
    rightKnee: rightLift * 0.2,
    leftFoot: -leftLift * 0.075,
    rightFoot: -rightLift * 0.075,
    leftArmSwing: -stride * 0.075,
    rightArmSwing: stride * 0.075,
    bodyBob: (1 - Math.cos(phase * 2)) * 0.0012,
    torsoTwist: -stride * 0.014,
  };
}

export function routeProgressFromPosition(
  x: number,
  z: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
): number {
  const dx = endX - startX;
  const dz = endZ - startZ;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-8) return 0;
  return clamp(((x - startX) * dx + (z - startZ) * dz) / lengthSquared, 0, 1);
}

export function roomWalkTimeForProgress(progress: number, duration: number): number {
  return clamp(progress, 0, 1) * Math.max(0, duration);
}
