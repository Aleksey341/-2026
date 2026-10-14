import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {CharacterAnimationR8, R8_CLIPS} from '../src/character-animation-r8.js';

// Exercise real Three.js mixer completion, interruptions and root transforms.
const root = new T.Group();
const bone = new T.Bone(); bone.name = 'Hips'; root.add(bone);
const clips = Object.values(R8_CLIPS).map(name => new T.AnimationClip(name, .3, [
  new T.QuaternionKeyframeTrack('Hips.quaternion', [0, .3], [0,0,0,1, 0,0,0,1])
]));
assert.throws(() => new CharacterAnimationR8(root, clips, {}), /reference speed/);
assert.throws(() => new CharacterAnimationR8(root, clips.slice(1), {walkSpeed:1.4}), /non-empty clip/);
const c = new CharacterAnimationR8(root, clips, {walkSpeed:1.4});
c.update(.05, {speed:1.4}); assert.equal(c.state, 'start');
c.update(.31, {speed:1.4}); assert.equal(c.state, 'walk');
c.update(.05, {speed:.7}); assert.equal(c.active.getEffectiveTimeScale(), .5);
c.update(.01, {speed:0}); assert.equal(c.state, 'stop');
c.update(.31, {speed:0}); assert.equal(c.state, 'idle');
c.update(.05, {speed:1.4}); assert.equal(c.state, 'start');
c.update(.02, {speed:0}); assert.equal(c.state, 'stop');
c.update(.31); assert.equal(c.state, 'idle');
c.update(.05, {turn:'left'}); assert.equal(c.state, 'turnLeft');
c.update(.31); assert.equal(c.state, 'idle');
assert.equal(c.trigger('wear'), true);
assert.equal(c.trigger('interact'), false);
c.update(.31); assert.equal(c.state, 'idle');
c.update(.05, {speed:1.4});
c.update(.1, {speed:200, teleported:true}); assert.equal(c.state, 'idle');
assert.deepEqual(root.position.toArray(), [0,0,0]);
assert.deepEqual(root.quaternion.toArray(), [0,0,0,1]);
c.dispose(); c.update(.1, {speed:1.4}); assert.equal(c.disposed,true);
console.log('PASS: real mixer transitions, speed calibration, collision stop, interrupted start, turn, gesture, teleport, disposal');
