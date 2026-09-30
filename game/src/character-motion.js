import * as T from '../vendor/three.module.js';

const clamp = T.MathUtils.clamp;
const damp = T.MathUtils.damp;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const UP = new T.Vector3(0, 1, 0);
const X = new T.Vector3(1, 0, 0);
const worldPosition = o => o.getWorldPosition(new T.Vector3());
const worldQuaternion = o => o.getWorldQuaternion(new T.Quaternion());

// All distances below are metres in the scene, independent of GLB authoring scale.
export class MotionDrive {
  constructor() { this.velocity = new T.Vector3(); this.reset(); }
  reset() { this.velocity.set(0, 0, 0); this.startDelay = 0; this.hadInput = false; this.intentYaw = null; }
  update(dt, player, input, blocked) {
    const direction = new T.Vector3(input.x, 0, input.z);
    const hasInput = direction.lengthSq() > 1e-6;
    if (hasInput) direction.normalize();
    if (dt <= 0) return { speed: 0, velocity: new T.Vector3(), intentYaw: this.intentYaw, anticipation: 0 };
    if (hasInput && !this.hadInput && this.velocity.length() < .08) this.startDelay = .12;
    this.hadInput = hasInput;
    this.startDelay = Math.max(0, this.startDelay - dt);
    if (hasInput) this.intentYaw = Math.atan2(-direction.x, -direction.z);
    // Look/shoulders can lead a turn; translation slows during a sharp reversal.
    const error = this.intentYaw === null ? 0 : angleDelta(this.intentYaw, player.rotation.y);
    const speedLimit = 1.65 * (1 - .72 * smooth(Math.abs(error) / Math.PI));
    const desired = direction.multiplyScalar(this.startDelay > 0 ? 0 : speedLimit);
    if (!hasInput) desired.set(0, 0, 0);
    const change = desired.sub(this.velocity);
    const maxChange = (hasInput ? 4.2 : 5.5) * dt;
    if (change.length() > maxChange) change.setLength(maxChange);
    this.velocity.add(change);
    if (!hasInput && this.velocity.length() < .005) this.velocity.set(0, 0, 0);
    const before = player.position.clone();
    const nx = before.x + this.velocity.x * dt;
    if (!blocked(nx, before.z)) player.position.x = nx; else this.velocity.x = 0;
    const nz = before.z + this.velocity.z * dt;
    if (!blocked(player.position.x, nz)) player.position.z = nz; else this.velocity.z = 0;
    if (hasInput) player.rotation.y += clamp(error * (1 - Math.exp(-5.5 * dt)), -2.8 * dt, 2.8 * dt);
    const actual = player.position.clone().sub(before).divideScalar(dt);
    return { speed: actual.length(), velocity: actual, intentYaw: this.intentYaw,
      anticipation: hasInput && this.startDelay > 0 ? Math.sin(Math.PI * (1 - this.startDelay / .12)) : 0 };
  }
}

function setWorldQuaternion(bone, q) {
  bone.quaternion.copy(worldQuaternion(bone.parent).invert().multiply(q));
  bone.updateWorldMatrix(false, true);
}
function aimBone(bone, child, target) {
  const origin = worldPosition(bone);
  const from = worldPosition(child).sub(origin).normalize();
  const to = target.clone().sub(origin).normalize();
  if (to.lengthSq() < .5) return;
  setWorldQuaternion(bone, new T.Quaternion().setFromUnitVectors(from, to).multiply(worldQuaternion(bone)));
}

// Two-bone analytic IK, with a forward knee pole and a small extension margin.
export function solveLegIK(leg, target, forward) {
  const hip = worldPosition(leg.thigh);
  const delta = target.clone().sub(hip);
  const distance = clamp(delta.length(), Math.abs(leg.upper - leg.lower) + .001, (leg.upper + leg.lower) * .998);
  const axis = delta.normalize();
  const pole = forward.clone().addScaledVector(axis, -forward.dot(axis));
  if (pole.lengthSq() < 1e-8) pole.copy(X).addScaledVector(axis, -X.dot(axis));
  pole.normalize();
  const along = (leg.upper ** 2 - leg.lower ** 2 + distance ** 2) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, leg.upper ** 2 - along ** 2));
  const knee = hip.clone().addScaledVector(axis, along).addScaledVector(pole, bend);
  const reachable = hip.clone().addScaledVector(axis, distance);
  aimBone(leg.thigh, leg.shin, knee);
  aimBone(leg.shin, leg.foot, reachable);
  return worldPosition(leg.foot).distanceTo(target);
}

export class CharacterMotion {
  constructor({ player, hero, bones, rest }) {
    Object.assign(this, { player, hero, bones, rest });
    this.legs = ['Left', 'Right'].map((side, i) => ({ side, index: i,
      thigh: bones[side + 'Thigh'], shin: bones[side + 'Shin'], foot: bones[side + 'Foot'] }));
    this.ready = this.legs.every(l => l.thigh && l.shin && l.foot) && !!bones.Hips;
    this.time = 0; this.reset();
  }
  restore() {
    for (const [name, value] of Object.entries(this.rest)) {
      this.bones[name].quaternion.copy(value.q); this.bones[name].position.copy(value.p);
    }
  }
  reset() {
    this.restore(); this.hero.position.set(0, 0, 0); this.hero.rotation.set(0, 0, 0);
    this.player.updateWorldMatrix(true, true);
    this.lastPosition = this.player.position.clone(); this.lastYaw = this.player.rotation.y;
    this.speed = 0; this.previousSpeed = 0; this.acceleration = 0;
    this.gaitPhase = 0; this.nextLeg = 0; this.activeLeg = null; this.lookYaw = 0; this.lookPitch = 0;
    this.time = 0; this.turn = 0; this.settleTime = 0; this.pelvisDrop = 0;
    if (!this.ready) return;
    for (const leg of this.legs) {
      const ankle = worldPosition(leg.foot);
      leg.home = this.player.worldToLocal(ankle.clone());
      leg.height = ankle.y - this.player.position.y;
      leg.upper = worldPosition(leg.thigh).distanceTo(worldPosition(leg.shin));
      leg.lower = worldPosition(leg.shin).distanceTo(ankle);
      leg.restWorld = worldQuaternion(this.player).invert().multiply(worldQuaternion(leg.foot));
      leg.plant = ankle.clone(); leg.from = ankle.clone(); leg.target = ankle.clone();
      leg.swing = false; leg.progress = 0; leg.age = 1; leg.yaw = this.player.rotation.y;
      leg.fromYaw = leg.yaw; leg.toYaw = leg.yaw; leg.roll = 0; leg.error = 0;
    }
  }
  pose(name, x = 0, y = 0, z = 0) {
    const bone = this.bones[name]; if (!bone) return;
    bone.quaternion.copy(this.rest[name].q).multiply(new T.Quaternion().setFromEuler(new T.Euler(x, y, z, 'YXZ')));
  }
  nominal(leg) {
    this.player.updateWorldMatrix(true, false);
    const p = this.player.localToWorld(leg.home.clone()); p.y = this.player.position.y + leg.height; return p;
  }
  startStep(leg, velocity, speed) {
    leg.swing = true; leg.progress = 0; leg.from.copy(leg.plant); leg.fromYaw = leg.yaw;
    leg.toYaw = this.player.rotation.y;
    leg.duration = clamp(.38 - speed * .045, .29, .38);
    // Predict where the pelvis will be at landing plus half the next support phase.
    leg.target.copy(this.nominal(leg)).addScaledVector(velocity, leg.duration * 1.8);
    const reach = (leg.upper + leg.lower) * 1.4;
    const offset = leg.target.clone().sub(leg.from); offset.y = 0;
    if (offset.length() > reach) { offset.setLength(reach); leg.target.copy(leg.from).add(offset); }
    leg.target.y = this.player.position.y + leg.height;
    this.activeLeg = leg.index; this.nextLeg = 1 - leg.index; this.settleTime = 0;
  }
  update(dt, motion = {}) {
    if (!this.ready || dt <= 0) return;
    // Room changes and reset must never leave a foot anchored in the previous room.
    if (this.player.position.distanceTo(this.lastPosition) > 1) this.reset();
    this.time += dt;
    const velocity = motion.velocity?.clone() || this.player.position.clone().sub(this.lastPosition).divideScalar(dt);
    velocity.y = 0; const measured = velocity.length();
    const dyaw = angleDelta(this.player.rotation.y, this.lastYaw);
    this.lastPosition.copy(this.player.position); this.lastYaw = this.player.rotation.y;
    this.speed = damp(this.speed, measured, 10, dt);
    this.acceleration = damp(this.acceleration, clamp((measured - this.previousSpeed) / dt, -5, 5), 7, dt);
    this.previousSpeed = measured;
    this.turn = damp(this.turn, clamp(dyaw / dt, -3, 3), 9, dt);
    this.restore();
    const forward = new T.Vector3(0, 0, -1).applyAxisAngle(UP, this.player.rotation.y);
    const stepping = measured > .035;
    if (this.activeLeg === null) {
      const errors = this.legs.map(l => this.nominal(l).distanceTo(l.plant));
      const angular = this.legs.map(l => Math.abs(angleDelta(this.player.rotation.y, l.yaw)));
      let candidate = this.nextLeg;
      if (!stepping && errors[candidate] < .045 && angular[candidate] < .12) candidate = 1 - candidate;
      if (stepping || errors[candidate] > .045 || angular[candidate] > .12) this.startStep(this.legs[candidate], velocity, measured);
    }
    for (const leg of this.legs) {
      leg.age += dt;
      if (!leg.swing) continue;
      leg.progress = Math.min(1, leg.progress + dt / leg.duration);
      // Early swing can adapt to a stop or reversal; late swing commits to its landing.
      if (leg.progress < .65) {
        const landing = this.nominal(leg).addScaledVector(velocity, leg.duration * (1.8 - leg.progress));
        const offset = landing.clone().sub(leg.from); offset.y = 0;
        if (offset.length() > (leg.upper + leg.lower) * 1.4) offset.setLength((leg.upper + leg.lower) * 1.4);
        landing.copy(leg.from).add(offset); landing.y = this.player.position.y + leg.height;
        leg.target.lerp(landing, 1 - Math.exp(-12 * dt));
        leg.toYaw += angleDelta(this.player.rotation.y, leg.toYaw) * (1 - Math.exp(-12 * dt));
      }
      this.gaitPhase = leg.index * Math.PI + leg.progress * Math.PI;
      if (leg.progress === 1) {
        leg.plant.copy(leg.target); leg.yaw = leg.toYaw; leg.swing = false; leg.age = 0; this.activeLeg = null;
      }
    }
    const activity = clamp(this.speed / 1.65, 0, 1);
    const swingLeg = this.legs.find(l => l.swing);
    const p = swingLeg?.progress || 0;
    const support = swingLeg ? 1 - swingLeg.index : null;
    const transfer = swingLeg ? Math.sin(Math.PI * p) : 0;
    const supportX = support === null ? 0 : this.legs[support].home.x;
    const hips = this.bones.Hips;
    const scale = this.hero.getWorldScale(new T.Vector3()).y;
    // Lower the pelvis slightly to keep knees soft, then shift above the support foot.
    hips.position.y += (-.065 + .012 * Math.sin(Math.PI * p) * activity + .002 * Math.sin(this.time * 2.1)) / scale;
    hips.position.x += (supportX * .18 * transfer + .009 * (motion.anticipation || 0)) / scale;
    const phase = this.gaitPhase;
    const twist = .055 * Math.sin(phase) * activity;
    const lean = .012 * activity + .012 * this.acceleration;
    this.pose('Hips', lean * .3, twist, -.025 * transfer * Math.sign(supportX));
    const intent = motion.intentYaw ?? this.player.rotation.y;
    let look = clamp(angleDelta(intent, this.player.rotation.y), -.7, .7);
    let pitch = 0;
    if (motion.lookTarget) {
      const gaze = motion.lookTarget.clone().sub(this.player.position).sub(new T.Vector3(0, 1.5, 0));
      look = clamp(angleDelta(Math.atan2(-gaze.x, -gaze.z), this.player.rotation.y), -.85, .85);
      pitch = clamp(Math.atan2(gaze.y, Math.hypot(gaze.x, gaze.z)), -.30, .25);
    }
    this.lookYaw = damp(this.lookYaw, look, 9, dt); this.lookPitch = damp(this.lookPitch, pitch, 6, dt);
    const breath = Math.sin(this.time * 1.7) * .006 * (1 - activity * .7);
    this.pose('Spine', lean * .45 + breath, -twist * .55 + this.lookYaw * .12, this.turn * .009 * activity);
    this.pose('Chest', lean * .25 - breath * .5, -twist * .6 + this.lookYaw * .23, -this.turn * .012 * activity);
    // Counter the torso rotation so the head remains stable in world space.
    this.pose('Head', -lean - breath * .5 - this.lookPitch + .004 * Math.sin(this.time * 1.13),
      twist * .15 + this.lookYaw * .65 + .014 * Math.sin(this.time * .73) * (1 - activity),
      .025 * transfer * Math.sign(supportX) + this.turn * .003 * activity);
    for (const leg of this.legs) {
      const side = leg.side, sign = leg.index === 0 ? 1 : -1;
      const armPhase = phase + leg.index * Math.PI;
      const asymmetry = leg.index === 0 ? 1 : .93;
      // Legs are solved in world space. Opposite arm leads with a delayed elbow/wrist.
      const arm = -.27 * Math.cos(armPhase) * activity * asymmetry;
      this.pose(side + 'UpperArm', arm - .018, this.lookYaw * .04,
        sign * (.025 + .012 * activity) + this.turn * .009);
      this.pose(side + 'ForeArm', -.10 - (.08 + .055 * Math.cos(armPhase - .35)) * activity, 0, sign * .012);
      this.pose(side + 'Hand', .025 * Math.cos(armPhase - .65) * activity, 0, sign * .018 * Math.sin(armPhase - .45) * activity);
    }
    this.player.updateWorldMatrix(true, true);
    for (const leg of this.legs) {
      const ankle = leg.plant.clone(); let yaw = leg.yaw; let roll = 0;
      if (leg.swing) {
        const t = leg.progress, travel = leg.from.distanceTo(leg.target);
        ankle.lerpVectors(leg.from, leg.target, smooth(t));
        ankle.y += Math.sin(Math.PI * t) ** 1.35 * clamp(.035 + travel * .13, .035, .105);
        yaw = leg.fromYaw + angleDelta(leg.toYaw, leg.fromYaw) * smooth(t);
        roll = -.18 * Math.sin(Math.PI * t) + .16 * smooth((t - .72) / .28);
      } else {
        // Heel settles after contact; the trailing foot rolls over the toe before lift.
        roll = .16 * (1 - smooth(leg.age / .09));
        if (swingLeg && swingLeg !== leg && measured > .15) roll -= .20 * smooth((p - .72) / .28);
      }
      leg.roll = roll;
      const yawQ = new T.Quaternion().setFromAxisAngle(UP, yaw);
      const axis = X.clone().applyQuaternion(yawQ);
      const rollQ = new T.Quaternion().setFromAxisAngle(axis, roll);
      if (!leg.swing) {
        // Rotate around the contact point rather than driving the sole through the floor.
        const footForward = new T.Vector3(0, 0, -1).applyQuaternion(yawQ);
        const pivotOffset = footForward.multiplyScalar(roll >= 0 ? -.075 : .14);
        pivotOffset.y = -leg.height;
        ankle.add(pivotOffset).sub(pivotOffset.clone().applyQuaternion(rollQ));
      }
      leg.solvedTarget = ankle;
      leg.solvedRotation = rollQ.multiply(yawQ).multiply(leg.restWorld);
    }
    // Keep both targets reachable by lowering the pelvis, never dragging a planted foot.
    let requiredDrop = 0;
    for (const leg of this.legs) {
      const hip = worldPosition(leg.thigh), ankle = leg.solvedTarget;
      const horizontal = Math.hypot(hip.x - ankle.x, hip.z - ankle.z);
      const reach = (leg.upper + leg.lower) * .995;
      const height = Math.sqrt(Math.max(.01, reach * reach - horizontal * horizontal));
      requiredDrop = Math.max(requiredDrop, hip.y - ankle.y - height);
    }
    this.pelvisDrop = Math.max(requiredDrop, damp(this.pelvisDrop, requiredDrop, 8, dt));
    hips.position.y -= Math.min(.16, this.pelvisDrop) / scale;
    this.player.updateWorldMatrix(true, true);
    for (const leg of this.legs) {
      leg.error = solveLegIK(leg, leg.solvedTarget, forward);
      setWorldQuaternion(leg.foot, leg.solvedRotation);
    }
    this.hero.updateWorldMatrix(true, true);
  }
}
