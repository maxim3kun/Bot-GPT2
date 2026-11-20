import { Quaternion } from 'three';

const PROCEDURAL_GAIT_BONES = new Set([
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerLeg',
  'rightLowerLeg',
  'leftFoot',
  'rightFoot',
]);

/** Keep the idle source from replacing the grounded gait pose on moving frames. */
export function shouldRetargetIdleBone(boneName: string, moving: boolean): boolean {
  return !moving || !PROCEDURAL_GAIT_BONES.has(boneName);
}

/**
 * Transfer a joint's animated rotation without copying the source model's
 * absolute pose. The source motion is measured from its own neutral pose and
 * then applied on top of the user's VRM rest pose.
 */
export function retargetJointRotation(
  sourceRest: Quaternion,
  sourcePose: Quaternion,
  targetRest: Quaternion,
  output: Quaternion,
  scratch: Quaternion,
): Quaternion {
  scratch.copy(sourceRest).invert().multiply(sourcePose);
  return output.copy(targetRest).multiply(scratch).normalize();
}

