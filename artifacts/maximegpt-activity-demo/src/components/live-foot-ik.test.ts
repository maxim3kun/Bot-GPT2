import assert from 'node:assert/strict';
import test from 'node:test';
import { Object3D, Quaternion, Vector3 } from 'three';
import {
  createFootLockState,
  solveGroundedLeg,
  updateFootLock,
} from './live-foot-ik.ts';

function createTestLeg() {
  const root = new Object3D();
  const upperLeg = new Object3D();
  const lowerLeg = new Object3D();
  const foot = new Object3D();
  upperLeg.position.set(0, 2, 0);
  lowerLeg.position.set(0, -0.9, 0.2);
  foot.position.set(0, -0.9, -0.2);
  root.add(upperLeg);
  upperLeg.add(lowerLeg);
  lowerLeg.add(foot);
  root.updateMatrixWorld(true);
  return { root, upperLeg, lowerLeg, foot };
}

test('locks a planted ankle in world space while the body moves', () => {
  const leg = createTestLeg();
  const state = createFootLockState();
  const initialFoot = leg.foot.getWorldPosition(new Vector3());
  updateFootLock(state, true, leg.foot, initialFoot.y);
  const anchor = state.anchor.clone();

  leg.root.position.x = 0.18;
  leg.root.updateMatrixWorld(true);
  const solved = solveGroundedLeg({
    ...leg,
    anchor: state.anchor,
    footRestWorldQuaternion: leg.foot.getWorldQuaternion(new Quaternion()),
  });
  leg.root.updateMatrixWorld(true);

  assert.equal(solved, true);
  assert.ok(leg.foot.getWorldPosition(new Vector3()).distanceTo(anchor) < 0.02);
});

test('releases and captures a new anchor at the next stance', () => {
  const leg = createTestLeg();
  const state = createFootLockState();
  updateFootLock(state, true, leg.foot, 0.2);
  const firstAnchor = state.anchor.clone();

  leg.root.position.x = 0.3;
  leg.root.updateMatrixWorld(true);
  updateFootLock(state, true, leg.foot, 0.2);
  assert.deepEqual(state.anchor.toArray(), firstAnchor.toArray());

  updateFootLock(state, false, leg.foot, 0.2);
  assert.equal(state.planted, false);
  updateFootLock(state, true, leg.foot, 0.2);
  assert.equal(state.planted, true);
  assert.ok(state.anchor.x > firstAnchor.x);
  assert.equal(state.anchor.y, 0.2);
});
