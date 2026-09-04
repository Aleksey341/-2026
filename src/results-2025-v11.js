(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;

  const camera = scene.activeCamera;
  const data = window.HR2026;
  const results = data?.demoResults2025 || [];
  if (!camera || !results.length) return;

  const makeMat = (name, hex, emissive = 0, alpha = 1) => {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.roughness = 0.32;
    m.metallic = 0.34;
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  };

  const MAT = {
    cyan: makeMat("demo25-cyan", "#53d9ff", 0.85),
    teal: makeMat("demo25-teal", "#60e3b9", 0.82),
    amber: makeMat("demo25-amber", "#f4bd68", 0.82),
    violet: makeMat("demo25-violet", "#b39aff", 0.82),
    red: makeMat("demo25-red", "#ff7593", 0.7),
    dark: makeMat("demo25-dark", "#071019", 0.05),
    glass: makeMat("demo25-glass", "#7cdcff", 0.15, 0.22),
    white: makeMat("demo25-white", "#eaf9ff", 0.3)
  };

  const colors = [
    [MAT.cyan, "#53d9ff"],
    [MAT.teal, "#60e3b9"],
    [MAT.violet, "#b39aff"],
    [MAT.amber, "#f4bd68"],
    [MAT.red, "#ff7593"]
  ];

  const stationPositions = [
    new BABYLON.Vector3(-10.5, 0, -8.6), // Приём
    new BABYLON.Vector3(-2.8, 0, -1.8),  // HR-конвергент, в коридоре у стены
    new BABYLON.Vector3(10.5, 0, 0.8),   // ИИ-команда
    new BABYLON.Vector3(-10.5, 0, 6.8),  // Награды / recognition
    new BABYLON.Vector3(2.8, 0, 12.0)    // ВУТ, в конце коридора
  ];

  const stations = [];

  function createStation(item, index) {
    const p = stationPositions[index];
    const [accentMat, accentHex] = colors[index % colors.length];
    const root = new BABYLON.TransformNode(`demo25-${item.id}`, scene);
    root.position.copyFrom(p);

    const base = BABYLON.MeshBuilder.CreateCylinder(`demo25-base-${index}`, {
      height: 0.22,
      diameterTop: 1.65,
      diameterBottom: 1.95,
      tessellation: 48
    }, scene);
    base.parent = root;
    base.position.y = 0.15;
    base.material = MAT.dark;

    const ring0 = BABYLON.MeshBuilder.CreateTorus(`demo25-ring0-${index}`, {
      diameter: 1.78,
      thickness: 0.035,
      tessellation: 72
    }, scene);
    ring0.parent = root;
    ring0.position.y = 0.3;
    ring0.rotation.x = Math.PI / 2;
    ring0.material = accentMat;

    const column = BABYLON.MeshBuilder.CreateCylinder(`demo25-column-${index}`, {
      height: 2.15,
      diameter: 0.48,
      tessellation: 36
    }, scene);
    column.parent = root;
    column.position.y = 1.33;
    column.material = MAT.glass;

    const core = BABYLON.MeshBuilder.CreatePolyhedron(`demo25-core-${index}`, {
      type: index % 2 ? 2 : 1,
      size: 0.56
    }, scene);
    core.parent = root;
    core.position.y = 1.62;
    core.material = accentMat;

    const ring1 = BABYLON.MeshBuilder.CreateTorus(`demo25-ring1-${index}`, {
      diameter: 1.12,
      thickness: 0.025,
      tessellation: 64
    }, scene);
    ring1.parent = root;
    ring1.position.y = 1.63;
    ring1.rotation.x = Math.PI / 2.6;
    ring1.material = accentMat;

    const ring2 = BABYLON.MeshBuilder.CreateTorus(`demo25-ring2-${index}`, {
      diameter: 0.86,
      thickness: 0.018,
      tessellation: 64
    }, scene);
    ring2.parent = root;
    ring2.position.y = 1.63;
    ring2.rotation.z = Math.PI / 2.4;
    ring2.material = MAT.white;

    const halo = BABYLON.MeshBuilder.CreateDisc(`demo25-halo-${index}`, {
      radius: 1.05,
      tessellation: 72,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    halo.parent = root;
    halo.position.y = 2.45;
    halo.rotation.x = Math.PI / 2;
    halo.material = MAT.glass;

    const light = new BABYLON.PointLight(`demo25-light-${index}`, new BABYLON.Vector3(p.x, 2.0, p.z), scene);
    light.diffuse = BABYLON.Color3.FromHexString(accentHex);
    light.intensity = 0.8;
    light.range = 4.8;

    // Orbiting data particles give the station depth even without text meshes.
    const orbs = [];
    for (let i = 0; i < 7; i++) {
      const orb = BABYLON.MeshBuilder.CreateSphere(`demo25-orb-${index}-${i}`, { diameter: 0.075, segments: 10 }, scene);
      orb.parent = root;
      orb.material = i % 2 ? MAT.white : accentMat;
      orbs.push(orb);
    }

    stations.push({ item, root, ring0, ring1, ring2, core, halo, orbs, index, accentHex });
  }

  results.slice(0, stationPositions.length).forEach(createStation);

  // Floating light shafts and perspective markers deepen the corridor.
  for (let i = 0; i < 7; i++) {
    const z = -12 + i * 4;
    const beam = BABYLON.MeshBuilder.CreateBox(`demo25-beam-${i}`, { width: 0.04, height: 2.7, depth: 0.04 }, scene);
    beam.position = new BABYLON.Vector3(i % 2 ? 3.45 : -3.45, 1.5, z);
    beam.material = i % 2 ? MAT.teal : MAT.cyan;
  }

  // A subtle moving pulse travelling through the floor emphasizes depth and motion.
  const pulse = BABYLON.MeshBuilder.CreateBox("demo25-floor-pulse", { width: 6.0, height: 0.015, depth: 0.06 }, scene);
  pulse.position = new BABYLON.Vector3(0, 0.11, -13.0);
  pulse.material = MAT.cyan;
  pulse.isPickable = false;

  const badge = document.createElement("div");
  badge.className = "demo2025-badge";
  badge.innerHTML = '<span>DEMO DATA</span><strong>2025</strong>';
  document.body.appendChild(badge);

  const card = document.createElement("div");
  card.className = "demo2025-card hidden";
  card.innerHTML = `
    <div class="demo2025-kicker">РЕЗУЛЬТАТЫ 2025 · ТЕСТОВОЕ НАПОЛНЕНИЕ</div>
    <div class="demo2025-title"></div>
    <div class="demo2025-subtitle"></div>
    <div class="demo2025-metrics"></div>
    <div class="demo2025-foot">Подойдите к следующему световому объекту, чтобы увидеть другой результат.</div>
  `;
  document.body.appendChild(card);

  const titleEl = card.querySelector(".demo2025-title");
  const subtitleEl = card.querySelector(".demo2025-subtitle");
  const metricsEl = card.querySelector(".demo2025-metrics");
  let activeId = null;

  function showResult(item, accentHex) {
    if (activeId === item.id) return;
    activeId = item.id;
    titleEl.textContent = item.title;
    subtitleEl.textContent = item.subtitle || "";
    card.style.setProperty("--demo-accent", accentHex);
    metricsEl.innerHTML = "";
    item.metrics.forEach(([value, label]) => {
      const cell = document.createElement("div");
      cell.className = "demo2025-metric";
      cell.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
      metricsEl.appendChild(cell);
    });
    card.classList.remove("hidden");
  }

  function hideResult() {
    activeId = null;
    card.classList.add("hidden");
  }

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    t += dt;

    stations.forEach((s) => {
      s.ring0.rotation.z += dt * (0.25 + s.index * 0.03);
      s.ring1.rotation.y += dt * (0.65 + s.index * 0.05);
      s.ring2.rotation.x -= dt * 0.55;
      s.core.rotation.y += dt * 0.72;
      s.core.rotation.x += dt * 0.22;
      s.core.position.y = 1.62 + Math.sin(t * 1.8 + s.index) * 0.12;
      s.halo.scaling.x = s.halo.scaling.z = 1 + Math.sin(t * 1.25 + s.index) * 0.05;

      s.orbs.forEach((orb, i) => {
        const a = t * (0.8 + i * 0.035) + i * (Math.PI * 2 / s.orbs.length);
        const r = 0.86 + (i % 3) * 0.13;
        orb.position.x = Math.cos(a) * r;
        orb.position.z = Math.sin(a) * r;
        orb.position.y = 1.35 + Math.sin(a * 1.8) * 0.55;
      });
    });

    pulse.position.z += dt * 4.2;
    if (pulse.position.z > 13) pulse.position.z = -13;

    let nearest = null;
    let nearestD = Infinity;
    stations.forEach((s) => {
      const d = BABYLON.Vector3.Distance(camera.position, s.root.position.add(new BABYLON.Vector3(0, 1.3, 0)));
      if (d < nearestD) {
        nearestD = d;
        nearest = s;
      }
    });

    if (nearest && nearestD < 3.0) {
      showResult(nearest.item, nearest.accentHex);
      nearest.ring0.scaling.x = nearest.ring0.scaling.z = 1.08;
    } else {
      hideResult();
    }
  });
})();
