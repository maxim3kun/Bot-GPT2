import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoomAutonomy, type RoomActivity } from './live-room-autonomy.ts';

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
      ['working', 'stretching', 'walking-to-window'].includes(snapshot.activity)
      && snapshot.activity !== previousActivity
    ) {
      chosenActivities.push(snapshot.activity);
    }
    previousActivity = snapshot.activity;
  }

  assert.ok(seen.has('working'));
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
  assert.deepEqual(snapshot, { activity: 'attending', targetProgress: 0.4 });
  snapshot = autonomy.update(0.05, true, true, 0.4);
  assert.deepEqual(snapshot, { activity: 'attending', targetProgress: 0.4 });

  snapshot = autonomy.update(0.05, false, true, 0.4);
  assert.equal(snapshot.activity, 'walking-to-desk');
  assert.equal(snapshot.targetProgress, 0);
});

test('does not move while reduced motion is enabled', () => {
  const autonomy = createRoomAutonomy(() => 0.5);
  const snapshot = autonomy.update(0.05, false, false, 0.37);
  assert.equal(snapshot.targetProgress, 0.37);
});
