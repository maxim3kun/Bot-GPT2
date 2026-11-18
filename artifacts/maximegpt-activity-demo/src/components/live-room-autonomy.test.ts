import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRoomAutonomy,
  createRoomRouteMotion,
  ROOM_WALK_DURATION_SECONDS,
  type RoomActivity,
} from './live-room-autonomy.ts';
import {
  getRoomWalkPose,
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
    ['attending', 'looking-out-window', 'walking-to-desk', 'walking-to-window'].sort(),
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

  const paused = route.update('attending', 0.05, progress);
  assert.equal(paused, progress);
  const firstReturnStep = route.update('walking-to-desk', 0.05, 0.4);
  assert.ok(firstReturnStep < 0.4);
});

test('calculates progress along the diagonal desk-to-window path', () => {
  assert.equal(routeProgressFromPosition(5, 5, 0, 0, 10, 10), 0.5);
  assert.equal(routeProgressFromPosition(10, 10, 0, 0, 10, 10), 1);
  assert.equal(routeProgressFromPosition(4, 4, 2, 2, 2, 2), 0);
  assert.equal(roomWalkTimeForProgress(0.5, 1.6), 0.8);
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
