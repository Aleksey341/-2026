(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;

  const camera = scene.activeCamera;
  if (!camera) return;

  // app-v10 drives the POV camera with moveWithCollisions().
  // Babylon cameras expose the collision routine internally, while moveWithCollisions
  // is normally a mesh method. On mobile this caused the joystick UI to move while
  // the POV camera itself stayed in place (or the render loop stopped on first input).
  if (typeof camera.moveWithCollisions !== "function") {
    camera.moveWithCollisions = function moveCameraWithCollisions(displacement) {
      if (!displacement) return;
      if (this.checkCollisions && typeof this._collideWithWorld === "function") {
        this._collideWithWorld(displacement);
      } else {
        this.position.addInPlace(displacement);
      }
    };
  }

  const joystickBase = document.getElementById("joystickBase");
  const joystickKnob = document.getElementById("joystickKnob");
  if (!joystickBase || !joystickKnob) return;

  // Make first touch responsive immediately instead of requiring a visible drag first.
  const max = 42;
  function placeKnobFromPointer(e) {
    const r = joystickBase.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    joystickKnob.style.transform = `translate(${dx}px,${dy}px)`;
  }

  joystickBase.addEventListener("pointerdown", placeKnobFromPointer, { passive: true });

  // Safety: if the finger leaves the control, force the visual stick back to centre.
  const resetVisual = () => {
    joystickKnob.style.transform = "translate(0px,0px)";
  };
  window.addEventListener("pointerup", resetVisual, { passive: true });
  window.addEventListener("pointercancel", resetVisual, { passive: true });

  // Tiny diagnostic flag useful while testing on a phone.
  document.documentElement.dataset.mobileDrive = "ready";
})();
