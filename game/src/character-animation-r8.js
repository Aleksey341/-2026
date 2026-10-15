import * as T from '../vendor/three.module.js';

export const R8_CLIPS = Object.freeze({
  idle: 'Idle', walk: 'Walk', start: 'WalkStart', stop: 'WalkStop',
  turnLeft: 'TurnLeft', turnRight: 'TurnRight', interact: 'Interact',
  reach: 'Reach', wear: 'WearVR'
});
export const R8_LOCOMOTION = Object.freeze(['idle','walk','start','stop','turnLeft','turnRight']);
const LOOPS = new Set(['idle', 'walk']);
const GESTURES = new Set(['interact', 'reach', 'wear']);

/** Plays supplied skeletal clips only. Does not move the player or rotate bones.
 * The game must pass speed measured AFTER collisions, in metres/second.
 * walkSpeed is the measured reference speed of the supplied Walk clip.
 * This controller is staged for integration after a real rigged GLB is accepted.
 */
export class CharacterAnimationR8 {
  constructor(root, clips, {names = R8_CLIPS, walkSpeed, fade = .18, requiredStates = Object.keys(R8_CLIPS)} = {}) {
    if (!(Number.isFinite(walkSpeed) && walkSpeed > 0)) {
      throw new Error('R8: measured Walk reference speed is required');
    }
    const resolved = {};
    for (const key of Object.keys(R8_CLIPS)) {
      const candidates = clips.filter(c => c.name === names[key]);
      if (candidates.length !== 1 || !candidates[0].tracks.length ||
          !(candidates[0].duration > 0)) {
        if(requiredStates.includes(key))throw new Error(`R8: supply one non-empty clip for ${key}: ${names[key]}`);
        continue;
      }
      resolved[key] = candidates[0];
    }
    this.mixer = new T.AnimationMixer(root);
    this.actions = Object.fromEntries(Object.entries(resolved).map(([key, clip]) =>
      [key, this.mixer.clipAction(clip)]));
    this.walkSpeed = walkSpeed;
    this.fade = fade;
    this.speed = 0;
    this.state = null;
    this.gesture = null;
    this.disposed = false;
    this.onFinished = event => {
      if (event.action !== this.active) return;
      this.gesture = null;
      this.play(this.speed > .02 ? 'walk' : 'idle');
    };
    this.mixer.addEventListener('finished', this.onFinished);
    this.play('idle', 0);
  }

  play(state, fade = this.fade) {
    if (state === this.state) return;
    const next = this.actions[state];
    if (!next) throw new Error('R8: unknown animation state '+state);
    const previous = this.active;
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    next.clampWhenFinished = !LOOPS.has(state);
    next.setLoop(LOOPS.has(state) ? T.LoopRepeat : T.LoopOnce, Infinity);
    next.play();
    // Avoid freezing an already finished action during the crossfade.
    if (previous && fade > 0) next.crossFadeFrom(previous, fade, false);
    else if (previous) previous.stop();
    this.active = next;
    this.state = state;
    if (state === 'walk') next.setEffectiveTimeScale(this.speed / this.walkSpeed);
  }

  trigger(gesture) {
    if (!GESTURES.has(gesture)) throw new Error('R8: unknown gesture '+gesture);
    if (this.disposed) throw new Error('R8: controller disposed');
    if (!this.actions[gesture] || this.gesture) return false;
    this.gesture = gesture;
    this.play(gesture);
    return true;
  }

  update(dt, {speed = 0, turn = null, teleported = false} = {}) {
    if (this.disposed) return;
    if (!(Number.isFinite(dt) && dt >= 0) ||
        !(Number.isFinite(speed) && speed >= 0)) {
      throw new Error('R8: finite, non-negative time and actual speed required');
    }
    this.speed = teleported ? 0 : speed;
    if (teleported) {
      this.reset();
    } else if (!this.gesture) {
      if (this.speed > .02) {
        if (this.state === 'idle' || this.state === 'stop') this.play('start');
        else if (this.state !== 'start' && this.state !== 'walk') this.play('walk');
      } else if (this.state === 'walk' || this.state === 'start') {
        this.play('stop');
      } else if (this.state === 'idle' && (turn === 'left' || turn === 'right')) {
        this.play(turn === 'left' ? 'turnLeft' : 'turnRight');
      }
    }
    if (this.state === 'walk') {
      // No minimum phase rate: blocked movement must not keep the feet walking.
      this.active.setEffectiveTimeScale(this.speed / this.walkSpeed);
    }
    this.mixer.update(dt);
  }

  reset() {
    this.mixer.stopAllAction();
    this.gesture = null;
    this.speed = 0;
    this.state = null;
    this.active = null;
    this.play('idle', 0);
  }

  dispose() {
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
    this.disposed = true;
  }
}
