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
  const worldLabels = [];
  const keys = new Set();
  let currentInteraction = null;
  let currentZone = "hub";
  let toastTimer = null;
  let transitionBusy = false;
  let walking = false;
  let walkPhase = 0;

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.05, 0.055, 0.06, 1);
  scene.collisionsEnabled = true;

  const camera = new BABYLON.FreeCamera("thirdPersonCamera", new BABYLON.Vector3(0, 5.0, -7.0), scene);
  camera.fov = 0.86;
  camera.minZ = 0.1;

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.95;
  hemi.diffuse = new BABYLON.Color3(0.96, 0.95, 0.9);
  hemi.groundColor = new BABYLON.Color3(0.22, 0.22, 0.23);

  const glow = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 24 });
  glow.intensity = 0.32;

  function makeMat(name, hex, emissive = 0, alpha = 1) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    wall: makeMat("wall", "#c9c3b7"),
    wallDark: makeMat("wallDark", "#97948d"),
    floor: makeMat("floor", "#b9b4a9"),
    ceiling: makeMat("ceiling", "#24282b"),
    charcoal: makeMat("charcoal", "#293036"),
    black: makeMat("black", "#101417"),
    white: makeMat("white", "#f4f0e8", 0.03),
    metal: makeMat("metal", "#64727a"),
    wood: makeMat("wood", "#7a6250"),
    cyan: makeMat("cyan", "#3bcaf2", 0.42),
    teal: makeMat("teal", "#4bd8ae", 0.38),
    amber: makeMat("amber", "#e7ad55", 0.38),
    violet: makeMat("violet", "#9b83e8", 0.38),
    green: makeMat("green", "#4ee6a8", 0.48),
    red: makeMat("red", "#a65363", 0.25),
    plant: makeMat("plant", "#547764"),
    skin: makeMat("skin", "#f0b38e"),
    hair: makeMat("hair", "#49372d"),
    shirt: makeMat("shirt", "#47a9dc"),
    pants: makeMat("pants", "#33485f"),
    shoe: makeMat("shoe", "#22272b"),
    glass: makeMat("glass", "#63c8df", 0.12, 0.44)
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

  function sphere(name, diameter, position, material, parent = null) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 18 }, scene);
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

  function createPlant(name, pos) {
    cylinder(`${name}-pot`, { height: 0.62, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 20 }, new BABYLON.Vector3(pos.x, 0.4, pos.z), M.wood);
    cylinder(`${name}-stem`, { height: 0.95, diameter: 0.1, tessellation: 12 }, new BABYLON.Vector3(pos.x, 1.0, pos.z), M.plant);
    [[0,1.48,0],[.28,1.4,.08],[-.27,1.4,-.08],[.1,1.68,-.1]].forEach((o, i) => {
      const leaf = sphere(`${name}-leaf-${i}`, 0.68, new BABYLON.Vector3(pos.x + o[0], o[1], pos.z + o[2]), M.plant);
      leaf.scaling.y = 1.35;
    });
  }

  function ceilingLights(center, width, depth, height) {
    for (let x = -width / 2 + 3; x <= width / 2 - 3; x += 6) {
      for (let z = -depth / 2 + 3; z <= depth / 2 - 3; z += 6) {
        box(`ceil-${center.x}-${center.z}-${x}-${z}`, { width: 2.5, height: 0.05, depth: 0.55 }, new BABYLON.Vector3(center.x + x, height - 0.12, center.z + z), M.white, false);
        const l = new BABYLON.PointLight(`pl-${center.x}-${center.z}-${x}-${z}`, new BABYLON.Vector3(center.x + x, height - 0.48, center.z + z), scene);
        l.intensity = 0.24;
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

  function createWorldLabel(text, worldPos, zone, accent = "#9edff0") {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.position = "absolute";
    el.style.zIndex = "11";
    el.style.pointerEvents = "none";
    el.style.transform = "translate(-50%, -50%)";
    el.style.padding = "7px 10px";
    el.style.borderRadius = "5px";
    el.style.border = `1px solid ${accent}66`;
    el.style.background = "rgba(15,19,21,.82)";
    el.style.color = "#fff";
    el.style.fontSize = "11px";
    el.style.fontWeight = "700";
    el.style.letterSpacing = ".04em";
    el.style.whiteSpace = "nowrap";
    el.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";
    hud.appendChild(el);
    worldLabels.push({ el, worldPos, zone });
    return el;
  }

  function updateWorldLabels() {
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    for (const item of worldLabels) {
      if (item.zone !== currentZone) {
        item.el.style.display = "none";
        continue;
      }
      const p = BABYLON.Vector3.Project(item.worldPos, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), viewport);
      if (p.z < 0 || p.z > 1) {
        item.el.style.display = "none";
      } else {
        item.el.style.display = "block";
        item.el.style.left = `${p.x}px`;
        item.el.style.top = `${p.y}px`;
      }
    }
  }

  // ---------- Cartoon character ----------
  const collider = BABYLON.MeshBuilder.CreateBox("player-collider", { width: 0.7, height: 0.1, depth: 0.7 }, scene);
  collider.position = new BABYLON.Vector3(0, 0.12, -6.2);
  collider.isVisible = false;
  collider.isPickable = false;
  collider.ellipsoid = new BABYLON.Vector3(0.34, 0.86, 0.34);
  collider.ellipsoidOffset = new BABYLON.Vector3(0, 0.86, 0);

  const avatar = new BABYLON.TransformNode("avatar", scene);
  avatar.parent = collider;

  function localBox(name, size, pos, material, parent = avatar) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }
  function localCylinder(name, options, pos, material, parent = avatar) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }
  function localSphere(name, diameter, pos, material, parent = avatar) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 18 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }

  localCylinder("avatar-torso", { height: 0.9, diameterTop: 0.48, diameterBottom: 0.58, tessellation: 18 }, new BABYLON.Vector3(0, 1.23, 0), M.shirt);
  localSphere("avatar-head", 0.56, new BABYLON.Vector3(0, 1.98, 0), M.skin);
  const hair = localSphere("avatar-hair", 0.58, new BABYLON.Vector3(0, 2.08, -0.01), M.hair);
  hair.scaling.y = 0.52;
  localSphere("avatar-nose", 0.10, new BABYLON.Vector3(0, 1.96, 0.29), M.skin);
  const eyeL = localSphere("avatar-eye-l", 0.065, new BABYLON.Vector3(-0.11, 2.04, 0.26), M.black);
  const eyeR = localSphere("avatar-eye-r", 0.065, new BABYLON.Vector3(0.11, 2.04, 0.26), M.black);
  eyeL.scaling.z = 0.6; eyeR.scaling.z = 0.6;

  const leftArmPivot = new BABYLON.TransformNode("left-arm-pivot", scene);
  leftArmPivot.parent = avatar;
  leftArmPivot.position = new BABYLON.Vector3(-0.36, 1.55, 0);
  localCylinder("left-arm", { height: 0.72, diameter: 0.16, tessellation: 12 }, new BABYLON.Vector3(0, -0.34, 0), M.skin, leftArmPivot);

  const rightArmPivot = new BABYLON.TransformNode("right-arm-pivot", scene);
  rightArmPivot.parent = avatar;
  rightArmPivot.position = new BABYLON.Vector3(0.36, 1.55, 0);
  localCylinder("right-arm", { height: 0.72, diameter: 0.16, tessellation: 12 }, new BABYLON.Vector3(0, -0.34, 0), M.skin, rightArmPivot);

  const leftLegPivot = new BABYLON.TransformNode("left-leg-pivot", scene);
  leftLegPivot.parent = avatar;
  leftLegPivot.position = new BABYLON.Vector3(-0.16, 0.85, 0);
  localCylinder("left-leg", { height: 0.74, diameter: 0.20, tessellation: 12 }, new BABYLON.Vector3(0, -0.34, 0), M.pants, leftLegPivot);
  localBox("left-shoe", { width: 0.24, height: 0.12, depth: 0.38 }, new BABYLON.Vector3(0, -0.72, 0.08), M.shoe, leftLegPivot);

  const rightLegPivot = new BABYLON.TransformNode("right-leg-pivot", scene);
  rightLegPivot.parent = avatar;
  rightLegPivot.position = new BABYLON.Vector3(0.16, 0.85, 0);
  localCylinder("right-leg", { height: 0.74, diameter: 0.20, tessellation: 12 }, new BABYLON.Vector3(0, -0.34, 0), M.pants, rightLegPivot);
  localBox("right-shoe", { width: 0.24, height: 0.12, depth: 0.38 }, new BABYLON.Vector3(0, -0.72, 0.08), M.shoe, rightLegPivot);

  // ---------- Doors ----------
  function createDoor(name, pos, rotY, accentMat, label, targetZone, triggerPos, zone = "hub", locked = false) {
    const root = new BABYLON.TransformNode(`${name}-root`, scene);
    root.position.copyFrom(pos);
    root.rotation.y = rotY;

    box(`${name}-frame-l`, { width: 0.30, height: 3.15, depth: 0.55 }, new BABYLON.Vector3(-1.85, 1.58, 0), M.charcoal, false, root);
    box(`${name}-frame-r`, { width: 0.30, height: 3.15, depth: 0.55 }, new BABYLON.Vector3(1.85, 1.58, 0), M.charcoal, false, root);
    box(`${name}-frame-t`, { width: 4.0, height: 0.30, depth: 0.55 }, new BABYLON.Vector3(0, 3.0, 0), M.charcoal, false, root);
    strip(`${name}-accent`, new BABYLON.Vector3(0, 2.9, -0.3), { width: 3.1, height: 0.07, depth: 0.07 }, accentMat, root);

    const leftLeaf = box(`${name}-left`, { width: 1.55, height: 2.65, depth: 0.16 }, new BABYLON.Vector3(-0.78, 1.45, 0), locked ? M.red : M.metal, true, root);
    const rightLeaf = box(`${name}-right`, { width: 1.55, height: 2.65, depth: 0.16 }, new BABYLON.Vector3(0.78, 1.45, 0), locked ? M.red : M.metal, true, root);

    const entry = { name, root, leftLeaf, rightLeaf, targetZone, locked, label };
    doors[name] = entry;

    const action = () => activateDoor(entry);
    [leftLeaf, rightLeaf].forEach((leaf) => {
      leaf.isPickable = true;
      leaf.actionManager = new BABYLON.ActionManager(scene);
      leaf.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    });
    interactions.push({ position: triggerPos, radius: 2.1, zone, label: locked ? "Enter — проверить доступ" : `Enter — открыть: ${label}`, action });
    createWorldLabel(label, pos.add(new BABYLON.Vector3(0, 3.65, 0)), zone, locked ? "#cf7e8a" : "#9edff0");
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
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-l`, entry.leftLeaf, "position.x", 60, 26, lx, -1.65, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease);
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-r`, entry.rightLeaf, "position.x", 60, 26, rx, 1.65, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
      setTimeout(() => {
        callback();
        setTimeout(() => {
          entry.leftLeaf.position.x = lx;
          entry.rightLeaf.position.x = rx;
          entry.leftLeaf.checkCollisions = true;
          entry.rightLeaf.checkCollisions = true;
          transitionBusy = false;
        }, 260);
      }, 90);
    });
  }

  function activateDoor(entry) {
    if (entry.name === "portal" && completed.size !== data.totalZones) {
      showToast(`Переход в 2027 пока закрыт. Пройдено ${completed.size} / ${data.totalZones}.`, 3200);
      return;
    }
    animateDoor(entry, () => travel(entry.targetZone));
  }

  // ---------- World ----------
  function hubWorld() {
    roomShell("hub", new BABYLON.Vector3(0, 0, 0), 26, 22, 4.7);
    box("hub-rug", { width: 7.5, height: 0.03, depth: 5.0 }, new BABYLON.Vector3(0, 0.13, 0.5), M.charcoal, false);
    box("hub-desk", { width: 4.8, height: 0.9, depth: 1.2 }, new BABYLON.Vector3(0, 0.55, 1.1), M.wood, false);
    box("hub-desk-top", { width: 5.1, height: 0.08, depth: 1.35 }, new BABYLON.Vector3(0, 1.02, 1.1), M.white, false);
    createPlant("hub-plant-l", new BABYLON.Vector3(-10.5, 0, -7.8));
    createPlant("hub-plant-r", new BABYLON.Vector3(10.5, 0, -7.8));

    createDoor("recruitment", new BABYLON.Vector3(-12.85, 0, 0), -Math.PI / 2, M.cyan, "01 · ПРИЁМ", "recruitment", new BABYLON.Vector3(-11.1, 1.0, 0), "hub");
    createDoor("ai", new BABYLON.Vector3(0, 0, 10.85), 0, M.teal, "02 · AI LAB", "ai", new BABYLON.Vector3(0, 1.0, 9.1), "hub");
    createDoor("mentoring", new BABYLON.Vector3(12.85, 0, 0), Math.PI / 2, M.amber, "03 · НАСТАВНИЧЕСТВО", "mentoring", new BABYLON.Vector3(11.1, 1.0, 0), "hub");
    createDoor("portal", new BABYLON.Vector3(0, 0, -10.85), Math.PI, M.violet, "2027 · ЗАКРЫТО", "future", new BABYLON.Vector3(0, 1.0, -9.1), "hub", true);
  }

  function addStudyObject(name, pos, material, zone, title, text) {
    const base = cylinder(`${name}-base`, { height: 0.24, diameter: 1.5, tessellation: 28 }, new BABYLON.Vector3(pos.x, 0.22, pos.z), material);
    const object = box(`${name}-object`, { width: 0.8, height: 1.0, depth: 0.6 }, new BABYLON.Vector3(pos.x, 0.88, pos.z), M.charcoal, false);
    strip(`${name}-glow`, new BABYLON.Vector3(pos.x, 1.42, pos.z), { width: 0.72, height: 0.05, depth: 0.5 }, material);
    const action = () => showToast(`${title}: ${text}`, 4600);
    object.isPickable = true;
    object.actionManager = new BABYLON.ActionManager(scene);
    object.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    interactions.push({ position: new BABYLON.Vector3(pos.x, 1.0, pos.z), radius: 1.8, zone, label: `Enter — изучить: ${title}`, action });
    createWorldLabel(title, new BABYLON.Vector3(pos.x, 2.0, pos.z), zone, material === M.amber ? "#e7ad55" : material === M.teal ? "#4bd8ae" : "#3bcaf2");
    return { base, object };
  }

  function addCompletionTerminal(name, center, zone, accentMat, title) {
    const pos = new BABYLON.Vector3(center.x, 0, center.z + 5.5);
    box(`${name}-base`, { width: 2.6, height: 0.85, depth: 1.15 }, new BABYLON.Vector3(pos.x, 0.52, pos.z), M.wood, false);
    const top = box(`${name}-top`, { width: 2.2, height: 0.1, depth: 0.95 }, new BABYLON.Vector3(pos.x, 1.0, pos.z), accentMat, false);
    strip(`${name}-strip`, new BABYLON.Vector3(pos.x, 1.07, pos.z - 0.34), { width: 1.55, height: 0.03, depth: 0.05 }, accentMat);
    const action = () => complete(zone);
    top.isPickable = true;
    top.actionManager = new BABYLON.ActionManager(scene);
    top.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, action));
    interactions.push({ position: new BABYLON.Vector3(pos.x, 1.0, pos.z - 1.0), radius: 2.0, zone, label: "Enter — подтвердить итоги комнаты", action });
    createWorldLabel(title, new BABYLON.Vector3(pos.x, 1.85, pos.z), zone, "#ffffff");
  }

  function addExitDoor(name, center, zone) {
    createDoor(name, new BABYLON.Vector3(center.x, 0, center.z - 8.85), 0, M.green, "← HR HUB · ВЫХОД", "hub", new BABYLON.Vector3(center.x, 1.0, center.z - 7.2), zone);
    strip(`${name}-path`, new BABYLON.Vector3(center.x, 0.14, center.z - 5.2), { width: 0.08, height: 0.025, depth: 4.0 }, M.green);
  }

  function recruitmentWorld(center) {
    roomShell("recruitment-room", center, 20, 18, 4.7);
    addStudyObject("rec-1", new BABYLON.Vector3(center.x - 4.5, 0, center.z + 0.7), M.cyan, "recruitment", "Маршрут", "кандидат проходит цифровой путь от заявки до оформления");
    addStudyObject("rec-2", new BABYLON.Vector3(center.x, 0, center.z + 0.7), M.cyan, "recruitment", "Автоматизация", "здесь будут показаны автоматизированные операции 2026 года");
    addStudyObject("rec-3", new BABYLON.Vector3(center.x + 4.5, 0, center.z + 0.7), M.cyan, "recruitment", "Эффект", "сюда подставим SLA, объём и экономический эффект 2026 года");
    addCompletionTerminal("rec-terminal", center, "recruitment", M.cyan, "ПОДТВЕРДИТЬ ИТОГИ");
    addExitDoor("rec-exit", center, "recruitment");
  }

  function aiWorld(center) {
    roomShell("ai-room", center, 20, 18, 4.8);
    const core = sphere("ai-core", 2.6, new BABYLON.Vector3(center.x, 2.0, center.z + 0.8), M.glass);
    const ring = BABYLON.MeshBuilder.CreateTorus("ai-ring", { diameter: 3.8, thickness: 0.05, tessellation: 64 }, scene);
    ring.position.copyFrom(core.position);
    ring.rotation.x = Math.PI / 2.25;
    ring.material = M.teal;
    glow.addIncludedOnlyMesh(ring);
    addStudyObject("ai-1", new BABYLON.Vector3(center.x - 4.8, 0, center.z + 0.5), M.teal, "ai", "AI-агенты", "здесь будут реальные агенты и их задачи за 2026 год");
    addStudyObject("ai-2", new BABYLON.Vector3(center.x + 4.8, 0, center.z + 0.5), M.teal, "ai", "Эффект AI", "сюда подставим процессы, пользователей, FTE и экономический эффект");
    addCompletionTerminal("ai-terminal", center, "ai", M.teal, "АКТИВИРОВАТЬ AI CORE");
    addExitDoor("ai-exit", center, "ai");
    scene.onBeforeRenderObservable.add(() => { ring.rotation.z += 0.0035; core.rotation.y += 0.002; });
  }

  function mentoringWorld(center) {
    roomShell("mentoring-room", center, 20, 18, 4.7);
    const mentorPositions = [
      new BABYLON.Vector3(center.x - 4.4, 0, center.z + 1.7),
      new BABYLON.Vector3(center.x - 4.4, 0, center.z - 1.0),
      new BABYLON.Vector3(center.x - 1.8, 0, center.z + 0.4)
    ];
    const newcomerPositions = [
      new BABYLON.Vector3(center.x + 2.0, 0, center.z + 2.2),
      new BABYLON.Vector3(center.x + 4.1, 0, center.z + 1.2),
      new BABYLON.Vector3(center.x + 2.2, 0, center.z - 0.7),
      new BABYLON.Vector3(center.x + 4.3, 0, center.z - 1.8)
    ];
    mentorPositions.forEach((p, i) => {
      cylinder(`mentor-${i}`, { height: 1.0, diameter: 0.38, tessellation: 14 }, new BABYLON.Vector3(p.x, 0.75, p.z), M.amber);
      sphere(`mentor-head-${i}`, 0.45, new BABYLON.Vector3(p.x, 1.45, p.z), M.amber);
    });
    newcomerPositions.forEach((p, i) => {
      cylinder(`new-${i}`, { height: 1.0, diameter: 0.36, tessellation: 14 }, new BABYLON.Vector3(p.x, 0.75, p.z), M.white);
      sphere(`new-head-${i}`, 0.43, new BABYLON.Vector3(p.x, 1.45, p.z), M.white);
    });
    [[0,0],[1,2],[2,1]].forEach((pair, i) => {
      const a = mentorPositions[pair[0]].add(new BABYLON.Vector3(0,1.1,0));
      const b = newcomerPositions[pair[1]].add(new BABYLON.Vector3(0,1.1,0));
      const line = BABYLON.MeshBuilder.CreateLines(`mentor-line-${i}`, { points: [a,b] }, scene);
      line.color = BABYLON.Color3.FromHexString("#d99b43");
      line.alpha = 0.7;
    });
    addStudyObject("mentor-info-1", new BABYLON.Vector3(center.x - 5.6, 0, center.z - 4.0), M.amber, "mentoring", "Наставники", "покажем охват программы и количество наставников");
    addStudyObject("mentor-info-2", new BABYLON.Vector3(center.x + 5.6, 0, center.z - 4.0), M.amber, "mentoring", "Удержание", "покажем влияние наставничества на адаптацию и отток");
    addCompletionTerminal("mentor-terminal", center, "mentoring", M.amber, "ПОДТВЕРДИТЬ СЕТЬ");
    addExitDoor("mentor-exit", center, "mentoring");
  }

  function futureWorld(center) {
    roomShell("future-room", center, 20, 18, 4.8);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 2 * i / 5 - Math.PI / 2;
      const x = center.x + Math.cos(a) * 4.8;
      const z = center.z + Math.sin(a) * 3.5;
      cylinder(`future-ped-${i}`, { height: 0.23, diameter: 1.55, tessellation: 28 }, new BABYLON.Vector3(x, 0.22, z), M.violet);
      sphere(`future-orb-${i}`, 0.55, new BABYLON.Vector3(x, 1.2, z), M.violet);
    }
    addExitDoor("future-exit", center, "future");
  }

  const zoneMap = {
    hub: { spawn: new BABYLON.Vector3(0, 0.12, -6.2), facing: 0 },
    recruitment: { spawn: new BABYLON.Vector3(-42, 0.12, -5.8), facing: 0 },
    ai: { spawn: new BABYLON.Vector3(0, 0.12, 36.2), facing: 0 },
    mentoring: { spawn: new BABYLON.Vector3(42, 0.12, -5.8), facing: 0 },
    future: { spawn: new BABYLON.Vector3(0, 0.12, -47.8), facing: 0 }
  };

  hubWorld();
  recruitmentWorld(new BABYLON.Vector3(-42, 0, 0));
  aiWorld(new BABYLON.Vector3(0, 0, 42));
  mentoringWorld(new BABYLON.Vector3(42, 0, 0));
  futureWorld(new BABYLON.Vector3(0, 0, -42));

  function showToast(text, ms = 4000) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
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
      const strong = document.createElement("strong");
      strong.textContent = value;
      const span = document.createElement("span");
      span.textContent = label;
      card.append(strong, span);
      roomPanelMetrics.appendChild(card);
    });
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
    const portal = doors.portal;
    if (portal) {
      const open = completed.size === data.totalZones;
      portal.locked = !open;
      portal.leftLeaf.material = open ? M.violet : M.red;
      portal.rightLeaf.material = open ? M.violet : M.red;
      const label = worldLabels.find((x) => x.el.textContent.startsWith("2027"));
      if (label) label.el.textContent = open ? "2027 · ДОСТУП ОТКРЫТ" : `2027 · ЗАКРЫТО (${completed.size}/3)`;
    }
  }

  function travel(id) {
    currentZone = id;
    fade.classList.add("active");
    setTimeout(() => {
      collider.position.copyFrom(zoneMap[id].spawn);
      collider.rotation.y = zoneMap[id].facing;
      zoneName.textContent = id === "hub" ? "HR HUB · ИТОГИ 2026" : data.zones[id].name;
      hubGuide.style.display = id === "hub" ? "block" : "none";
      updateRoomPanel(id);
      fade.classList.remove("active");
      if (id === "hub") showToast("Вы в HR HUB. Управляйте персонажем стрелками. Подойдите к нужной двери и нажмите Enter.", 4800);
      else showToast("Осмотрите комнату, подходите к объектам и нажимайте Enter. Выход — зелёная дверь позади или клавиша Q.", 5200);
    }, 220);
  }

  function complete(id) {
    if (!completed.has(id)) {
      completed.add(id);
      updateGuide();
      showToast(`${data.zones[id].name}: итоги комнаты зафиксированы. Теперь можно выйти через зелёную дверь.`, 4600);
    } else {
      showToast(`${data.zones[id].name}: эта комната уже пройдена.`, 3000);
    }
  }

  // ---------- Controls ----------
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Space"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if ((e.code === "Enter" || e.code === "KeyE") && currentInteraction) currentInteraction.action();
    if (e.code === "KeyQ" && currentZone !== "hub") travel("hub");
  }, { passive: false });

  window.addEventListener("keyup", (e) => keys.delete(e.code));

  function updatePlayer(dt) {
    let x = 0;
    let z = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) z += 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) z -= 1;

    const dir = new BABYLON.Vector3(x, 0, z);
    walking = dir.lengthSquared() > 0.001;
    if (walking) {
      dir.normalize();
      const speed = 3.0;
      collider.moveWithCollisions(dir.scale(speed * dt));
      collider.position.y = 0.12;
      collider.rotation.y = Math.atan2(dir.x, dir.z);
      walkPhase += dt * 10;
      const swing = Math.sin(walkPhase) * 0.58;
      leftArmPivot.rotation.x = swing;
      rightArmPivot.rotation.x = -swing;
      leftLegPivot.rotation.x = -swing * 0.72;
      rightLegPivot.rotation.x = swing * 0.72;
    } else {
      leftArmPivot.rotation.x *= 0.78;
      rightArmPivot.rotation.x *= 0.78;
      leftLegPivot.rotation.x *= 0.78;
      rightLegPivot.rotation.x *= 0.78;
    }
  }

  function updateCamera() {
    const desired = collider.position.add(new BABYLON.Vector3(0, 4.6, -7.2));
    camera.position = BABYLON.Vector3.Lerp(camera.position, desired, 0.12);
    camera.setTarget(collider.position.add(new BABYLON.Vector3(0, 1.25, 0.8)));
  }

  function updateInteraction() {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const item of interactions) {
      if (item.zone !== currentZone) continue;
      const d = BABYLON.Vector3.Distance(collider.position, item.position);
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
  }

  const bootLines = [
    "HR HUB ............... READY",
    "THIRD PERSON MODE ..... READY",
    "PROJECT ZONES ........ 3 FOUND",
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
  }, 190);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    travel("hub");
  });

  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (boot.classList.contains("hidden")) updatePlayer(dt);
    updateCamera();
    updateInteraction();
    scene.render();
    updateWorldLabels();
  });

  window.addEventListener("resize", () => engine.resize());
})();