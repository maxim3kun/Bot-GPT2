import { Object3D, Quaternion, Vector3 } from 'three';

export interface FootLockState {
  planted: boolean;
  anchor: Vector3;
}

export interface LegIkChain {
  upperLeg: Object3D;
  lowerLeg: Object3D;
  foot: Object3D;
  anchor: Vector3;
  footRestWorldQuaternion: Quaternion;
}

const EPSILON = 1e-5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createFootLockState(): FootLockState {
  return { planted: false, anchor: new Vector3() };
}

/** Capture a foot's world position at heel contact and keep its ankle at floor height. */
export function updateFootLock(
  state: FootLockState,
  stance: boolean,
  foot: Object3D,
  groundAnkleHeight: number,
): FootLockState {
  if (!stance) {
    state.planted = false;
    return state;
  }

  if (!state.planted) {
    foot.updateWorldMatrix(true, false);
    foot.getWorldPosition(state.anchor);
    state.anchor.y = groundAnkleHeight;
    state.planted = true;
  }
  return state;
}

function rotateBoneToMatchVector(bone: Object3D, current: Vector3, target: Vector3): void {
  if (current.lengthSq() < EPSILON || target.lengthSq() < EPSILON) return;
  const delta = new Quaternion().setFromUnitVectors(current.normalize(), target.normalize());
  const worldRotation = bone.getWorldQuaternion(new Quaternion());
  worldRotation.premultiply(delta);
  const parentRotation = bone.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion();
  bone.quaternion.copy(parentRotation.invert().multiply(worldRotation).normalize());
  bone.updateWorldMatrix(false, true);
}

/**
 * Two-bone analytic IK for a planted ankle. The current knee direction is
 * used as the pole so the knee keeps bending in the same forward-facing plane.
 */
export function solveGroundedLeg(chain: LegIkChain): boolean {
  const { upperLeg, lowerLeg, foot, anchor, footRestWorldQuaternion } = chain;
  upperLeg.updateWorldMatrix(true, true);

  const hipPosition = upperLeg.getWorldPosition(new Vector3());
  const kneePosition = lowerLeg.getWorldPosition(new Vector3());
  const anklePosition = foot.getWorldPosition(new Vector3());
  const upperLength = hipPosition.distanceTo(kneePosition);
  const lowerLength = kneePosition.distanceTo(anklePosition);
  if (upperLength < EPSILON || lowerLength < EPSILON) return false;

  const hipToTarget = anchor.clone().sub(hipPosition);
  const rawDistance = hipToTarget.length();
  if (rawDistance < EPSILON) return false;
  const minReach = Math.abs(upperLength - lowerLength) + EPSILON;
  const maxReach = upperLength + lowerLength - EPSILON;
  const distance = clamp(rawDistance, minReach, maxReach);
  const direction = hipToTarget.normalize();

  const pole = kneePosition.clone().sub(hipPosition);
  pole.addScaledVector(direction, -pole.dot(direction));
  if (pole.lengthSq() < EPSILON) {
    pole.set(0, 0, 1).addScaledVector(direction, -direction.z);
  }
  if (pole.lengthSq() < EPSILON) {
    pole.set(1, 0, 0).addScaledVector(direction, -direction.x);
  }
  pole.normalize();

  const along = clamp(
    (upperLength * upperLength + distance * distance - lowerLength * lowerLength)
      / (2 * upperLength * distance),
    -1,
    1,
  ) * upperLength;
  const perpendicular = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  const desiredKnee = hipPosition
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(pole, perpendicular);

  rotateBoneToMatchVector(
    upperLeg,
    kneePosition.clone().sub(hipPosition),
    desiredKnee.clone().sub(hipPosition),
  );

  const solvedKneePosition = lowerLeg.getWorldPosition(new Vector3());
  const solvedAnklePosition = foot.getWorldPosition(new Vector3());
  rotateBoneToMatchVector(
    lowerLeg,
    solvedAnklePosition.clone().sub(solvedKneePosition),
    anchor.clone().sub(solvedKneePosition),
  );

  if (foot.parent) {
    foot.parent.updateWorldMatrix(true, false);
    const parentRotation = foot.parent.getWorldQuaternion(new Quaternion());
    foot.quaternion.copy(parentRotation.invert().multiply(footRestWorldQuaternion).normalize());
    foot.updateWorldMatrix(false, true);
  }

  return true;
}
