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
  const doors = {};
  let currentInteraction = null;
  let toastTimer = null;
  let transitionBusy = false;
  let currentZone = "hub";

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.055, 0.065, 0.07, 1);
  scene.gravity = new BABYLON.Vector3(0, -0.32, 0);
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0022;
  scene.fogColor = new BABYLON.Color3(0.14, 0.15, 0.15);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.18;
  scene.imageProcessingConfiguration.contrast = 1.08;

  const camera = new BABYLON.UniversalCamera("player", new BABYLON.Vector3(0, 1.72, -7.2), scene);
  camera.speed = 0.2;
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
  hemi.intensity = 0.62;
  hemi.diffuse = new BABYLON.Color3(1, 0.97, 0.9);
  hemi.groundColor = new BABYLON.Color3(0.16, 0.18, 0.19);

  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.25, -1, 0.2), scene);
  sun.position = new BABYLON.Vector3(10, 18, -12);
  sun.intensity = 0.62;
  sun.diffuse = new BABYLON.Color3(1, 0.9, 0.76);

  const glow = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 24 });
  glow.intensity = 0.45;

  function pbr(name, hex, roughness = 0.6, metallic = 0, emissiveHex = null, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.roughness = roughness;
    m.metallic = metallic;
    m.alpha = alpha;
    if (emissiveHex) m.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex);
    if (alpha < 1) {
      m.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    wall: pbr("wall", "#ded8ce", 0.88, 0),
    wallWarm: pbr("wallWarm", "#cbc2b5", 0.9, 0),
    floor: pbr("floor", "#b7b0a4", 0.34, 0.05),
    carpet: pbr("carpet", "#343738", 0.96, 0),
    ceiling: pbr("ceiling", "#252829", 0.82, 0),
    black: pbr("black", "#171a1b", 0.65, 0.05),
    metal: pbr("metal", "#5f6465", 0.38, 0.7),
    brushed: pbr("brushed", "#8d9292", 0.42, 0.58),
    white: pbr("white", "#f4f0e8", 0.55, 0),
    wood: pbr("wood", "#765945", 0.7, 0),
    plant: pbr("plant", "#416f54", 0.86, 0),
    glass: pbr("glass", "#9fc4cc", 0.12, 0.08, null, 0.28),
    cyan: pbr("cyan", "#37bfe8", 0.45, 0.05, "#10485b"),
    teal: pbr("teal", "#47c9a4", 0.45, 0.05, "#123e34"),
    amber: pbr("amber", "#d7a45b", 0.48, 0.05, "#493315"),
    violet: pbr("violet", "#8d75d1", 0.42, 0.05, "#2f2459"),
    red: pbr("red", "#8f5360", 0.58, 0.02, "#32151d")
  };

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

  function makeTextMaterial(name, title, subtitle, accent = "#8adcf4", bg = "rgba(25,28,29,.96)") {
    const tex = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1600, height: 460 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 1600, 460);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1600, 460);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 1600, 10);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5f3ee";
    ctx.font = "700 86px Arial";
    ctx.fillText(title, 92, subtitle ? 172 : 230, 1410);
    if (subtitle) {
      ctx.fillStyle = "#b8c0c0";
      ctx.font = "500 39px Arial";
      ctx.fillText(subtitle, 94, 302, 1400);
    }
    tex.update();

    const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.backFaceCulling = true;
    mat.disableLighting = true;
    return mat;
  }

  // Plane front face in Babylon looks along local -Z. All rotations below are chosen so the front faces the room.
  function signPlane(name, title, subtitle, position, rotY, width = 5.6, height = 1.55, accent = "#8adcf4", parent = null) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height, sideOrientation: BABYLON.Mesh.FRONTSIDE }, scene);
    plane.position.copyFrom(position);
    plane.rotation.y = rotY;
    plane.material = makeTextMaterial(name, title, subtitle, accent);
    plane.isPickable = false;
    if (parent) plane.parent = parent;
    return plane;
  }

  function stripLight(name, position, size, emissiveMaterial) {
    const l = box(name, size, position, emissiveMaterial, false);
    glow.addIncludedOnlyMesh(l);
    return l;
  }

  function buildRoomShell(name, center, width, depth, height = 4.6, wallMat = M.wall) {
    box(`${name}-floor`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${name}-ceiling`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, height, center.z), M.ceiling);
    box(`${name}-north`, { width, height, depth: 0.34 }, new BABYLON.Vector3(center.x, height / 2, center.z + depth / 2), wallMat);
    box(`${name}-south`, { width, height, depth: 0.34 }, new BABYLON.Vector3(center.x, height / 2, center.z - depth / 2), wallMat);
    box(`${name}-west`, { width: 0.34, height, depth }, new BABYLON.Vector3(center.x - width / 2, height / 2, center.z), M.wallWarm);
    box(`${name}-east`, { width: 0.34, height, depth }, new BABYLON.Vector3(center.x + width / 2, height / 2, center.z), M.wallWarm);

    box(`${name}-skirting-n`, { width: width - 0.4, height: 0.16, depth: 0.08 }, new BABYLON.Vector3(center.x, 0.18, center.z + depth / 2 - 0.2), M.black, false);
    box(`${name}-skirting-s`, { width: width - 0.4, height: 0.16, depth: 0.08 }, new BABYLON.Vector3(center.x, 0.18, center.z - depth / 2 + 0.2), M.black, false);

    for (let x = -width / 2 + 3.3; x < width / 2 - 1; x += 5.8) {
      for (let z = -depth / 2 + 3; z < depth / 2 - 1; z += 5.5) {
        stripLight(`${name}-ceiling-light-${x}-${z}`, new BABYLON.Vector3(center.x + x, height - 0.12, center.z + z), { width: 2.8, height: 0.045, depth: 0.32 }, M.white);
      }
    }

    const point = new BABYLON.PointLight(`${name}-point`, new BABYLON.Vector3(center.x, height - 0.8, center.z), scene);
    point.intensity = 0.48;
    point.range = 24;
    point.diffuse = new BABYLON.Color3(1, 0.88, 0.72);
  }

  function wallWithOpening(prefix, orientation, value, span, height, openingW = 3.7, openingH = 3.1, material = M.wall) {
    const t = 0.34;
    const side = (span - openingW) / 2;
    if (orientation === "horizontal") {
      box(`${prefix}-a`, { width: side, height, depth: t }, new BABYLON.Vector3(-openingW / 2 - side / 2, height / 2, value), material);
      box(`${prefix}-b`, { width: side, height, depth: t }, new BABYLON.Vector3(openingW / 2 + side / 2, height / 2, value), material);
      box(`${prefix}-lintel`, { width: openingW, height: height - openingH, depth: t }, new BABYLON.Vector3(0, openingH + (height - openingH) / 2, value), material);
    } else {
      box(`${prefix}-a`, { width: t, height, depth: side }, new BABYLON.Vector3(value, height / 2, -openingW / 2 - side / 2), material);
      box(`${prefix}-b`, { width: t, height, depth: side }, new BABYLON.Vector3(value, height / 2, openingW / 2 + side / 2), material);
      box(`${prefix}-lintel`, { width: t, height: height - openingH, depth: openingW }, new BABYLON.Vector3(value, openingH + (height - openingH) / 2, 0), material);
    }
  }

  function buildHub() {
    const width = 26;
    const depth = 22;
    const height = 5.0;
    box("hub-floor", { width, height: 0.2, depth }, new BABYLON.Vector3(0, 0, 0), M.floor);
    box("hub-ceiling", { width, height: 0.18, depth }, new BABYLON.Vector3(0, height, 0), M.ceiling);

    wallWithOpening("hub-north", "horizontal", depth / 2, width, height, 3.8, 3.2, M.wall);
    wallWithOpening("hub-south", "horizontal", -depth / 2, width, height, 3.8, 3.2, M.wall);
    wallWithOpening("hub-west", "vertical", -width / 2, depth, height, 3.8, 3.2, M.wallWarm);
    wallWithOpening("hub-east", "vertical", width / 2, depth, height, 3.8, 3.2, M.wallWarm);

    box("hub-carpet-main", { width: 4.3, height: 0.035, depth: 15.8 }, new BABYLON.Vector3(0, 0.13, 0.4), M.carpet, false);
    box("hub-carpet-side", { width: 18.8, height: 0.035, depth: 3.2 }, new BABYLON.Vector3(0, 0.135, 0.4), M.carpet, false);

    for (let x = -9; x <= 9; x += 6) {
      for (let z = -7; z <= 7; z += 7) {
        stripLight(`hub-light-${x}-${z}`, new BABYLON.Vector3(x, height - 0.12, z), { width: 3.0, height: 0.045, depth: 0.34 }, M.white);
      }
    }

    const warmPoints = [[-7,3],[7,3],[-7,-4],[7,-4]];
    warmPoints.forEach((p, i) => {
      const l = new BABYLON.PointLight(`hub-warm-${i}`, new BABYLON.Vector3(p[0], 3.8, p[1]), scene);
      l.intensity = 0.55;
      l.range = 10;
      l.diffuse = new BABYLON.Color3(1, 0.78, 0.55);
    });

    // Central island: compact enough not to block navigation.
    box("hub-island", { width: 4.8, height: 0.78, depth: 1.45 }, new BABYLON.Vector3(0, 0.49, 1.0), M.wood);
    box("hub-island-top", { width: 5.05, height: 0.09, depth: 1.62 }, new BABYLON.Vector3(0, 0.93, 1.0), M.white, false);
    box("hub-monolith", { width: 4.3, height: 2.0, depth: 0.22 }, new BABYLON.Vector3(0, 2.0, 2.0), M.black, false);
    signPlane("hub-main-sign", "ИТОГИ 2026", "ЦК БОРУП · HR BACKROOM OFFICE", new BABYLON.Vector3(0, 2.2, 1.86), 0, 4.05, 1.28, "#77d8f1");

    createPlant("hub-plant-a", new BABYLON.Vector3(-10.7, 0, -7.6));
    createPlant("hub-plant-b", new BABYLON.Vector3(10.7, 0, -7.6));
    createLounge("hub-lounge-a", new BABYLON.Vector3(-8.4, 0, 5.7), Math.PI / 2);
    createLounge("hub-lounge-b", new BABYLON.Vector3(8.4, 0, 5.7), -Math.PI / 2);

    signPlane("hub-directory", "ВЫБЕРИТЕ НАПРАВЛЕНИЕ", "01 Приём   ·   02 AI LAB   ·   03 Наставничество", new BABYLON.Vector3(0, 3.65, 10.78), 0, 8.2, 1.35, "#8cd6e9");
  }

  function createPlant(name, pos) {
    cylinder(`${name}-pot`, { height: 0.62, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 24 }, new BABYLON.Vector3(pos.x, 0.4, pos.z), M.wood);
    cylinder(`${name}-stem`, { height: 1.0, diameter: 0.1, tessellation: 12 }, new BABYLON.Vector3(pos.x, 1.0, pos.z), M.plant);
    [[0,1.5,0],[0.3,1.45,0.1],[-0.28,1.42,-0.08],[0.12,1.73,-0.12]].forEach((o, i) => {
      const leaf = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf-${i}`, { diameter: 0.68, segments: 12 }, scene);
      leaf.position = new BABYLON.Vector3(pos.x + o[0], o[1], pos.z + o[2]);
      leaf.scaling.y = 1.35;
      leaf.material = M.plant;
    });
  }

  function createLounge(name, pos, rotY = 0) {
    const root = new BABYLON.TransformNode(name, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;
    box(`${name}-seat`, { width: 2.65, height: 0.42, depth: 0.88 }, new BABYLON.Vector3(0, 0.48, 0), M.wood, false, root);
    box(`${name}-back`, { width: 2.65, height: 0.84, depth: 0.24 }, new BABYLON.Vector3(0, 0.98, 0.34), M.wallWarm, false, root);
    box(`${name}-table`, { width: 1.2, height: 0.12, depth: 0.7 }, new BABYLON.Vector3(0, 0.55, -1.2), M.white, false, root);
    cylinder(`${name}-leg`, { height: 0.48, diameter: 0.16, tessellation: 16 }, new BABYLON.Vector3(0, 0.3, -1.2), M.metal, root);
  }

  function createSlidingDoor(name, pos, rotY, accentMat, accentHex, title, subtitle, targetZone, locked = false) {
    const root = new BABYLON.TransformNode(`${name}-root`, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;

    // Recessed vestibule and frame.
    box(`${name}-recess-top`, { width: 4.5, height: 0.28, depth: 1.5 }, new BABYLON.Vector3(0, 3.25, 0.45), M.black, false, root);
    box(`${name}-recess-left`, { width: 0.32, height: 3.2, depth: 1.5 }, new BABYLON.Vector3(-2.08, 1.6, 0.45), M.black, false, root);
    box(`${name}-recess-right`, { width: 0.32, height: 3.2, depth: 1.5 }, new BABYLON.Vector3(2.08, 1.6, 0.45), M.black, false, root);
    stripLight(`${name}-accent`, new BABYLON.Vector3(0, 3.08, -0.22), { width: 3.3, height: 0.06, depth: 0.08 }, accentMat).parent = root;

    const leftLeaf = box(`${name}-left`, { width: 1.68, height: 2.82, depth: 0.16 }, new BABYLON.Vector3(-0.84, 1.46, 0), locked ? M.red : M.brushed, true, root);
    const rightLeaf = box(`${name}-right`, { width: 1.68, height: 2.82, depth: 0.16 }, new BABYLON.Vector3(0.84, 1.46, 0), locked ? M.red : M.brushed, true, root);
    box(`${name}-left-inset`, { width: 1.22, height: 2.34, depth: 0.025 }, new BABYLON.Vector3(-0.84, 1.46, -0.1), M.black, false, root);
    box(`${name}-right-inset`, { width: 1.22, height: 2.34, depth: 0.025 }, new BABYLON.Vector3(0.84, 1.46, -0.1), M.black, false, root);

    const sign = signPlane(`${name}-sign`, title, subtitle, new BABYLON.Vector3(0, 3.82, -0.18), 0, 4.2, 1.02, accentHex, root);

    root.computeWorldMatrix(true);
    const inward = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, -1), root.getWorldMatrix()).normalize();
    const triggerPos = pos.add(inward.scale(1.55)).add(new BABYLON.Vector3(0, 1.05, 0));
    const entry = { name, root, leftLeaf, rightLeaf, sign, targetZone, locked, triggerPos, accentMat, accentHex };
    doors[name] = entry;

    const activate = () => activateDoor(entry);
    [leftLeaf, rightLeaf].forEach((leaf) => {
      leaf.isPickable = true;
      leaf.actionManager = new BABYLON.ActionManager(scene);
      leaf.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, activate));
    });
    interactions.push({ position: triggerPos, radius: 2.35, label: locked ? "E / клик — проверить доступ" : `E / клик — ${title}`, action: activate });
    return entry;
  }

  function animateDoor(entry, onOpened) {
    if (transitionBusy) return;
    transitionBusy = true;
    entry.leftLeaf.checkCollisions = false;
    entry.rightLeaf.checkCollisions = false;
    const lx = entry.leftLeaf.position.x;
    const rx = entry.rightLeaf.position.x;
    const ease = new BABYLON.CubicEase();
    ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-left-open`, entry.leftLeaf, "position.x", 60, 34, lx, -1.75, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease);
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-right-open`, entry.rightLeaf, "position.x", 60, 34, rx, 1.75, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
      setTimeout(() => {
        onOpened();
        setTimeout(() => {
          entry.leftLeaf.position.x = lx;
          entry.rightLeaf.position.x = rx;
          entry.leftLeaf.checkCollisions = true;
          entry.rightLeaf.checkCollisions = true;
          transitionBusy = false;
        }, 420);
      }, 160);
    });
  }

  function activateDoor(entry) {
    if (entry.name === "portal" && completed.size !== data.totalZones) {
      showToast(`Переход в 2027 закрыт. Пройдено ${completed.size} из ${data.totalZones} направлений.`, 3900);
      return;
    }
    animateDoor(entry, () => travel(entry.targetZone));
  }

  function refreshPortal() {
    const p = doors.portal;
    if (!p) return;
    const open = completed.size === data.totalZones;
    p.locked = !open;
    p.leftLeaf.material = open ? M.violet : M.red;
    p.rightLeaf.material = open ? M.violet : M.red;
    p.sign.material = makeTextMaterial("portal-sign-live", open ? "2027 · ДОСТУП ОТКРЫТ" : "2027 · ЗАКРЫТО", open ? "E / клик — перейти к планам" : `Пройдено ${completed.size} / ${data.totalZones}`, open ? "#bca8ff" : "#c67a86");
  }

  function createMetricCards(prefix, metrics, wallPosition, rotY, accent) {
    const offsets = [-4.8, -1.6, 1.6, 4.8];
    metrics.slice(0, 4).forEach((m, i) => {
      const p = wallPosition.clone();
      if (Math.abs(Math.cos(rotY)) > 0.5) p.x += offsets[i]; else p.z += offsets[i];
      signPlane(`${prefix}-${i}`, m[0], m[1], p, rotY, 2.75, 1.35, accent);
    });
  }

  function createActionConsole(name, position, accentMat, accentHex, title, zoneId) {
    box(`${name}-base`, { width: 2.6, height: 0.86, depth: 1.35 }, new BABYLON.Vector3(position.x, 0.52, position.z), M.wood, false);
    const top = box(`${name}-top`, { width: 2.25, height: 0.1, depth: 1.05 }, new BABYLON.Vector3(position.x, 1.0, position.z), accentMat, false);
    stripLight(`${name}-light`, new BABYLON.Vector3(position.x, 1.07, position.z - 0.38), { width: 1.5, height: 0.035, depth: 0.05 }, accentMat);
    signPlane(`${name}-sign`, title, "E / клик — завершить зону", new BABYLON.Vector3(position.x, 1.92, position.z + 0.58), 0, 3.3, 0.95, accentHex);
    const action = () => complete(zoneId);
    top.isPickable = true;
    top.actionManager = new BABYLON.ActionManager(scene);
    top.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    interactions.push({ position: new BABYLON.Vector3(position.x, 1.0, position.z - 1.0), radius: 2.1, label: `E / клик — ${title}`, action });
  }

  function createBackDoor(name, roomCenter, roomWidth, target = "hub") {
    return createSlidingDoor(name, new BABYLON.Vector3(roomCenter.x - roomWidth / 2 + 0.18, 0, roomCenter.z), -Math.PI / 2, M.metal, "#9ea9aa", "← HR HUB", "вернуться в центральный зал", target, false);
  }

  function buildRecruitment(center) {
    buildRoomShell("recruitment", center, 20, 18, 4.7, M.wall);
    signPlane("rec-title", "01 · ПРИЁМ", "Цифровой путь: кандидат → сотрудник", new BABYLON.Vector3(center.x, 3.2, center.z + 8.78), 0, 7.4, 1.5, "#5dd5f5");

    const labels = ["КАНДИДАТ", "ЗАЯВКА", "ДОКУМЕНТЫ", "ПРОВЕРКА", "ОФОРМЛЕНИЕ", "СОТРУДНИК"];
    labels.forEach((label, i) => {
      const x = center.x - 5 + i * 2;
      const z = center.z + 1.2;
      cylinder(`rec-ped-${i}`, { height: 0.24, diameter: 1.35, tessellation: 32 }, new BABYLON.Vector3(x, 0.22, z), i === 5 ? M.teal : M.cyan);
      const card = box(`rec-card-${i}`, { width: 1.45, height: 1.0, depth: 0.12 }, new BABYLON.Vector3(x, 1.02, z), M.black, false);
      signPlane(`rec-card-sign-${i}`, label, i === 5 ? "результат" : `этап ${i + 1}`, new BABYLON.Vector3(x, 1.08, z - 0.07), 0, 1.34, 0.82, i === 5 ? "#77e5bd" : "#6edcf8");
      if (i < 5) stripLight(`rec-line-${i}`, new BABYLON.Vector3(x + 1, 0.16, z), { width: 1.0, height: 0.025, depth: 0.06 }, M.cyan);
    });
    createMetricCards("rec-metric", data.zones.recruitment.metrics, new BABYLON.Vector3(center.x, 2.25, center.z - 8.78), Math.PI, "#6edcf8");
    createActionConsole("rec-action", new BABYLON.Vector3(center.x, 0, center.z - 4.4), M.cyan, "#6edcf8", "ПОДТВЕРДИТЬ РЕЗУЛЬТАТЫ", "recruitment");
    createBackDoor("rec-back", center, 20);
  }

  function buildAI(center) {
    buildRoomShell("ai", center, 20, 18, 4.9, M.wallWarm);
    signPlane("ai-title", "02 · AI LAB", "ИИ-решения и измеримый эффект", new BABYLON.Vector3(center.x, 3.25, center.z + 8.78), 0, 7.0, 1.5, "#6fe5c2");

    const core = BABYLON.MeshBuilder.CreateSphere("ai-core", { diameter: 3.0, segments: 32 }, scene);
    core.position = new BABYLON.Vector3(center.x, 2.0, center.z + 0.9);
    core.material = M.glass;
    const ringA = BABYLON.MeshBuilder.CreateTorus("ai-ring-a", { diameter: 4.1, thickness: 0.045, tessellation: 72 }, scene);
    ringA.position.copyFrom(core.position);
    ringA.rotation.x = Math.PI / 2.4;
    ringA.material = M.teal;
    const ringB = BABYLON.MeshBuilder.CreateTorus("ai-ring-b", { diameter: 3.55, thickness: 0.04, tessellation: 72 }, scene);
    ringB.position.copyFrom(core.position);
    ringB.rotation.y = Math.PI / 2.7;
    ringB.material = M.cyan;
    glow.addIncludedOnlyMesh(ringA);
    glow.addIncludedOnlyMesh(ringB);

    [[-5.2,3.0],[5.2,3.0],[-5.2,-1.5],[5.2,-1.5]].forEach((o, i) => {
      const x = center.x + o[0];
      const z = center.z + o[1];
      cylinder(`agent-ped-${i}`, { height: 0.22, diameter: 1.8, tessellation: 32 }, new BABYLON.Vector3(x, 0.2, z), M.teal);
      signPlane(`agent-sign-${i}`, `AI AGENT 0${i + 1}`, "данные 2026", new BABYLON.Vector3(x, 1.25, z), 0, 2.55, 0.9, "#73e8c4");
    });

    createMetricCards("ai-metric", data.zones.ai.metrics, new BABYLON.Vector3(center.x, 2.25, center.z - 8.78), Math.PI, "#73e8c4");
    createActionConsole("ai-action", new BABYLON.Vector3(center.x, 0, center.z - 4.5), M.teal, "#73e8c4", "АКТИВИРОВАТЬ AI CORE", "ai");
    createBackDoor("ai-back", center, 20);

    scene.onBeforeRenderObservable.add(() => {
      ringA.rotation.z += 0.004;
      ringB.rotation.x += 0.003;
      core.rotation.y += 0.002;
    });
  }

  function buildMentoring(center) {
    buildRoomShell("mentoring", center, 20, 18, 4.7, M.wall);
    signPlane("mentor-title", "03 · НАСТАВНИЧЕСТВО", "Сеть адаптации и развития", new BABYLON.Vector3(center.x, 3.2, center.z + 8.78), 0, 7.4, 1.5, "#e9b76e");

    const points = [];
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 6);
      const col = i % 6;
      const x = center.x - 5 + col * 2;
      const z = center.z + 1.8 - row * 3.2;
      const mentor = i < 4;
      cylinder(`mentor-body-${i}`, { height: 1.0, diameter: 0.38, tessellation: 16 }, new BABYLON.Vector3(x, 0.78, z), mentor ? M.amber : M.white);
      const head = BABYLON.MeshBuilder.CreateSphere(`mentor-head-${i}`, { diameter: 0.46, segments: 16 }, scene);
      head.position = new BABYLON.Vector3(x, 1.48, z);
      head.material = mentor ? M.amber : M.white;
      points.push(new BABYLON.Vector3(x, 1.1, z));
    }

    [[0,6],[0,7],[1,8],[1,9],[2,10],[3,11]].forEach((pair, i) => {
      const line = BABYLON.MeshBuilder.CreateLines(`mentor-link-${i}`, { points: [points[pair[0]], points[pair[1]]] }, scene);
      line.color = new BABYLON.Color3(0.83, 0.58, 0.25);
      line.alpha = 0.72;
    });

    createMetricCards("mentor-metric", data.zones.mentoring.metrics, new BABYLON.Vector3(center.x, 2.25, center.z - 8.78), Math.PI, "#e9b76e");
    createActionConsole("mentor-action", new BABYLON.Vector3(center.x, 0, center.z - 4.5), M.amber, "#e9b76e", "ПОДТВЕРДИТЬ СЕТЬ", "mentoring");
    createBackDoor("mentor-back", center, 20);
  }

  function buildFuture(center) {
    buildRoomShell("future", center, 20, 18, 5.0, M.wallWarm);
    signPlane("future-title", "2027 · NEXT CHAPTER", "Планы будут заполнены после утверждения итогов 2026", new BABYLON.Vector3(center.x, 3.35, center.z + 8.78), 0, 8.0, 1.55, "#c0aff8");
    const labels = ["AI", "АВТОМАТИЗАЦИЯ", "ЛЮДИ", "ЭФФЕКТИВНОСТЬ", "КЛИЕНТСКИЙ СЕРВИС"];
    labels.forEach((label, i) => {
      const a = Math.PI * 2 * i / labels.length - Math.PI / 2;
      const x = center.x + Math.cos(a) * 5.2;
      const z = center.z + Math.sin(a) * 4.0;
      cylinder(`future-ped-${i}`, { height: 0.28, diameter: 2.1, tessellation: 32 }, new BABYLON.Vector3(x, 0.22, z), M.violet);
      signPlane(`future-sign-${i}`, `0${i + 1} · ${label}`, "план 2027", new BABYLON.Vector3(x, 1.45, z), 0, 3.0, 0.9, "#c7b8fa");
    });
    createBackDoor("future-back", center, 20);
  }

  const zoneMap = {
    hub: { pos: new BABYLON.Vector3(0, 1.72, -7.2), target: new BABYLON.Vector3(0, 1.65, 1.2) },
    recruitment: { pos: new BABYLON.Vector3(-42, 1.72, -5.9), target: new BABYLON.Vector3(-42, 1.6, 1.4) },
    ai: { pos: new BABYLON.Vector3(0, 1.72, 35.8), target: new BABYLON.Vector3(0, 1.8, 42.0) },
    mentoring: { pos: new BABYLON.Vector3(42, 1.72, -5.9), target: new BABYLON.Vector3(42, 1.6, 1.4) },
    future: { pos: new BABYLON.Vector3(0, 1.72, -47.8), target: new BABYLON.Vector3(0, 1.8, -41.0) }
  };

  // Build world.
  buildHub();
  createSlidingDoor("recruitment", new BABYLON.Vector3(-13.0, 0, 0), -Math.PI / 2, M.cyan, "#6edcf8", "01 · ПРИЁМ", "цифровой маршрут сотрудника", "recruitment");
  createSlidingDoor("ai", new BABYLON.Vector3(0, 0, 11.0), 0, M.teal, "#73e8c4", "02 · AI LAB", "ИИ-решения и эффект", "ai");
  createSlidingDoor("mentoring", new BABYLON.Vector3(13.0, 0, 0), Math.PI / 2, M.amber, "#e9b76e", "03 · НАСТАВНИЧЕСТВО", "адаптация и развитие", "mentoring");
  createSlidingDoor("portal", new BABYLON.Vector3(0, 0, -11.0), Math.PI, M.violet, "#c0aff8", "2027 · ЗАКРЫТО", "пройдите 0 / 3", "future", true);

  buildRecruitment(new BABYLON.Vector3(-42, 0, 0));
  buildAI(new BABYLON.Vector3(0, 0, 42));
  buildMentoring(new BABYLON.Vector3(42, 0, 0));
  buildFuture(new BABYLON.Vector3(0, 0, -42));

  function showToast(text, ms = 4200) {
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
      const mark = row.querySelector("i");
      if (mark) mark.textContent = done ? "✓" : "○";
    });
    progressText.textContent = `${completed.size} / ${data.totalZones}`;
    refreshPortal();
    if (completed.size === data.totalZones) showToast("Все направления пройдены. Переход в 2027 разблокирован.", 5000);
  }

  function travel(id) {
    currentZone = id;
    fade.classList.add("active");
    setTimeout(() => {
      camera.position.copyFrom(zoneMap[id].pos);
      camera.setTarget(zoneMap[id].target);
      zoneName.textContent = id === "hub" ? "HR HUB · ИТОГИ 2026" : data.zones[id].name;
      hubGuide.style.display = id === "hub" ? "block" : "none";
      fade.classList.remove("active");
      if (id === "hub") showToast("Центральный HR HUB. Выберите одно из трёх направлений: дверь открывается клавишей E или кликом.", 5200);
      else if (data.zones[id].intro) showToast(data.zones[id].intro, 4600);
      else if (id === "future") showToast("Переход в 2027 открыт. Здесь будут реальные планы следующего года.", 4600);
    }, 300);
  }

  function complete(id) {
    if (!completed.has(id)) {
      completed.add(id);
      updateGuide();
      showToast(`${data.zones[id].name}: результаты подтверждены.`, 3800);
    } else {
      showToast(`${data.zones[id].name}: зона уже пройдена.`, 3000);
    }
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
  }, 220);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    camera.position.copyFrom(zoneMap.hub.pos);
    camera.setTarget(zoneMap.hub.target);
    canvas.focus();
    setTimeout(() => {
      canvas.requestPointerLock?.();
      showToast("Вы вошли в HR HUB. Осмотритесь: три проектные двери расположены слева, прямо и справа.", 5600);
    }, 220);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  if (scene.createDefaultXRExperienceAsync) {
    scene.createDefaultXRExperienceAsync({ floorMeshes: scene.meshes.filter((m) => m.name.endsWith("-floor")) }).catch(() => {});
  }
})();