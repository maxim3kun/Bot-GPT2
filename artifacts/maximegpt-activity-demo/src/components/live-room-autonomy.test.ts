import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRoomAutonomy,
  createRoomRouteMotion,
  ROOM_WALK_DURATION_SECONDS,
  type RoomActivity,
} from './live-room-autonomy.ts';
import { getRoomWalkPose, ROOM_WALK_CYCLE_SECONDS } from './live-room-gait.ts';

test('chooses varied, bounded activities instead of repeating a fixed route', () => {
  const autonomy = createRoomAutonomy(() => 0.999);
  const seen = new Set<RoomActivity>();
  const chosenActivities: RoomActivity[] = [];
  let position = 0;
  let snapshot = autonomy.update(0.05, false, true, position);
  let previousActivity: RoomActivity | undefined;

  for (let frame = 0; frame < 1_200; frame += 1) {
    position = snapshot.targetProgress;
    snapshot = autonomy.update(0.05, false, true, position);
    seen.add(snapshot.activity);
    if (
      ['working-seated', 'stretching', 'walking-to-window'].includes(snapshot.activity)
      && snapshot.activity !== previousActivity
    ) {
      chosenActivities.push(snapshot.activity);
    }
    previousActivity = snapshot.activity;
  }

  assert.ok(seen.has('working-seated'));
  assert.ok(seen.has('stretching'));
  assert.ok(seen.has('walking-to-window'));
  assert.ok(seen.has('looking-out-window'));
  assert.ok(seen.has('walking-to-desk'));
  assert.ok(chosenActivities.length >= 3);
  for (let index = 1; index < chosenActivities.length; index += 1) {
    assert.notEqual(chosenActivities[index], chosenActivities[index - 1]);
  }
});

test('pauses movement for conversation and returns to the desk afterward', () => {
  const autonomy = createRoomAutonomy(() => 0.999);
  let position = 0;
  let snapshot = autonomy.update(0.05, false, true, position);

  for (let frame = 0; frame < 400 && snapshot.activity !== 'walking-to-window'; frame += 1) {
    position = snapshot.targetProgress;
    snapshot = autonomy.update(0.05, false, true, position);
  }
  assert.equal(snapshot.activity, 'walking-to-window');

  snapshot = autonomy.update(0.05, true, true, 0.4);
  assert.deepEqual(snapshot, { activity: 'attending', targetProgress: 0.4, seated: false });
  snapshot = autonomy.update(0.05, true, true, 0.4);
  assert.deepEqual(snapshot, { activity: 'attending', targetProgress: 0.4, seated: false });

  snapshot = autonomy.update(0.05, false, true, 0.4);
  assert.equal(snapshot.activity, 'walking-to-desk');
  assert.equal(snapshot.targetProgress, 0);
});

test('does not move while reduced motion is enabled', () => {
  const autonomy = createRoomAutonomy(() => 0.5);
  const snapshot = autonomy.update(0.05, false, false, 0.37);
  assert.equal(snapshot.targetProgress, 0.37);
  assert.equal(snapshot.activity, 'walking-to-window');
  assert.equal(snapshot.seated, false);
});

test('starts with the walk, then sits to work and stands before another walk', () => {
  const autonomy = createRoomAutonomy(() => 0.999);
  let snapshot = autonomy.update(0.05, false, true, 0);

  assert.equal(snapshot.activity, 'walking-to-window');
  assert.equal(snapshot.seated, false);
  for (let frame = 0; frame < 400 && snapshot.activity !== 'working-seated'; frame += 1) {
    snapshot = autonomy.update(0.05, false, true, snapshot.targetProgress);
  }
  assert.equal(snapshot.activity, 'working-seated');
  assert.equal(snapshot.seated, true);

  for (let frame = 0; frame < 400 && snapshot.activity !== 'standing-up'; frame += 1) {
    snapshot = autonomy.update(0.05, false, true, snapshot.targetProgress);
  }
  assert.equal(snapshot.activity, 'standing-up');
  assert.equal(snapshot.seated, false);
  for (let frame = 0; frame < 30 && snapshot.activity === 'standing-up'; frame += 1) {
    snapshot = autonomy.update(0.05, false, true, snapshot.targetProgress);
  }
  assert.ok(['stretching', 'walking-to-window'].includes(snapshot.activity));
});

test('keeps a seated pose through a voice interruption at the desk', () => {
  const autonomy = createRoomAutonomy(() => 0.5);
  let snapshot = autonomy.update(0.05, false, true, 0);
  for (let frame = 0; frame < 400 && snapshot.activity !== 'working-seated'; frame += 1) {
    snapshot = autonomy.update(0.05, false, true, snapshot.targetProgress);
  }
  assert.equal(snapshot.activity, 'working-seated');
  snapshot = autonomy.update(0.05, true, true, 0);
  assert.equal(snapshot.activity, 'attending');
  assert.equal(snapshot.seated, true);

  snapshot = autonomy.update(0.05, false, true, 0);
  assert.equal(snapshot.activity, 'working-seated');
  assert.equal(snapshot.seated, true);
});

test('walks across the route in step with the walk animation and pauses cleanly', () => {
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

test('keeps the arms relaxed and makes the left and right steps alternate', () => {
  const start = getRoomWalkPose(0);
  const halfCycle = getRoomWalkPose(ROOM_WALK_CYCLE_SECONDS / 2);
  assert.ok(Math.abs(start.leftHip + start.rightHip) < 1e-10);
  assert.ok(Math.abs(start.leftArmSwing + start.rightArmSwing) < 1e-10);
  assert.ok(Math.abs(start.leftArmSwing) < 1e-10);
  assert.ok(Math.abs(halfCycle.leftHip + start.leftHip) < 1e-10);
  assert.ok(Math.abs(halfCycle.leftArmSwing + start.leftArmSwing) < 1e-10);
  assert.ok(Math.abs(start.leftArmSwing) <= 0.12);
  assert.ok(Math.abs(halfCycle.rightArmSwing) <= 0.12);
});
