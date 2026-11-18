import { Quaternion, type Object3D } from 'three';

export interface RoomWalkTrack {
  bone: string;
  values: number[];
}

export interface RoomWalkAnimation {
  duration: number;
  times: number[];
  tracks: RoomWalkTrack[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const startQuaternion = new Quaternion();
const endQuaternion = new Quaternion();

/**
 * Applies the retargeted walk clip in the VRM's normalized local bone space.
 * Its phase is driven by route progress so the feet and the room displacement
 * advance together instead of playing as an unrelated loop.
 */
export function applyRoomWalkAnimation(
  animation: RoomWalkAnimation,
  bones: ReadonlyMap<string, Object3D>,
  restPose: ReadonlyMap<string, Quaternion>,
  timeSeconds: number,
  weight = 1,
): void {
  if (animation.duration <= 0 || animation.times.length < 2 || !animation.tracks.length) return;

  const time = ((timeSeconds % animation.duration) + animation.duration) % animation.duration;
  let upper = 1;
  while (upper < animation.times.length - 1 && animation.times[upper]! < time) upper += 1;
  const lower = upper - 1;
  const lowerTime = animation.times[lower]!;
  const upperTime = animation.times[upper]!;
  const interpolation = upperTime > lowerTime
    ? clamp((time - lowerTime) / (upperTime - lowerTime), 0, 1)
    : 0;
  const amount = clamp(weight, 0, 1);

  for (const track of animation.tracks) {
    const bone = bones.get(track.bone);
    const base = restPose.get(track.bone);
    const lowerOffset = lower * 4;
    const upperOffset = upper * 4;
    if (!bone || !base || track.values.length < upperOffset + 4) continue;

    startQuaternion
      .set(
        track.values[lowerOffset]!,
        track.values[lowerOffset + 1]!,
        track.values[lowerOffset + 2]!,
        track.values[lowerOffset + 3]!,
      )
      .normalize();
    endQuaternion
      .set(
        track.values[upperOffset]!,
        track.values[upperOffset + 1]!,
        track.values[upperOffset + 2]!,
        track.values[upperOffset + 3]!,
      )
      .normalize();
    startQuaternion.slerp(endQuaternion, interpolation);
    bone.quaternion.slerpQuaternions(base, startQuaternion, amount);
  }
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
