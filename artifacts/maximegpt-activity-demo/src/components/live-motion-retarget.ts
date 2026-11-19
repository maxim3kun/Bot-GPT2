import { Quaternion } from 'three';

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

