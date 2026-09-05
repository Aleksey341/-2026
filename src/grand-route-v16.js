(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  const chase = scene.getCameraByName("v13-chase-camera");
  const logicalCamera = scene.getCameraByName("povCamera");
  if (!car || !chase) return;

  document.body.classList.add("grand-route-v16");
  scene.clearColor = new BABYLON.Color4(0.004, 0.008, 0.018, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0038;
  scene.fogColor = new BABYLON.Color3(0.012, 0.025, 0.045);

  // Remove the previous compact-world visuals. The core app and car controller remain active.
  const hidePrefixes = [
    "corridor", "leftWall-", "rightWall-", "ceilLine-", "guide",
    "doorRecruit-", "doorAI-", "doorMentor-", "doorFuture-",
    "recruitment-", "ai-", "mentoring-", "future-", "mentor", "aiCore", "aiRing",
    "plant", "demo25-", "v14-", "v15-"
  ];
  scene.meshes.forEach(mesh => {
    if (hidePrefixes.some(prefix => mesh.name.startsWith(prefix))) mesh.setEnabled(false);
  });

  function pbr(name, hex, emissive = 0, metallic = 0.2, roughness = 0.28, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    road: pbr("v16-road", "#07121d", 0, 0.42, 0.24),
    roadAlt: pbr("v16-road-alt", "#0a1824", 0, 0.38, 0.24),
    dark: pbr("v16-dark", "#02060c", 0, 0.55, 0.26),
    steel: pbr("v16-steel", "#152b3b", 0.02, 0.66, 0.2),
    cyan: pbr("v16-cyan", "#56dcff", 1.0, 0.06, 0.17),
    teal: pbr("v16-teal", "#62e4bb", 0.95, 0.06, 0.17),
    amber: pbr("v16-amber", "#ffc66d", 0.95, 0.06, 0.18),
    violet: pbr("v16-violet", "#ba9eff", 1.0, 0.06, 0.17),
    red: pbr("v16-red", "#ff4c69", 0.92, 0.06, 0.17),
    white: pbr("v16-white", "#e9fbff", 0.82, 0.04, 0.16),
    glass: pbr("v16-glass", "#7cdef8", 0.12, 0.12, 0.08, 0.17),
    city: pbr("v16-city", "#050c15", 0.01, 0.62, 0.24)
  };

  const glow = scene.getGlowLayerByName?.("glow");
  const makeBox = (name, size, pos, mat, parent = null) => {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    return mesh;
  };
  const makeTorus = (name, diameter, thickness, pos, mat, parent = null) => {
    const mesh = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 72 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    glow?.addIncludedOnlyMesh?.(mesh);
    return mesh;
  };
  const lightMesh = mesh => { glow?.addIncludedOnlyMesh?.(mesh); return mesh; };

  const routeLength = 320;
  const anchorZ = -6.5;
  let virtualDistance = 0;
  let lastPinnedX = car.position.x;
  let previousDistance = 0;
  car.position.z = anchorZ;

  // Mild, broad curves. The route remains driveable with the existing steering model.
  function pathX(d) {
    return Math.sin(d / 47) * 1.55 + Math.sin(d / 19) * 0.48;
  }
  function pathAngle(d) {
    const dx = pathX(d + 1) - pathX(d - 1);
    return Math.atan2(dx, 2);
  }

  // 320m road built from recyclable local segments.
  const roadSegments = [];
  const segmentLength = 7.5;
  for (let d = 0; d <= routeLength + segmentLength; d += segmentLength) {
    const node = new BABYLON.TransformNode(`v16-road-node-${d}`, scene);
    const road = makeBox(`v16-road-${d}`, { width: 10.8, height: 0.09, depth: 7.7 }, new BABYLON.Vector3(0, 0, 0), (Math.round(d / segmentLength) % 2) ? M.roadAlt : M.road, node);
    const left = lightMesh(makeBox(`v16-edge-l-${d}`, { width: 0.07, height: 0.025, depth: 7.3 }, new BABYLON.Vector3(-5.15, 0.075, 0), M.cyan, node));
    const right = lightMesh(makeBox(`v16-edge-r-${d}`, { width: 0.07, height: 0.025, depth: 7.3 }, new BABYLON.Vector3(5.15, 0.075, 0), M.teal, node));
    const dash = lightMesh(makeBox(`v16-center-${d}`, { width: 0.035, height: 0.02, depth: 2.25 }, new BABYLON.Vector3(0, 0.078, 0), M.white, node));
    roadSegments.push({ d, node, road, left, right, dash });
  }

  // City blocks: deliberately varied height and side placement for strong parallax.
  const city = [];
  for (let d = 8, i = 0; d < routeLength; d += 13, i++) {
    [-1, 1].forEach((side, sIdx) => {
      const h = 5.5 + ((i * 3 + sIdx * 5) % 9) * 1.15;
      const w = 2.2 + ((i + sIdx) % 3) * 0.7;
      const root = new BABYLON.TransformNode(`v16-city-node-${i}-${sIdx}`, scene);
      makeBox(`v16-building-${i}-${sIdx}`, { width: w, height: h, depth: 3.0 }, new BABYLON.Vector3(0, h / 2, 0), M.city, root);
      const accent = (i + sIdx) % 3 === 0 ? M.violet : ((i + sIdx) % 2 ? M.teal : M.cyan);
      for (let y = 1.0; y < h - 0.5; y += 1.45) {
        const win = lightMesh(makeBox(`v16-window-${i}-${sIdx}-${y}`, { width: w * 0.62, height: 0.045, depth: 0.035 }, new BABYLON.Vector3(0, y, side < 0 ? 1.52 : -1.52), accent, root));
        win.visibility = 0.55 + ((i + Math.round(y)) % 3) * 0.13;
      }
      city.push({ d, side, root, offset: 11.0 + (i % 4) * 1.35 });
    });
  }

  // Tunnel section: 92m–142m.
  const tunnel = [];
  for (let d = 92; d <= 142; d += 5.2) {
    const root = new BABYLON.TransformNode(`v16-tunnel-node-${d}`, scene);
    const ring = makeTorus(`v16-tunnel-ring-${d}`, 9.25, 0.08, new BABYLON.Vector3(0, 3.65, 0), M.teal, root);
    ring.rotation.x = Math.PI / 2;
    ring.scaling.y = 0.86;
    const halo = makeTorus(`v16-tunnel-halo-${d}`, 10.1, 0.018, new BABYLON.Vector3(0, 3.65, 0), M.glass, root);
    halo.rotation.x = Math.PI / 2;
    halo.scaling.y = 0.86;
    tunnel.push({ d, root, ring, halo, phase: d * 0.07 });
  }

  // Bridge section: 155m–220m, with luminous rails and a deep dark void below.
  const bridge = [];
  const bridgeVoid = makeBox("v16-bridge-void", { width: 34, height: 0.2, depth: 84 }, new BABYLON.Vector3(0, -2.35, 0), M.dark);
  for (let d = 155; d <= 220; d += 6.0) {
    [-1, 1].forEach((side, idx) => {
      const root = new BABYLON.TransformNode(`v16-bridge-node-${d}-${idx}`, scene);
      makeBox(`v16-bridge-pylon-${d}-${idx}`, { width: 0.15, height: 2.35, depth: 0.15 }, new BABYLON.Vector3(0, 1.15, 0), M.steel, root);
      lightMesh(makeBox(`v16-bridge-light-${d}-${idx}`, { width: 0.06, height: 1.8, depth: 0.04 }, new BABYLON.Vector3(-side * 0.09, 1.25, 0), side < 0 ? M.amber : M.violet, root));
      bridge.push({ d, side, root });
    });
  }

  // Five 2025 result gates plus the final 2027 portal.
  const data = window.HR2026;
  const resultMap = Object.fromEntries((data?.demoResults2025 || []).map(x => [x.id, x]));
  const gates = [
    { id: "recruitment", d: 55, no: "01", title: "ПРИЁМ", color: "#56dcff", mat: M.cyan, result: resultMap["recruitment-2025"] },
    { id: "convergent", d: 105, no: "02", title: "HR-КОНВЕРГЕНТ", color: "#62e4bb", mat: M.teal, result: resultMap["hr-convergent-2025"] },
    { id: "ai", d: 165, no: "03", title: "ИИ-КОМАНДА", color: "#ba9eff", mat: M.violet, result: resultMap["ai-team-2025"] },
    { id: "awards", d: 220, no: "04", title: "КОРПОРАТИВНЫЕ НАГРАДЫ", color: "#ffc66d", mat: M.amber, result: resultMap["awards-2025"] },
    { id: "harmful", d: 270, no: "05", title: "ВРЕДНЫЕ УСЛОВИЯ ТРУДА", color: "#ff4c69", mat: M.red, result: resultMap["harmful-conditions-2025"] },
    { id: "future", d: 310, no: "2027", title: "NEXT CHAPTER", color: "#ba9eff", mat: M.violet, result: { subtitle: "Портал будущего", metrics: [["2027", "следующая глава"]] }, final: true }
  ];

  const gateMeshes = [];
  gates.forEach((g, i) => {
    const root = new BABYLON.TransformNode(`v16-gate-node-${g.id}`, scene);
    const ring = makeTorus(`v16-gate-ring-${g.id}`, g.final ? 10.8 : 8.6, g.final ? 0.18 : 0.11, new BABYLON.Vector3(0, 3.5, 0), g.mat, root);
    ring.rotation.x = Math.PI / 2;
    ring.scaling.y = 0.9;
    const halo = makeTorus(`v16-gate-halo-${g.id}`, g.final ? 12.0 : 9.55, 0.025, new BABYLON.Vector3(0, 3.5, 0), M.glass, root);
    halo.rotation.x = Math.PI / 2;
    halo.scaling.y = 0.9;
    [-1, 1].forEach(side => {
      makeBox(`v16-gate-pylon-${g.id}-${side}`, { width: 0.38, height: 4.3, depth: 0.45 }, new BABYLON.Vector3(side * 4.15, 2.15, 0), M.steel, root);
      lightMesh(makeBox(`v16-gate-pylon-light-${g.id}-${side}`, { width: 0.11, height: 3.2, depth: 0.48 }, new BABYLON.Vector3(side * 4.15, 2.15, -0.26), g.mat, root));
    });
    const point = new BABYLON.PointLight(`v16-gate-light-${g.id}`, new BABYLON.Vector3(0, 3.3, 0), scene);
    point.diffuse = BABYLON.Color3.FromHexString(g.color);
    point.intensity = g.final ? 1.9 : 1.15;
    point.range = g.final ? 14 : 9;
    point.parent = root;
    gateMeshes.push({ ...g, root, ring, halo, point, phase: i * 0.9 });
  });

  // Floating route particles: small moving lights in the distance.
  const particles = [];
  for (let i = 0; i < 34; i++) {
    const orb = BABYLON.MeshBuilder.CreateSphere(`v16-particle-${i}`, { diameter: 0.055 + (i % 3) * 0.025, segments: 8 }, scene);
    orb.material = i % 4 === 0 ? M.violet : (i % 2 ? M.teal : M.cyan);
    orb.isPickable = false;
    orb.checkCollisions = false;
    glow?.addIncludedOnlyMesh?.(orb);
    particles.push({ mesh: orb, seed: i * 13.7, side: i % 2 ? 1 : -1, y: 2.8 + (i % 7) * 0.7 });
  }

  // New route HUD replaces the compact pilot UI.
  const hud = document.createElement("div");
  hud.className = "v16-route-hud";
  hud.innerHTML = `
    <div class="v16-route-kicker">GRAND EXPERIENCE ROUTE · 320 M</div>
    <div class="v16-route-row"><span id="v16ChapterNo">START</span><strong id="v16Chapter">NEON CITY</strong></div>
    <div class="v16-route-meta"><b id="v16Distance">000</b><span>/ 320 M</span><i id="v16GateProgress">0 / 5 DATA GATES</i></div>
    <div class="v16-route-progress"><b id="v16ProgressBar"></b></div>
  `;
  document.body.appendChild(hud);
  const chapterNo = document.getElementById("v16ChapterNo");
  const chapterTitle = document.getElementById("v16Chapter");
  const distanceEl = document.getElementById("v16Distance");
  const gateProgressEl = document.getElementById("v16GateProgress");
  const progressBar = document.getElementById("v16ProgressBar");

  const card = document.createElement("div");
  card.className = "v16-data-card hidden";
  card.innerHTML = `
    <div class="v16-data-kicker">RESULT GATE · DEMO DATA 2025</div>
    <div class="v16-data-head"><span></span><strong></strong></div>
    <div class="v16-data-sub"></div>
    <div class="v16-data-metrics"></div>
  `;
  document.body.appendChild(card);
  const cardNo = card.querySelector(".v16-data-head span");
  const cardTitle = card.querySelector(".v16-data-head strong");
  const cardSub = card.querySelector(".v16-data-sub");
  const cardMetrics = card.querySelector(".v16-data-metrics");
  let cardTimer = null;
  const passed = new Set();

  function showGate(g) {
    card.style.setProperty("--v16-accent", g.color);
    cardNo.textContent = g.no;
    cardTitle.textContent = g.title;
    cardSub.textContent = g.result?.subtitle || "";
    cardMetrics.innerHTML = "";
    (g.result?.metrics || []).slice(0, 5).forEach(([value, label]) => {
      const cell = document.createElement("div");
      cell.className = "v16-data-metric";
      cell.innerHTML = `<b>${value}</b><span>${label}</span>`;
      cardMetrics.appendChild(cell);
    });
    card.classList.remove("hidden");
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => card.classList.add("hidden"), g.final ? 5200 : 3300);
    navigator.vibrate?.(g.final ? [35, 45, 35, 45, 70] : [24, 32, 24]);
  }

  function updateChapter() {
    let no = "START";
    let title = "NEON CITY";
    if (virtualDistance >= 70 && virtualDistance < 145) { no = "SECTOR 02"; title = "SERVICE TUNNEL"; }
    else if (virtualDistance >= 145 && virtualDistance < 205) { no = "SECTOR 03"; title = "AI DISTRICT"; }
    else if (virtualDistance >= 205 && virtualDistance < 260) { no = "SECTOR 04"; title = "PEOPLE BRIDGE"; }
    else if (virtualDistance >= 260) { no = "FINAL"; title = "FUTURE GATE"; }
    chapterNo.textContent = no;
    chapterTitle.textContent = title;
    const zoneName = document.getElementById("zoneName");
    if (zoneName) zoneName.textContent = `${title} · ИТОГИ 2026`;
  }

  // Replace old boot diagnostics after app-v10 finishes its small boot sequence.
  setTimeout(() => {
    const log = document.getElementById("bootLog");
    const btn = document.getElementById("enterButton");
    if (log) log.textContent = "GRAND ROUTE ............ 320 M READY\nNEON CITY .............. READY\nSERVICE TUNNEL ......... READY\nAI DISTRICT ............ READY\nPEOPLE BRIDGE .......... READY\n2025 DATA GATES ........ 5 FOUND\n2027 PORTAL ............ ONLINE\n\nЦК БОРУП · ИТОГИ 2026";
    if (btn) { btn.disabled = false; btn.textContent = "СТАРТ · GRAND TOUR"; }
  }, 1200);

  // Quiet synthetic engine / air stream. It starts only after the user's gesture.
  let audio = null, motor = null, air = null, motorGain = null, airGain = null;
  function startAudio() {
    if (audio) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audio = new AC();
      motor = audio.createOscillator();
      air = audio.createOscillator();
      motorGain = audio.createGain();
      airGain = audio.createGain();
      motor.type = "sawtooth";
      air.type = "triangle";
      motor.frequency.value = 44;
      air.frequency.value = 108;
      motorGain.gain.value = 0.012;
      airGain.gain.value = 0;
      motor.connect(motorGain).connect(audio.destination);
      air.connect(airGain).connect(audio.destination);
      motor.start(); air.start();
    } catch (_) { audio = null; }
  }
  document.getElementById("enterButton")?.addEventListener("click", startAudio, { once: true });

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;

    // v13 moves the car first. Measure that local displacement, convert it into route distance,
    // then recenter Z so the road can be hundreds of virtual metres long without changing the old controller.
    const beforeReset = car.position.clone();
    const delta = new BABYLON.Vector3(beforeReset.x - lastPinnedX, 0, beforeReset.z - anchorZ);
    const forward = new BABYLON.Vector3(Math.sin(car.rotation.y), 0, Math.cos(car.rotation.y));
    const signedTravel = BABYLON.Vector3.Dot(delta, forward);
    previousDistance = virtualDistance;
    virtualDistance = BABYLON.Scalar.Clamp(virtualDistance + signedTravel * 1.55, 0, routeLength - 1.5);

    const zCorrection = beforeReset.z - anchorZ;
    car.position.z = anchorZ;
    if (Math.abs(zCorrection) > 0.0001) chase.position.z -= zCorrection;
    if (logicalCamera) {
      logicalCamera.position.x = car.position.x;
      logicalCamera.position.y = 1.25;
      logicalCamera.position.z = anchorZ;
    }
    lastPinnedX = car.position.x;

    // Slight route-centering assistance keeps mobile driving pleasant through the broad curves.
    const roadCenter = pathX(virtualDistance);
    car.position.x += BABYLON.Scalar.Clamp(roadCenter - car.position.x, -0.035, 0.035) * dt * 2.3;

    roadSegments.forEach(seg => {
      const relZ = anchorZ + (seg.d - virtualDistance);
      const enabled = relZ > anchorZ - 24 && relZ < anchorZ + 115;
      seg.node.setEnabled(enabled);
      if (!enabled) return;
      seg.node.position.set(pathX(seg.d), 0.025, relZ);
      seg.node.rotation.y = pathAngle(seg.d);
    });

    city.forEach(c => {
      const relZ = anchorZ + (c.d - virtualDistance);
      const enabled = relZ > anchorZ - 28 && relZ < anchorZ + 130;
      c.root.setEnabled(enabled);
      if (!enabled) return;
      c.root.position.set(pathX(c.d) + c.side * c.offset, -0.02, relZ);
      c.root.rotation.y = pathAngle(c.d) * 0.35;
    });

    tunnel.forEach(t => {
      const relZ = anchorZ + (t.d - virtualDistance);
      const enabled = relZ > anchorZ - 15 && relZ < anchorZ + 95;
      t.root.setEnabled(enabled);
      if (!enabled) return;
      t.root.position.set(pathX(t.d), 0, relZ);
      t.root.rotation.y = pathAngle(t.d);
      t.ring.visibility = 0.58 + Math.sin(time * 2.4 + t.phase) * 0.25;
      t.halo.visibility = 0.08 + Math.sin(time * 1.8 + t.phase) * 0.05;
    });

    bridge.forEach(b => {
      const relZ = anchorZ + (b.d - virtualDistance);
      const enabled = relZ > anchorZ - 18 && relZ < anchorZ + 110;
      b.root.setEnabled(enabled);
      if (!enabled) return;
      b.root.position.set(pathX(b.d) + b.side * 5.45, 0.05, relZ);
      b.root.rotation.y = pathAngle(b.d);
    });
    const bridgeMidRel = anchorZ + (187 - virtualDistance);
    bridgeVoid.position.z = bridgeMidRel;
    bridgeVoid.position.x = pathX(187);
    bridgeVoid.setEnabled(bridgeMidRel > anchorZ - 45 && bridgeMidRel < anchorZ + 90);

    gateMeshes.forEach(g => {
      const relZ = anchorZ + (g.d - virtualDistance);
      const enabled = relZ > anchorZ - 18 && relZ < anchorZ + 115;
      g.root.setEnabled(enabled);
      if (enabled) {
        g.root.position.set(pathX(g.d), 0, relZ);
        g.root.rotation.y = pathAngle(g.d);
        const pulse = 1 + Math.sin(time * 2.2 + g.phase) * 0.035;
        g.ring.scaling.x = pulse;
        g.ring.scaling.y = 0.9 * pulse;
        g.halo.rotation.z += dt * (g.final ? 0.28 : 0.12);
        g.halo.visibility = g.final ? 0.5 + Math.sin(time * 2) * 0.18 : 0.16 + Math.sin(time * 1.7 + g.phase) * 0.08;
      }
      const crossed = previousDistance < g.d && virtualDistance >= g.d;
      if (crossed && !passed.has(g.id)) {
        passed.add(g.id);
        showGate(g);
        const dataCount = Array.from(passed).filter(id => id !== "future").length;
        gateProgressEl.textContent = `${Math.min(5, dataCount)} / 5 DATA GATES`;
      }
    });

    particles.forEach((p, i) => {
      const span = 115;
      const rel = ((p.seed - virtualDistance * 0.55 + time * (1.4 + (i % 5) * 0.25)) % span + span) % span;
      p.mesh.position.z = anchorZ + rel;
      p.mesh.position.x = pathX(virtualDistance + rel) + p.side * (7.5 + (i % 6) * 1.2);
      p.mesh.position.y = p.y + Math.sin(time * 0.9 + i) * 0.5;
      p.mesh.visibility = 0.35 + (i % 4) * 0.12;
    });

    updateChapter();
    distanceEl.textContent = String(Math.round(virtualDistance)).padStart(3, "0");
    progressBar.style.width = `${(virtualDistance / routeLength) * 100}%`;

    // Dynamic chase FOV: noticeably stronger in the long sections, still comfortable on mobile.
    const speedText = parseFloat(document.getElementById("v13Speed")?.textContent || "0");
    const speed01 = BABYLON.Scalar.Clamp(speedText / 145, 0, 1);
    const targetFov = 0.90 + speed01 * 0.17;
    chase.fov = BABYLON.Scalar.Lerp(chase.fov, targetFov, 1 - Math.exp(-3.7 * dt));

    if (audio && motor && motorGain && air && airGain) {
      const now = audio.currentTime;
      motor.frequency.setTargetAtTime(44 + speed01 * 88, now, 0.06);
      motorGain.gain.setTargetAtTime(0.010 + speed01 * 0.022, now, 0.08);
      air.frequency.setTargetAtTime(105 + speed01 * 170, now, 0.08);
      airGain.gain.setTargetAtTime(speed01 * 0.009, now, 0.1);
    }
  });
})();
