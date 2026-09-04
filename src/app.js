(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("renderCanvas");
  const boot = $("boot");
  const bootLog = $("bootLog");
  const enterButton = $("enterButton");
  const hud = $("hud");
  const hubGuide = $("hubGuide");
  const zoneName = $("zoneName");
  const progressText = $("progressText");
  const prompt = $("interactionPrompt");
  const toast = $("toast");
  const fade = $("fade");
  const data = window.HR2026;

  const completed = new Set();
  const interactions = [];
  const doorRegistry = {};
  let currentInteraction = null;
  let toastTimer = null;
  let transitionBusy = false;

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.018, 0.024, 0.028, 1);
  scene.gravity = new BABYLON.Vector3(0, -0.32, 0);
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0035;
  scene.fogColor = new BABYLON.Color3(0.035, 0.045, 0.05);

  const camera = new BABYLON.UniversalCamera("player", new BABYLON.Vector3(0, 1.72, -6.8), scene);
  camera.speed = 0.19;
  camera.angularSensibility = 3600;
  camera.fov = 0.9;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.42, 0.86, 0.42);
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];
  camera.attachControl(canvas, true);

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.72;
  hemi.diffuse = new BABYLON.Color3(0.83, 0.9, 0.94);
  hemi.groundColor = new BABYLON.Color3(0.08, 0.1, 0.11);

  const makeMat = (name, hex, emissive = 0, alpha = 1) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.06, 0.07, 0.075);
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  };

  const M = {
    wall: makeMat("wall", "#2a3338"),
    wall2: makeMat("wall2", "#20282d"),
    floor: makeMat("floor", "#11171b"),
    floorLine: makeMat("floorLine", "#48616d", 0.12),
    ceiling: makeMat("ceiling", "#171d21"),
    metal: makeMat("metal", "#697981"),
    dark: makeMat("dark", "#0a0f12"),
    white: makeMat("white", "#e4ebee", 0.08),
    cyan: makeMat("cyan", "#35c8ff", 0.35),
    teal: makeMat("teal", "#48dcb1", 0.32),
    amber: makeMat("amber", "#efb35c", 0.28),
    violet: makeMat("violet", "#a982ff", 0.30),
    red: makeMat("red", "#9b4b5d", 0.18),
    wood: makeMat("wood", "#665448"),
    plant: makeMat("plant", "#4c765c")
  };

  function box(name, size, position, material, collisions = true, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = collisions;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function cylinder(name, options, position, material) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    return mesh;
  }

  function makeTextMaterial(name, title, subtitle, accent = "#7bdcff", bg = "rgba(8,13,16,.94)") {
    const tex = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1400, height: 420 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 1400, 420);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1400, 420);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 1392, 412);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5f8f9";
    ctx.font = "700 86px Arial";
    ctx.fillText(title, 700, subtitle ? 168 : 210, 1280);
    if (subtitle) {
      ctx.fillStyle = "#aabcc4";
      ctx.font = "500 42px Arial";
      ctx.fillText(subtitle, 700, 288, 1260);
    }
    tex.update();
    const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.backFaceCulling = false;
    return mat;
  }

  function wallSign(name, title, subtitle, pos, rotY, width = 5.2, height = 1.55, accent = "#7bdcff") {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    plane.position.copyFrom(pos);
    plane.rotation.y = rotY;
    plane.material = makeTextMaterial(name, title, subtitle, accent);
    plane.isPickable = false;
    return plane;
  }

  function floorTileGrid(center, width, depth) {
    const spacing = 2;
    for (let x = -width / 2 + spacing; x < width / 2; x += spacing) {
      box(`grid-x-${center.x}-${x}`, { width: 0.018, height: 0.012, depth: depth - 0.5 }, new BABYLON.Vector3(center.x + x, 0.101, center.z), M.floorLine, false);
    }
    for (let z = -depth / 2 + spacing; z < depth / 2; z += spacing) {
      box(`grid-z-${center.z}-${z}`, { width: width - 0.5, height: 0.012, depth: 0.018 }, new BABYLON.Vector3(center.x, 0.101, center.z + z), M.floorLine, false);
    }
  }

  function ceilingPanels(center, width, depth, height) {
    for (let x = -width / 2 + 3; x <= width / 2 - 3; x += 6) {
      for (let z = -depth / 2 + 3; z <= depth / 2 - 3; z += 6) {
        box(`ceil-${center.x}-${center.z}-${x}-${z}`, { width: 2.7, height: 0.05, depth: 0.8 }, new BABYLON.Vector3(center.x + x, height - 0.11, center.z + z), M.white, false);
      }
    }
  }

  function buildRoomShell(name, center, width, depth, height = 4.2, material = M.wall) {
    box(`${name}-floor`, { width, height: 0.2, depth }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${name}-ceiling`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, height, center.z), M.ceiling);
    box(`${name}-north`, { width, height, depth: 0.3 }, new BABYLON.Vector3(center.x, height / 2, center.z + depth / 2), material);
    box(`${name}-south`, { width, height, depth: 0.3 }, new BABYLON.Vector3(center.x, height / 2, center.z - depth / 2), material);
    box(`${name}-west`, { width: 0.3, height, depth }, new BABYLON.Vector3(center.x - width / 2, height / 2, center.z), M.wall2);
    box(`${name}-east`, { width: 0.3, height, depth }, new BABYLON.Vector3(center.x + width / 2, height / 2, center.z), M.wall2);
    floorTileGrid(center, width, depth);
    ceilingPanels(center, width, depth, height);
    const light = new BABYLON.PointLight(`${name}-light`, new BABYLON.Vector3(center.x, height - 0.65, center.z), scene);
    light.intensity = 0.55;
    light.range = 22;
    light.diffuse = new BABYLON.Color3(0.85, 0.92, 0.95);
  }

  function buildHubShell() {
    const center = new BABYLON.Vector3(0, 0, 0);
    const width = 24;
    const depth = 20;
    const height = 4.4;
    const doorW = 3.4;
    const doorH = 2.9;
    const t = 0.34;
    box("hub-floor", { width, height: 0.2, depth }, new BABYLON.Vector3(0, 0, 0), M.floor);
    box("hub-ceiling", { width, height: 0.18, depth }, new BABYLON.Vector3(0, height, 0), M.ceiling);
    floorTileGrid(center, width, depth);
    ceilingPanels(center, width, depth, height);

    const horizontalWall = (prefix, z, material) => {
      const sideW = (width - doorW) / 2;
      box(`${prefix}-left`, { width: sideW, height, depth: t }, new BABYLON.Vector3(-doorW / 2 - sideW / 2, height / 2, z), material);
      box(`${prefix}-right`, { width: sideW, height, depth: t }, new BABYLON.Vector3(doorW / 2 + sideW / 2, height / 2, z), material);
      box(`${prefix}-lintel`, { width: doorW, height: height - doorH, depth: t }, new BABYLON.Vector3(0, doorH + (height - doorH) / 2, z), material);
    };
    const verticalWall = (prefix, x, material) => {
      const sideD = (depth - doorW) / 2;
      box(`${prefix}-front`, { width: t, height, depth: sideD }, new BABYLON.Vector3(x, height / 2, -doorW / 2 - sideD / 2), material);
      box(`${prefix}-back`, { width: t, height, depth: sideD }, new BABYLON.Vector3(x, height / 2, doorW / 2 + sideD / 2), material);
      box(`${prefix}-lintel`, { width: t, height: height - doorH, depth: doorW }, new BABYLON.Vector3(x, doorH + (height - doorH) / 2, 0), material);
    };
    horizontalWall("hub-north", depth / 2, M.wall);
    horizontalWall("hub-south", -depth / 2, M.wall);
    verticalWall("hub-west", -width / 2, M.wall2);
    verticalWall("hub-east", width / 2, M.wall2);

    [[-7.3,-4],[7.3,-4],[-7.3,4],[7.3,4]].forEach((p, i) => {
      const light = new BABYLON.PointLight(`hub-point-${i}`, new BABYLON.Vector3(p[0], 3.65, p[1]), scene);
      light.intensity = 0.42;
      light.range = 11;
      light.diffuse = new BABYLON.Color3(0.82, 0.9, 0.94);
    });
  }

  function createPlant(name, pos) {
    cylinder(`${name}-pot`, { height: 0.65, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 24 }, new BABYLON.Vector3(pos.x, 0.43, pos.z), M.wood);
    cylinder(`${name}-stem`, { height: 1.05, diameter: 0.12, tessellation: 12 }, new BABYLON.Vector3(pos.x, 1.05, pos.z), M.plant);
    [[0,1.55,0],[.35,1.45,.1],[-.3,1.42,-.1],[.15,1.75,-.15]].forEach((o, i) => {
      const leaf = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf-${i}`, { diameter: 0.72, segments: 12 }, scene);
      leaf.position = new BABYLON.Vector3(pos.x + o[0], o[1], pos.z + o[2]);
      leaf.scaling.y = 1.35;
      leaf.material = M.plant;
    });
  }

  function createReception() {
    box("reception-main", { width: 5.2, height: 1.0, depth: 1.3 }, new BABYLON.Vector3(0, 0.6, 1.0), M.wood);
    box("reception-top", { width: 5.5, height: 0.12, depth: 1.5 }, new BABYLON.Vector3(0, 1.15, 1.0), M.white, false);
    wallSign("reception-sign", "HR 2026", "ЦЕНТРАЛЬНЫЙ ХАБ", new BABYLON.Vector3(0, 1.95, 1.72), Math.PI, 3.8, 1.0, "#5fcfff");
  }

  function createBench(name, pos, rotY = 0) {
    const root = new BABYLON.TransformNode(name, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;
    box(`${name}-seat`, { width: 2.7, height: 0.18, depth: 0.75 }, new BABYLON.Vector3(0, 0.62, 0), M.wood, false, root);
    box(`${name}-leg1`, { width: 0.18, height: 0.55, depth: 0.55 }, new BABYLON.Vector3(-1.05, 0.31, 0), M.metal, false, root);
    box(`${name}-leg2`, { width: 0.18, height: 0.55, depth: 0.55 }, new BABYLON.Vector3(1.05, 0.31, 0), M.metal, false, root);
  }

  function createAlcove(name, pos, rotY, accentMat) {
    const root = new BABYLON.TransformNode(`${name}-alcove`, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;
    box(`${name}-alcove-floor`, { width: 3.3, height: 0.1, depth: 3.1 }, new BABYLON.Vector3(0, 0.02, -1.4), M.floor, false, root);
    box(`${name}-alcove-ceiling`, { width: 3.3, height: 0.1, depth: 3.1 }, new BABYLON.Vector3(0, 3.0, -1.4), M.ceiling, false, root);
    box(`${name}-alcove-left`, { width: 0.15, height: 3, depth: 3.1 }, new BABYLON.Vector3(-1.58, 1.5, -1.4), M.wall2, false, root);
    box(`${name}-alcove-right`, { width: 0.15, height: 3, depth: 3.1 }, new BABYLON.Vector3(1.58, 1.5, -1.4), M.wall2, false, root);
    box(`${name}-alcove-light`, { width: 1.8, height: 0.06, depth: 0.25 }, new BABYLON.Vector3(0, 2.88, -1.0), accentMat, false, root);
  }

  function createDoor(name, pos, rotY, accentMat, accentHex, title, subtitle, targetZone, locked = false) {
    const root = new BABYLON.TransformNode(`${name}-root`, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;
    box(`${name}-jamb-l`, { width: 0.24, height: 3.0, depth: 0.34 }, new BABYLON.Vector3(-1.55, 1.5, 0), M.metal, false, root);
    box(`${name}-jamb-r`, { width: 0.24, height: 3.0, depth: 0.34 }, new BABYLON.Vector3(1.55, 1.5, 0), M.metal, false, root);
    box(`${name}-header`, { width: 3.34, height: 0.24, depth: 0.34 }, new BABYLON.Vector3(0, 2.89, 0), M.metal, false, root);
    box(`${name}-accent-l`, { width: 0.055, height: 2.72, depth: 0.38 }, new BABYLON.Vector3(-1.38, 1.45, -0.02), accentMat, false, root);
    box(`${name}-accent-r`, { width: 0.055, height: 2.72, depth: 0.38 }, new BABYLON.Vector3(1.38, 1.45, -0.02), accentMat, false, root);
    const panel = box(`${name}-panel`, { width: 2.72, height: 2.62, depth: 0.18 }, new BABYLON.Vector3(0, 1.43, 0.03), locked ? M.red : M.dark, true, root);
    panel.isPickable = true;
    panel.actionManager = new BABYLON.ActionManager(scene);
    const sign = BABYLON.MeshBuilder.CreatePlane(`${name}-sign`, { width: 3.5, height: 0.9, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    sign.position = new BABYLON.Vector3(0, 3.48, 0.05);
    sign.parent = root;
    sign.material = makeTextMaterial(`${name}-sign`, title, subtitle, accentHex, "rgba(8,13,16,.98)");
    sign.isPickable = false;
    createAlcove(name, pos, rotY, accentMat);
    const inward = new BABYLON.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    const triggerPos = pos.add(inward.scale(1.35)).add(new BABYLON.Vector3(0, 1.0, 0));
    const entry = { name, root, panel, targetZone, locked, title, triggerPos, open: false, accentMat, accentHex, sign };
    doorRegistry[name] = entry;
    const activate = () => activateDoor(entry);
    panel.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, activate));
    interactions.push({ position: triggerPos, radius: 2.1, label: locked ? "E / клик — проверить доступ" : `E / клик — войти: ${title}`, action: activate });
    return entry;
  }

  function refreshPortalSign() {
    const p = doorRegistry.portal;
    if (!p) return;
    const isOpen = completed.size === data.totalZones;
    p.locked = !isOpen;
    p.panel.material = isOpen ? M.violet : M.red;
    p.sign.material = makeTextMaterial("portal-sign-live", isOpen ? "2027 · ДОСТУП ОТКРЫТ" : "2027 · ЗАКРЫТО", isOpen ? "E / клик — перейти" : `Сначала пройдите ${data.totalZones} / ${data.totalZones}`, isOpen ? "#c5b2ff" : "#c06a7d", "rgba(8,13,16,.98)");
  }

  function animateDoor(entry, callback) {
    if (transitionBusy) return;
    transitionBusy = true;
    entry.panel.checkCollisions = false;
    const startY = entry.panel.position.y;
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-open`, entry.panel, "position.y", 60, 30, startY, 4.0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, new BABYLON.CubicEase(), () => {
      entry.open = true;
      setTimeout(() => {
        callback();
        setTimeout(() => {
          entry.panel.position.y = startY;
          entry.panel.checkCollisions = true;
          entry.open = false;
          transitionBusy = false;
        }, 320);
      }, 140);
    });
  }

  function activateDoor(entry) {
    if (entry.name === "portal" && completed.size !== data.totalZones) {
      showToast(`Портал 2027 пока закрыт. Пройдено: ${completed.size} / ${data.totalZones}.`, 3800);
      return;
    }
    animateDoor(entry, () => travel(entry.targetZone));
  }

  function createActionConsole(name, pos, accentMat, accentHex, title, zoneId) {
    box(`${name}-base`, { width: 2.4, height: 0.9, depth: 1.2 }, new BABYLON.Vector3(pos.x, 0.52, pos.z), M.wood, false);
    const top = box(`${name}-top`, { width: 2.15, height: 0.12, depth: 1.05 }, new BABYLON.Vector3(pos.x, 1.03, pos.z), accentMat, false);
    const action = () => complete(zoneId);
    top.isPickable = true;
    top.actionManager = new BABYLON.ActionManager(scene);
    top.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    wallSign(`${name}-sign`, title, "E / клик — завершить зону", new BABYLON.Vector3(pos.x, 1.82, pos.z + 0.12), Math.PI, 3.1, 0.85, accentHex);
    interactions.push({ position: new BABYLON.Vector3(pos.x, 1.0, pos.z - 1.0), radius: 2.0, label: `E / клик — ${title}`, action });
  }

  function createMetricWall(prefix, metrics, wallZ, rotY, centerX = 0, accent = "#7bdcff") {
    const xs = [-4.8, -1.6, 1.6, 4.8];
    metrics.slice(0, 4).forEach((m, i) => wallSign(`${prefix}-${i}`, m[0], m[1], new BABYLON.Vector3(centerX + xs[i], 2.2, wallZ), rotY, 2.7, 1.35, accent));
  }

  function createBackDoor(name, pos, rotY, title, target = "hub") {
    return createDoor(name, pos, rotY, M.metal, "#8da4af", title, "вернуться в центральный зал", target, false);
  }

  const zones = {
    hub: { pos: new BABYLON.Vector3(0, 1.72, -6.8), target: new BABYLON.Vector3(0, 1.7, 1.4) },
    recruitment: { pos: new BABYLON.Vector3(-42, 1.72, -5.8), target: new BABYLON.Vector3(-42, 1.65, 1.8) },
    ai: { pos: new BABYLON.Vector3(0, 1.72, 38.2), target: new BABYLON.Vector3(0, 1.8, 45) },
    mentoring: { pos: new BABYLON.Vector3(42, 1.72, -5.8), target: new BABYLON.Vector3(42, 1.65, 1.8) },
    future: { pos: new BABYLON.Vector3(0, 1.72, -48.5), target: new BABYLON.Vector3(0, 1.8, -42) }
  };

  buildHubShell();
  createReception();
  createPlant("hub-plant-1", new BABYLON.Vector3(-9.2, 0, -6.8));
  createPlant("hub-plant-2", new BABYLON.Vector3(9.2, 0, -6.8));
  createPlant("hub-plant-3", new BABYLON.Vector3(-9.2, 0, 6.8));
  createPlant("hub-plant-4", new BABYLON.Vector3(9.2, 0, 6.8));
  createBench("hub-bench-left", new BABYLON.Vector3(-6.4, 0, 5.7), Math.PI / 2);
  createBench("hub-bench-right", new BABYLON.Vector3(6.4, 0, 5.7), -Math.PI / 2);
  wallSign("hub-directory", "КАРТА ПРОЕКТОВ", "01 ПРИЁМ   ·   02 AI LAB   ·   03 НАСТАВНИЧЕСТВО", new BABYLON.Vector3(0, 2.8, 9.78), Math.PI, 8.8, 1.45, "#6cd8ff");
  wallSign("hub-side-left", "01 · ПРИЁМ", "цифровой маршрут сотрудника", new BABYLON.Vector3(-11.78, 2.8, 0), Math.PI / 2, 5.0, 1.35, "#35c8ff");
  wallSign("hub-side-right", "03 · НАСТАВНИЧЕСТВО", "адаптация и развитие", new BABYLON.Vector3(11.78, 2.8, 0), -Math.PI / 2, 5.0, 1.35, "#efb35c");
  createDoor("recruitment", new BABYLON.Vector3(-12.0, 0, 0), Math.PI / 2, M.cyan, "#35c8ff", "01 · ПРИЁМ", "EMPLOYEE ENTRY", "recruitment");
  createDoor("ai", new BABYLON.Vector3(0, 0, 10.0), Math.PI, M.teal, "#48dcb1", "02 · AI LAB", "DIGITAL HR", "ai");
  createDoor("mentoring", new BABYLON.Vector3(12.0, 0, 0), -Math.PI / 2, M.amber, "#efb35c", "03 · НАСТАВНИЧЕСТВО", "PEOPLE DEVELOPMENT", "mentoring");
  createDoor("portal", new BABYLON.Vector3(0, 0, -10.0), 0, M.violet, "#a982ff", "2027 · ЗАКРЫТО", `Сначала пройдите ${data.totalZones} / ${data.totalZones}`, "future", true);

  buildRoomShell("recruitment-room", new BABYLON.Vector3(-42, 0, 0), 20, 18, 4.3, M.wall);
  wallSign("rec-title", "ПРОЕКТ 01 · ПРИЁМ", "Цифровой путь: кандидат → сотрудник", new BABYLON.Vector3(-42, 2.9, 8.82), Math.PI, 7.5, 1.45, "#35c8ff");
  ["КАНДИДАТ","ЗАЯВКА","ДОКУМЕНТЫ","ПРОВЕРКА","ОФОРМЛЕНИЕ","СОТРУДНИК"].forEach((s, i) => {
    const x = -47 + i * 2.0;
    box(`rec-stage-${i}`, { width: 1.45, height: 0.18, depth: 1.45 }, new BABYLON.Vector3(x, 0.2, 1.4), i === 5 ? M.teal : M.cyan, false);
    cylinder(`rec-marker-${i}`, { height: 1.4, diameter: 0.5, tessellation: 18 }, new BABYLON.Vector3(x, 0.95, 1.4), i === 5 ? M.teal : M.metal);
    wallSign(`rec-stage-sign-${i}`, s, `ЭТАП ${String(i + 1).padStart(2, "0")}`, new BABYLON.Vector3(x, 2.05, 1.4), Math.PI, 1.8, 0.8, i === 5 ? "#48dcb1" : "#35c8ff");
  });
  createMetricWall("rec-metric", data.zones.recruitment.metrics, -8.82, 0, -42, "#35c8ff");
  createActionConsole("rec-console", new BABYLON.Vector3(-42, 0, -4.8), M.cyan, "#35c8ff", "ПОДТВЕРДИТЬ РЕЗУЛЬТАТЫ", "recruitment");
  createBackDoor("rec-back", new BABYLON.Vector3(-51.85, 0, 0), Math.PI / 2, "← HR HUB");

  buildRoomShell("ai-room", new BABYLON.Vector3(0, 0, 45), 20, 18, 4.6, M.wall2);
  wallSign("ai-title", "ПРОЕКТ 02 · AI LAB", "ИИ-решения, агенты и измеримый эффект", new BABYLON.Vector3(0, 3.05, 53.82), Math.PI, 7.8, 1.45, "#48dcb1");
  const core = BABYLON.MeshBuilder.CreateSphere("ai-core", { diameter: 3.5, segments: 28 }, scene);
  core.position = new BABYLON.Vector3(0, 2.0, 45);
  core.material = M.teal;
  const coreRing = BABYLON.MeshBuilder.CreateTorus("ai-core-ring", { diameter: 5.0, thickness: 0.08, tessellation: 64 }, scene);
  coreRing.position = new BABYLON.Vector3(0, 2.0, 45);
  coreRing.rotation.x = Math.PI / 2;
  coreRing.material = M.cyan;
  [[-5,41],[5,41],[-5,49],[5,49]].forEach((p, i) => {
    box(`agent-desk-${i}`, { width: 2.3, height: 0.9, depth: 1.4 }, new BABYLON.Vector3(p[0], 0.55, p[1]), M.wood, false);
    wallSign(`agent-sign-${i}`, `AI AGENT 0${i + 1}`, "данные 2026 будут добавлены", new BABYLON.Vector3(p[0], 1.7, p[1]), 0, 3.1, 0.88, "#48dcb1");
  });
  createMetricWall("ai-metric", data.zones.ai.metrics, 36.18, 0, 0, "#48dcb1");
  createActionConsole("ai-console", new BABYLON.Vector3(0, 0, 39.7), M.teal, "#48dcb1", "АКТИВИРОВАТЬ AI CORE", "ai");
  createBackDoor("ai-back", new BABYLON.Vector3(-9.85, 0, 45), Math.PI / 2, "← HR HUB");

  buildRoomShell("mentor-room", new BABYLON.Vector3(42, 0, 0), 20, 18, 4.3, M.wall);
  wallSign("mentor-title", "ПРОЕКТ 03 · НАСТАВНИЧЕСТВО", "Новички, наставники и сеть адаптации", new BABYLON.Vector3(42, 2.9, 8.82), Math.PI, 8.4, 1.45, "#efb35c");
  const people = [];
  for (let i = 0; i < 14; i++) {
    const x = 36.8 + (i % 7) * 1.75;
    const z = 0.5 + Math.floor(i / 7) * 3.2;
    const color = i < 5 ? M.amber : M.white;
    cylinder(`mentor-body-${i}`, { height: 1.0, diameter: 0.4, tessellation: 16 }, new BABYLON.Vector3(x, 0.76, z), color);
    const head = BABYLON.MeshBuilder.CreateSphere(`mentor-head-${i}`, { diameter: 0.46, segments: 12 }, scene);
    head.position = new BABYLON.Vector3(x, 1.52, z);
    head.material = color;
    people.push(new BABYLON.Vector3(x, 1.1, z));
  }
  for (let i = 0; i < 5; i++) {
    const path = BABYLON.MeshBuilder.CreateLines(`mentor-link-${i}`, { points: [people[i], people[5 + (i * 2) % 9]] }, scene);
    path.color = BABYLON.Color3.FromHexString("#efb35c");
  }
  createMetricWall("mentor-metric", data.zones.mentoring.metrics, -8.82, 0, 42, "#efb35c");
  createActionConsole("mentor-console", new BABYLON.Vector3(42, 0, -4.8), M.amber, "#efb35c", "ЗАФИКСИРОВАТЬ СЕТЬ", "mentoring");
  createBackDoor("mentor-back", new BABYLON.Vector3(32.15, 0, 0), Math.PI / 2, "← HR HUB");

  buildRoomShell("future-room", new BABYLON.Vector3(0, 0, -42), 20, 18, 4.6, M.wall2);
  wallSign("future-title", "2027 · NEXT CHAPTER", "Планы будут заполнены после утверждения итогов 2026", new BABYLON.Vector3(0, 3.05, -33.18), 0, 8.4, 1.45, "#a982ff");
  ["AI","АВТОМАТИЗАЦИЯ","ЛЮДИ","ЭФФЕКТИВНОСТЬ","КЛИЕНТСКИЙ СЕРВИС"].forEach((s, i) => {
    const x = -6 + i * 3;
    box(`future-ped-${i}`, { width: 2.2, height: 0.8, depth: 2.2 }, new BABYLON.Vector3(x, 0.5, -42), M.dark, false);
    wallSign(`future-sign-${i}`, `0${i + 1} · ${s}`, "план 2027", new BABYLON.Vector3(x, 1.9, -42), 0, 2.7, 0.95, "#a982ff");
  });
  createBackDoor("future-back", new BABYLON.Vector3(-9.85, 0, -42), Math.PI / 2, "← HR HUB");

  function showToast(text, ms = 3600) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function updateGuide() {
    document.querySelectorAll(".guide-row").forEach((row) => {
      const id = row.dataset.zone;
      const done = completed.has(id);
      row.classList.toggle("complete", done);
      row.querySelector("i").textContent = done ? "✓" : "○";
    });
    progressText.textContent = `${completed.size} / ${data.totalZones}`;
    refreshPortalSign();
    if (completed.size === data.totalZones) showToast("Все пилотные зоны пройдены. Дверь 2027 разблокирована.", 4500);
  }

  function complete(id) {
    if (completed.has(id)) {
      showToast(`${data.zones[id].name}: зона уже пройдена.`, 2600);
      return;
    }
    completed.add(id);
    updateGuide();
    showToast(`${data.zones[id].name}: результаты отмечены. Вернитесь в HR HUB.`, 3800);
  }

  function travel(id) {
    fade.classList.add("active");
    setTimeout(() => {
      camera.position.copyFrom(zones[id].pos);
      camera.setTarget(zones[id].target);
      zoneName.textContent = id === "hub" ? "HR HUB — ЦЕНТРАЛЬНЫЙ ЗАЛ" : data.zones[id].name;
      hubGuide.style.display = id === "hub" ? "block" : "none";
      fade.classList.remove("active");
      if (id === "hub") showToast("Центральный зал. Выберите дверь проекта: Приём, AI LAB или Наставничество.", 4200);
      else if (data.zones[id]?.intro) showToast(data.zones[id].intro, 3600);
      else if (id === "future") showToast("Переход в 2027 открыт. Здесь появятся утверждённые планы на 2027 год.", 4200);
    }, 260);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyE" && currentInteraction) currentInteraction.action();
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
    } else prompt.classList.add("hidden");
    core.rotation.y += 0.004;
    coreRing.rotation.z += 0.003;
  });

  canvas.addEventListener("click", () => {
    if (!document.pointerLockElement && boot.classList.contains("hidden")) canvas.requestPointerLock?.();
  });

  const bootLines = [
    "HR HUB ................. READY",
    "PROJECT ROOMS .......... 3 READY",
    "INTERACTIVE DOORS ...... READY",
    "RESULTS 2026 ........... WAITING",
    "PORTAL 2027 ............ LOCKED",
    "",
    "Маршрут: HR HUB → 3 проекта → 2027"
  ];
  let bootIndex = 0;
  const bootTimer = setInterval(() => {
    bootLog.textContent += `${bootLines[bootIndex]}\n`;
    bootIndex += 1;
    if (bootIndex >= bootLines.length) {
      clearInterval(bootTimer);
      enterButton.disabled = false;
    }
  }, 180);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    camera.position.copyFrom(zones.hub.pos);
    camera.setTarget(zones.hub.target);
    canvas.focus();
    setTimeout(() => {
      canvas.requestPointerLock?.();
      showToast("Вы вошли в HR HUB. Двери открываются по E или кликом. За каждой дверью — отдельная проектная комната.", 5200);
    }, 220);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
  if (scene.createDefaultXRExperienceAsync) {
    scene.createDefaultXRExperienceAsync({ floorMeshes: scene.meshes.filter(m => m.name.endsWith("-floor")) }).catch(() => {});
  }
})();