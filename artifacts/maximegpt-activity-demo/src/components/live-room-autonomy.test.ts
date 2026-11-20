import assert from 'node:assert/strict';
import test from 'node:test';
import { Quaternion } from 'three';
import {
  createRoomAutonomy,
  createRoomRouteMotion,
  ROOM_WALK_DURATION_SECONDS,
  type RoomActivity,
} from './live-room-autonomy.ts';
import {
  LIVE_BEDROOM_CHAIR_Z_RATIO,
  LIVE_BEDROOM_DESK_STAND_X_OFFSET_RATIO,
  LIVE_BEDROOM_DESK_STAND_Z_RATIO,
  LIVE_BEDROOM_DESK_X_RATIO,
  LIVE_BEDROOM_FLOOR_TOP_RATIO,
  LIVE_BEDROOM_RUG_SURFACE_OFFSET_RATIO,
  LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO,
  LIVE_BEDROOM_WINDOW_BODY_CLEARANCE_RATIO,
  LIVE_BEDROOM_WINDOW_DISTANCE_RATIO,
  LIVE_BEDROOM_WINDOW_GLASS_Z_RATIO,
} from './live-bedroom-scene.ts';
import {
  createQuadraticRoomRoute,
  applyRetargetedWalkAnimation,
  getRoomWalkFootPhase,
  getRoomWalkPose,
  roomRouteLength,
  roomRouteHeadingAtProgress,
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

test('repeats desk play, a continuous walk, the window, and a continuous return', () => {
  const autonomy = createRoomAutonomy(() => 0);
  const seen = new Set<RoomActivity>();
  let position = 0;
  let snapshot = autonomy.update(0.05, false, true, position);

  for (let frame = 0; frame < 1_200; frame += 1) {
    if (snapshot.activity.startsWith('walking-')) {
      position = snapshot.targetProgress;
    }
    snapshot = autonomy.update(0.05, false, true, position);
    seen.add(snapshot.activity);
    assert.equal(snapshot.seated, false);
  }

  assert.deepEqual(
    [...seen].sort(),
    [
      'looking-out-window',
      'walking-to-desk',
      'walking-to-window',
      'checking-plant',
      'playing-at-desk',
    ].sort(),
  );
});

test('preserves the current route while the page is hidden, then resumes it in place', () => {
  const autonomy = createRoomAutonomy(() => 0);
  let walk = autonomy.update(0.05, false, true, 0);
  for (let frame = 0; frame < 140 && walk.activity !== 'walking-to-window'; frame += 1) {
    walk = autonomy.update(0.05, false, true, 0);
  }
  assert.equal(walk.activity, 'walking-to-window');
  const hidden = autonomy.update(0.05, true, true, 0.42);
  assert.deepEqual(hidden, { activity: 'attending', targetProgress: 0.42, seated: false });

  const resumed = autonomy.update(0.05, false, true, 0.42);
  assert.equal(resumed.activity, 'walking-to-window');
  assert.equal(resumed.targetProgress, 1);
});

test('respects reduced-motion settings and holds the current position', () => {
  const autonomy = createRoomAutonomy(() => 0.5);
  const snapshot = autonomy.update(0.05, false, false, 0.37);
  assert.equal(snapshot.targetProgress, 0);
  assert.equal(snapshot.activity, 'playing-at-desk');
  assert.equal(snapshot.seated, false);
});

test('eases each walk and holds position while the page is hidden', () => {
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

test('smooths steering through sampled route corners without changing travel direction', () => {
  const route = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 1 }];
  const cornerHeading = roomRouteHeadingAtProgress(route, 0.5);
  const reverseHeading = roomRouteHeadingAtProgress(route, 0.5, -1);

  assert.ok(cornerHeading.x > 0.65 && cornerHeading.z > 0.65);
  assert.ok(Math.abs(Math.hypot(cornerHeading.x, cornerHeading.z) - 1) < 1e-8);
  assert.ok(Math.abs(reverseHeading.x + cornerHeading.x) < 1e-8);
  assert.ok(Math.abs(reverseHeading.z + cornerHeading.z) < 1e-8);
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

test('advances each foot by the full distance travelled during its gait cycle', () => {
  const height = 1.7;
  const segmentDistance = height * 0.82;
  const strideLength = roomWalkStrideLengthForSegment(segmentDistance, height);
  const swingLength = strideLength;
  const cycles = roomWalkCyclesForSegmentDistance(segmentDistance, segmentDistance, height);

  assert.equal(cycles, 2);
  assert.ok(Math.abs(swingLength * cycles - segmentDistance) < 1e-8);
});

test('keeps the curved room stroll clear of the desk, chair, bed, and window', () => {
  const deskPositionX = LIVE_BEDROOM_DESK_X_RATIO - LIVE_BEDROOM_DESK_STAND_X_OFFSET_RATIO;
  const windowX = LIVE_BEDROOM_DESK_X_RATIO - LIVE_BEDROOM_WINDOW_DISTANCE_RATIO;
  const route = createQuadraticRoomRoute(
    { x: deskPositionX, z: LIVE_BEDROOM_DESK_STAND_Z_RATIO },
    { x: (deskPositionX + windowX) / 2, z: 0.82 },
    { x: windowX, z: LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO },
    40,
  );
  const deskX = LIVE_BEDROOM_DESK_X_RATIO;
  const deskZ = -0.52;
  const desk = { left: deskX - 0.39, right: deskX + 0.39, front: deskZ + 0.17, back: deskZ - 0.17 };
  const chair = { x: deskX - 0.48, z: LIVE_BEDROOM_CHAIR_Z_RATIO, radiusX: 0.135, radiusZ: 0.125 };
  const bed = {
    left: windowX - 0.82 - 1.02 / 2,
    right: windowX - 0.82 + 1.02 / 2,
    back: -0.61 - 0.62 / 2,
    front: -0.61 + 0.62 / 2,
  };
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
    const insideBedClearance = x >= bed.left - avatarClearance
      && x <= bed.right + avatarClearance
      && z >= bed.back - avatarClearance
      && z <= bed.front + avatarClearance;
    const avatarFrontZ = z - LIVE_BEDROOM_WINDOW_BODY_CLEARANCE_RATIO;
    const entersWindowPlane = avatarFrontZ <= LIVE_BEDROOM_WINDOW_GLASS_Z_RATIO;
    assert.equal(insideDeskClearance, false);
    assert.equal(insideChairClearance, false);
    assert.equal(insideBedClearance, false);
    assert.equal(entersWindowPlane, false);
  }

  assert.ok(
    LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO - LIVE_BEDROOM_WINDOW_GLASS_Z_RATIO >= 0.35,
  );
  assert.ok(routeProgressFromPosition(0.35, -0.3, route) > 0.39);
  const destination = roomRoutePointAtProgress(route, 1);
  assert.ok(Math.abs(destination.x - route.at(-1)!.x) < 1e-8);
  assert.ok(Math.abs(destination.z - route.at(-1)!.z) < 1e-8);
});

test('keeps the rug visibly above the floor to prevent flicker', () => {
  const floorTop = LIVE_BEDROOM_FLOOR_TOP_RATIO;
  const rugThickness = 0.018;
  const rugCenter = floorTop - rugThickness / 2 + LIVE_BEDROOM_RUG_SURFACE_OFFSET_RATIO;
  const rugTop = rugCenter + rugThickness / 2;

  assert.ok(rugTop > floorTop);
  assert.ok(Math.abs(rugTop - floorTop - LIVE_BEDROOM_RUG_SURFACE_OFFSET_RATIO) < 1e-10);
  assert.ok(
    LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO - LIVE_BEDROOM_WINDOW_GLASS_Z_RATIO
      >= LIVE_BEDROOM_WINDOW_BODY_CLEARANCE_RATIO,
  );
});

test('alternates realistic stance and swing phases with brief double support', () => {
  const start = getRoomWalkFootPhase(0);
  const leftSwing = getRoomWalkFootPhase(0.3);
  const doubleSupport = getRoomWalkFootPhase(0.56);
  const rightSwing = getRoomWalkFootPhase(0.8);

  assert.deepEqual(start, {
    leftStance: true,
    rightStance: true,
    leftSwingProgress: 0,
    rightSwingProgress: 0,
  });
  assert.equal(leftSwing.leftStance, false);
  assert.equal(leftSwing.rightStance, true);
  assert.ok(leftSwing.leftSwingProgress > 0 && leftSwing.leftSwingProgress < 1);
  assert.equal(doubleSupport.leftStance, true);
  assert.equal(doubleSupport.rightStance, true);
  assert.equal(rightSwing.leftStance, true);
  assert.equal(rightSwing.rightStance, false);
  assert.ok(rightSwing.rightSwingProgress > 0 && rightSwing.rightSwingProgress < 1);
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
  assert.ok(Math.abs(quarter.leftKnee) <= 0.32);
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
