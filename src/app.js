(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("renderCanvas");
  const boot = $("boot");
  const bootLog = $("bootLog");
  const enterButton = $("enterButton");
  const hud = $("hud");
  const hubGuide = $("hubGuide");
  const roomPanel = $("roomPanel");
  const roomPanelTitle = $("roomPanelTitle");
  const roomPanelSubtitle = $("roomPanelSubtitle");
  const roomPanelProcess = $("roomPanelProcess");
  const roomPanelMetrics = $("roomPanelMetrics");
  const zoneName = $("zoneName");
  const progressText = $("progressText");
  const prompt = $("interactionPrompt");
  const toast = $("toast");
  const fade = $("fade");
  const data = window.HR2026;

  const completed = new Set();
  const interactions = [];
  const doors = {};
  let currentInteraction = null;
  let currentZone = "hub";
  let toastTimer = null;
  let transitionBusy = false;

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true
  });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.035, 0.045, 0.052, 1);
  scene.gravity = new BABYLON.Vector3(0, -0.32, 0);
  scene.collisionsEnabled = true;

  const camera = new BABYLON.UniversalCamera("player", new BABYLON.Vector3(0, 1.72, -6.7), scene);
  camera.speed = 0.18;
  camera.angularSensibility = 3600;
  camera.fov = 0.88;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.42, 0.86, 0.42);
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];
  camera.attachControl(canvas, true);

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.9;
  hemi.diffuse = new BABYLON.Color3(0.95, 0.94, 0.9);
  hemi.groundColor = new BABYLON.Color3(0.18, 0.2, 0.22);

  const glow = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 24 });
  glow.intensity = 0.35;

  function mat(name, hex, emissive = 0) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    wall: mat("wall", "#c9c3b7"),
    wallDark: mat("wallDark", "#98958e"),
    floor: mat("floor", "#b8b3a8"),
    ceiling: mat("ceiling", "#24282b"),
    charcoal: mat("charcoal", "#262d31"),
    black: mat("black", "#111518"),
    white: mat("white", "#f3f1eb", 0.04),
    metal: mat("metal", "#67727a"),
    wood: mat("wood", "#7b6554"),
    cyan: mat("cyan", "#3bcaf2", 0.42),
    teal: mat("teal", "#4bd8ae", 0.38),
    amber: mat("amber", "#e7ad55", 0.38),
    violet: mat("violet", "#9b83e8", 0.38),
    green: mat("green", "#4ee6a8", 0.5),
    red: mat("red", "#a65363", 0.28),
    plant: mat("plant", "#547764"),
    glass: mat("glass", "#5bbbd0", 0.12)
  };
  M.glass.alpha = 0.45;

  function box(name, size, position, material, collisions = true, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = collisions;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function cylinder(name, options, position, material, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function strip(name, position, size, material, parent = null) {
    const s = box(name, size, position, material, false, parent);
    glow.addIncludedOnlyMesh(s);
    return s;
  }

  function makeTextMaterial(name, title, subtitle, accent = "#7bdcff") {
    const tex = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1200, height: 320 }, scene, true);
    const ctx = tex.getContext();
    ctx.fillStyle = "#101417";
    ctx.fillRect(0, 0, 1200, 320);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 1190, 310);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 66px Arial";
    ctx.fillText(title, 600, subtitle ? 125 : 160, 1080);
    if (subtitle) {
      ctx.fillStyle = "#b9c4c9";
      ctx.font = "500 34px Arial";
      ctx.fillText(subtitle, 600, 220, 1050);
    }
    tex.update();

    const m = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    m.diffuseTexture = tex;
    m.emissiveTexture = tex;
    m.backFaceCulling = true;
    return m;
  }

  function doorSign(name, root, title, subtitle, accent) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, {
      width: 3.8,
      height: 0.95,
      sideOrientation: BABYLON.Mesh.FRONTSIDE
    }, scene);
    plane.parent = root;
    plane.position = new BABYLON.Vector3(0, 3.55, -0.16);
    plane.rotation.y = Math.PI;
    plane.material = makeTextMaterial(name, title, subtitle, accent);
    plane.isPickable = false;
    return plane;
  }

  function ceilingLights(center, width, depth, height) {
    for (let x = -width / 2 + 3; x <= width / 2 - 3; x += 6) {
      for (let z = -depth / 2 + 3; z <= depth / 2 - 3; z += 6) {
        box(
          `ceil-${center.x}-${center.z}-${x}-${z}`,
          { width: 2.5, height: 0.05, depth: 0.55 },
          new BABYLON.Vector3(center.x + x, height - 0.12, center.z + z),
          M.white,
          false
        );
        const l = new BABYLON.PointLight(`pl-${center.x}-${center.z}-${x}-${z}`, new BABYLON.Vector3(center.x + x, height - 0.5, center.z + z), scene);
        l.intensity = 0.22;
        l.range = 8;
      }
    }
  }

  function roomShell(name, center, width = 20, depth = 18, height = 4.6) {
    box(`${name}-floor`, { width, height: 0.2, depth }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${name}-ceiling`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, height, center.z), M.ceiling);
    box(`${name}-north`, { width, height, depth: 0.3 }, new BABYLON.Vector3(center.x, height / 2, center.z + depth / 2), M.wall);
    box(`${name}-south`, { width, height, depth: 0.3 }, new BABYLON.Vector3(center.x, height / 2, center.z - depth / 2), M.wall);
    box(`${name}-west`, { width: 0.3, height, depth }, new BABYLON.Vector3(center.x - width / 2, height / 2, center.z), M.wallDark);
    box(`${name}-east`, { width: 0.3, height, depth }, new BABYLON.Vector3(center.x + width / 2, height / 2, center.z), M.wallDark);
    ceilingLights(center, width, depth, height);
  }

  function hubShell() {
    roomShell("hub", new BABYLON.Vector3(0, 0, 0), 26, 22, 4.7);
    box("hub-rug", { width: 7.5, height: 0.03, depth: 5.0 }, new BABYLON.Vector3(0, 0.13, 0.5), M.charcoal, false);
    box("hub-desk", { width: 4.8, height: 0.9, depth: 1.2 }, new BABYLON.Vector3(0, 0.55, 1.1), M.wood, false);
    box("hub-desk-top", { width: 5.1, height: 0.08, depth: 1.35 }, new BABYLON.Vector3(0, 1.02, 1.1), M.white, false);
    createPlant("plant-l", new BABYLON.Vector3(-10.5, 0, -7.8));
    createPlant("plant-r", new BABYLON.Vector3(10.5, 0, -7.8));
  }

  function createPlant(name, pos) {
    cylinder(`${name}-pot`, { height: 0.6, diameterTop: 0.7, diameterBottom: 0.9, tessellation: 20 }, new BABYLON.Vector3(pos.x, 0.4, pos.z), M.wood);
    cylinder(`${name}-stem`, { height: 0.95, diameter: 0.1, tessellation: 12 }, new BABYLON.Vector3(pos.x, 1.0, pos.z), M.plant);
    [[0,1.48,0],[.28,1.4,.08],[-.27,1.4,-.08],[.1,1.68,-.1]].forEach((o, i) => {
      const leaf = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf-${i}`, { diameter: 0.68, segments: 12 }, scene);
      leaf.position = new BABYLON.Vector3(pos.x + o[0], o[1], pos.z + o[2]);
      leaf.scaling.y = 1.35;
      leaf.material = M.plant;
    });
  }

  function createDoor(name, pos, rotY, accentMat, accentHex, title, subtitle, targetZone, locked = false) {
    const root = new BABYLON.TransformNode(`${name}-root`, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;

    box(`${name}-frame-l`, { width: 0.3, height: 3.15, depth: 0.55 }, new BABYLON.Vector3(-1.85, 1.58, 0), M.charcoal, false, root);
    box(`${name}-frame-r`, { width: 0.3, height: 3.15, depth: 0.55 }, new BABYLON.Vector3(1.85, 1.58, 0), M.charcoal, false, root);
    box(`${name}-frame-t`, { width: 4.0, height: 0.3, depth: 0.55 }, new BABYLON.Vector3(0, 3.0, 0), M.charcoal, false, root);

    strip(`${name}-accent`, new BABYLON.Vector3(0, 2.92, -0.3), { width: 3.15, height: 0.06, depth: 0.06 }, accentMat, root);

    const leftLeaf = box(`${name}-left`, { width: 1.55, height: 2.65, depth: 0.16 }, new BABYLON.Vector3(-0.78, 1.45, 0), locked ? M.red : M.metal, true, root);
    const rightLeaf = box(`${name}-right`, { width: 1.55, height: 2.65, depth: 0.16 }, new BABYLON.Vector3(0.78, 1.45, 0), locked ? M.red : M.metal, true, root);
    doorSign(`${name}-sign`, root, title, subtitle, accentHex);

    root.computeWorldMatrix(true);
    const inward = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, -1), root.getWorldMatrix()).normalize();
    const triggerPos = pos.add(inward.scale(1.5)).add(new BABYLON.Vector3(0, 1.0, 0));

    const entry = { name, root, leftLeaf, rightLeaf, targetZone, locked, triggerPos, accentMat, accentHex };
    doors[name] = entry;

    const action = () => activateDoor(entry);
    [leftLeaf, rightLeaf].forEach((leaf) => {
      leaf.isPickable = true;
      leaf.actionManager = new BABYLON.ActionManager(scene);
      leaf.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    });
    interactions.push({
      position: triggerPos,
      radius: 2.35,
      label: locked ? "E / клик — проверить доступ" : `E / клик — ${title}`,
      action
    });
    return entry;
  }

  function animateDoor(entry, callback) {
    if (transitionBusy) return;
    transitionBusy = true;
    entry.leftLeaf.checkCollisions = false;
    entry.rightLeaf.checkCollisions = false;
    const lx = entry.leftLeaf.position.x;
    const rx = entry.rightLeaf.position.x;
    const ease = new BABYLON.CubicEase();
    ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-l`, entry.leftLeaf, "position.x", 60, 28, lx, -1.65, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease);
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-r`, entry.rightLeaf, "position.x", 60, 28, rx, 1.65, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
      setTimeout(() => {
        callback();
        setTimeout(() => {
          entry.leftLeaf.position.x = lx;
          entry.rightLeaf.position.x = rx;
          entry.leftLeaf.checkCollisions = true;
          entry.rightLeaf.checkCollisions = true;
          transitionBusy = false;
        }, 260);
      }, 100);
    });
  }

  function activateDoor(entry) {
    if (entry.name === "portal" && completed.size !== data.totalZones) {
      showToast(`Переход в 2027 закрыт. Пройдено ${completed.size} / ${data.totalZones}.`, 3500);
      return;
    }
    animateDoor(entry, () => travel(entry.targetZone));
  }

  function createExitBeacon(center) {
    strip(`exit-beacon-${center.x}-${center.z}`, new BABYLON.Vector3(center.x - 8.6, 2.1, center.z), { width: 0.12, height: 3.4, depth: 0.12 }, M.green);
    strip(`exit-path-${center.x}-${center.z}`, new BABYLON.Vector3(center.x - 4.2, 0.14, center.z), { width: 8.0, height: 0.025, depth: 0.08 }, M.green);
  }

  function createActionConsole(name, position, accentMat, title, zoneId) {
    box(`${name}-base`, { width: 2.4, height: 0.8, depth: 1.2 }, new BABYLON.Vector3(position.x, 0.5, position.z), M.wood, false);
    const top = box(`${name}-top`, { width: 2.0, height: 0.1, depth: 1.0 }, new BABYLON.Vector3(position.x, 0.96, position.z), accentMat, false);
    strip(`${name}-glow`, new BABYLON.Vector3(position.x, 1.04, position.z - 0.35), { width: 1.4, height: 0.03, depth: 0.05 }, accentMat);
    const action = () => complete(zoneId);
    top.isPickable = true;
    top.actionManager = new BABYLON.ActionManager(scene);
    top.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    interactions.push({
      position: new BABYLON.Vector3(position.x, 1.0, position.z - 1.1),
      radius: 2.0,
      label: `E / клик — ${title}`,
      action
    });
  }

  function createBackDoor(name, center, target = "hub") {
    createExitBeacon(center);
    return createDoor(
      name,
      new BABYLON.Vector3(center.x - 9.82, 0, center.z),
      -Math.PI / 2,
      M.green,
      "#4ee6a8",
      "ВЫХОД",
      "Q — вернуться в HR HUB",
      target,
      false
    );
  }

  function buildRecruitment(center) {
    roomShell("recruitment", center);
    const z = center.z + 1.2;
    for (let i = 0; i < 6; i++) {
      const x = center.x - 5 + i * 2;
      cylinder(`rec-ped-${i}`, { height: 0.22, diameter: 1.2, tessellation: 28 }, new BABYLON.Vector3(x, 0.22, z), i === 5 ? M.teal : M.cyan);
      cylinder(`rec-marker-${i}`, { height: 1.0, diameter: 0.32, tessellation: 18 }, new BABYLON.Vector3(x, 0.82, z), i === 5 ? M.teal : M.charcoal);
      if (i < 5) strip(`rec-link-${i}`, new BABYLON.Vector3(x + 1, 0.14, z), { width: 1.05, height: 0.025, depth: 0.06 }, M.cyan);
    }
    createActionConsole("rec-action", new BABYLON.Vector3(center.x, 0, center.z - 4.4), M.cyan, "ПОДТВЕРДИТЬ РЕЗУЛЬТАТЫ", "recruitment");
    createBackDoor("rec-back", center);
  }

  function buildAI(center) {
    roomShell("ai", center, 20, 18, 4.8);
    const core = BABYLON.MeshBuilder.CreateSphere("ai-core", { diameter: 2.8, segments: 28 }, scene);
    core.position = new BABYLON.Vector3(center.x, 1.9, center.z + 1.0);
    core.material = M.glass;

    const ring = BABYLON.MeshBuilder.CreateTorus("ai-ring", { diameter: 4.0, thickness: 0.05, tessellation: 64 }, scene);
    ring.position.copyFrom(core.position);
    ring.rotation.x = Math.PI / 2.3;
    ring.material = M.teal;
    glow.addIncludedOnlyMesh(ring);

    [[-4.4, 2.7], [4.4, 2.7], [-4.4, -1.0], [4.4, -1.0]].forEach((o, i) => {
      cylinder(`ai-pod-${i}`, { height: 0.25, diameter: 1.6, tessellation: 28 }, new BABYLON.Vector3(center.x + o[0], 0.24, center.z + o[1]), M.teal);
      cylinder(`ai-node-${i}`, { height: 0.9, diameter: 0.35, tessellation: 18 }, new BABYLON.Vector3(center.x + o[0], 0.78, center.z + o[1]), M.charcoal);
    });

    createActionConsole("ai-action", new BABYLON.Vector3(center.x, 0, center.z - 4.4), M.teal, "АКТИВИРОВАТЬ AI CORE", "ai");
    createBackDoor("ai-back", center);

    scene.onBeforeRenderObservable.add(() => {
      ring.rotation.z += 0.0035;
      core.rotation.y += 0.002;
    });
  }

  function buildMentoring(center) {
    roomShell("mentoring", center);
    const mentorXs = [-5.4, -3.5, -1.6, 0.3];
    const newcomerXs = [2.6, 4.3, 6.0, 2.6, 4.3, 6.0, 2.6, 4.3];
    const newcomers = [];

    mentorXs.forEach((dx, i) => {
      const z = center.z + 1.7 - (i % 2) * 3.2;
      cylinder(`mentor-body-${i}`, { height: 0.95, diameter: 0.38, tessellation: 16 }, new BABYLON.Vector3(center.x + dx, 0.76, z), M.amber);
      const h = BABYLON.MeshBuilder.CreateSphere(`mentor-head-${i}`, { diameter: 0.45, segments: 14 }, scene);
      h.position = new BABYLON.Vector3(center.x + dx, 1.45, z);
      h.material = M.amber;
    });

    newcomerXs.forEach((dx, i) => {
      const row = Math.floor(i / 3);
      const z = center.z + 2.2 - row * 2.1;
      const p = new BABYLON.Vector3(center.x + dx, 0.76, z);
      cylinder(`new-body-${i}`, { height: 0.95, diameter: 0.36, tessellation: 16 }, p, M.white);
      const h = BABYLON.MeshBuilder.CreateSphere(`new-head-${i}`, { diameter: 0.43, segments: 14 }, scene);
      h.position = new BABYLON.Vector3(p.x, 1.45, p.z);
      h.material = M.white;
      newcomers.push(new BABYLON.Vector3(p.x, 1.1, p.z));
    });

    for (let i = 0; i < 4; i++) {
      const from = new BABYLON.Vector3(center.x + mentorXs[i], 1.1, center.z + 1.7 - (i % 2) * 3.2);
      const to = newcomers[i * 2];
      const line = BABYLON.MeshBuilder.CreateLines(`mentor-link-${i}`, { points: [from, to] }, scene);
      line.color = BABYLON.Color3.FromHexString("#d99b43");
      line.alpha = 0.65;
    }

    createActionConsole("mentor-action", new BABYLON.Vector3(center.x, 0, center.z - 4.4), M.amber, "ЗАФИКСИРОВАТЬ СЕТЬ", "mentoring");
    createBackDoor("mentor-back", center);
  }

  function buildFuture(center) {
    roomShell("future", center, 20, 18, 4.8);
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI * 2 * i / 5 - Math.PI / 2;
      const x = center.x + Math.cos(angle) * 4.8;
      const z = center.z + Math.sin(angle) * 3.5;
      cylinder(`future-ped-${i}`, { height: 0.22, diameter: 1.6, tessellation: 28 }, new BABYLON.Vector3(x, 0.22, z), M.violet);
      cylinder(`future-node-${i}`, { height: 1.0, diameter: 0.35, tessellation: 18 }, new BABYLON.Vector3(x, 0.82, z), M.charcoal);
    }
    createBackDoor("future-back", center);
  }

  const zoneMap = {
    hub: { pos: new BABYLON.Vector3(0, 1.72, -6.8), target: new BABYLON.Vector3(0, 1.6, 1.0) },
    recruitment: { pos: new BABYLON.Vector3(-42, 1.72, -5.8), target: new BABYLON.Vector3(-42, 1.3, 1.0) },
    ai: { pos: new BABYLON.Vector3(0, 1.72, 36.2), target: new BABYLON.Vector3(0, 1.8, 42.5) },
    mentoring: { pos: new BABYLON.Vector3(42, 1.72, -5.8), target: new BABYLON.Vector3(42, 1.3, 1.0) },
    future: { pos: new BABYLON.Vector3(0, 1.72, -47.8), target: new BABYLON.Vector3(0, 1.3, -41.5) }
  };

  hubShell();
  createDoor("recruitment", new BABYLON.Vector3(-12.85, 0, 0), -Math.PI / 2, M.cyan, "#3bcaf2", "01 · ПРИЁМ", "цифровой маршрут", "recruitment");
  createDoor("ai", new BABYLON.Vector3(0, 0, 10.85), 0, M.teal, "#4bd8ae", "02 · AI LAB", "ИИ и эффект", "ai");
  createDoor("mentoring", new BABYLON.Vector3(12.85, 0, 0), Math.PI / 2, M.amber, "#e7ad55", "03 · НАСТАВНИЧЕСТВО", "адаптация", "mentoring");
  createDoor("portal", new BABYLON.Vector3(0, 0, -10.85), Math.PI, M.violet, "#9b83e8", "2027 · ЗАКРЫТО", "пройдите 0 / 3", "future", true);

  buildRecruitment(new BABYLON.Vector3(-42, 0, 0));
  buildAI(new BABYLON.Vector3(0, 0, 42));
  buildMentoring(new BABYLON.Vector3(42, 0, 0));
  buildFuture(new BABYLON.Vector3(0, 0, -42));

  function showToast(text, ms = 4000) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function refreshPortal() {
    const p = doors.portal;
    if (!p) return;
    const open = completed.size === data.totalZones;
    p.locked = !open;
    p.leftLeaf.material = open ? M.violet : M.red;
    p.rightLeaf.material = open ? M.violet : M.red;
  }

  function updateGuide() {
    document.querySelectorAll(".guide-row").forEach((row) => {
      const id = row.dataset.zone;
      const done = completed.has(id);
      row.classList.toggle("complete", done);
      const mark = row.querySelector("i");
      if (mark) mark.textContent = done ? "✓" : "○";
    });
    progressText.textContent = `${completed.size} / ${data.totalZones}`;
    refreshPortal();
  }

  function zoneProcess(id) {
    if (id === "recruitment") return "Кандидат → Заявка → Документы → Проверка → Оформление → Сотрудник";
    if (id === "ai") return "Задача → AI-агент → Автоматизация → Измеримый эффект";
    if (id === "mentoring") return "Новичок → Наставник → Адаптация → Удержание";
    if (id === "future") return "Планы 2027 будут добавлены после утверждения итогов 2026";
    return "";
  }

  function updateRoomPanel(id) {
    if (id === "hub") {
      roomPanel.classList.add("hidden");
      return;
    }
    roomPanel.classList.remove("hidden");
    const zone = data.zones[id];
    roomPanelTitle.textContent = zone?.name || id.toUpperCase();
    roomPanelSubtitle.textContent = zone?.intro || zone?.subtitle || "";
    roomPanelProcess.textContent = zoneProcess(id);
    roomPanelMetrics.innerHTML = "";
    (zone?.metrics || []).slice(0, 4).forEach(([value, label]) => {
      const card = document.createElement("div");
      card.className = "room-metric";
      card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
      roomPanelMetrics.appendChild(card);
    });
  }

  function travel(id) {
    currentZone = id;
    fade.classList.add("active");
    setTimeout(() => {
      camera.position.copyFrom(zoneMap[id].pos);
      camera.setTarget(zoneMap[id].target);
      zoneName.textContent = id === "hub" ? "HR HUB · ИТОГИ 2026" : data.zones[id].name;
      hubGuide.style.display = id === "hub" ? "block" : "none";
      updateRoomPanel(id);
      fade.classList.remove("active");
      if (id === "hub") {
        showToast("Вы в центральном HR HUB. Выберите направление.", 3600);
      } else {
        showToast("Вы в проектной комнате. Для выхода в любой момент нажмите Q.", 4200);
      }
    }, 240);
  }

  function complete(id) {
    if (!completed.has(id)) {
      completed.add(id);
      updateGuide();
      showToast(`${data.zones[id].name}: результаты зафиксированы. Нажмите Q, чтобы вернуться в HR HUB.`, 4600);
    } else {
      showToast(`${data.zones[id].name}: зона уже пройдена. Q — выход в HR HUB.`, 3200);
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyE" && currentInteraction) currentInteraction.action();
    if (e.code === "KeyQ" && currentZone !== "hub") travel("hub");
  });

  scene.onBeforeRenderObservable.add(() => {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const item of interactions) {
      const d = BABYLON.Vector3.Distance(camera.position, item.position);
      if (d < item.radius && d < nearestDistance) {
        nearest = item;
        nearestDistance = d;
      }
    }
    currentInteraction = nearest;
    if (nearest) {
      prompt.textContent = nearest.label;
      prompt.classList.remove("hidden");
    } else {
      prompt.classList.add("hidden");
    }
  });

  canvas.addEventListener("click", () => {
    if (!document.pointerLockElement && boot.classList.contains("hidden")) canvas.requestPointerLock?.();
  });

  const bootLines = [
    "HR HUB ............... READY",
    "PROJECT ZONES ........ 3 FOUND",
    "RESULTS 2026 ......... WAITING",
    "PORTAL 2027 .......... LOCKED",
    "",
    "ЦК БОРУП · ИТОГИ 2026"
  ];
  let bootIndex = 0;
  const timer = setInterval(() => {
    bootLog.textContent += `${bootLines[bootIndex]}\n`;
    bootIndex += 1;
    if (bootIndex >= bootLines.length) {
      clearInterval(timer);
      enterButton.disabled = false;
    }
  }, 210);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    camera.position.copyFrom(zoneMap.hub.pos);
    camera.setTarget(zoneMap.hub.target);
    updateRoomPanel("hub");
    canvas.focus();
    setTimeout(() => {
      canvas.requestPointerLock?.();
      showToast("HR HUB готов. Двери: Приём, AI LAB и Наставничество.", 4200);
    }, 200);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  if (scene.createDefaultXRExperienceAsync) {
    scene.createDefaultXRExperienceAsync({
      floorMeshes: scene.meshes.filter((m) => m.name.endsWith("-floor"))
    }).catch(() => {});
  }
})();