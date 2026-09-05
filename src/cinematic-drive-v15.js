(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  if (!car) return;

  document.body.classList.add("cinematic-v15");

  const makeMat = (name, hex, emissive = 0, alpha = 1) => {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.roughness = 0.24;
    m.metallic = 0.22;
    m.alpha = alpha;
    return m;
  };

  const MAT = {
    cyan: makeMat("v15-cyan", "#58ddff", 0.95),
    teal: makeMat("v15-teal", "#61e5ba", 0.92),
    amber: makeMat("v15-amber", "#ffc46a", 0.9),
    violet: makeMat("v15-violet", "#b99cff", 0.92),
    white: makeMat("v15-white", "#ecfbff", 0.75),
    red: makeMat("v15-red", "#ff405f", 0.85),
    glass: makeMat("v15-glass", "#8ce7ff", 0.18, 0.18),
    dark: makeMat("v15-dark", "#061019", 0.01)
  };

  const glow = scene.getGlowLayerByName?.("glow");

  function box(name, size, pos, material) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos);
    m.material = material;
    m.isPickable = false;
    m.checkCollisions = false;
    return m;
  }

  function torus(name, diameter, thickness, pos, material) {
    const m = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 72 }, scene);
    m.position.copyFrom(pos);
    m.rotation.x = Math.PI / 2;
    m.material = material;
    m.isPickable = false;
    m.checkCollisions = false;
    glow?.addIncludedOnlyMesh?.(m);
    return m;
  }

  // Sequential arches make the boulevard feel like a real journey instead of one static room.
  const archData = [
    { z: -11.0, mat: MAT.cyan },
    { z: -8.7, mat: MAT.cyan },
    { z: -4.7, mat: MAT.teal },
    { z: -1.3, mat: MAT.teal },
    { z: 2.7, mat: MAT.amber },
    { z: 5.0, mat: MAT.amber },
    { z: 8.1, mat: MAT.violet },
    { z: 11.4, mat: MAT.violet }
  ];

  const arches = [];
  archData.forEach((a, i) => {
    const left = box(`v15-arch-l-${i}`, { width: 0.14, height: 4.8, depth: 0.14 }, new BABYLON.Vector3(-5.25, 2.4, a.z), a.mat);
    const right = box(`v15-arch-r-${i}`, { width: 0.14, height: 4.8, depth: 0.14 }, new BABYLON.Vector3(5.25, 2.4, a.z), a.mat);
    const top = box(`v15-arch-top-${i}`, { width: 10.6, height: 0.12, depth: 0.14 }, new BABYLON.Vector3(0, 4.75, a.z), a.mat);
    [left, right, top].forEach(m => glow?.addIncludedOnlyMesh?.(m));
    const halo = torus(`v15-arch-halo-${i}`, 7.2, 0.018, new BABYLON.Vector3(0, 3.25, a.z), MAT.glass);
    halo.scaling.x = 1.35;
    arches.push({ left, right, top, halo, z: a.z, phase: i * 0.58 });
  });

  // Speed streaks on both sides of the road. They become visible only while the car moves.
  const streaks = [];
  for (let i = 0; i < 28; i++) {
    const side = i % 2 ? 1 : -1;
    const lane = 6.0 + (i % 4) * 0.42;
    const s = box(
      `v15-streak-${i}`,
      { width: 0.028, height: 0.028, depth: 0.7 + (i % 3) * 0.28 },
      new BABYLON.Vector3(side * lane, 0.3 + (i % 5) * 0.42, -14 + (i * 1.13) % 28),
      i % 3 === 0 ? MAT.violet : (i % 2 ? MAT.teal : MAT.cyan)
    );
    s.visibility = 0;
    glow?.addIncludedOnlyMesh?.(s);
    streaks.push({ mesh: s, offset: (i * 1.13) % 28, side, y: s.position.y });
  }

  // Holographic beacons at the project turn-offs.
  const beacons = [
    { id: "recruitment", z: -7, x: -6.4, title: "ПРИЁМ", value: "65%", sub: "цифровых приёмов", color: "#58ddff", mat: MAT.cyan },
    { id: "ai", z: 0, x: 6.4, title: "ИИ-КОМАНДА", value: "29", sub: "сотрудников", color: "#61e5ba", mat: MAT.teal },
    { id: "mentoring", z: 6, x: -6.4, title: "НАСТАВНИЧЕСТВО", value: "2025", sub: "демо-сцена", color: "#ffc46a", mat: MAT.amber },
    { id: "future", z: 10, x: 6.4, title: "NEXT CHAPTER", value: "2027", sub: "портал будущего", color: "#b99cff", mat: MAT.violet }
  ];

  beacons.forEach((b, i) => {
    const stem = box(`v15-beacon-${b.id}`, { width: 0.12, height: 3.1, depth: 0.12 }, new BABYLON.Vector3(b.x, 1.55, b.z), b.mat);
    const crown = torus(`v15-beacon-ring-${b.id}`, 1.55, 0.035, new BABYLON.Vector3(b.x, 3.2, b.z), b.mat);
    crown.rotation.x = 0.15;
    crown.rotation.z = Math.PI / 2;
    stem.visibility = 0.88;
    crown.visibility = 0.9;
  });

  // Cinematic checkpoint overlay.
  const checkpoint = document.createElement("div");
  checkpoint.className = "v15-checkpoint hidden";
  checkpoint.innerHTML = `
    <div class="v15-check-kicker">PROJECT GATE · DEMO 2025</div>
    <div class="v15-check-row"><span class="v15-check-no"></span><strong class="v15-check-title"></strong></div>
    <div class="v15-check-metric"><b></b><span></span></div>
  `;
  document.body.appendChild(checkpoint);
  const checkNo = checkpoint.querySelector(".v15-check-no");
  const checkTitle = checkpoint.querySelector(".v15-check-title");
  const checkValue = checkpoint.querySelector(".v15-check-metric b");
  const checkSub = checkpoint.querySelector(".v15-check-metric span");

  const gateInfo = [
    { z: -7, no: "01", title: "ПРИЁМ", value: "65%", sub: "цифровых приёмов", color: "#58ddff" },
    { z: 0, no: "02", title: "ИИ-КОМАНДА", value: "29", sub: "сотрудников", color: "#61e5ba" },
    { z: 6, no: "03", title: "НАСТАВНИЧЕСТВО", value: "2025", sub: "тестовое наполнение", color: "#ffc46a" },
    { z: 10, no: "2027", title: "NEXT CHAPTER", value: "→", sub: "следующий этап", color: "#b99cff" }
  ];
  const passed = new Set();
  let hideTimer = null;
  let prevCarZ = car.position.z;

  function showCheckpoint(info) {
    checkpoint.style.setProperty("--v15-accent", info.color);
    checkNo.textContent = info.no;
    checkTitle.textContent = info.title;
    checkValue.textContent = info.value;
    checkSub.textContent = info.sub;
    checkpoint.classList.remove("hidden");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => checkpoint.classList.add("hidden"), 2600);
  }

  // Small objective bar: this is always visible but does not cover the driving view.
  const mission = document.createElement("div");
  mission.className = "v15-mission";
  mission.innerHTML = `
    <span>EXPERIENCE ROUTE</span>
    <strong><i id="v15Passed">0</i> / 4 GATES</strong>
    <div class="v15-progress"><b id="v15Progress"></b></div>
  `;
  document.body.appendChild(mission);
  const passedEl = document.getElementById("v15Passed");
  const progressEl = document.getElementById("v15Progress");

  // Synthetic engine/ambient audio. Starts only after the user's Start button gesture.
  let audio = null;
  let engineOsc = null;
  let windOsc = null;
  let engineGain = null;
  let windGain = null;

  function startAudio() {
    if (audio) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      audio = new AudioCtx();
      engineOsc = audio.createOscillator();
      windOsc = audio.createOscillator();
      engineGain = audio.createGain();
      windGain = audio.createGain();
      engineOsc.type = "sawtooth";
      windOsc.type = "triangle";
      engineOsc.frequency.value = 48;
      windOsc.frequency.value = 82;
      engineGain.gain.value = 0.018;
      windGain.gain.value = 0.0;
      engineOsc.connect(engineGain).connect(audio.destination);
      windOsc.connect(windGain).connect(audio.destination);
      engineOsc.start();
      windOsc.start();
    } catch (_) {
      audio = null;
    }
  }

  document.getElementById("enterButton")?.addEventListener("click", startAudio, { once: true });

  let lastPos = car.position.clone();
  let estimatedSpeed = 0;
  let time = 0;

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;

    const dist = BABYLON.Vector3.Distance(car.position, lastPos);
    const instantSpeed = dt > 0 ? dist / dt : 0;
    estimatedSpeed = BABYLON.Scalar.Lerp(estimatedSpeed, instantSpeed, 1 - Math.exp(-5 * dt));
    lastPos.copyFrom(car.position);
    const speed01 = BABYLON.Scalar.Clamp(estimatedSpeed / 8.2, 0, 1);

    // Dynamic FOV is one of the strongest visual speed cues.
    const chase = scene.getCameraByName("v13-chase-camera");
    if (chase) {
      const targetFov = 0.92 + speed01 * 0.16;
      chase.fov = BABYLON.Scalar.Lerp(chase.fov, targetFov, 1 - Math.exp(-3.8 * dt));
    }

    arches.forEach((a, i) => {
      const pulse = 0.72 + Math.sin(time * 2.0 + a.phase) * 0.22;
      a.halo.visibility = 0.12 + pulse * 0.22;
      a.top.visibility = 0.55 + pulse * 0.28;
    });

    streaks.forEach((s, i) => {
      s.mesh.visibility = speed01 > 0.18 ? (speed01 - 0.18) * 0.72 : 0;
      const wrap = 28;
      let z = car.position.z + 11 - ((time * (5 + speed01 * 24) + s.offset) % wrap);
      if (z < -14.3) z += wrap;
      if (z > 14.3) z -= wrap;
      s.mesh.position.z = z;
      s.mesh.position.x = s.side * (5.8 + (i % 4) * 0.36);
      s.mesh.position.y = s.y;
      s.mesh.scaling.z = 1 + speed01 * 3.5;
    });

    // Detect crossing of the central project gates in either direction.
    gateInfo.forEach(info => {
      const crossed = (prevCarZ < info.z && car.position.z >= info.z) || (prevCarZ > info.z && car.position.z <= info.z);
      if (crossed && Math.abs(car.position.x) < 5.6) {
        const key = `${info.no}-${Math.sign(car.position.z - prevCarZ)}`;
        if (!passed.has(key)) {
          passed.add(key);
          showCheckpoint(info);
          const uniquePassed = new Set(Array.from(passed).map(k => k.split("-")[0])).size;
          passedEl.textContent = String(uniquePassed);
          progressEl.style.width = `${Math.min(100, uniquePassed * 25)}%`;
          navigator.vibrate?.([22, 35, 22]);
        }
      }
    });
    prevCarZ = car.position.z;

    if (audio && engineOsc && engineGain && windOsc && windGain) {
      const now = audio.currentTime;
      engineOsc.frequency.setTargetAtTime(48 + speed01 * 72, now, 0.05);
      engineGain.gain.setTargetAtTime(0.014 + speed01 * 0.025, now, 0.08);
      windOsc.frequency.setTargetAtTime(82 + speed01 * 155, now, 0.08);
      windGain.gain.setTargetAtTime(speed01 * 0.012, now, 0.1);
    }
  });
})();
