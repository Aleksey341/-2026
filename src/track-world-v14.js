(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  if (!car) return;

  document.body.classList.add("future-track-v14");
  scene.clearColor = new BABYLON.Color4(0.008, 0.014, 0.024, 1);
  scene.fogDensity = 0.0065;
  scene.fogColor = new BABYLON.Color3(0.018, 0.035, 0.055);

  // Remove the old box-like office shell but keep interactive exhibits and result stations.
  const hidePrefixes = [
    "corridor", "leftWall-", "rightWall-",
    "doorRecruit-", "doorAI-", "doorMentor-", "doorFuture-",
    "recruitment-floor", "recruitment-ceiling", "recruitment-north", "recruitment-south", "recruitment-outer",
    "ai-floor", "ai-ceiling", "ai-north", "ai-south", "ai-outer",
    "mentoring-floor", "mentoring-ceiling", "mentoring-north", "mentoring-south", "mentoring-outer",
    "future-floor", "future-ceiling", "future-north", "future-south", "future-outer"
  ];
  scene.meshes.forEach(mesh => {
    if (hidePrefixes.some(p => mesh.name.startsWith(p))) mesh.setEnabled(false);
  });

  function mat(name, hex, emissive = 0, metallic = 0.18, roughness = 0.34, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    asphalt: mat("v14-asphalt", "#08131d", 0, 0.36, 0.24),
    platform: mat("v14-platform", "#0d1e2b", 0, 0.38, 0.22),
    edge: mat("v14-edge", "#132938", 0, 0.52, 0.26),
    cyan: mat("v14-cyan", "#53d9ff", 0.95, 0.05, 0.18),
    teal: mat("v14-teal", "#5ce2b9", 0.9, 0.05, 0.18),
    amber: mat("v14-amber", "#f5bd67", 0.9, 0.05, 0.2),
    violet: mat("v14-violet", "#b59cff", 0.9, 0.05, 0.18),
    red: mat("v14-red", "#ff4865", 0.85, 0.05, 0.18),
    glass: mat("v14-glass", "#72d5f2", 0.12, 0.12, 0.08, 0.2),
    tower: mat("v14-tower", "#071019", 0.01, 0.58, 0.28),
    white: mat("v14-white", "#eaf8ff", 0.5, 0.05, 0.18)
  };

  const glow = scene.getGlowLayerByName?.("glow");

  function box(name, size, pos, material, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function strip(name, size, pos, material, parent = null) {
    const mesh = box(name, size, pos, material, parent);
    glow?.addIncludedOnlyMesh?.(mesh);
    return mesh;
  }

  function torus(name, diameter, thickness, pos, rot, material) {
    const mesh = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 84 }, scene);
    mesh.position.copyFrom(pos);
    mesh.rotation.copyFrom(rot);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    glow?.addIncludedOnlyMesh?.(mesh);
    return mesh;
  }

  // Open boulevard instead of a narrow corridor.
  box("v14-world-ground", { width: 42, height: 0.12, depth: 42 }, new BABYLON.Vector3(0, -0.08, 0), M.tower);
  box("v14-main-road", { width: 11.8, height: 0.08, depth: 29.5 }, new BABYLON.Vector3(0, 0.02, 0), M.asphalt);
  strip("v14-road-left-edge", { width: 0.09, height: 0.025, depth: 28.6 }, new BABYLON.Vector3(-5.58, 0.09, 0), M.cyan);
  strip("v14-road-right-edge", { width: 0.09, height: 0.025, depth: 28.6 }, new BABYLON.Vector3(5.58, 0.09, 0), M.teal);
  strip("v14-road-center", { width: 0.035, height: 0.025, depth: 28.2 }, new BABYLON.Vector3(0, 0.095, 0), M.white);

  // Broken lane markers create speed/parallax cues.
  for (let z = -13; z <= 13; z += 2.1) {
    strip(`v14-lane-l-${z}`, { width: 0.035, height: 0.022, depth: 0.72 }, new BABYLON.Vector3(-2.55, 0.098, z), M.cyan);
    strip(`v14-lane-r-${z}`, { width: 0.035, height: 0.022, depth: 0.72 }, new BABYLON.Vector3(2.55, 0.098, z), M.teal);
  }

  const zones = [
    { id: "recruitment", no: "01", title: "ПРИЁМ", side: -1, z: -7, color: "#53d9ff", mat: M.cyan },
    { id: "ai", no: "02", title: "AI LAB", side: 1, z: 0, color: "#5ce2b9", mat: M.teal },
    { id: "mentoring", no: "03", title: "НАСТАВНИЧЕСТВО", side: -1, z: 6, color: "#f5bd67", mat: M.amber },
    { id: "future", no: "2027", title: "NEXT CHAPTER", side: 1, z: 10, color: "#b59cff", mat: M.violet }
  ];

  const animated = [];

  zones.forEach((zone, index) => {
    const cx = zone.side * 10.0;
    box(`v14-bay-${zone.id}`, { width: 8.4, height: 0.09, depth: 6.2 }, new BABYLON.Vector3(cx, 0.025, zone.z), M.platform);
    strip(`v14-bay-edge-${zone.id}`, { width: 7.6, height: 0.025, depth: 0.06 }, new BABYLON.Vector3(cx, 0.09, zone.z - 2.8), zone.mat);
    strip(`v14-bay-guide-${zone.id}`, { width: 8.2, height: 0.022, depth: 0.055 }, new BABYLON.Vector3(zone.side * 8.8, 0.095, zone.z), zone.mat).rotation.y = Math.PI / 2;

    // Side portal: car drives through the ring into each project bay.
    const portalX = zone.side * 5.4;
    const portal = torus(
      `v14-side-portal-${zone.id}`,
      4.65,
      0.085,
      new BABYLON.Vector3(portalX, 2.35, zone.z),
      new BABYLON.Vector3(0, 0, Math.PI / 2),
      zone.mat
    );
    const halo = torus(
      `v14-side-halo-${zone.id}`,
      5.25,
      0.025,
      new BABYLON.Vector3(portalX, 2.35, zone.z),
      new BABYLON.Vector3(0, 0, Math.PI / 2),
      M.glass
    );
    animated.push({ mesh: portal, halo, phase: index * 0.9, type: "portal" });

    // Two pylons make the gate read as an architectural object instead of a floating ring.
    [-1, 1].forEach(s => {
      const pz = zone.z + s * 1.95;
      box(`v14-pylon-${zone.id}-${s}`, { width: 0.48, height: 3.8, depth: 0.42 }, new BABYLON.Vector3(portalX, 1.9, pz), M.edge);
      strip(`v14-pylon-light-${zone.id}-${s}`, { width: 0.51, height: 2.7, depth: 0.045 }, new BABYLON.Vector3(portalX - zone.side * 0.26, 1.85, pz), zone.mat);
    });

    // Over-road checkpoint ring gives tunnel/depth sensation while driving the main route.
    const checkpoint = torus(
      `v14-checkpoint-${zone.id}`,
      6.5,
      0.055,
      new BABYLON.Vector3(0, 3.35, zone.z),
      new BABYLON.Vector3(Math.PI / 2, 0, 0),
      zone.mat
    );
    checkpoint.scaling.x = 1.18;
    animated.push({ mesh: checkpoint, phase: index * 1.25, type: "checkpoint" });

    const light = new BABYLON.PointLight(`v14-zone-light-${zone.id}`, new BABYLON.Vector3(portalX, 2.45, zone.z), scene);
    light.diffuse = BABYLON.Color3.FromHexString(zone.color);
    light.intensity = 1.05;
    light.range = 7.5;
  });

  // High-tech city silhouettes around the drive area.
  const towerData = [
    [-18, -12, 8.5], [-18, -3, 12.5], [-18, 8, 10.2], [-18, 15, 7.4],
    [18, -10, 11.0], [18, 1, 8.3], [18, 10, 13.2], [18, 16, 9.5],
    [-13.5, -17, 6.2], [-4.5, 17.5, 8.7], [6.5, -17.5, 7.8], [13, 17, 6.8]
  ];
  towerData.forEach((t, i) => {
    const [x, z, h] = t;
    box(`v14-tower-${i}`, { width: 2.2 + (i % 3) * 0.5, height: h, depth: 2.2 }, new BABYLON.Vector3(x, h / 2 - 0.02, z), M.tower);
    const accent = i % 2 ? M.teal : M.cyan;
    for (let y = 1.2; y < h - 0.5; y += 1.25) {
      strip(`v14-window-${i}-${y}`, { width: 1.4, height: 0.05, depth: 0.03 }, new BABYLON.Vector3(x, y, z - 1.12), accent);
    }
  });

  // Floating sky rings and moving light drones add vertical depth.
  const skyRings = [];
  [-9, 1, 11].forEach((z, i) => {
    const ring = torus(`v14-sky-ring-${i}`, 8 + i * 1.6, 0.035, new BABYLON.Vector3(0, 8.5 + i * 1.7, z), new BABYLON.Vector3(0.15 + i * 0.12, 0, 0.35), i % 2 ? M.violet : M.cyan);
    ring.scaling.y = 0.56;
    skyRings.push(ring);
  });

  const drones = [];
  for (let i = 0; i < 16; i++) {
    const orb = BABYLON.MeshBuilder.CreateSphere(`v14-drone-${i}`, { diameter: 0.09 + (i % 3) * 0.025, segments: 10 }, scene);
    orb.material = i % 3 === 0 ? M.violet : (i % 2 ? M.teal : M.cyan);
    orb.isPickable = false;
    orb.checkCollisions = false;
    glow?.addIncludedOnlyMesh?.(orb);
    drones.push({ mesh: orb, phase: i * 0.72, radius: 7 + (i % 5), y: 4.3 + (i % 4) * 0.75, speed: 0.16 + (i % 4) * 0.035 });
  }

  // Moving pulses on the road make speed visible even at low velocity.
  const pulses = [];
  for (let i = 0; i < 8; i++) {
    const p = strip(`v14-pulse-${i}`, { width: 5.1, height: 0.018, depth: 0.045 }, new BABYLON.Vector3(0, 0.115, -13 + i * 3.6), i % 2 ? M.teal : M.cyan);
    p.visibility = 0.55;
    pulses.push(p);
  }

  // Compact route HUD.
  const routeHud = document.createElement("div");
  routeHud.className = "track-hud-v14";
  routeHud.innerHTML = `
    <div class="track-hud-kicker">FUTURE BOULEVARD · v1.4</div>
    <div class="track-hud-main"><span id="trackNo">START</span><strong id="trackTitle">HR EXPERIENCE DRIVE</strong></div>
    <div class="track-hud-sub" id="trackSub">Следуйте по световой трассе к проектным порталам</div>
  `;
  document.body.appendChild(routeHud);
  const noEl = document.getElementById("trackNo");
  const titleEl = document.getElementById("trackTitle");
  const subEl = document.getElementById("trackSub");

  let activeZone = "";
  function updateRouteHud() {
    let nearest = null;
    let min = Infinity;
    zones.forEach(z => {
      const target = new BABYLON.Vector3(z.side * 5.4, 0.15, z.z);
      const d = BABYLON.Vector3.Distance(car.position, target);
      if (d < min) { min = d; nearest = z; }
    });
    if (!nearest) return;
    const nextKey = nearest.id;
    if (nextKey !== activeZone) {
      activeZone = nextKey;
      noEl.textContent = nearest.no;
      titleEl.textContent = nearest.title;
      subEl.textContent = nearest.id === "future"
        ? "Портал 2027 откроется после прохождения трёх направлений"
        : "Сверните в световой портал и изучите результаты 2025";
      routeHud.style.setProperty("--track-accent", nearest.color);
    }
    routeHud.classList.toggle("near", min < 4.5);
  }

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    t += dt;

    animated.forEach((a, i) => {
      if (a.type === "portal") {
        a.mesh.rotation.x = Math.sin(t * 0.32 + a.phase) * 0.06;
        const s = 1 + Math.sin(t * 2.0 + a.phase) * 0.035;
        a.halo.scaling.y = a.halo.scaling.z = s;
      } else {
        a.mesh.rotation.z += dt * (0.05 + i * 0.004);
      }
    });

    skyRings.forEach((ring, i) => {
      ring.rotation.y += dt * (0.025 + i * 0.012);
      ring.rotation.z -= dt * 0.01;
    });

    drones.forEach((d, i) => {
      const a = t * d.speed + d.phase;
      d.mesh.position.x = Math.cos(a) * d.radius;
      d.mesh.position.z = Math.sin(a * 0.86) * (d.radius + 4);
      d.mesh.position.y = d.y + Math.sin(a * 2.1) * 0.35;
    });

    pulses.forEach((p, i) => {
      p.position.z += dt * (4.2 + i * 0.08);
      if (p.position.z > 14.0) p.position.z = -14.0;
      p.visibility = 0.35 + Math.abs(Math.sin(t * 2.4 + i)) * 0.35;
    });

    updateRouteHud();
  });
})();
