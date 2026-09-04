(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;

  const engine = scene.getEngine();
  const driverCamera = scene.activeCamera;
  const canvas = engine.getRenderingCanvas();
  if (!driverCamera || !canvas) return;

  document.body.classList.add("car-mode-v13");

  // The original POV camera remains the logical interaction position used by app-v10.
  // Its own movement is disabled; this script now moves the vehicle and places that
  // logical camera inside the car every frame.
  try { driverCamera.moveWithCollisions = () => {}; } catch (_) {}
  try { driverCamera._collideWithWorld = () => {}; } catch (_) {}

  const oldHands = scene.getTransformNodeByName("povHands");
  oldHands?.setEnabled(false);

  function pbr(name, hex, metallic = 0.15, roughness = 0.32, emissive = 0, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    red: pbr("v13-car-red", "#d91024", 0.36, 0.18),
    redDark: pbr("v13-car-red-dark", "#760817", 0.28, 0.25),
    carbon: pbr("v13-carbon", "#080b0f", 0.58, 0.23),
    tire: pbr("v13-tire", "#060708", 0.02, 0.9),
    rim: pbr("v13-rim", "#191d22", 0.82, 0.18),
    glass: pbr("v13-glass", "#315467", 0.18, 0.12, 0.04, 0.54),
    light: pbr("v13-headlight", "#dff8ff", 0.08, 0.16, 1.0),
    tail: pbr("v13-taillight", "#ff2039", 0.05, 0.2, 1.15),
    neon: pbr("v13-neon", "#48d9ff", 0.03, 0.22, 1.0),
    skin: pbr("v13-skin", "#efb08c", 0.01, 0.68),
    hair: pbr("v13-hair", "#6a4735", 0.02, 0.78),
    jacket: pbr("v13-jacket", "#d0c0ad", 0.02, 0.6),
    blouse: pbr("v13-blouse", "#f5eee8", 0.01, 0.72),
    pants: pbr("v13-pants", "#273645", 0.02, 0.7),
    seat: pbr("v13-seat", "#141519", 0.08, 0.58)
  };

  const root = new BABYLON.TransformNode("v13-supercar", scene);
  root.position = new BABYLON.Vector3(0, 0.15, -11.8);

  function box(name, size, pos, mat, parent = root) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    m.isPickable = false;
    return m;
  }
  function sphere(name, diameter, pos, mat, parent = root) {
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 28 }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    m.isPickable = false;
    return m;
  }
  function cyl(name, opts, pos, mat, parent = root) {
    const m = BABYLON.MeshBuilder.CreateCylinder(name, opts, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    m.isPickable = false;
    return m;
  }

  // Ferrari-inspired 2027 concept proportions (no logo/brand assets).
  const lower = box("v13-lower-body", { width: 1.55, height: 0.32, depth: 3.25 }, new BABYLON.Vector3(0, 0.48, 0.03), M.red);
  lower.scaling.y = 0.72;

  const nose = sphere("v13-nose", 1.65, new BABYLON.Vector3(0, 0.58, 1.05), M.red);
  nose.scaling = new BABYLON.Vector3(0.92, 0.28, 1.12);

  const tail = sphere("v13-tail", 1.5, new BABYLON.Vector3(0, 0.62, -1.1), M.redDark);
  tail.scaling = new BABYLON.Vector3(0.95, 0.30, 0.85);

  const canopy = sphere("v13-canopy", 1.32, new BABYLON.Vector3(0, 0.93, -0.16), M.glass);
  canopy.scaling = new BABYLON.Vector3(0.72, 0.48, 0.98);

  box("v13-splitter", { width: 1.42, height: 0.08, depth: 0.34 }, new BABYLON.Vector3(0, 0.28, 1.66), M.carbon);
  box("v13-diffuser", { width: 1.32, height: 0.09, depth: 0.42 }, new BABYLON.Vector3(0, 0.27, -1.66), M.carbon);
  box("v13-side-left", { width: 0.16, height: 0.13, depth: 2.2 }, new BABYLON.Vector3(-0.78, 0.35, 0), M.carbon);
  box("v13-side-right", { width: 0.16, height: 0.13, depth: 2.2 }, new BABYLON.Vector3(0.78, 0.35, 0), M.carbon);

  const headlights = [
    box("v13-headlight-l", { width: 0.36, height: 0.07, depth: 0.08 }, new BABYLON.Vector3(-0.46, 0.58, 1.61), M.light),
    box("v13-headlight-r", { width: 0.36, height: 0.07, depth: 0.08 }, new BABYLON.Vector3(0.46, 0.58, 1.61), M.light)
  ];
  const taillights = [
    box("v13-tail-l", { width: 0.42, height: 0.07, depth: 0.08 }, new BABYLON.Vector3(-0.45, 0.58, -1.61), M.tail),
    box("v13-tail-r", { width: 0.42, height: 0.07, depth: 0.08 }, new BABYLON.Vector3(0.45, 0.58, -1.61), M.tail)
  ];

  // Underglow.
  const under = box("v13-underglow", { width: 1.22, height: 0.018, depth: 2.55 }, new BABYLON.Vector3(0, 0.19, 0), M.neon);

  // Wheels.
  const wheelPositions = [
    [-0.79, 0.38, 1.05], [0.79, 0.38, 1.05],
    [-0.79, 0.38, -1.08], [0.79, 0.38, -1.08]
  ];
  const wheels = [];
  wheelPositions.forEach((p, i) => {
    const tire = cyl(`v13-tire-${i}`, { height: 0.25, diameter: 0.62, tessellation: 36 }, new BABYLON.Vector3(...p), M.tire);
    tire.rotation.z = Math.PI / 2;
    const rim = cyl(`v13-rim-${i}`, { height: 0.27, diameter: 0.38, tessellation: 24 }, new BABYLON.Vector3(...p), M.rim);
    rim.rotation.z = Math.PI / 2;
    wheels.push({ tire, rim, front: i < 2 });
  });

  // Driver: stylised seated female character.
  const seat = box("v13-seat", { width: 0.56, height: 0.18, depth: 0.68 }, new BABYLON.Vector3(0, 0.68, -0.28), M.seat);
  seat.rotation.x = -0.12;
  const torso = cyl("v13-driver-torso", { height: 0.58, diameterTop: 0.38, diameterBottom: 0.48, tessellation: 20 }, new BABYLON.Vector3(0, 1.02, -0.28), M.jacket);
  torso.rotation.x = -0.08;
  box("v13-driver-blouse", { width: 0.20, height: 0.34, depth: 0.04 }, new BABYLON.Vector3(0, 1.04, -0.04), M.blouse);
  sphere("v13-driver-head", 0.42, new BABYLON.Vector3(0, 1.45, -0.29), M.skin);
  const hair = sphere("v13-driver-hair", 0.46, new BABYLON.Vector3(0, 1.52, -0.32), M.hair);
  hair.scaling.y = 0.72;
  sphere("v13-driver-hair-l", 0.20, new BABYLON.Vector3(-0.18, 1.45, -0.34), M.hair);
  sphere("v13-driver-hair-r", 0.20, new BABYLON.Vector3(0.18, 1.45, -0.34), M.hair);
  const armL = cyl("v13-arm-l", { height: 0.48, diameter: 0.12, tessellation: 12 }, new BABYLON.Vector3(-0.24, 0.98, -0.02), M.jacket);
  armL.rotation.x = 1.1; armL.rotation.z = -0.22;
  const armR = cyl("v13-arm-r", { height: 0.48, diameter: 0.12, tessellation: 12 }, new BABYLON.Vector3(0.24, 0.98, -0.02), M.jacket);
  armR.rotation.x = 1.1; armR.rotation.z = 0.22;
  const legL = cyl("v13-leg-l", { height: 0.58, diameter: 0.15, tessellation: 12 }, new BABYLON.Vector3(-0.16, 0.65, 0.18), M.pants);
  legL.rotation.x = 1.08;
  const legR = cyl("v13-leg-r", { height: 0.58, diameter: 0.15, tessellation: 12 }, new BABYLON.Vector3(0.16, 0.65, 0.18), M.pants);
  legR.rotation.x = 1.08;

  // Steering wheel.
  const steering = BABYLON.MeshBuilder.CreateTorus("v13-steering", { diameter: 0.38, thickness: 0.035, tessellation: 48 }, scene);
  steering.parent = root;
  steering.position = new BABYLON.Vector3(0, 0.91, 0.25);
  steering.rotation.x = 0.55;
  steering.material = M.carbon;

  // Lights around the vehicle.
  const frontLight = new BABYLON.SpotLight("v13-front-light", new BABYLON.Vector3(0, 0.7, 1.4), new BABYLON.Vector3(0, -0.04, 1), Math.PI / 4, 3, scene);
  frontLight.parent = root;
  frontLight.diffuse = BABYLON.Color3.FromHexString("#dff8ff");
  frontLight.intensity = 2.4;
  frontLight.range = 13;

  const glow = scene.getGlowLayerByName?.("glow");
  [...headlights, ...taillights, under].forEach(m => glow?.addIncludedOnlyMesh?.(m));

  // Chase camera.
  const chase = new BABYLON.UniversalCamera("v13-chase-camera", new BABYLON.Vector3(0, 2.7, -17), scene);
  chase.minZ = 0.05;
  chase.fov = 0.92;
  chase.inertia = 0;
  scene.activeCamera = chase;

  let carYaw = 0;
  let speed = 0;
  let wheelSpin = 0;
  let steerVisual = 0;
  let orbitYaw = 0;
  let orbitPitch = 0;

  const keys = new Set();
  window.addEventListener("keydown", e => keys.add(e.code));
  window.addEventListener("keyup", e => keys.delete(e.code));

  // Mobile joystick input (parallel listener to the visual joystick already present).
  const joyBase = document.getElementById("joystickBase");
  const joyKnob = document.getElementById("joystickKnob");
  const joy = { x: 0, y: 0, id: null };
  if (joyBase) {
    const updateJoy = e => {
      const r = joyBase.getBoundingClientRect();
      const max = Math.min(r.width, r.height) * 0.34;
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      joy.x = dx / max;
      joy.y = -dy / max;
      if (joyKnob) joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    };
    const resetJoy = () => {
      joy.id = null; joy.x = 0; joy.y = 0;
      if (joyKnob) joyKnob.style.transform = "translate(0px,0px)";
    };
    joyBase.addEventListener("pointerdown", e => {
      joy.id = e.pointerId;
      joyBase.setPointerCapture?.(e.pointerId);
      updateJoy(e);
    });
    joyBase.addEventListener("pointermove", e => { if (e.pointerId === joy.id) updateJoy(e); });
    joyBase.addEventListener("pointerup", e => { if (e.pointerId === joy.id) resetJoy(); });
    joyBase.addEventListener("pointercancel", resetJoy);
  }

  // Right-side drag = orbit chase camera; release keeps the chosen angle.
  let lookId = null;
  let lastLook = null;
  canvas.addEventListener("pointerdown", e => {
    if (e.clientX < innerWidth * 0.44) return;
    lookId = e.pointerId;
    lastLook = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointermove", e => {
    if (e.pointerId !== lookId || !lastLook) return;
    orbitYaw -= (e.clientX - lastLook.x) * 0.0045;
    orbitPitch += (e.clientY - lastLook.y) * 0.0035;
    orbitYaw = Math.max(-1.15, Math.min(1.15, orbitYaw));
    orbitPitch = Math.max(-0.18, Math.min(0.48, orbitPitch));
    lastLook = { x: e.clientX, y: e.clientY };
  });
  const endLook = e => { if (e.pointerId === lookId) { lookId = null; lastLook = null; } };
  canvas.addEventListener("pointerup", endLook);
  canvas.addEventListener("pointercancel", endLook);

  const hud = document.createElement("div");
  hud.className = "car-hud-v13";
  hud.innerHTML = `
    <div class="car-model"><span>2027 CONCEPT</span><strong>ROSSO GT</strong></div>
    <div class="car-speed"><strong id="v13Speed">0</strong><span>км/ч</span></div>
    <div class="car-hint">W / ↑ — газ · S / ↓ — тормоз/реверс · A/D — руль · Space — тормоз</div>
  `;
  document.body.appendChild(hud);
  const speedEl = document.getElementById("v13Speed");

  const badge = document.querySelector(".demo2025-badge");
  if (badge) badge.style.top = "58px";

  function damp(value, target, lambda, dt) {
    return BABYLON.Scalar.Lerp(value, target, 1 - Math.exp(-lambda * dt));
  }

  function updateCar(dt) {
    let throttle = 0;
    let steer = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) throttle += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) throttle -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) steer += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) steer -= 1;
    throttle = BABYLON.Scalar.Clamp(throttle + joy.y, -1, 1);
    steer = BABYLON.Scalar.Clamp(steer + joy.x, -1, 1);

    const maxForward = 8.2;
    const maxReverse = -3.2;
    const accel = throttle >= 0 ? 6.6 : 5.4;

    if (Math.abs(throttle) > 0.04) {
      speed += throttle * accel * dt;
    } else {
      const drag = 3.5 * dt;
      if (speed > 0) speed = Math.max(0, speed - drag);
      else if (speed < 0) speed = Math.min(0, speed + drag);
    }

    if (keys.has("Space")) {
      const brake = 10.5 * dt;
      if (speed > 0) speed = Math.max(0, speed - brake);
      else speed = Math.min(0, speed + brake);
    }

    speed = BABYLON.Scalar.Clamp(speed, maxReverse, maxForward);

    const speedFactor = Math.min(Math.abs(speed) / maxForward, 1);
    const turnRate = 1.65 * (0.20 + speedFactor * 0.80);
    if (Math.abs(speed) > 0.06) carYaw += steer * turnRate * dt * (speed >= 0 ? 1 : -1);
    root.rotation.y = carYaw;

    const forward = new BABYLON.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw));
    root.position.addInPlace(forward.scale(speed * dt));

    // Keep the car at floor level and within a reasonable playable envelope.
    root.position.y = 0.15;
    root.position.x = BABYLON.Scalar.Clamp(root.position.x, -15.0, 15.0);
    root.position.z = BABYLON.Scalar.Clamp(root.position.z, -14.2, 14.2);

    wheelSpin += speed * dt * 3.45;
    steerVisual = damp(steerVisual, steer * 0.48, 9, dt);
    wheels.forEach(w => {
      w.tire.rotation.x = wheelSpin;
      w.rim.rotation.x = wheelSpin;
      if (w.front) {
        w.tire.rotation.y = steerVisual;
        w.rim.rotation.y = steerVisual;
      }
    });
    steering.rotation.z = -steerVisual * 1.7;

    // Lean the body a little during steering to feel less static.
    lower.rotation.z = damp(lower.rotation.z, -steer * speedFactor * 0.035, 8, dt);

    // Logical app-v10 camera follows the driver seat for zones/interactions/results.
    driverCamera.position.copyFrom(root.position.add(new BABYLON.Vector3(0, 1.12, 0)));
    driverCamera.rotation.y = carYaw;
    driverCamera.rotation.x = 0;

    if (speedEl) speedEl.textContent = Math.round(Math.abs(speed) * 18);
  }

  function updateChase(dt) {
    const camYaw = carYaw + orbitYaw;
    const forward = new BABYLON.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    const side = new BABYLON.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const target = root.position.add(new BABYLON.Vector3(0, 0.82, 0)).add(new BABYLON.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw)).scale(1.05));
    let desired = root.position
      .subtract(forward.scale(5.2))
      .add(new BABYLON.Vector3(0, 2.25 + orbitPitch * 2.0, 0))
      .add(side.scale(orbitYaw * 0.22));

    // Keep chase camera in front of walls where possible.
    const rayVec = desired.subtract(target);
    const rayLen = rayVec.length();
    if (rayLen > 0.01) {
      const ray = new BABYLON.Ray(target, rayVec.normalize(), rayLen);
      const hit = scene.pickWithRay(ray, mesh => {
        if (!mesh || !mesh.checkCollisions) return false;
        let n = mesh;
        while (n) { if (n === root) return false; n = n.parent; }
        return true;
      });
      if (hit?.hit && hit.distance > 0.6) desired = target.add(ray.direction.scale(Math.max(0.7, hit.distance - 0.28)));
    }

    chase.position = BABYLON.Vector3.Lerp(chase.position, desired, 1 - Math.exp(-8.5 * dt));
    chase.setTarget(target);
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    updateCar(dt);
    updateChase(dt);
  });

  window.addEventListener("keydown", e => {
    if (e.code === "KeyC") {
      orbitYaw = 0;
      orbitPitch = 0;
    }
  });
})();
