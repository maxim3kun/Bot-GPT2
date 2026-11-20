import assert from 'node:assert/strict';
import test from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { retargetJointRotation, shouldRetargetIdleBone } from './live-motion-retarget.ts';

test('retargeting a neutral pose preserves the avatar rest rotation', () => {
  const sourceRest = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.7);
  const targetRest = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.35);
  const output = new Quaternion();

  retargetJointRotation(sourceRest, sourceRest, targetRest, output, new Quaternion());

  assert.ok(output.angleTo(targetRest) < 1e-8);
});

test('retargeting keeps the source animation delta on the target rest pose', () => {
  const sourceRest = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.7);
  const targetRest = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.35);
  const sourceMotion = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.55);
  const sourcePose = sourceRest.clone().multiply(sourceMotion);
  const output = new Quaternion();

  retargetJointRotation(sourceRest, sourcePose, targetRest, output, new Quaternion());

  assert.ok(output.angleTo(targetRest.clone().multiply(sourceMotion)) < 1e-8);
});

test('does not let idle animation overwrite procedural leg motion while walking', () => {
  for (const bone of ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot']) {
    assert.equal(shouldRetargetIdleBone(bone, true), false, `${bone} must keep the gait solver pose`);
    assert.equal(shouldRetargetIdleBone(bone, false), true, `${bone} can use idle pose while stationary`);
  }
  assert.equal(shouldRetargetIdleBone('leftUpperArm', true), true);
});
