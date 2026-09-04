(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("renderCanvas");
  const boot = $("boot");
  const bootLog = $("bootLog");
  const enterButton = $("enterButton");
  const hud = $("hud");
  const zoneName = $("zoneName");
  const progressText = $("progressText");
  const prompt = $("interactionPrompt");
  const toast = $("toast");
  const fade = $("fade");
  const roomPanel = $("roomPanel");
  const roomPanelTitle = $("roomPanelTitle");
  const roomPanelSubtitle = $("roomPanelSubtitle");
  const roomPanelProcess = $("roomPanelProcess");
  const roomPanelMetrics = $("roomPanelMetrics");
  const hubGuide = $("hubGuide");
  const mobileControls = $("mobileControls");
  const joystickBase = $("joystickBase");
  const joystickKnob = $("joystickKnob");
  const mobileAction = $("mobileAction");
  const mobileHub = $("mobileHub");
  const data = window.HR2026;

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.025, 0.035, 0.045, 1);
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.04, 0.07, 0.085);
  scene.imageProcessingConfiguration.contrast = 1.18;
  scene.imageProcessingConfiguration.exposure = 1.08;
  scene.imageProcessingConfiguration.vignetteEnabled = true;
  scene.imageProcessingConfiguration.vignetteWeight = 1.2;

  const camera = new BABYLON.UniversalCamera("povCamera", new BABYLON.Vector3(0, 1.68, -12.6), scene);
  camera.minZ = 0.05;
  camera.fov = 1.02;
  camera.inertia = 0;
  camera.angularSensibility = 2200;
  camera.ellipsoid = new BABYLON.Vector3(0.32, 0.82, 0.32);
  camera.checkCollisions = true;
  camera.applyGravity = false;
  scene.activeCamera = camera;

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.68;
  hemi.diffuse = new BABYLON.Color3(0.72, 0.83, 0.9);
  hemi.groundColor = new BABYLON.Color3(0.08, 0.09, 0.1);

  const keyLight = new BABYLON.DirectionalLight("key", new BABYLON.Vector3(-0.35, -1, 0.25), scene);
  keyLight.position = new BABYLON.Vector3(8, 14, -8);
  keyLight.intensity = 0.42;

  const glow = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 32 });
  glow.intensity = 0.42;

  try {
    const pipeline = new BABYLON.DefaultRenderingPipeline("povPipeline", true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.72;
    pipeline.bloomWeight = 0.22;
    pipeline.bloomKernel = 48;
  } catch (_) {}

  function mat(name, hex, emissive = 0, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.roughness = 0.72;
    m.metallic = 0.04;
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    wall: mat("wall", "#27343d"),
    wall2: mat("wall2", "#172129"),
    floor: mat("floor", "#101820"),
    ceiling: mat("ceiling", "#0a1016"),
    frame: mat("frame", "#596b76"),
    dark: mat("dark", "#070b0f"),
    cyan: mat("cyan", "#4bd6ff", 0.9),
    teal: mat("teal", "#55e0b3", 0.8),
    amber: mat("amber", "#f0b85f", 0.8),
    violet: mat("violet", "#aa8cff", 0.8),
    green: mat("green", "#58e7a9", 0.9),
    red: mat("red", "#b44f68", 0.32),
    glass: mat("glass", "#72cde5", 0.16, 0.36),
    white: mat("white", "#edf7fb", 0.08),
    wood: mat("wood", "#725847"),
    skin: mat("skin", "#efb08c"),
    sleeve: mat("sleeve", "#b5a795"),
    tablet: mat("tablet", "#0d151b"),
    plant: mat("plant", "#3f785e")
  };

  function box(name, size, pos, material, collide = true, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    mesh.checkCollisions = collide;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function cyl(name, options, pos, material, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function sph(name, diameter, pos, material, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 20 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function strip(name, pos, size, material, parent = null) {
    const mesh = box(name, size, pos, material, false, parent);
    glow.addIncludedOnlyMesh(mesh);
    return mesh;
  }

  function addPointLight(name, pos, color, intensity = 0.7, range = 8) {
    const l = new BABYLON.PointLight(name, pos, scene);
    l.diffuse = BABYLON.Color3.FromHexString(color);
    l.intensity = intensity;
    l.range = range;
    return l;
  }

  // --- POV hands / navigator, inspired by the physical foreground in the reference video ---
  const handRoot = new BABYLON.TransformNode("povHands", scene);
  handRoot.parent = camera;
  handRoot.position = new BABYLON.Vector3(0, -0.43, 1.0);

  const leftSleeve = cyl("leftSleeve", { height: 0.72, diameterTop: 0.24, diameterBottom: 0.32, tessellation: 18 }, new BABYLON.Vector3(-0.47, -0.13, 0.16), M.sleeve, handRoot);
  leftSleeve.rotation.z = -0.62;
  leftSleeve.rotation.x = 1.05;
  const rightSleeve = cyl("rightSleeve", { height: 0.72, diameterTop: 0.24, diameterBottom: 0.32, tessellation: 18 }, new BABYLON.Vector3(0.47, -0.13, 0.16), M.sleeve, handRoot);
  rightSleeve.rotation.z = 0.62;
  rightSleeve.rotation.x = 1.05;
  sph("leftHand", 0.28, new BABYLON.Vector3(-0.25, 0.0, 0.62), M.skin, handRoot);
  sph("rightHand", 0.28, new BABYLON.Vector3(0.25, 0.0, 0.62), M.skin, handRoot);
  const tablet = box("hrNavigator", { width: 0.62, height: 0.08, depth: 0.36 }, new BABYLON.Vector3(0, -0.02, 0.68), M.tablet, false, handRoot);
  tablet.rotation.x = 0.26;
  strip("tabletGlow", new BABYLON.Vector3(0, 0.035, 0.69), { width: 0.49, height: 0.012, depth: 0.25 }, M.cyan, handRoot).rotation.x = 0.26;

  // --- Architecture ---
  const corridor = { width: 8.4, depth: 30, height: 3.7 };
  box("corridorFloor", { width: corridor.width, height: 0.16, depth: corridor.depth }, new BABYLON.Vector3(0, 0, 0), M.floor);
  box("corridorCeiling", { width: corridor.width, height: 0.16, depth: corridor.depth }, new BABYLON.Vector3(0, corridor.height, 0), M.ceiling);
  box("corridorNorth", { width: corridor.width, height: corridor.height, depth: 0.22 }, new BABYLON.Vector3(0, corridor.height / 2, 15), M.wall2);
  box("corridorSouth", { width: corridor.width, height: corridor.height, depth: 0.22 }, new BABYLON.Vector3(0, corridor.height / 2, -15), M.wall2);

  function sideWallWithOpenings(side, x, openings) {
    const minZ = -15;
    const maxZ = 15;
    const gapHalf = 1.55;
    const sorted = [...openings].sort((a, b) => a - b);
    let cursor = minZ;
    sorted.forEach((z, i) => {
      const end = z - gapHalf;
      if (end > cursor) {
        box(`${side}-seg-${i}`, { width: 0.22, height: corridor.height, depth: end - cursor }, new BABYLON.Vector3(x, corridor.height / 2, (cursor + end) / 2), M.wall);
      }
      cursor = z + gapHalf;
    });
    if (cursor < maxZ) {
      box(`${side}-seg-last`, { width: 0.22, height: corridor.height, depth: maxZ - cursor }, new BABYLON.Vector3(x, corridor.height / 2, (cursor + maxZ) / 2), M.wall);
    }
  }

  sideWallWithOpenings("leftWall", -4.2, [-7, 6]);
  sideWallWithOpenings("rightWall", 4.2, [0, 10]);

  for (let z = -12; z <= 12; z += 4) {
    strip(`ceilLine-${z}`, new BABYLON.Vector3(0, 3.54, z), { width: 5.4, height: 0.035, depth: 0.13 }, M.cyan);
    addPointLight(`corrLight-${z}`, new BABYLON.Vector3(0, 3.25, z), "#bfefff", 0.42, 7.2);
  }

  // floor perspective guides
  strip("guideCenter", new BABYLON.Vector3(0, 0.09, 0), { width: 0.035, height: 0.02, depth: 26 }, M.cyan);
  strip("guideLeft", new BABYLON.Vector3(-2.6, 0.09, 0), { width: 0.025, height: 0.02, depth: 26 }, M.teal);
  strip("guideRight", new BABYLON.Vector3(2.6, 0.09, 0), { width: 0.025, height: 0.02, depth: 26 }, M.violet);

  function roomShell(name, center, side, accentMat) {
    const w = 11;
    const d = 8;
    const h = 3.7;
    box(`${name}-floor`, { width: w, height: 0.16, depth: d }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${name}-ceiling`, { width: w, height: 0.16, depth: d }, new BABYLON.Vector3(center.x, h, center.z), M.ceiling);
    box(`${name}-north`, { width: w, height: h, depth: 0.22 }, new BABYLON.Vector3(center.x, h / 2, center.z + d / 2), M.wall2);
    box(`${name}-south`, { width: w, height: h, depth: 0.22 }, new BABYLON.Vector3(center.x, h / 2, center.z - d / 2), M.wall2);
    if (side === "left") {
      box(`${name}-outer`, { width: 0.22, height: h, depth: d }, new BABYLON.Vector3(center.x - w / 2, h / 2, center.z), M.wall2);
    } else {
      box(`${name}-outer`, { width: 0.22, height: h, depth: d }, new BABYLON.Vector3(center.x + w / 2, h / 2, center.z), M.wall2);
    }
    // illuminated ceiling rails for depth
    for (let x = -3.8; x <= 3.8; x += 3.8) {
      strip(`${name}-rail-${x}`, new BABYLON.Vector3(center.x + x, 3.50, center.z), { width: 0.09, height: 0.03, depth: 5.9 }, accentMat);
    }
    addPointLight(`${name}-roomLight`, new BABYLON.Vector3(center.x, 3.2, center.z), side === "left" ? "#9ceaff" : "#bfffe8", 0.58, 8.5);
  }

  const centers = {
    recruitment: new BABYLON.Vector3(-9.7, 0, -7),
    ai: new BABYLON.Vector3(9.7, 0, 0),
    mentoring: new BABYLON.Vector3(-9.7, 0, 6),
    future: new BABYLON.Vector3(9.7, 0, 10)
  };

  roomShell("recruitment", centers.recruitment, "left", M.cyan);
  roomShell("ai", centers.ai, "right", M.teal);
  roomShell("mentoring", centers.mentoring, "left", M.amber);
  roomShell("future", centers.future, "right", M.violet);

  function createPlant(name, pos) {
    cyl(`${name}-pot`, { height: 0.5, diameterTop: 0.58, diameterBottom: 0.72, tessellation: 20 }, new BABYLON.Vector3(pos.x, 0.33, pos.z), M.wood);
    cyl(`${name}-stem`, { height: 0.9, diameter: 0.08, tessellation: 12 }, new BABYLON.Vector3(pos.x, 0.9, pos.z), M.plant);
    [[0,1.45,0],[.25,1.36,.05],[-.23,1.36,-.04]].forEach((o, i) => sph(`${name}-leaf-${i}`, 0.58, new BABYLON.Vector3(pos.x + o[0], o[1], pos.z + o[2]), M.plant));
  }
  createPlant("plant1", new BABYLON.Vector3(-3.2, 0, -12.5));
  createPlant("plant2", new BABYLON.Vector3(3.2, 0, 12.5));

  // --- Door mechanics ---
  const doors = {};
  const interactions = [];
  const completed = new Set();
  let currentInteraction = null;
  let currentZone = "hub";
  let toastTimer = null;

  function createDoor(name, side, z, accentMat, label, targetZone, locked = false) {
    const x = side === "left" ? -4.12 : 4.12;
    const panel = box(`${name}-panel`, { width: 0.16, height: 2.7, depth: 2.55 }, new BABYLON.Vector3(x, 1.36, z), locked ? M.red : accentMat, true);
    const frameTop = box(`${name}-frameTop`, { width: 0.35, height: 0.22, depth: 3.0 }, new BABYLON.Vector3(x, 2.85, z), M.frame, false);
    const frameA = box(`${name}-frameA`, { width: 0.35, height: 2.9, depth: 0.18 }, new BABYLON.Vector3(x, 1.45, z - 1.45), M.frame, false);
    const frameB = box(`${name}-frameB`, { width: 0.35, height: 2.9, depth: 0.18 }, new BABYLON.Vector3(x, 1.45, z + 1.45), M.frame, false);
    const trigger = new BABYLON.Vector3(side === "left" ? -3.3 : 3.3, 1.65, z);
    const door = { name, side, z, panel, label, targetZone, locked, opened: false };
    doors[name] = door;
    interactions.push({
      zone: "hub",
      pos: trigger,
      radius: 2.0,
      label: `E / ДЕЙСТВИЕ — ${label}`,
      action: () => {
        if (door.locked) {
          showToast("Портал 2027 откроется после подтверждения всех трёх направлений.");
          return;
        }
        if (!door.opened) {
          door.opened = true;
          panel.checkCollisions = false;
          BABYLON.Animation.CreateAndStartAnimation(`${name}-open`, panel, "position.y", 60, 30, panel.position.y, 4.7, 0, new BABYLON.CubicEase());
          showToast(`${label}: дверь открыта. Проходите внутрь.`);
        }
      }
    });
    return door;
  }

  createDoor("doorRecruit", "left", -7, M.cyan, "01 · ПРИЁМ", "recruitment");
  createDoor("doorAI", "right", 0, M.teal, "02 · AI LAB", "ai");
  createDoor("doorMentor", "left", 6, M.amber, "03 · НАСТАВНИЧЕСТВО", "mentoring");
  createDoor("doorFuture", "right", 10, M.violet, "2027 · NEXT CHAPTER", "future", true);

  // --- World labels: HTML projected into 3D, always readable ---
  const worldLabels = [];
  function label(text, pos, zone, accent = "#8fe4ff", big = false) {
    const el = document.createElement("div");
    el.className = big ? "world-label world-label-big" : "world-label";
    el.textContent = text;
    el.style.borderColor = `${accent}66`;
    el.style.color = accent;
    hud.appendChild(el);
    worldLabels.push({ el, pos, zone });
  }

  label("01 · ПРИЁМ", new BABYLON.Vector3(-3.55, 3.05, -7), "hub", "#73dcff", true);
  label("02 · AI LAB", new BABYLON.Vector3(3.55, 3.05, 0), "hub", "#82efc8", true);
  label("03 · НАСТАВНИЧЕСТВО", new BABYLON.Vector3(-3.55, 3.05, 6), "hub", "#f2c575", true);
  label("2027 · ЗАКРЫТО", new BABYLON.Vector3(3.55, 3.05, 10), "hub", "#d2bfff", true);

  // --- Exhibits / room content ---
  function exhibit(zone, pos, title, accentMat, accentHex, detail) {
    const pedestal = cyl(`${zone}-${title}-ped`, { height: 0.86, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 22 }, new BABYLON.Vector3(pos.x, 0.48, pos.z), M.dark);
    const orb = sph(`${zone}-${title}-orb`, 0.62, new BABYLON.Vector3(pos.x, 1.35, pos.z), accentMat);
    glow.addIncludedOnlyMesh(orb);
    label(title, new BABYLON.Vector3(pos.x, 2.0, pos.z), zone, accentHex, false);
    interactions.push({ zone, pos: new BABYLON.Vector3(pos.x, 1.5, pos.z), radius: 1.6, label: `E / ДЕЙСТВИЕ — изучить «${title}»`, action: () => showToast(`${title}: ${detail}`, 4800) });
  }

  function screen(zone, pos, title, accentMat, accentHex, detail) {
    const panel = box(`${zone}-${title}-screen`, { width: 2.7, height: 1.55, depth: 0.12 }, new BABYLON.Vector3(pos.x, 1.75, pos.z), M.dark, false);
    strip(`${zone}-${title}-glow`, new BABYLON.Vector3(pos.x, 1.75, pos.z - 0.07), { width: 2.45, height: 1.28, depth: 0.02 }, accentMat);
    label(title, new BABYLON.Vector3(pos.x, 2.7, pos.z), zone, accentHex, true);
    interactions.push({ zone, pos: new BABYLON.Vector3(pos.x, 1.7, pos.z), radius: 2.2, label: `E / ДЕЙСТВИЕ — открыть «${title}»`, action: () => showToast(detail, 5200) });
    return panel;
  }

  // Recruitment room
  exhibit("recruitment", centers.recruitment.add(new BABYLON.Vector3(-2.6, 0, -1.6)), "КАНДИДАТ", M.cyan, "#73dcff", "точка входа в цифровой маршрут сотрудника");
  exhibit("recruitment", centers.recruitment.add(new BABYLON.Vector3(0, 0, 0)), "ДОКУМЕНТЫ", M.cyan, "#73dcff", "автоматизированная проверка и подготовка документов");
  exhibit("recruitment", centers.recruitment.add(new BABYLON.Vector3(2.6, 0, 1.6)), "СОТРУДНИК", M.cyan, "#73dcff", "завершение оформления и готовность к работе");
  screen("recruitment", centers.recruitment.add(new BABYLON.Vector3(-3.7, 0, 2.9)), "МЕТРИКИ 2026", M.cyan, "#73dcff", "Здесь появятся реальные показатели 2026: доля цифровых приёмов, SLA, объём оформлений и снижение ручных операций.");

  // AI room
  const aiCore = sph("aiCore", 1.55, centers.ai.add(new BABYLON.Vector3(0, 1.85, 0.2)), M.teal); glow.addIncludedOnlyMesh(aiCore);
  const aiRing = BABYLON.MeshBuilder.CreateTorus("aiRing", { diameter: 2.7, thickness: 0.055, tessellation: 72 }, scene);
  aiRing.position = centers.ai.add(new BABYLON.Vector3(0, 1.85, 0.2)); aiRing.rotation.x = 1.0; aiRing.material = M.cyan; glow.addIncludedOnlyMesh(aiRing);
  label("HR AI CORE", centers.ai.add(new BABYLON.Vector3(0, 3.0, 0.2)), "ai", "#82efc8", true);
  exhibit("ai", centers.ai.add(new BABYLON.Vector3(-3.0, 0, -2.1)), "AI AGENT 01", M.teal, "#82efc8", "задача → AI-решение → измеримый эффект");
  exhibit("ai", centers.ai.add(new BABYLON.Vector3(3.0, 0, 2.1)), "AI AGENT 02", M.teal, "#82efc8", "второй реальный AI-проект 2026 будет размещён здесь");

  // Mentoring room
  for (let i = 0; i < 8; i++) {
    const x = centers.mentoring.x - 3 + (i % 4) * 2;
    const z = centers.mentoring.z - 1.7 + Math.floor(i / 4) * 3.4;
    const mentor = i < 2;
    cyl(`mentorBody-${i}`, { height: 0.86, diameter: 0.34, tessellation: 16 }, new BABYLON.Vector3(x, 0.62, z), mentor ? M.amber : M.white);
    sph(`mentorHead-${i}`, 0.39, new BABYLON.Vector3(x, 1.25, z), mentor ? M.amber : M.white);
  }
  screen("mentoring", centers.mentoring.add(new BABYLON.Vector3(0, 0, 3.0)), "СЕТЬ НАСТАВНИЧЕСТВА", M.amber, "#f2c575", "В 2026 сюда добавим реальные связи: новички, наставники, охват, удержание и экономический эффект.");

  // Future room
  ["AI", "АВТОМАТИЗАЦИЯ", "ЛЮДИ", "ЭФФЕКТИВНОСТЬ", "СЕРВИС"].forEach((t, i) => {
    const a = (Math.PI * 2 * i) / 5;
    exhibit("future", centers.future.add(new BABYLON.Vector3(Math.cos(a) * 3.3, 0, Math.sin(a) * 2.5)), t, M.violet, "#d2bfff", "Здесь появится утверждённый приоритет 2027 года.");
  });

  // completion terminals at back of each room
  function terminal(zone, pos, accentMat, accentHex) {
    const p = box(`${zone}-terminal`, { width: 1.3, height: 1.55, depth: 0.45 }, new BABYLON.Vector3(pos.x, 0.82, pos.z), M.dark, false);
    strip(`${zone}-terminalGlow`, new BABYLON.Vector3(pos.x, 1.15, pos.z - 0.24), { width: 0.9, height: 0.55, depth: 0.02 }, accentMat);
    label("ПОДТВЕРДИТЬ ИТОГИ", new BABYLON.Vector3(pos.x, 2.1, pos.z), zone, accentHex, false);
    interactions.push({ zone, pos: new BABYLON.Vector3(pos.x, 1.3, pos.z), radius: 1.8, label: "E / ДЕЙСТВИЕ — подтвердить итоги", action: () => complete(zone) });
  }
  terminal("recruitment", centers.recruitment.add(new BABYLON.Vector3(-4.1, 0, 0)), M.cyan, "#73dcff");
  terminal("ai", centers.ai.add(new BABYLON.Vector3(4.1, 0, 0)), M.teal, "#82efc8");
  terminal("mentoring", centers.mentoring.add(new BABYLON.Vector3(-4.1, 0, 0)), M.amber, "#f2c575");

  // zone detectors based on camera position
  function detectZone() {
    const p = camera.position;
    if (p.x < -4.4 && Math.abs(p.z + 7) < 4.2) return "recruitment";
    if (p.x > 4.4 && Math.abs(p.z) < 4.2) return "ai";
    if (p.x < -4.4 && Math.abs(p.z - 6) < 4.2) return "mentoring";
    if (p.x > 4.4 && Math.abs(p.z - 10) < 4.2) return "future";
    return "hub";
  }

  function updateZone() {
    const z = detectZone();
    if (z === currentZone) return;
    currentZone = z;
    zoneName.textContent = z === "hub" ? "HR HUB · ИТОГИ 2026" : (data.zones[z]?.name || z.toUpperCase());
    if (z === "hub") {
      hubGuide.style.display = "block";
      roomPanel.classList.add("hidden");
    } else {
      hubGuide.style.display = "none";
      roomPanel.classList.remove("hidden");
      const d = data.zones[z];
      roomPanelTitle.textContent = d?.name || z.toUpperCase();
      roomPanelSubtitle.textContent = d?.intro || d?.subtitle || "";
      roomPanelProcess.textContent = z === "recruitment" ? "Кандидат → документы → проверка → сотрудник" : z === "ai" ? "Проблема → AI-решение → эффект" : z === "mentoring" ? "Новичок → наставник → адаптация → удержание" : "Приоритеты 2027";
      roomPanelMetrics.innerHTML = "";
      (d?.metrics || []).slice(0, 4).forEach(m => {
        const div = document.createElement("div");
        div.className = "room-metric";
        div.innerHTML = `<strong>${m[0]}</strong><span>${m[1]}</span>`;
        roomPanelMetrics.appendChild(div);
      });
    }
  }

  function complete(zone) {
    if (!["recruitment", "ai", "mentoring"].includes(zone)) return;
    if (completed.has(zone)) {
      showToast("Это направление уже подтверждено.");
      return;
    }
    completed.add(zone);
    progressText.textContent = `${completed.size} / ${data.totalZones}`;
    document.querySelectorAll(".guide-row").forEach(row => {
      if (completed.has(row.dataset.zone)) {
        row.classList.add("complete");
        const i = row.querySelector("i"); if (i) i.textContent = "✓";
      }
    });
    showToast(`${data.zones[zone].name}: итоги подтверждены.`);
    if (completed.size === data.totalZones) {
      const d = doors.doorFuture;
      d.locked = false;
      d.panel.material = M.violet;
      showToast("Все направления пройдены. Портал 2027 разблокирован!", 5000);
    }
  }

  function showToast(text, ms = 3800) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function updateInteraction() {
    let nearest = null;
    let dmin = Infinity;
    for (const item of interactions) {
      if (item.zone !== currentZone && !(item.zone === "hub" && currentZone === "hub")) continue;
      const d = BABYLON.Vector3.Distance(camera.position, item.pos);
      if (d < item.radius && d < dmin) { nearest = item; dmin = d; }
    }
    currentInteraction = nearest;
    if (nearest) {
      prompt.textContent = nearest.label;
      prompt.classList.remove("hidden");
    } else prompt.classList.add("hidden");
  }

  function updateLabels() {
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    for (const item of worldLabels) {
      if (item.zone !== currentZone) { item.el.style.display = "none"; continue; }
      const p = BABYLON.Vector3.Project(item.pos, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), viewport);
      if (p.z < 0 || p.z > 1) item.el.style.display = "none";
      else {
        item.el.style.display = "block";
        item.el.style.left = `${p.x}px`;
        item.el.style.top = `${p.y}px`;
      }
    }
  }

  // --- Controls ---
  const keys = new Set();
  let yaw = 0;
  let pitch = 0;
  let moveBob = 0;
  let mobileMove = { x: 0, y: 0 };
  let lookPointer = null;
  let lookLast = null;

  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if ((e.code === "KeyE" || e.code === "Enter") && currentInteraction) currentInteraction.action();
    if (e.code === "KeyQ") returnToHub();
  });
  window.addEventListener("keyup", e => keys.delete(e.code));

  const isTouch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  if (!isTouch) {
    canvas.addEventListener("click", () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    });
    document.addEventListener("mousemove", e => {
      if (document.pointerLockElement !== canvas) return;
      yaw += e.movementX * 0.00235;
      pitch -= e.movementY * 0.00205;
      pitch = Math.max(-0.72, Math.min(0.72, pitch));
    });
  }

  function setupJoystick() {
    if (!mobileControls) return;
    mobileControls.classList.remove("hidden");
    let joyId = null;
    const max = 42;
    const reset = () => {
      joyId = null;
      mobileMove = { x: 0, y: 0 };
      joystickKnob.style.transform = "translate(0px,0px)";
    };
    joystickBase.addEventListener("pointerdown", e => {
      joyId = e.pointerId;
      joystickBase.setPointerCapture(e.pointerId);
    });
    joystickBase.addEventListener("pointermove", e => {
      if (e.pointerId !== joyId) return;
      const r = joystickBase.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      joystickKnob.style.transform = `translate(${dx}px,${dy}px)`;
      mobileMove.x = dx / max;
      mobileMove.y = -dy / max;
    });
    joystickBase.addEventListener("pointerup", reset);
    joystickBase.addEventListener("pointercancel", reset);

    canvas.addEventListener("pointerdown", e => {
      if (e.clientX < innerWidth * 0.42) return;
      lookPointer = e.pointerId;
      lookLast = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
      if (e.pointerId !== lookPointer || !lookLast) return;
      const dx = e.clientX - lookLast.x;
      const dy = e.clientY - lookLast.y;
      yaw += dx * 0.0052;
      pitch -= dy * 0.0045;
      pitch = Math.max(-0.72, Math.min(0.72, pitch));
      lookLast = { x: e.clientX, y: e.clientY };
    });
    const endLook = e => { if (e.pointerId === lookPointer) { lookPointer = null; lookLast = null; } };
    canvas.addEventListener("pointerup", endLook);
    canvas.addEventListener("pointercancel", endLook);

    mobileAction?.addEventListener("pointerdown", e => {
      e.preventDefault();
      navigator.vibrate?.(20);
      currentInteraction?.action();
    });
    mobileHub?.addEventListener("pointerdown", e => {
      e.preventDefault();
      navigator.vibrate?.(20);
      returnToHub();
    });
  }
  if (isTouch) setupJoystick();

  function returnToHub() {
    fade.classList.add("active");
    setTimeout(() => {
      camera.position.copyFrom(new BABYLON.Vector3(0, 1.68, -12.6));
      yaw = 0; pitch = 0;
      fade.classList.remove("active");
      showToast("Возврат в HR HUB.");
    }, 220);
  }

  function updateMovement(dt) {
    let forwardAmount = 0;
    let strafeAmount = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) forwardAmount += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) forwardAmount -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) strafeAmount += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) strafeAmount -= 1;
    forwardAmount += mobileMove.y;
    strafeAmount += mobileMove.x;

    const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    let delta = forward.scale(forwardAmount).add(right.scale(strafeAmount));
    const len = delta.length();
    if (len > 1) delta.scaleInPlace(1 / len);
    const moving = len > 0.035;
    if (moving) {
      const speed = 3.15;
      camera.moveWithCollisions(delta.scale(speed * dt));
      moveBob += dt * 8.5;
    }

    camera.rotation.x = pitch + (moving ? Math.sin(moveBob * 2) * 0.008 : 0);
    camera.rotation.y = yaw;
    camera.rotation.z = moving ? Math.sin(moveBob) * 0.004 : 0;

    // foreground motion provides the same kind of embodied POV cue as the reference video
    const targetY = -0.43 + (moving ? Math.abs(Math.sin(moveBob * 2)) * 0.018 : 0);
    handRoot.position.y += (targetY - handRoot.position.y) * 0.22;
    handRoot.rotation.z = moving ? Math.sin(moveBob) * 0.012 : 0;
  }

  // Intro
  const bootLines = [
    "IMMERSIVE POV .......... READY",
    "DEPTH / FOG / BLOOM .... READY",
    "MOBILE JOYSTICK ........ READY",
    "PROJECT SPACES ......... 3 FOUND",
    "",
    "ЦК БОРУП · ИТОГИ 2026"
  ];
  let bi = 0;
  const bt = setInterval(() => {
    bootLog.textContent += `${bootLines[bi]}\n`;
    bi++;
    if (bi >= bootLines.length) { clearInterval(bt); enterButton.disabled = false; }
  }, 160);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    if (isTouch) mobileControls?.classList.remove("hidden");
    showToast(isTouch ? "Левый джойстик — движение. Проводите пальцем справа по экрану — смотреть вокруг." : "WASD — движение. Щёлкните по сцене и двигайте мышью — осмотр.", 5200);
  });

  let last = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (boot.classList.contains("hidden")) {
      updateMovement(dt);
      updateZone();
      updateInteraction();
      updateLabels();
      aiRing.rotation.y += dt * 0.55;
      aiRing.rotation.z += dt * 0.28;
    }
    scene.render();
  });
  window.addEventListener("resize", () => engine.resize());
})();
