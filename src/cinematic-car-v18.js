(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  const chase = scene.getCameraByName("v13-chase-camera");
  if (!car || !chase) return;

  document.body.classList.add("cinematic-car-v18");

  const speedEl = document.getElementById("v13Speed");
  const distanceEl = document.getElementById("v16Distance");
  const glow = scene.getGlowLayerByName?.("glow");

  function pbr(name, hex, emissive = 0, alpha = 1, metallic = 0.1, roughness = 0.24) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    red: pbr("v18-red", "#ff2748", 1.05, 0.56),
    redSoft: pbr("v18-red-soft", "#ff3452", 0.72, 0.13),
    cyan: pbr("v18-cyan", "#57ddff", 0.98, 0.28),
    cyanSoft: pbr("v18-cyan-soft", "#78e9ff", 0.62, 0.10),
    violet: pbr("v18-violet", "#c19dff", 1.0, 0.46),
    violetSoft: pbr("v18-violet-soft", "#b99bff", 0.70, 0.12),
    white: pbr("v18-white", "#f2fdff", 0.9, 0.46)
  };

  function box(name, size, pos, material, parent = car) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    return mesh;
  }

  // Light wake: static relative to the car, but scaled with speed so acceleration becomes visible.
  const leftWake = box("v18-tail-wake-l", { width: 0.10, height: 0.045, depth: 2.8 }, new BABYLON.Vector3(-0.45, 0.55, -2.75), M.redSoft);
  const rightWake = box("v18-tail-wake-r", { width: 0.10, height: 0.045, depth: 2.8 }, new BABYLON.Vector3(0.45, 0.55, -2.75), M.redSoft);
  const underWake = box("v18-under-wake", { width: 1.10, height: 0.015, depth: 3.6 }, new BABYLON.Vector3(0, 0.16, -2.15), M.cyanSoft);
  [leftWake, rightWake, underWake].forEach(m => glow?.addIncludedOnlyMesh?.(m));

  // Volumetric-looking headlight cones built with transparent tapered cylinders.
  function beam(name, x) {
    const b = BABYLON.MeshBuilder.CreateCylinder(name, {
      height: 5.5,
      diameterTop: 1.9,
      diameterBottom: 0.18,
      tessellation: 28
    }, scene);
    b.parent = car;
    b.position = new BABYLON.Vector3(x, 0.48, 3.95);
    b.rotation.x = Math.PI / 2;
    b.material = M.cyanSoft;
    b.visibility = 0.18;
    b.isPickable = false;
    b.checkCollisions = false;
    return b;
  }
  const beamL = beam("v18-head-beam-l", -0.44);
  const beamR = beam("v18-head-beam-r", 0.44);

  // Additional brake glow behind the rear lights.
  const brakeLightL = new BABYLON.PointLight("v18-brake-light-l", new BABYLON.Vector3(-0.46, 0.58, -1.75), scene);
  const brakeLightR = new BABYLON.PointLight("v18-brake-light-r", new BABYLON.Vector3(0.46, 0.58, -1.75), scene);
  brakeLightL.parent = car;
  brakeLightR.parent = car;
  brakeLightL.diffuse = brakeLightR.diffuse = BABYLON.Color3.FromHexString("#ff2444");
  brakeLightL.range = brakeLightR.range = 4.5;
  brakeLightL.intensity = brakeLightR.intensity = 0.18;

  const tailL = scene.getMeshByName("v13-tail-l");
  const tailR = scene.getMeshByName("v13-tail-r");
  const baseTailEmission = BABYLON.Color3.FromHexString("#ff2039");

  // Procedural particle texture, so the project stays asset-free and fast on GitHub Pages.
  const particleTexture = new BABYLON.DynamicTexture("v18-particle-texture", { width: 32, height: 32 }, scene, false);
  const ctx = particleTexture.getContext();
  ctx.clearRect(0, 0, 32, 32);
  const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(170,235,255,.8)");
  grad.addColorStop(1, "rgba(80,190,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  particleTexture.update();

  const emitters = [];
  [-0.66, 0.66].forEach((x, i) => {
    const emitter = BABYLON.MeshBuilder.CreateBox(`v18-wheel-emitter-${i}`, { size: 0.03 }, scene);
    emitter.parent = car;
    emitter.position = new BABYLON.Vector3(x, 0.18, -1.18);
    emitter.isVisible = false;
    emitter.isPickable = false;
    emitters.push(emitter);
  });

  const particles = emitters.map((emitter, i) => {
    const ps = new BABYLON.ParticleSystem(`v18-wheel-particles-${i}`, 180, scene);
    ps.particleTexture = particleTexture;
    ps.emitter = emitter;
    ps.minEmitBox = new BABYLON.Vector3(-0.04, -0.01, -0.04);
    ps.maxEmitBox = new BABYLON.Vector3(0.04, 0.02, 0.04);
    ps.color1 = new BABYLON.Color4(0.36, 0.88, 1.0, 0.45);
    ps.color2 = new BABYLON.Color4(0.78, 0.94, 1.0, 0.25);
    ps.colorDead = new BABYLON.Color4(0.12, 0.20, 0.26, 0);
    ps.minSize = 0.025;
    ps.maxSize = 0.11;
    ps.minLifeTime = 0.18;
    ps.maxLifeTime = 0.48;
    ps.emitRate = 0;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new BABYLON.Vector3(0, -0.15, 0);
    ps.direction1 = new BABYLON.Vector3(-0.24, 0.22, -1.4);
    ps.direction2 = new BABYLON.Vector3(0.24, 0.44, -2.2);
    ps.minEmitPower = 0.4;
    ps.maxEmitPower = 1.1;
    ps.updateSpeed = 0.012;
    ps.start();
    return ps;
  });

  // Three follow-camera presets. Every preset remains anchored to the car.
  const presets = ["CHASE", "LOW", "WIDE"];
  let cameraMode = 0;
  const camChip = document.createElement("button");
  camChip.className = "v18-camera-chip";
  camChip.type = "button";
  camChip.innerHTML = '<span>CAMERA</span><strong>CHASE</strong><i>V</i>';
  document.body.appendChild(camChip);
  const camModeEl = camChip.querySelector("strong");

  function cycleCamera() {
    cameraMode = (cameraMode + 1) % presets.length;
    camModeEl.textContent = presets[cameraMode];
    navigator.vibrate?.(12);
  }
  camChip.addEventListener("pointerdown", e => { e.preventDefault(); cycleCamera(); });
  window.addEventListener("keydown", e => { if (e.code === "KeyV") cycleCamera(); });

  const keys = new Set();
  window.addEventListener("keydown", e => keys.add(e.code));
  window.addEventListener("keyup", e => keys.delete(e.code));

  // Final 2027 portal amplification. The base portal from v16 remains; these rings form an energy tunnel.
  const finalRings = [];
  for (let i = 0; i < 7; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`v18-final-ring-${i}`, {
      diameter: 9.0 + i * 0.62,
      thickness: 0.035 + i * 0.005,
      tessellation: 84
    }, scene);
    ring.material = i % 2 ? M.violet : M.white;
    ring.rotation.x = Math.PI / 2;
    ring.scaling.y = 0.88;
    ring.isPickable = false;
    ring.checkCollisions = false;
    ring.setEnabled(false);
    glow?.addIncludedOnlyMesh?.(ring);
    finalRings.push(ring);
  }

  const portalOverlay = document.createElement("div");
  portalOverlay.className = "v18-portal-overlay";
  portalOverlay.innerHTML = `
    <div class="v18-cinema-bar top"></div>
    <div class="v18-cinema-bar bottom"></div>
    <div class="v18-portal-copy">
      <span>ROUTE COMPLETE · DEMO 2025</span>
      <strong>2027</strong>
      <b>NEXT CHAPTER</b>
      <i>Переход к следующей главе</i>
    </div>
  `;
  document.body.appendChild(portalOverlay);

  const flash = document.createElement("div");
  flash.className = "v18-flash";
  document.body.appendChild(flash);

  let portalAudio = null;
  function preparePortalAudio() {
    if (portalAudio) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { portalAudio = new AC(); } catch (_) { portalAudio = null; }
  }
  document.getElementById("enterButton")?.addEventListener("click", preparePortalAudio, { once: true });

  function playPortalSweep() {
    if (!portalAudio) return;
    try {
      const now = portalAudio.currentTime;
      const osc = portalAudio.createOscillator();
      const gain = portalAudio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(690, now + 1.25);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
      osc.connect(gain).connect(portalAudio.destination);
      osc.start(now);
      osc.stop(now + 1.4);
    } catch (_) {}
  }

  let prevSpeed = 0;
  let prevX = car.position.x;
  let tiltZ = 0;
  let pitchX = 0;
  let finalTriggered = false;
  let time = 0;

  function damp(current, target, lambda, dt) {
    return BABYLON.Scalar.Lerp(current, target, 1 - Math.exp(-lambda * dt));
  }

  function readNumber(el) {
    if (!el) return 0;
    const n = parseFloat(String(el.textContent || "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;

    const speedKmh = readNumber(speedEl);
    const speed01 = BABYLON.Scalar.Clamp(speedKmh / 145, 0, 1);
    const distance = readNumber(distanceEl);
    const accel = (speedKmh - prevSpeed) / Math.max(dt, 0.016);
    const lateral = (car.position.x - prevX) / Math.max(dt, 0.016);

    const keyboardBrake = keys.has("Space") || keys.has("KeyS") || keys.has("ArrowDown");
    const decelBrake = accel < -16 && speedKmh > 8;
    const brake = keyboardBrake || decelBrake;
    const brakeLevel = brake ? 1 : BABYLON.Scalar.Clamp(-accel / 70, 0, 0.55);

    // Body pitch/roll: subtle enough to stay comfortable, visible enough to stop feeling static.
    tiltZ = damp(tiltZ, BABYLON.Scalar.Clamp(-lateral * 0.010, -0.045, 0.045), 8.5, dt);
    pitchX = damp(pitchX, BABYLON.Scalar.Clamp(-accel * 0.0007, -0.028, 0.032), 7.2, dt);
    car.rotation.z = tiltZ;
    car.rotation.x = pitchX;

    const wakeScale = 0.38 + speed01 * 1.95;
    leftWake.scaling.z = wakeScale;
    rightWake.scaling.z = wakeScale;
    underWake.scaling.z = 0.45 + speed01 * 1.65;
    leftWake.visibility = rightWake.visibility = 0.08 + speed01 * 0.46 + brakeLevel * 0.28;
    underWake.visibility = 0.05 + speed01 * 0.32;
    beamL.visibility = beamR.visibility = 0.08 + (1 - speed01 * 0.25) * 0.10;

    brakeLightL.intensity = brakeLightR.intensity = 0.14 + brakeLevel * 2.4;
    if (tailL?.material?.emissiveColor) tailL.material.emissiveColor = baseTailEmission.scale(1.0 + brakeLevel * 1.8);
    if (tailR?.material?.emissiveColor) tailR.material.emissiveColor = baseTailEmission.scale(1.0 + brakeLevel * 1.8);

    particles.forEach(ps => {
      ps.emitRate = Math.round(speed01 * 34 + brakeLevel * 48);
      ps.minEmitPower = 0.28 + speed01 * 0.35;
      ps.maxEmitPower = 0.75 + speed01 * 1.1 + brakeLevel * 0.5;
    });

    // Camera roll follows the car. Alternate presets are still third-person follow cameras.
    if (cameraMode === 0) {
      chase.rotation.z = damp(chase.rotation.z || 0, tiltZ * 0.48, 7, dt);
    } else {
      const yaw = car.rotation.y || 0;
      const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const target = car.position.add(new BABYLON.Vector3(0, cameraMode === 1 ? 0.72 : 0.95, 0)).add(forward.scale(cameraMode === 1 ? 1.0 : 1.35));
      let desired;
      if (cameraMode === 1) {
        desired = car.position.subtract(forward.scale(3.5)).add(new BABYLON.Vector3(0, 1.42, 0));
      } else {
        desired = car.position.subtract(forward.scale(6.7)).add(new BABYLON.Vector3(0, 3.25, 0)).add(right.scale(1.25));
      }
      chase.position = BABYLON.Vector3.Lerp(chase.position, desired, 1 - Math.exp(-10 * dt));
      chase.setTarget(target);
      chase.rotation.z = tiltZ * (cameraMode === 1 ? 0.72 : 0.32);
    }

    // Final energy tunnel appears in the last 40 metres and contracts around the car.
    const finalProximity = BABYLON.Scalar.Clamp((distance - 270) / 40, 0, 1);
    finalRings.forEach((ring, i) => {
      const rel = 310 - distance + i * 2.1;
      const visible = distance >= 270 && rel > -8 && rel < 48;
      ring.setEnabled(visible);
      if (!visible) return;
      ring.position.x = car.position.x;
      ring.position.y = 3.45 + Math.sin(time * 1.6 + i) * 0.08;
      ring.position.z = car.position.z + rel;
      ring.rotation.z += dt * (0.14 + i * 0.025);
      const pulse = 1 + Math.sin(time * 2.4 + i * 0.7) * (0.025 + finalProximity * 0.035);
      ring.scaling.x = pulse;
      ring.scaling.y = 0.88 * pulse;
      ring.visibility = 0.20 + finalProximity * 0.55;
    });

    if (distance > 285) {
      const k = BABYLON.Scalar.Clamp((distance - 285) / 28, 0, 1);
      scene.fogColor = BABYLON.Color3.Lerp(new BABYLON.Color3(0.012, 0.025, 0.045), new BABYLON.Color3(0.065, 0.025, 0.11), k * 0.62);
      scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.Lerp(new BABYLON.Color3(0.004, 0.008, 0.018), new BABYLON.Color3(0.028, 0.008, 0.052), k * 0.55), 1);
    }

    if (!finalTriggered && distance >= 309) {
      finalTriggered = true;
      portalOverlay.classList.add("active");
      flash.classList.add("active");
      navigator.vibrate?.([40, 40, 90]);
      playPortalSweep();
      setTimeout(() => flash.classList.remove("active"), 760);
      setTimeout(() => portalOverlay.classList.add("complete"), 1500);
    }

    prevSpeed = speedKmh;
    prevX = car.position.x;
  });
})();
