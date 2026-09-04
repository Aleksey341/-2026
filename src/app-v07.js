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

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.07, 0.075, 0.08, 1);
  scene.collisionsEnabled = true;

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 1.0;
  hemi.diffuse = new BABYLON.Color3(1, 0.98, 0.94);
  hemi.groundColor = new BABYLON.Color3(0.25, 0.25, 0.26);

  const glow = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 28 });
  glow.intensity = 0.35;

  function mat(name, hex, emissive = 0, alpha = 1) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    m.alpha = alpha;
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  }

  const M = {
    wall: mat("wall", "#d7d1c5"),
    wall2: mat("wall2", "#aaa79f"),
    floor: mat("floor", "#bcb7ad"),
    ceiling: mat("ceiling", "#25292c"),
    dark: mat("dark", "#1b2024"),
    metal: mat("metal", "#66747d"),
    wood: mat("wood", "#856b57"),
    white: mat("white", "#f2efe8"),
    cyan: mat("cyan", "#3bcaf2", 0.45),
    teal: mat("teal", "#4bd8ae", 0.42),
    amber: mat("amber", "#e8ad57", 0.42),
    violet: mat("violet", "#9b83e8", 0.42),
    green: mat("green", "#45d996", 0.5),
    red: mat("red", "#a75362", 0.25),
    skin: mat("skin", "#efb18c"),
    hair: mat("hair", "#6a4a36"),
    jacket: mat("jacket", "#c8b9a7"),
    blouse: mat("blouse", "#f4eee7"),
    pants: mat("pants", "#384554"),
    shoe: mat("shoe", "#262a2f"),
    eye: mat("eye", "#2a2420"),
    plant: mat("plant", "#4f7a5c")
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
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 18 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = material;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function lightStrip(name, pos, size, material, parent = null) {
    const m = box(name, size, pos, material, false, parent);
    glow.addIncludedOnlyMesh(m);
    return m;
  }

  function roomShell(name, center, width = 24, depth = 18, height = 4.8) {
    box(`${name}-floor`, { width, height: 0.2, depth }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${name}-ceiling`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, height, center.z), M.ceiling);
    box(`${name}-north`, { width, height, depth: 0.28 }, new BABYLON.Vector3(center.x, height / 2, center.z + depth / 2), M.wall);
    box(`${name}-south`, { width, height, depth: 0.28 }, new BABYLON.Vector3(center.x, height / 2, center.z - depth / 2), M.wall);
    box(`${name}-west`, { width: 0.28, height, depth }, new BABYLON.Vector3(center.x - width / 2, height / 2, center.z), M.wall2);
    box(`${name}-east`, { width: 0.28, height, depth }, new BABYLON.Vector3(center.x + width / 2, height / 2, center.z), M.wall2);

    for (let x = -width / 2 + 3; x <= width / 2 - 3; x += 6) {
      for (let z = -depth / 2 + 3; z <= depth / 2 - 3; z += 6) {
        box(`${name}-lamp-${x}-${z}`, { width: 2.4, height: 0.05, depth: 0.55 }, new BABYLON.Vector3(center.x + x, height - 0.12, center.z + z), M.white, false);
        const l = new BABYLON.PointLight(`${name}-pl-${x}-${z}`, new BABYLON.Vector3(center.x + x, height - 0.45, center.z + z), scene);
        l.intensity = 0.28;
        l.range = 8;
      }
    }
  }

  function createPlant(name, pos) {
    cyl(`${name}-pot`, { height: 0.62, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 20 }, new BABYLON.Vector3(pos.x, 0.4, pos.z), M.wood);
    cyl(`${name}-stem`, { height: 0.95, diameter: 0.10, tessellation: 12 }, new BABYLON.Vector3(pos.x, 1.0, pos.z), M.plant);
    [[0,1.48,0],[.28,1.4,.08],[-.27,1.4,-.08],[.1,1.68,-.1]].forEach((o, i) => {
      const leaf = sph(`${name}-leaf-${i}`, 0.68, new BABYLON.Vector3(pos.x + o[0], o[1], pos.z + o[2]), M.plant);
      leaf.scaling.y = 1.35;
    });
  }

  // ---------- Third-person character ----------
  const player = BABYLON.MeshBuilder.CreateBox("playerCollider", { width: 0.7, height: 1.7, depth: 0.7 }, scene);
  player.position = new BABYLON.Vector3(0, 0.95, -4.5);
  player.isVisible = false;
  player.isPickable = false;
  player.ellipsoid = new BABYLON.Vector3(0.34, 0.85, 0.34);
  player.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);

  const avatar = new BABYLON.TransformNode("cartoonAvatar", scene);
  avatar.parent = player;
  avatar.position.y = -0.85;

  function localBox(name, size, pos, material, parent = avatar) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos); m.material = material; m.parent = parent; m.isPickable = false; return m;
  }
  function localCyl(name, options, pos, material, parent = avatar) {
    const m = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    m.position.copyFrom(pos); m.material = material; m.parent = parent; m.isPickable = false; return m;
  }
  function localSph(name, diameter, pos, material, parent = avatar) {
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 18 }, scene);
    m.position.copyFrom(pos); m.material = material; m.parent = parent; m.isPickable = false; return m;
  }

  // Larger stylized figure so it is unmistakably visible on screen.
  localCyl("torso", { height: 0.86, diameterTop: 0.54, diameterBottom: 0.66, tessellation: 20 }, new BABYLON.Vector3(0, 1.28, 0), M.jacket);
  localBox("blouse", { width: 0.24, height: 0.55, depth: 0.055 }, new BABYLON.Vector3(0, 1.30, 0.33), M.blouse);
  localSph("head", 0.62, new BABYLON.Vector3(0, 2.02, 0), M.skin);
  const hairTop = localSph("hairTop", 0.68, new BABYLON.Vector3(0, 2.13, -0.02), M.hair);
  hairTop.scaling.y = 0.60;
  localSph("hairL", 0.30, new BABYLON.Vector3(-0.28, 2.05, -0.03), M.hair);
  localSph("hairR", 0.30, new BABYLON.Vector3(0.28, 2.05, -0.03), M.hair);
  localSph("nose", 0.09, new BABYLON.Vector3(0, 2.01, 0.31), M.skin);
  localSph("eyeL", 0.055, new BABYLON.Vector3(-0.11, 2.08, 0.29), M.eye);
  localSph("eyeR", 0.055, new BABYLON.Vector3(0.11, 2.08, 0.29), M.eye);

  const leftArm = new BABYLON.TransformNode("leftArmPivot", scene); leftArm.parent = avatar; leftArm.position = new BABYLON.Vector3(-0.40, 1.55, 0);
  const rightArm = new BABYLON.TransformNode("rightArmPivot", scene); rightArm.parent = avatar; rightArm.position = new BABYLON.Vector3(0.40, 1.55, 0);
  localCyl("leftArm", { height: 0.78, diameter: 0.18, tessellation: 12 }, new BABYLON.Vector3(0, -0.36, 0), M.jacket, leftArm);
  localCyl("rightArm", { height: 0.78, diameter: 0.18, tessellation: 12 }, new BABYLON.Vector3(0, -0.36, 0), M.jacket, rightArm);
  localSph("leftHand", 0.18, new BABYLON.Vector3(0, -0.77, 0), M.skin, leftArm);
  localSph("rightHand", 0.18, new BABYLON.Vector3(0, -0.77, 0), M.skin, rightArm);

  const leftLeg = new BABYLON.TransformNode("leftLegPivot", scene); leftLeg.parent = avatar; leftLeg.position = new BABYLON.Vector3(-0.17, 0.89, 0);
  const rightLeg = new BABYLON.TransformNode("rightLegPivot", scene); rightLeg.parent = avatar; rightLeg.position = new BABYLON.Vector3(0.17, 0.89, 0);
  localCyl("leftLeg", { height: 0.78, diameter: 0.22, tessellation: 12 }, new BABYLON.Vector3(0, -0.37, 0), M.pants, leftLeg);
  localCyl("rightLeg", { height: 0.78, diameter: 0.22, tessellation: 12 }, new BABYLON.Vector3(0, -0.37, 0), M.pants, rightLeg);
  localBox("leftShoe", { width: 0.26, height: 0.13, depth: 0.42 }, new BABYLON.Vector3(0, -0.77, 0.10), M.shoe, leftLeg);
  localBox("rightShoe", { width: 0.26, height: 0.13, depth: 0.42 }, new BABYLON.Vector3(0, -0.77, 0.10), M.shoe, rightLeg);

  const camera = new BABYLON.FreeCamera("thirdPersonCamera", new BABYLON.Vector3(0, 3.4, -8.0), scene);
  camera.fov = 0.80;
  camera.minZ = 0.08;

  const keyState = new Set();
  let yaw = 0;
  let walkPhase = 0;
  let walking = false;

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter","Space"].includes(e.code)) e.preventDefault();
    keyState.add(e.code);
  });
  window.addEventListener("keyup", (e) => keyState.delete(e.code));

  // ---------- UI labels projected from world ----------
  const worldLabels = [];
  function addLabel(text, pos, zone, accent = "#9edff0", kind = "normal") {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.position = "absolute";
    el.style.zIndex = "12";
    el.style.pointerEvents = "none";
    el.style.transform = "translate(-50%, -50%)";
    el.style.padding = kind === "door" ? "9px 13px" : "6px 9px";
    el.style.borderRadius = "6px";
    el.style.border = `1px solid ${accent}99`;
    el.style.background = kind === "door" ? "rgba(16,20,22,.92)" : "rgba(16,20,22,.78)";
    el.style.color = "#fff";
    el.style.fontSize = kind === "door" ? "12px" : "10px";
    el.style.fontWeight = "700";
    el.style.letterSpacing = ".03em";
    el.style.whiteSpace = "nowrap";
    el.style.boxShadow = "0 8px 24px rgba(0,0,0,.24)";
    hud.appendChild(el);
    worldLabels.push({ el, pos, zone });
    return el;
  }

  // ---------- Interactions ----------
  const interactions = [];
  const doors = {};
  const completed = new Set();
  let currentZone = "hub";
  let currentInteraction = null;
  let toastTimer = null;
  let transitionBusy = false;

  function createDoor(name, pos, accentMat, label, targetZone, zone = "hub", locked = false) {
    const frame = new BABYLON.TransformNode(`${name}-root`, scene);
    frame.position.copyFrom(pos);
    box(`${name}-frameL`, { width: 0.25, height: 3.0, depth: 0.45 }, new BABYLON.Vector3(-1.65, 1.5, 0), M.dark, false, frame);
    box(`${name}-frameR`, { width: 0.25, height: 3.0, depth: 0.45 }, new BABYLON.Vector3(1.65, 1.5, 0), M.dark, false, frame);
    box(`${name}-frameT`, { width: 3.55, height: 0.25, depth: 0.45 }, new BABYLON.Vector3(0, 2.9, 0), M.dark, false, frame);
    lightStrip(`${name}-accent`, new BABYLON.Vector3(0, 2.78, -0.26), { width: 2.7, height: 0.05, depth: 0.06 }, accentMat, frame);
    const left = box(`${name}-left`, { width: 1.42, height: 2.62, depth: 0.14 }, new BABYLON.Vector3(-0.72, 1.43, 0), locked ? M.red : M.metal, false, frame);
    const right = box(`${name}-right`, { width: 1.42, height: 2.62, depth: 0.14 }, new BABYLON.Vector3(0.72, 1.43, 0), locked ? M.red : M.metal, false, frame);
    const entry = { name, frame, left, right, targetZone, locked, baseL: -0.72, baseR: 0.72 };
    doors[name] = entry;
    addLabel(label, pos.add(new BABYLON.Vector3(0, 3.55, -0.15)), zone, locked ? "#c87a86" : (name.includes("exit") ? "#66e4a5" : "#8fdff3"), "door");
    interactions.push({ zone, pos: pos.add(new BABYLON.Vector3(0, 0.9, -1.7)), radius: 2.2, label: locked ? "Enter — проверить доступ" : `Enter — открыть: ${label}`, action: () => activateDoor(entry) });
    return entry;
  }

  function openDoor(entry, callback) {
    if (transitionBusy) return;
    transitionBusy = true;
    const ease = new BABYLON.CubicEase(); ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-L`, entry.left, "position.x", 60, 24, entry.left.position.x, -1.55, 0, ease);
    BABYLON.Animation.CreateAndStartAnimation(`${entry.name}-R`, entry.right, "position.x", 60, 24, entry.right.position.x, 1.55, 0, ease, () => {
      setTimeout(() => {
        callback();
        entry.left.position.x = entry.baseL;
        entry.right.position.x = entry.baseR;
        transitionBusy = false;
      }, 180);
    });
  }

  function activateDoor(entry) {
    if (entry.name === "portal" && completed.size < data.totalZones) {
      showToast(`Переход в 2027 закрыт. Пройдено ${completed.size} / ${data.totalZones}.`, 3200);
      return;
    }
    openDoor(entry, () => travel(entry.targetZone));
  }

  function createTerminal(zone, pos, accentMat, accentHex, text) {
    box(`${zone}-terminal-base`, { width: 2.4, height: 0.85, depth: 1.1 }, new BABYLON.Vector3(pos.x, 0.52, pos.z), M.wood, false);
    const top = box(`${zone}-terminal-top`, { width: 2.1, height: 0.1, depth: 0.92 }, new BABYLON.Vector3(pos.x, 0.99, pos.z), accentMat, false);
    glow.addIncludedOnlyMesh(top);
    addLabel(text, new BABYLON.Vector3(pos.x, 1.65, pos.z), zone, accentHex, "door");
    interactions.push({ zone, pos: new BABYLON.Vector3(pos.x, 0.9, pos.z - 1.0), radius: 2.0, label: `Enter — ${text}`, action: () => complete(zone) });
  }

  function addExhibit(zone, pos, label, accentMat, accentHex, description) {
    cyl(`${zone}-${label}-ped`, { height: 0.26, diameter: 1.5, tessellation: 28 }, new BABYLON.Vector3(pos.x, 0.2, pos.z), accentMat);
    const obj = sph(`${zone}-${label}-obj`, 0.65, new BABYLON.Vector3(pos.x, 0.85, pos.z), accentMat);
    glow.addIncludedOnlyMesh(obj);
    addLabel(label, new BABYLON.Vector3(pos.x, 1.55, pos.z), zone, accentHex);
    interactions.push({ zone, pos: new BABYLON.Vector3(pos.x, 0.8, pos.z - 1.1), radius: 1.8, label: `Enter — изучить: ${label}`, action: () => showToast(description, 4200) });
  }

  // ---------- World ----------
  const centers = {
    hub: new BABYLON.Vector3(0,0,0),
    recruitment: new BABYLON.Vector3(-40,0,0),
    ai: new BABYLON.Vector3(0,0,40),
    mentoring: new BABYLON.Vector3(40,0,0),
    future: new BABYLON.Vector3(0,0,-40)
  };

  roomShell("hub", centers.hub, 24, 18, 4.8);
  box("hub-rug", { width: 7.0, height: 0.03, depth: 4.2 }, new BABYLON.Vector3(0,0.13,-1.0), M.dark, false);
  box("hub-desk", { width: 4.6, height: 0.9, depth: 1.2 }, new BABYLON.Vector3(0,0.55,2.2), M.wood, false);
  createPlant("hubPlantL", new BABYLON.Vector3(-9.5,0,-6.3));
  createPlant("hubPlantR", new BABYLON.Vector3(9.5,0,-6.3));
  addLabel("HR HUB · ИТОГИ 2026", new BABYLON.Vector3(0,3.6,6.9), "hub", "#9edff0", "door");

  createDoor("recruitmentDoor", new BABYLON.Vector3(-7.2,0,8.75), M.cyan, "01 · ПРИЁМ", "recruitment", "hub");
  createDoor("aiDoor", new BABYLON.Vector3(0,0,8.75), M.teal, "02 · AI LAB", "ai", "hub");
  createDoor("mentoringDoor", new BABYLON.Vector3(7.2,0,8.75), M.amber, "03 · НАСТАВНИЧЕСТВО", "mentoring", "hub");
  createDoor("portal", new BABYLON.Vector3(0,0,-8.75), M.violet, "2027 · ЗАКРЫТО", "future", "hub", true);

  roomShell("recruitment", centers.recruitment, 24, 18, 4.8);
  addLabel("01 · ПРИЁМ", centers.recruitment.add(new BABYLON.Vector3(0,3.6,6.9)), "recruitment", "#67d8f4", "door");
  [
    [-6,2,"КАНДИДАТ","Начало цифрового маршрута кандидата."],
    [-3,2,"ЗАЯВКА","Электронная заявка на оформление."],
    [0,2,"ДОКУМЕНТЫ","Проверка и подготовка комплекта документов."],
    [3,2,"ПРОВЕРКА","Автоматизированные контрольные операции."],
    [6,2,"СОТРУДНИК","Завершение приёма и готовность к работе."]
  ].forEach(v => addExhibit("recruitment", centers.recruitment.add(new BABYLON.Vector3(v[0],0,v[1])), v[2], M.cyan, "#67d8f4", v[3]));
  createTerminal("recruitment", centers.recruitment.add(new BABYLON.Vector3(0,0,-4.3)), M.cyan, "#67d8f4", "ПОДТВЕРДИТЬ ИТОГИ");
  createDoor("recruitment-exit", centers.recruitment.add(new BABYLON.Vector3(0,0,-8.75)), M.green, "← HR HUB · ВЫХОД", "hub", "recruitment");

  roomShell("ai", centers.ai, 24, 18, 4.8);
  addLabel("02 · AI LAB", centers.ai.add(new BABYLON.Vector3(0,3.6,6.9)), "ai", "#70e2bd", "door");
  const core = sph("ai-core", 2.3, centers.ai.add(new BABYLON.Vector3(0,2.0,1.5)), M.teal); glow.addIncludedOnlyMesh(core);
  const ring = BABYLON.MeshBuilder.CreateTorus("ai-ring", { diameter: 3.5, thickness: 0.05, tessellation: 64 }, scene); ring.position = centers.ai.add(new BABYLON.Vector3(0,2.0,1.5)); ring.rotation.x = 1.1; ring.material = M.cyan; glow.addIncludedOnlyMesh(ring);
  [[-5,2,"AI AGENT 01"],[5,2,"AI AGENT 02"],[-5,-1,"AI AGENT 03"],[5,-1,"AI AGENT 04"]].forEach(v => addExhibit("ai", centers.ai.add(new BABYLON.Vector3(v[0],0,v[1])), v[2], M.teal, "#70e2bd", "Здесь будет реальный AI-проект 2026: задача → решение → эффект."));
  createTerminal("ai", centers.ai.add(new BABYLON.Vector3(0,0,-4.3)), M.teal, "#70e2bd", "АКТИВИРОВАТЬ AI CORE");
  createDoor("ai-exit", centers.ai.add(new BABYLON.Vector3(0,0,-8.75)), M.green, "← HR HUB · ВЫХОД", "hub", "ai");

  roomShell("mentoring", centers.mentoring, 24, 18, 4.8);
  addLabel("03 · НАСТАВНИЧЕСТВО", centers.mentoring.add(new BABYLON.Vector3(0,3.6,6.9)), "mentoring", "#edbd70", "door");
  for (let i = 0; i < 10; i++) {
    const x = -6 + (i % 5) * 3;
    const z = 2.5 - Math.floor(i / 5) * 3.0;
    const mentor = i < 3;
    cyl(`person-${i}-body`, { height: 0.9, diameter: 0.36, tessellation: 16 }, centers.mentoring.add(new BABYLON.Vector3(x,0.75,z)), mentor ? M.amber : M.white);
    sph(`person-${i}-head`, 0.42, centers.mentoring.add(new BABYLON.Vector3(x,1.43,z)), mentor ? M.amber : M.white);
  }
  addExhibit("mentoring", centers.mentoring.add(new BABYLON.Vector3(-4,0,-3)), "НОВИЧКИ", M.amber, "#edbd70", "Здесь показываем охват новичков программой наставничества.");
  addExhibit("mentoring", centers.mentoring.add(new BABYLON.Vector3(4,0,-3)), "НАСТАВНИКИ", M.amber, "#edbd70", "Здесь показываем количество наставников и эффект программы.");
  createTerminal("mentoring", centers.mentoring.add(new BABYLON.Vector3(0,0,-4.3)), M.amber, "#edbd70", "ПОДТВЕРДИТЬ СЕТЬ");
  createDoor("mentoring-exit", centers.mentoring.add(new BABYLON.Vector3(0,0,-8.75)), M.green, "← HR HUB · ВЫХОД", "hub", "mentoring");

  roomShell("future", centers.future, 24, 18, 4.8);
  addLabel("2027 · NEXT CHAPTER", centers.future.add(new BABYLON.Vector3(0,3.6,6.9)), "future", "#c3b4f5", "door");
  ["AI","АВТОМАТИЗАЦИЯ","ЛЮДИ","ЭФФЕКТИВНОСТЬ","КЛИЕНТСКИЙ СЕРВИС"].forEach((label,i) => {
    const a = Math.PI*2*i/5 - Math.PI/2;
    addExhibit("future", centers.future.add(new BABYLON.Vector3(Math.cos(a)*5.2,0,Math.sin(a)*3.6)), label, M.violet, "#c3b4f5", "Здесь появится утверждённый приоритет 2027 года.");
  });
  createDoor("future-exit", centers.future.add(new BABYLON.Vector3(0,0,-8.75)), M.green, "← HR HUB · ВЫХОД", "hub", "future");

  // ---------- Travel / UI ----------
  const spawns = {
    hub: { p: new BABYLON.Vector3(0,0.95,-4.5), yaw: 0 },
    recruitment: { p: centers.recruitment.add(new BABYLON.Vector3(0,0.95,-4.5)), yaw: 0 },
    ai: { p: centers.ai.add(new BABYLON.Vector3(0,0.95,-4.5)), yaw: 0 },
    mentoring: { p: centers.mentoring.add(new BABYLON.Vector3(0,0.95,-4.5)), yaw: 0 },
    future: { p: centers.future.add(new BABYLON.Vector3(0,0.95,-4.5)), yaw: 0 }
  };

  function showToast(text, ms = 3600) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function updateRoomPanel() {
    if (currentZone === "hub") {
      roomPanel.classList.add("hidden");
      hubGuide.style.display = "block";
      return;
    }
    hubGuide.style.display = "none";
    roomPanel.classList.remove("hidden");
    const z = data.zones[currentZone];
    roomPanelTitle.textContent = z?.name || currentZone.toUpperCase();
    roomPanelSubtitle.textContent = z?.intro || z?.subtitle || "";
    roomPanelProcess.textContent = currentZone === "recruitment" ? "Кандидат → заявка → документы → проверка → сотрудник" : currentZone === "ai" ? "Проблема → AI-решение → измеримый эффект" : currentZone === "mentoring" ? "Новичок → наставник → адаптация → удержание" : "Планы следующего года";
    roomPanelMetrics.innerHTML = "";
    (z?.metrics || []).slice(0,4).forEach(m => {
      const div = document.createElement("div");
      div.className = "metric-chip";
      div.innerHTML = `<strong>${m[0]}</strong><span>${m[1]}</span>`;
      roomPanelMetrics.appendChild(div);
    });
  }

  function travel(zone) {
    currentZone = zone;
    fade.classList.add("active");
    setTimeout(() => {
      player.position.copyFrom(spawns[zone].p);
      yaw = spawns[zone].yaw;
      avatar.rotation.y = yaw;
      zoneName.textContent = zone === "hub" ? "HR HUB · ИТОГИ 2026" : (data.zones[zone]?.name || zone.toUpperCase());
      updateRoomPanel();
      fade.classList.remove("active");
      if (zone === "hub") showToast("Управляйте мультяшным персонажем стрелками. Подойдите к двери и нажмите Enter.", 4600);
      else showToast("Осмотрите комнату. Enter — изучить объект. Зелёная дверь сзади ведёт обратно в HR HUB.", 4300);
    }, 250);
  }

  function complete(zone) {
    if (["recruitment","ai","mentoring"].includes(zone) && !completed.has(zone)) {
      completed.add(zone);
      progressText.textContent = `${completed.size} / ${data.totalZones}`;
      document.querySelectorAll(".guide-row").forEach(row => {
        if (completed.has(row.dataset.zone)) { row.classList.add("complete"); const i=row.querySelector("i"); if(i)i.textContent="✓"; }
      });
      if (completed.size === data.totalZones) {
        doors.portal.locked = false;
        doors.portal.left.material = M.violet;
        doors.portal.right.material = M.violet;
        showToast("Все три направления пройдены. Портал 2027 открыт.", 4800);
      } else showToast(`${data.zones[zone].name}: результаты подтверждены. Теперь можно выйти в HR HUB.`, 4200);
    } else showToast("Эта зона уже подтверждена.", 2600);
  }

  // ---------- Game loop ----------
  function updatePlayer(dt) {
    const turnSpeed = 1.9;
    const moveSpeed = 2.6;
    const backSpeed = 1.8;
    if (keyState.has("ArrowLeft")) yaw -= turnSpeed * dt;
    if (keyState.has("ArrowRight")) yaw += turnSpeed * dt;
    avatar.rotation.y = yaw;

    const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    let speed = 0;
    if (keyState.has("ArrowUp")) speed = moveSpeed;
    if (keyState.has("ArrowDown")) speed = -backSpeed;
    walking = Math.abs(speed) > 0.01;
    if (walking) player.moveWithCollisions(forward.scale(speed * dt));

    if (walking) {
      walkPhase += dt * 9;
      const swing = Math.sin(walkPhase) * 0.48;
      leftArm.rotation.x = swing;
      rightArm.rotation.x = -swing;
      leftLeg.rotation.x = -swing;
      rightLeg.rotation.x = swing;
      avatar.position.y = -0.85 + Math.abs(Math.sin(walkPhase * 2)) * 0.025;
    } else {
      leftArm.rotation.x *= 0.78; rightArm.rotation.x *= 0.78; leftLeg.rotation.x *= 0.78; rightLeg.rotation.x *= 0.78;
      avatar.position.y += (-0.85 - avatar.position.y) * 0.2;
    }
  }

  function updateCamera() {
    const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const desired = player.position.subtract(forward.scale(3.45)).add(new BABYLON.Vector3(0, 2.65, 0));
    camera.position = BABYLON.Vector3.Lerp(camera.position, desired, 0.18);
    camera.setTarget(player.position.add(new BABYLON.Vector3(0, 0.75, 0)).add(forward.scale(0.8)));
  }

  function updateLabels() {
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    for (const item of worldLabels) {
      if (item.zone !== currentZone) { item.el.style.display = "none"; continue; }
      const p = BABYLON.Vector3.Project(item.pos, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), viewport);
      if (p.z < 0 || p.z > 1) item.el.style.display = "none";
      else { item.el.style.display = "block"; item.el.style.left = `${p.x}px`; item.el.style.top = `${p.y}px`; }
    }
  }

  function updateInteraction() {
    let nearest = null; let nearestD = Infinity;
    for (const item of interactions) {
      if (item.zone !== currentZone) continue;
      const d = BABYLON.Vector3.Distance(player.position, item.pos);
      if (d < item.radius && d < nearestD) { nearest = item; nearestD = d; }
    }
    currentInteraction = nearest;
    if (nearest) { prompt.textContent = nearest.label; prompt.classList.remove("hidden"); }
    else prompt.classList.add("hidden");
  }

  window.addEventListener("keydown", (e) => {
    if ((e.code === "Enter" || e.code === "KeyE") && currentInteraction) currentInteraction.action();
    if (e.code === "KeyQ" && currentZone !== "hub") travel("hub");
  });

  const bootLines = [
    "THIRD PERSON MODE ..... READY",
    "CARTOON AVATAR ........ READY",
    "ARROW KEYS ............ READY",
    "PROJECT ROOMS ......... 3 FOUND",
    "",
    "ЦК БОРУП · ИТОГИ 2026"
  ];
  let bootIndex = 0;
  const bootTimer = setInterval(() => {
    bootLog.textContent += `${bootLines[bootIndex]}\n`;
    bootIndex++;
    if (bootIndex >= bootLines.length) { clearInterval(bootTimer); enterButton.disabled = false; }
  }, 180);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    travel("hub");
  });

  let last = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (boot.classList.contains("hidden")) {
      updatePlayer(dt);
      updateCamera();
      updateInteraction();
      updateLabels();
      ring.rotation.z += 0.006;
    }
    scene.render();
  });
  window.addEventListener("resize", () => engine.resize());
})();
