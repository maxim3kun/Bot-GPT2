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
  pelvisSway: number;
  bodyBob: number;
  torsoTwist: number;
}

export interface RoomWalkFootPhase {
  leftStance: boolean;
  rightStance: boolean;
  leftSwingProgress: number;
  rightSwingProgress: number;
}

export interface RoomRoutePoint {
  x: number;
  z: number;
}

export function createQuadraticRoomRoute(
  start: RoomRoutePoint,
  control: RoomRoutePoint,
  end: RoomRoutePoint,
  segments = 28,
): RoomRoutePoint[] {
  const safeSegments = Math.max(2, Math.floor(segments));
  return Array.from({ length: safeSegments + 1 }, (_, index) => {
    const t = index / safeSegments;
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      z: inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z,
    };
  });
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

export const ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO = 0.42;

const TWO_PI = Math.PI * 2;
const LEFT_SWING_START = 0.12;
const LEFT_SWING_END = 0.5;
const RIGHT_SWING_START = 0.62;
const RIGHT_SWING_END = 1;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function swingProgress(phase: number, start: number, end: number): number {
  return phase >= start && phase < end
    ? clamp((phase - start) / (end - start), 0, 1)
    : 0;
}

export function getRoomWalkFootPhase(cycles: number): RoomWalkFootPhase {
  const phase = ((cycles % 1) + 1) % 1;
  const leftSwingProgress = swingProgress(phase, LEFT_SWING_START, LEFT_SWING_END);
  const rightSwingProgress = swingProgress(phase, RIGHT_SWING_START, RIGHT_SWING_END);
  return {
    leftStance: leftSwingProgress === 0,
    rightStance: rightSwingProgress === 0,
    leftSwingProgress,
    rightSwingProgress,
  };
}

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
 * Choose a stride length for a particular walk so the avatar reaches a stable
 * step phase at the destination instead of stopping halfway through a stride.
 */
export function roomWalkStrideLengthForSegment(distance: number, avatarHeight: number): number {
  const safeHeight = Math.max(0, avatarHeight);
  const safeDistance = Math.max(0, distance);
  const nominalStrideLength = safeHeight * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO;
  if (
    !Number.isFinite(safeDistance)
    || !Number.isFinite(nominalStrideLength)
    || nominalStrideLength <= 1e-8
  ) {
    return 0;
  }
  if (safeDistance <= 1e-8) return nominalStrideLength;

  const completeCycles = Math.max(1, Math.round(safeDistance / nominalStrideLength));
  return safeDistance / completeCycles;
}

export function roomWalkCyclesForSegmentDistance(
  distance: number,
  segmentDistance: number,
  avatarHeight: number,
): number {
  if (!Number.isFinite(distance) || !Number.isFinite(segmentDistance) || segmentDistance <= 1e-8) {
    return roomWalkCyclesForDistance(distance, avatarHeight);
  }
  const nominalStrideLength = Math.max(0, avatarHeight) * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO;
  if (nominalStrideLength <= 1e-8) return 0;
  const completeCycles = Math.max(1, Math.round(segmentDistance / nominalStrideLength));
  return clamp(distance / segmentDistance, 0, 1) * completeCycles;
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
  const gaitPhase = cycle / ROOM_WALK_CYCLE_SECONDS;
  const leftSwing = swingProgress(gaitPhase, LEFT_SWING_START, LEFT_SWING_END);
  const rightSwing = swingProgress(gaitPhase, RIGHT_SWING_START, RIGHT_SWING_END);
  const leftLift = Math.sin(Math.PI * leftSwing);
  const rightLift = Math.sin(Math.PI * rightSwing);

  return {
    leftHip: stride * 0.13,
    rightHip: -stride * 0.13,
    leftKnee: leftLift * 0.32,
    rightKnee: rightLift * 0.32,
    leftFoot: -leftLift * 0.055,
    rightFoot: -rightLift * 0.055,
    leftArmSwing: -stride * 0.14,
    rightArmSwing: stride * 0.14,
    pelvisSway: Math.sin(phase * 2) * 0.016,
    bodyBob: (1 - Math.cos(phase * 2)) * 0.007,
    torsoTwist: -stride * 0.024,
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

/** Direction of travel on the same distance-based route used by the avatar root. */
export function roomRouteTangentAtProgress(
  points: readonly RoomRoutePoint[],
  progress: number,
  direction: 1 | -1 = 1,
): RoomRoutePoint {
  if (points.length < 2) return { x: 0, z: 1 };

  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    totalLength += Math.hypot(current.x - previous.x, current.z - previous.z);
  }
  if (totalLength <= 1e-8) return { x: 0, z: 1 };

  let remaining = clamp(progress, 0, 1) * totalLength;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const dx = current.x - previous.x;
    const dz = current.z - previous.z;
    const segmentLength = Math.hypot(dx, dz);
    if (segmentLength <= 1e-8) continue;
    if (remaining <= segmentLength || index === points.length - 1) {
      return {
        x: dx === 0 ? 0 : (dx / segmentLength) * direction,
        z: dz === 0 ? 0 : (dz / segmentLength) * direction,
      };
    }
    remaining -= segmentLength;
  }
  return { x: 0, z: 1 };
}

/**
 * Smooth the heading across sampled curve segments so the avatar does not
 * make tiny steering corrections at every point on the path.
 */
export function roomRouteHeadingAtProgress(
  points: readonly RoomRoutePoint[],
  progress: number,
  direction: 1 | -1 = 1,
  sampleWindow = 0.018,
): RoomRoutePoint {
  if (points.length < 2) return { x: 0, z: 1 };
  const safeProgress = clamp(progress, 0, 1);
  const window = clamp(sampleWindow, 0.001, 0.08);
  const from = roomRoutePointAtProgress(points, Math.max(0, safeProgress - window));
  const to = roomRoutePointAtProgress(points, Math.min(1, safeProgress + window));
  const dx = (to.x - from.x) * direction;
  const dz = (to.z - from.z) * direction;
  const length = Math.hypot(dx, dz);
  if (length <= 1e-8) return roomRouteTangentAtProgress(points, safeProgress, direction);
  return { x: dx / length, z: dz / length };
}

export function roomWalkTimeForProgress(progress: number, duration: number): number {
  return clamp(progress, 0, 1) * Math.max(0, duration);
}
