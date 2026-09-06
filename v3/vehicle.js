(() => {
  const H = window.HR3;
  if (!H) return;
  const { scene, camera, glow, state } = H;

  function pbr(name, hex, metallic = 0.2, roughness = 0.28, emissive = 0, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    red: pbr("hr3-car-red", "#d90f28", 0.52, 0.16),
    redDark: pbr("hr3-car-red-dark", "#720714", 0.46, 0.22),
    carbon: pbr("hr3-carbon", "#090b0f", 0.72, 0.20),
    glass: pbr("hr3-glass", "#31576d", 0.15, 0.08, 0.05, 0.48),
    tire: pbr("hr3-tire", "#050607", 0.02, 0.92),
    rim: pbr("hr3-rim", "#252a31", 0.86, 0.16),
    light: pbr("hr3-head", "#e6fbff", 0.06, 0.15, 1.0),
    tail: pbr("hr3-tail", "#ff2342", 0.04, 0.18, 1.1),
    neon: pbr("hr3-neon", "#52ddff", 0.04, 0.18, 1.0),
    seat: pbr("hr3-seat", "#14161b", 0.08, 0.62)
  };

  const root = new BABYLON.TransformNode("hr3-vehicle", scene);
  root.position.set(0, 0.18, 0);
  const fallback = new BABYLON.TransformNode("hr3-fallback-car", scene);
  fallback.parent = root;

  function box(name, size, pos, mat, parent = fallback) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }
  function sphere(name, diameter, pos, mat, parent = fallback) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 30 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }
  function cyl(name, opts, pos, mat, parent = fallback) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, opts, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }

  const lower = box("hr3-body-lower", { width: 1.66, height: 0.31, depth: 3.45 }, new BABYLON.Vector3(0, 0.46, 0), M.red);
  lower.scaling.y = 0.72;
  const nose = sphere("hr3-body-nose", 1.72, new BABYLON.Vector3(0, 0.56, 1.14), M.red);
  nose.scaling.set(0.96, 0.28, 1.18);
  const tail = sphere("hr3-body-tail", 1.58, new BABYLON.Vector3(0, 0.60, -1.17), M.redDark);
  tail.scaling.set(0.98, 0.30, 0.90);
  const canopy = sphere("hr3-canopy", 1.38, new BABYLON.Vector3(0, 0.95, -0.12), M.glass);
  canopy.scaling.set(0.73, 0.48, 1.02);
  box("hr3-splitter", { width: 1.48, height: 0.065, depth: 0.36 }, new BABYLON.Vector3(0, 0.28, 1.76), M.carbon);
  box("hr3-diffuser", { width: 1.36, height: 0.08, depth: 0.46 }, new BABYLON.Vector3(0, 0.27, -1.75), M.carbon);
  box("hr3-side-l", { width: 0.13, height: 0.13, depth: 2.35 }, new BABYLON.Vector3(-0.83, 0.34, 0), M.carbon);
  box("hr3-side-r", { width: 0.13, height: 0.13, depth: 2.35 }, new BABYLON.Vector3(0.83, 0.34, 0), M.carbon);
  box("hr3-seat", { width: 0.56, height: 0.18, depth: 0.65 }, new BABYLON.Vector3(0, 0.72, -0.32), M.seat);

  const headL = box("hr3-head-l", { width: 0.39, height: 0.065, depth: 0.07 }, new BABYLON.Vector3(-0.48, 0.58, 1.68), M.light);
  const headR = box("hr3-head-r", { width: 0.39, height: 0.065, depth: 0.07 }, new BABYLON.Vector3(0.48, 0.58, 1.68), M.light);
  const tailL = box("hr3-tail-l", { width: 0.44, height: 0.065, depth: 0.08 }, new BABYLON.Vector3(-0.46, 0.58, -1.68), M.tail);
  const tailR = box("hr3-tail-r", { width: 0.44, height: 0.065, depth: 0.08 }, new BABYLON.Vector3(0.46, 0.58, -1.68), M.tail);
  const under = box("hr3-underglow", { width: 1.28, height: 0.014, depth: 2.7 }, new BABYLON.Vector3(0, 0.18, -0.05), M.neon);
  [headL, headR, tailL, tailR, under].forEach(m => glow.addIncludedOnlyMesh(m));

  const wheelPositions = [
    [-0.84, 0.38, 1.10], [0.84, 0.38, 1.10],
    [-0.84, 0.38, -1.14], [0.84, 0.38, -1.14]
  ];
  const wheels = wheelPositions.map((p, i) => {
    const holder = new BABYLON.TransformNode(`hr3-wheel-holder-${i}`, scene);
    holder.parent = fallback;
    holder.position.set(...p);
    const tire = cyl(`hr3-tire-${i}`, { height: 0.25, diameter: 0.64, tessellation: 36 }, BABYLON.Vector3.Zero(), M.tire, holder);
    tire.rotation.z = Math.PI / 2;
    const rim = cyl(`hr3-rim-${i}`, { height: 0.265, diameter: 0.39, tessellation: 24 }, BABYLON.Vector3.Zero(), M.rim, holder);
    rim.rotation.z = Math.PI / 2;
    return { holder, tire, rim, front: i < 2 };
  });

  const frontLight = new BABYLON.SpotLight("hr3-front-light", new BABYLON.Vector3(0, 0.62, 1.5), new BABYLON.Vector3(0, -0.035, 1), Math.PI / 4, 3, scene);
  frontLight.parent = root;
  frontLight.diffuse = BABYLON.Color3.FromHexString("#dffaff");
  frontLight.intensity = 2.2;
  frontLight.range = 18;

  const brakeGlow = new BABYLON.PointLight("hr3-brake-glow", new BABYLON.Vector3(0, 0.55, -1.72), scene);
  brakeGlow.parent = root;
  brakeGlow.diffuse = BABYLON.Color3.FromHexString("#ff2140");
  brakeGlow.range = 4.2;
  brakeGlow.intensity = 0.12;

  const keys = new Set();
  window.addEventListener("keydown", e => {
    keys.add(e.code);
    if (e.code === "KeyV") cameraMode = (cameraMode + 1) % 3;
  });
  window.addEventListener("keyup", e => keys.delete(e.code));

  const manual = { throttle: 0, steer: 0, brake: false };
  const autoInput = { throttle: 0, steer: 0, brake: false, active: false };
  const xrInput = { throttle: 0, steer: 0, brake: false, active: false };

  let joy = { x: 0, y: 0, id: null };
  if (H.isMobile) {
    const mobile = document.createElement("div");
    mobile.className = "hr3-mobile-controls";
    mobile.innerHTML = `
      <div class="hr3-joy" id="hr3Joy"><i id="hr3JoyKnob"></i></div>
      <button id="hr3Brake" type="button">ТОРМОЗ</button>
      <button id="hr3Cam" type="button">КАМЕРА</button>`;
    document.body.appendChild(mobile);
    const base = mobile.querySelector("#hr3Joy");
    const knob = mobile.querySelector("#hr3JoyKnob");
    const updateJoy = e => {
      const r = base.getBoundingClientRect();
      const max = r.width * 0.34;
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      joy.x = dx / max;
      joy.y = -dy / max;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    };
    const reset = () => { joy.x = joy.y = 0; joy.id = null; knob.style.transform = "translate(0,0)"; };
    base.addEventListener("pointerdown", e => { joy.id = e.pointerId; base.setPointerCapture?.(e.pointerId); updateJoy(e); });
    base.addEventListener("pointermove", e => { if (e.pointerId === joy.id) updateJoy(e); });
    base.addEventListener("pointerup", reset);
    base.addEventListener("pointercancel", reset);
    mobile.querySelector("#hr3Brake").addEventListener("pointerdown", () => manual.brake = true);
    ["pointerup","pointercancel","pointerleave"].forEach(ev => mobile.querySelector("#hr3Brake").addEventListener(ev, () => manual.brake = false));
    mobile.querySelector("#hr3Cam").addEventListener("click", () => cameraMode = (cameraMode + 1) % 3);
  }

  let yaw = 0;
  let speed = 0;
  let wheelSpin = 0;
  let steerVisual = 0;
  let cameraMode = 0;
  let previousSpeed = 0;

  function damp(a, b, lambda, dt) { return BABYLON.Scalar.Lerp(a, b, 1 - Math.exp(-lambda * dt)); }

  function getInput() {
    if (xrInput.active) return xrInput;
    if (autoInput.active) return autoInput;
    manual.throttle = 0;
    manual.steer = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) manual.throttle += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) manual.throttle -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) manual.steer -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) manual.steer += 1;
    manual.throttle = BABYLON.Scalar.Clamp(manual.throttle + joy.y, -1, 1);
    manual.steer = BABYLON.Scalar.Clamp(manual.steer + joy.x, -1, 1);
    manual.brake = manual.brake || keys.has("Space");
    return manual;
  }

  function update(dt) {
    if (!state.running) return;
    const input = getInput();
    const maxForward = 10.8;
    const maxReverse = -3.4;
    const accel = input.throttle >= 0 ? 7.4 : 5.6;
    if (Math.abs(input.throttle) > 0.025) speed += input.throttle * accel * dt;
    else {
      const drag = 2.45 * dt;
      if (speed > 0) speed = Math.max(0, speed - drag);
      else speed = Math.min(0, speed + drag);
    }
    if (input.brake) {
      const b = 13.5 * dt;
      if (speed > 0) speed = Math.max(0, speed - b); else speed = Math.min(0, speed + b);
    }
    speed = BABYLON.Scalar.Clamp(speed, maxReverse, maxForward);

    const sf = Math.min(Math.abs(speed) / maxForward, 1);
    const turnRate = 1.15 * (0.24 + sf * 0.76);
    if (Math.abs(speed) > 0.035) yaw += input.steer * turnRate * dt * (speed >= 0 ? 1 : -1);
    root.rotation.y = yaw;
    const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    root.position.addInPlace(forward.scale(speed * dt));
    root.position.y = 0.18;

    wheelSpin += speed * dt * 3.55;
    steerVisual = damp(steerVisual, input.steer * 0.45, 9, dt);
    wheels.forEach(w => {
      w.tire.rotation.x = wheelSpin;
      w.rim.rotation.x = wheelSpin;
      if (w.front) w.holder.rotation.y = steerVisual;
    });

    const accelVisual = (speed - previousSpeed) / Math.max(dt, 0.016);
    fallback.rotation.x = damp(fallback.rotation.x, BABYLON.Scalar.Clamp(-accelVisual * 0.0035, -0.045, 0.045), 7, dt);
    fallback.rotation.z = damp(fallback.rotation.z, BABYLON.Scalar.Clamp(-input.steer * sf * 0.055, -0.055, 0.055), 8, dt);
    brakeGlow.intensity = input.brake || accelVisual < -2.6 ? 1.55 : 0.12;
    previousSpeed = speed;

    if (!state.xrActive) {
      const presets = [
        { back: 6.1, height: 2.45, side: 0, look: 1.2 },
        { back: 3.9, height: 1.35, side: 0, look: 1.5 },
        { back: 8.0, height: 3.4, side: 1.5, look: 1.6 }
      ];
      const p = presets[cameraMode];
      const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const desired = root.position.subtract(forward.scale(p.back)).add(new BABYLON.Vector3(0, p.height, 0)).add(right.scale(p.side));
      camera.position = BABYLON.Vector3.Lerp(camera.position, desired, 1 - Math.exp(-7.8 * dt));
      camera.setTarget(root.position.add(new BABYLON.Vector3(0, 0.78, 0)).add(forward.scale(p.look)));
      camera.fov = damp(camera.fov, 0.90 + sf * 0.12, 4.2, dt);
    }
  }

  async function loadPremiumModel(url = "./assets/supercar-2027.glb") {
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(null, "", url, scene);
      const modelRoot = new BABYLON.TransformNode("hr3-premium-car", scene);
      modelRoot.parent = root;
      result.meshes.filter(m => m.parent == null).forEach(m => m.parent = modelRoot);
      modelRoot.scaling.setAll(1);
      fallback.setEnabled(false);
      H.emit("vehicle:model", { type: "glb", url });
      return true;
    } catch (err) {
      console.warn("HR3 GLB model unavailable; procedural fallback remains active.", err);
      fallback.setEnabled(true);
      return false;
    }
  }

  H.vehicle = {
    root,
    get speed() { return speed; },
    get speedKmh() { return Math.abs(speed) * 18; },
    get yaw() { return yaw; },
    setAutoInput(input) { Object.assign(autoInput, input, { active: true }); },
    clearAutoInput() { autoInput.active = false; autoInput.throttle = autoInput.steer = 0; autoInput.brake = false; },
    setXRInput(input) { Object.assign(xrInput, input, { active: true }); },
    clearXRInput() { xrInput.active = false; xrInput.throttle = xrInput.steer = 0; xrInput.brake = false; },
    setPose(x, z, heading = 0) { root.position.x = x; root.position.z = z; yaw = heading; root.rotation.y = yaw; speed = 0; },
    loadPremiumModel,
    fallback
  };

  H.registerUpdate(update);
})();
