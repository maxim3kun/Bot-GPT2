import assert from 'node:assert/strict';
import test from 'node:test';
import { Quaternion } from 'three';
import {
  createRoomAutonomy,
  createRoomRouteMotion,
  ROOM_CENTER_PROGRESS,
  ROOM_WALK_DURATION_SECONDS,
  type RoomActivity,
} from './live-room-autonomy.ts';
import {
  applyRetargetedWalkAnimation,
  getRoomWalkPose,
  roomRouteLength,
  roomRoutePointAtProgress,
  roomRouteTangentAtProgress,
  roomWalkCyclesForDistance,
  roomWalkCyclesForSegmentDistance,
  roomWalkStrideLengthForSegment,
  ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO,
  ROOM_WALK_CYCLE_SECONDS,
  roomWalkTimeForProgress,
  routeProgressFromPosition,
} from './live-room-gait.ts';

test('repeats only a simple desk-to-window route without unsupported poses', () => {
  const autonomy = createRoomAutonomy(() => 0.999);
  const seen = new Set<RoomActivity>();
  let position = 0;
  let snapshot = autonomy.update(0.05, false, true, position);

  for (let frame = 0; frame < 1_200; frame += 1) {
    position = snapshot.targetProgress;
    snapshot = autonomy.update(0.05, false, true, position);
    seen.add(snapshot.activity);
    assert.equal(snapshot.seated, false);
  }

  assert.deepEqual(
    [...seen].sort(),
    [
      'attending',
      'looking-around',
      'looking-out-window',
      'walking-to-desk',
      'walking-to-room-center',
      'walking-to-window',
    ].sort(),
  );
});

test('pauses for conversation and returns to the desk afterward', () => {
  const autonomy = createRoomAutonomy(() => 0.5);
  const paused = autonomy.update(0.05, true, true, 0.4);
  assert.deepEqual(paused, { activity: 'attending', targetProgress: 0.4, seated: false });

  const resumed = autonomy.update(0.05, false, true, 0.4);
  assert.equal(resumed.activity, 'walking-to-desk');
  assert.equal(resumed.targetProgress, 0);
});

test('respects reduced-motion settings and holds the current position', () => {
  const autonomy = createRoomAutonomy(() => 0.5);
  const snapshot = autonomy.update(0.05, false, false, 0.37);
  assert.equal(snapshot.targetProgress, 0.37);
  assert.equal(snapshot.activity, 'attending');
  assert.equal(snapshot.seated, false);
});

test('eases the route and pauses cleanly during an interaction', () => {
  const route = createRoomRouteMotion();
  const firstStep = route.update('walking-to-window', 0.05, 0);
  assert.ok(firstStep > 0);
  assert.ok(firstStep < 0.01);

  let progress = firstStep;
  for (let frame = 1; frame < Math.ceil(ROOM_WALK_DURATION_SECONDS / 0.05); frame += 1) {
    progress = route.update('walking-to-window', 0.05, progress);
  }
  assert.ok(progress > 0.99);

  const toCenter = route.update('walking-to-room-center', 0.05, progress);
  assert.ok(toCenter < progress);
  assert.ok(toCenter > ROOM_CENTER_PROGRESS);

  const paused = route.update('attending', 0.05, progress);
  assert.equal(paused, progress);
  const firstReturnStep = route.update('walking-to-desk', 0.05, 0.4);
  assert.ok(firstReturnStep < 0.4);
});

test('calculates progress along the diagonal desk-to-window path', () => {
  const route = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }];
  assert.equal(routeProgressFromPosition(5, 0, route), 0.25);
  assert.equal(routeProgressFromPosition(10, 10, route), 1);
  assert.deepEqual(roomRoutePointAtProgress(route, 0.5), { x: 10, z: 0 });
  assert.equal(roomRouteLength(route), 20);
  assert.deepEqual(roomRouteTangentAtProgress(route, 0.25), { x: 1, z: 0 });
  assert.deepEqual(roomRouteTangentAtProgress(route, 0.75), { x: 0, z: 1 });
  assert.deepEqual(roomRouteTangentAtProgress(route, 0.75, -1), { x: 0, z: -1 });
  assert.deepEqual(roomRouteTangentAtProgress([], 0.5), { x: 0, z: 1 });
  assert.equal(routeProgressFromPosition(4, 4, [{ x: 2, z: 2 }, { x: 2, z: 2 }]), 0);
  assert.equal(roomWalkTimeForProgress(0.5, 1.6), 0.8);
});

test('repeats footfalls according to distance instead of stretching one step across the route', () => {
  assert.equal(roomWalkCyclesForDistance(0, 1.7), 0);
  assert.ok(Math.abs(roomWalkCyclesForDistance(1.7 * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO, 1.7) - 1) < 1e-8);
  assert.ok(roomWalkCyclesForDistance(1.7 * 1.2, 1.7) > 1.8);
  assert.equal(roomWalkCyclesForDistance(1, 0), 0);
});

test('finishes each walk on a complete stride instead of snapping mid-step', () => {
  const height = 1.7;
  const shortWalk = height * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO * 0.78;
  const longWalk = height * 0.82;
  const shortStride = roomWalkStrideLengthForSegment(shortWalk, height);
  const longStride = roomWalkStrideLengthForSegment(longWalk, height);

  assert.equal(Math.round(shortWalk / shortStride), 1);
  assert.equal(Math.round(longWalk / longStride), 2);
  assert.ok(Math.abs(roomWalkCyclesForSegmentDistance(shortWalk, shortWalk, height) - 1) < 1e-8);
  assert.ok(Math.abs(roomWalkCyclesForSegmentDistance(longWalk, longWalk, height) - 2) < 1e-8);
  assert.ok(Math.abs(roomWalkCyclesForSegmentDistance(longWalk / 2, longWalk, height) - 1) < 1e-8);
  assert.ok(roomWalkStrideLengthForSegment(shortWalk, height) < height * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO);
});

test('keeps the straight desk-to-window walk lane clear of the desk and chair', () => {
  const route = [
    { x: 0.8, z: -0.12 },
    { x: -0.02, z: -0.72 },
  ];
  const desk = { left: 0.99, right: 1.77, front: -0.35, back: -0.69 };
  const chair = { x: 0.9, z: -0.52, radiusX: 0.135, radiusZ: 0.125 };
  const avatarClearance = 0.15;

  for (let step = 0; step <= 40; step += 1) {
    const t = step / 40;
    const { x, z } = roomRoutePointAtProgress(route, t);
    const insideDeskClearance = x >= desk.left - avatarClearance
      && x <= desk.right + avatarClearance
      && z >= desk.back - avatarClearance
      && z <= desk.front + avatarClearance;
    const chairDistanceX = Math.max(0, Math.abs(x - chair.x) - chair.radiusX);
    const chairDistanceZ = Math.max(0, Math.abs(z - chair.z) - chair.radiusZ);
    const insideChairClearance = Math.hypot(chairDistanceX, chairDistanceZ) < avatarClearance;
    assert.equal(insideDeskClearance, false);
    assert.equal(insideChairClearance, false);
  }

  assert.ok(routeProgressFromPosition(0.35, -0.47, route) > 0.39);
  const destination = roomRoutePointAtProgress(route, 1);
  assert.ok(Math.abs(destination.x - route.at(-1)!.x) < 1e-8);
  assert.ok(Math.abs(destination.z - route.at(-1)!.z) < 1e-8);
});

test('keeps the walk cycle balanced and alternates the feet and arms', () => {
  const start = getRoomWalkPose(0);
  const quarter = getRoomWalkPose(ROOM_WALK_CYCLE_SECONDS / 4);
  const half = getRoomWalkPose(ROOM_WALK_CYCLE_SECONDS / 2);

  assert.ok(Math.abs(start.leftHip + start.rightHip) < 1e-10);
  assert.ok(Math.abs(quarter.leftHip + quarter.rightHip) < 1e-10);
  assert.ok(Math.abs(quarter.leftArmSwing + quarter.rightArmSwing) < 1e-10);
  assert.ok(Math.abs(half.leftHip + start.leftHip) < 1e-10);
  assert.ok(Math.abs(half.leftArmSwing + start.leftArmSwing) < 1e-10);
  assert.ok(Math.abs(quarter.leftArmSwing) <= 0.19);
  assert.ok(Math.abs(quarter.leftKnee) <= 0.2);
  assert.equal(start.pelvisSway, 0);
  assert.ok(Math.abs(quarter.pelvisSway) <= 0.022);
});

test('softens the source animation when retargeting it onto the VRM rest pose', () => {
  const base = new Quaternion();
  const bone = { quaternion: base.clone() };
  const excludedArm = { quaternion: base.clone() };
  const quarterTurn = new Quaternion().setFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
  applyRetargetedWalkAnimation(
    {
      duration: 1,
      times: [0, 1],
      tracks: [{
        bone: 'hips',
        values: [0, 0, 0, 1, quarterTurn.x, quarterTurn.y, quarterTurn.z, quarterTurn.w],
      }, {
        bone: 'leftUpperArm',
        values: [0, 0, 0, 1, quarterTurn.x, quarterTurn.y, quarterTurn.z, quarterTurn.w],
      }],
    },
    new Map([['hips', bone], ['leftUpperArm', excludedArm]]),
    new Map([['hips', base], ['leftUpperArm', base]]),
    0.5,
    0.34,
    new Set(['hips']),
  );

  assert.ok(bone.quaternion.angleTo(base) > 0.25);
  assert.ok(bone.quaternion.angleTo(base) < 0.3);
  assert.equal(excludedArm.quaternion.angleTo(base), 0);
});
