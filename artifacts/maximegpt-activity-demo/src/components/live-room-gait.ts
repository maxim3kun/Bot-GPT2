import { Quaternion } from 'three';

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

export interface RoomRoutePoint {
  x: number;
  z: number;
}

export interface RoomRotationTrack {
  bone: string;
  values: readonly number[];
}

export interface RoomWalkClip {
  duration: number;
  times: readonly number[];
  tracks: readonly RoomRotationTrack[];
}

export const ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO = 0.64;

const TWO_PI = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function roomRouteLength(points: readonly RoomRoutePoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    length += Math.hypot(current.x - previous.x, current.z - previous.z);
  }
  return length;
}

/**
 * Convert real movement distance into repeated gait cycles. The cycle is
 * distance-driven so a short route does not stretch one step across the room.
 */
export function roomWalkCyclesForDistance(distance: number, avatarHeight: number): number {
  const strideLength = Math.max(avatarHeight, 0) * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO;
  if (!Number.isFinite(distance) || !Number.isFinite(strideLength) || strideLength <= 1e-8) return 0;
  return Math.max(0, distance) / strideLength;
}

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

/**
 * Retarget a source walk by applying its rotation changes relative to its
 * first pose. This preserves the VRM's own rest pose instead of copying the
 * source rig's absolute arm and leg angles.
 */
export function applyRetargetedWalkAnimation(
  clip: RoomWalkClip,
  bones: ReadonlyMap<string, { quaternion: Quaternion }>,
  baseQuaternions: ReadonlyMap<string, Quaternion>,
  seconds: number,
  intensity = 0.2,
  allowedBones?: ReadonlySet<string>,
): void {
  if (clip.duration <= 0 || clip.times.length < 2) return;
  const time = ((seconds % clip.duration) + clip.duration) % clip.duration;
  let upperFrame = 1;
  while (upperFrame < clip.times.length - 1 && clip.times[upperFrame]! <= time) {
    upperFrame += 1;
  }
  const lowerFrame = upperFrame - 1;
  const lowerTime = clip.times[lowerFrame] ?? 0;
  const upperTime = clip.times[upperFrame] ?? clip.duration;
  const frameBlend = upperTime > lowerTime
    ? clamp((time - lowerTime) / (upperTime - lowerTime), 0, 1)
    : 0;
  const sourceFirstPose = new Quaternion();
  const sourceCurrentPose = new Quaternion();
  const sourceNextPose = new Quaternion();
  const sourceDelta = new Quaternion();
  const scaledDelta = new Quaternion();
  const target = new Quaternion();

  for (const track of clip.tracks) {
    if (allowedBones && !allowedBones.has(track.bone)) continue;
    const bone = bones.get(track.bone);
    const base = baseQuaternions.get(track.bone);
    if (!bone || !base || track.values.length < clip.times.length * 4) continue;

    const readFrame = (frame: number, output: Quaternion) => {
      const offset = frame * 4;
      return output.set(
        track.values[offset] ?? 0,
        track.values[offset + 1] ?? 0,
        track.values[offset + 2] ?? 0,
        track.values[offset + 3] ?? 1,
      ).normalize();
    };

    readFrame(0, sourceFirstPose);
    readFrame(lowerFrame, sourceCurrentPose);
    readFrame(upperFrame, sourceNextPose);
    sourceCurrentPose.slerp(sourceNextPose, frameBlend);
    sourceDelta.copy(sourceFirstPose).invert().multiply(sourceCurrentPose);
    scaledDelta.identity().slerp(sourceDelta, clamp(intensity, 0, 1));
    target.copy(base).multiply(scaledDelta).normalize();
    bone.quaternion.copy(target);
  }
}

export function routeProgressFromPosition(
  x: number,
  z: number,
  points: readonly RoomRoutePoint[],
): number {
  if (points.length < 2) return 0;
  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    totalLength += Math.hypot(current.x - previous.x, current.z - previous.z);
  }
  if (totalLength <= 1e-8) return 0;

  let distanceBefore = 0;
  let nearestDistanceSquared = Infinity;
  let nearestProgress = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const dx = current.x - previous.x;
    const dz = current.z - previous.z;
    const segmentLength = Math.hypot(dx, dz);
    const lengthSquared = segmentLength * segmentLength;
    if (lengthSquared <= 1e-8) continue;

    const projection = clamp(((x - previous.x) * dx + (z - previous.z) * dz) / lengthSquared, 0, 1);
    const offsetX = x - (previous.x + dx * projection);
    const offsetZ = z - (previous.z + dz * projection);
    const distanceSquared = offsetX * offsetX + offsetZ * offsetZ;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestProgress = (distanceBefore + segmentLength * projection) / totalLength;
    }
    distanceBefore += segmentLength;
  }
  return clamp(nearestProgress, 0, 1);
}

export function roomRoutePointAtProgress(
  points: readonly RoomRoutePoint[],
  progress: number,
): RoomRoutePoint {
  if (points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return points[0]!;

  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    totalLength += Math.hypot(current.x - previous.x, current.z - previous.z);
  }
  if (totalLength <= 1e-8) return points[0]!;

  let remaining = clamp(progress, 0, 1) * totalLength;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const segmentLength = Math.hypot(current.x - previous.x, current.z - previous.z);
    if (segmentLength <= 1e-8) continue;
    if (remaining <= segmentLength) {
      const ratio = remaining / segmentLength;
      return {
        x: previous.x + (current.x - previous.x) * ratio,
        z: previous.z + (current.z - previous.z) * ratio,
      };
    }
    remaining -= segmentLength;
  }
  return points[points.length - 1]!;
}

export function roomWalkTimeForProgress(progress: number, duration: number): number {
  return clamp(progress, 0, 1) * Math.max(0, duration);
}
