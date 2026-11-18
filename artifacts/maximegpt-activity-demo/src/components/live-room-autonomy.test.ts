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
  roomWalkCyclesForDistance,
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
  assert.equal(routeProgressFromPosition(4, 4, [{ x: 2, z: 2 }, { x: 2, z: 2 }]), 0);
  assert.equal(roomWalkTimeForProgress(0.5, 1.6), 0.8);
});

test('repeats footfalls according to distance instead of stretching one step across the route', () => {
  assert.equal(roomWalkCyclesForDistance(0, 1.7), 0);
  assert.ok(Math.abs(roomWalkCyclesForDistance(1.7 * 0.64, 1.7) - 1) < 1e-8);
  assert.ok(roomWalkCyclesForDistance(1.7 * 1.2, 1.7) > 1.8);
  assert.equal(roomWalkCyclesForDistance(1, 0), 0);
});

test('routes around the desk and chair without entering their clearance zones', () => {
  const route = [
    { x: 0.8, z: -0.12 },
    { x: 0.35, z: -0.12 },
    { x: 0, z: -0.72 },
  ];
  const desk = { left: 0.99, right: 1.77, front: -0.35, back: -0.69 };
  const chair = { x: 0.9, z: -0.52, radiusX: 0.135, radiusZ: 0.125 };
  const avatarClearance = 0.15;

  for (let segment = 1; segment < route.length; segment += 1) {
    const from = route[segment - 1]!;
    const to = route[segment]!;
    for (let step = 0; step <= 20; step += 1) {
      const t = step / 20;
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
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
  }

  assert.ok(routeProgressFromPosition(0.35, -0.12, route) > 0.39);
  assert.deepEqual(roomRoutePointAtProgress(route, 1), route.at(-1));
});

test('keeps the walk cycle subtle and alternates the feet and arms', () => {
  const start = getRoomWalkPose(0);
  const quarter = getRoomWalkPose(ROOM_WALK_CYCLE_SECONDS / 4);
  const half = getRoomWalkPose(ROOM_WALK_CYCLE_SECONDS / 2);

  assert.ok(Math.abs(start.leftHip + start.rightHip) < 1e-10);
  assert.ok(Math.abs(quarter.leftHip + quarter.rightHip) < 1e-10);
  assert.ok(Math.abs(quarter.leftArmSwing + quarter.rightArmSwing) < 1e-10);
  assert.ok(Math.abs(half.leftHip + start.leftHip) < 1e-10);
  assert.ok(Math.abs(half.leftArmSwing + start.leftArmSwing) < 1e-10);
  assert.ok(Math.abs(quarter.leftArmSwing) <= 0.075);
  assert.ok(Math.abs(quarter.leftKnee) <= 0.2);
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
