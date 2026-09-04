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
  let currentInteraction = null;
  let toastTimer = null;
  let currentZone = "hub";

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.015, 0.035, 0.05, 1);
  scene.gravity = new BABYLON.Vector3(0, -0.32, 0);
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.006;
  scene.fogColor = new BABYLON.Color3(0.018, 0.045, 0.06);

  const camera = new BABYLON.UniversalCamera("player", new BABYLON.Vector3(0, 1.7, -4.3), scene);
  camera.speed = 0.18;
  camera.angularSensibility = 3200;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.42, 0.85, 0.42);
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];
  camera.attachControl(canvas, true);
  camera.setTarget(new BABYLON.Vector3(0, 1.65, 3));

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.54;

  const makeMaterial = (name, hex, emissive = 0) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.025, 0.035, 0.045);
    if (emissive > 0) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  };

  const M = {
    wall: makeMaterial("wall", "#20343f"),
    wallAlt: makeMaterial("wallAlt", "#182a34"),
    floor: makeMaterial("floor", "#0d171d"),
    ceiling: makeMaterial("ceiling", "#17252d"),
    accent: makeMaterial("accent", "#4cd3ff", 0.55),
    green: makeMaterial("green", "#68efc0", 0.48),
    warm: makeMaterial("warm", "#f0ad68", 0.38),
    violet: makeMaterial("violet", "#a980ff", 0.42),
    locked: makeMaterial("locked", "#8a3d4d", 0.26),
    dark: makeMaterial("dark", "#071019"),
    white: makeMaterial("white", "#d7edf5", 0.05),
    glass: makeMaterial("glass", "#17445a", 0.12)
  };

  function box(name, size, p, material, collisions = true) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(p);
    mesh.material = material;
    mesh.checkCollisions = collisions;
    return mesh;
  }

  function billboardText(name, lines, p, width = 4.5, height = 1.2, color = "#effbff", fontSize = 54) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, {
      width,
      height,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    plane.position.copyFrom(p);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.isPickable = false;

    const tex = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1024, height: 320 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 1024, 320);
    ctx.fillStyle = "rgba(4,14,22,.88)";
    ctx.fillRect(0, 0, 1024, 320);
    ctx.strokeStyle = "rgba(84,211,255,.55)";
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 1016, 312);

    const rows = Array.isArray(lines) ? lines : String(lines).split("\n");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const gap = 80;
    const startY = 160 - ((rows.length - 1) * gap) / 2;
    rows.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? color : "#a9cedd";
      ctx.font = `${i === 0 ? 700 : 500} ${i === 0 ? fontSize : Math.max(30, fontSize - 16)}px Arial`;
      ctx.fillText(line, 512, startY + i * gap, 920);
    });
    tex.update();

    const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.backFaceCulling = false;
    plane.material = mat;
    return plane;
  }

  function room(id, center, width, depth, height = 4, accent = M.accent) {
    const t = 0.3;
    box(`${id}-floor`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${id}-ceiling`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, height, center.z), M.ceiling);
    box(`${id}-north`, { width, height, depth: t }, new BABYLON.Vector3(center.x, height / 2, center.z + depth / 2), M.wall);
    box(`${id}-south`, { width, height, depth: t }, new BABYLON.Vector3(center.x, height / 2, center.z - depth / 2), M.wall);
    box(`${id}-west`, { width: t, height, depth }, new BABYLON.Vector3(center.x - width / 2, height / 2, center.z), M.wallAlt);
    box(`${id}-east`, { width: t, height, depth }, new BABYLON.Vector3(center.x + width / 2, height / 2, center.z), M.wallAlt);

    for (let z = -depth / 2 + 2; z <= depth / 2 - 2; z += 4) {
      const strip = box(`${id}-light-${z}`, { width: Math.min(width - 2, 7), height: 0.05, depth: 0.16 }, new BABYLON.Vector3(center.x, height - 0.13, center.z + z), accent, false);
      strip.material = accent;
    }

    const light = new BABYLON.PointLight(`${id}-light-main`, new BABYLON.Vector3(center.x, height - 0.7, center.z), scene);
    light.diffuse = accent.diffuseColor;
    light.intensity = 0.55;
    light.range = 18;
  }

  function floorPath(name, from, to, material) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const mesh = box(name, { width: 0.18, height: 0.025, depth: len }, new BABYLON.Vector3((from.x + to.x) / 2, 0.12, (from.z + to.z) / 2), material, false);
    mesh.rotation.y = Math.atan2(dx, dz);
    return mesh;
  }

  function door(name, p, rotY, material, title, subtitle) {
    const frame = box(`${name}-frame`, { width: 3.15, height: 3.0, depth: 0.32 }, new BABYLON.Vector3(p.x, 1.5, p.z), material, false);
    frame.rotation.y = rotY;
    const panel = box(`${name}-panel`, { width: 2.55, height: 2.45, depth: 0.38 }, new BABYLON.Vector3(p.x, 1.35, p.z), M.dark, false);
    panel.rotation.y = rotY;
    billboardText(`${name}-sign`, [title, subtitle], new BABYLON.Vector3(p.x, 3.18, p.z), 3.6, 0.85, "#f4fdff", 46);
    return { frame, panel };
  }

  function projectBoard(name, title, subtitle, p, color = "#effbff") {
    return billboardText(name, [title, subtitle], p, 5.8, 1.35, color, 50);
  }

  function metricBoards(prefix, metrics, center, y = 1.55) {
    const positions = [
      [-3.2, 1.7], [3.2, 1.7], [-3.2, -1.7], [3.2, -1.7]
    ];
    metrics.slice(0, 4).forEach((m, i) => {
      const [dx, dz] = positions[i];
      billboardText(`${prefix}-${i}`, [m[0], m[1]], new BABYLON.Vector3(center.x + dx, y, center.z + dz), 3.1, 1.05, "#ffffff", 62);
    });
  }

  const zones = {
    hub: { pos: new BABYLON.Vector3(0, 1.7, -4.3), target: new BABYLON.Vector3(0, 1.6, 2.5) },
    recruitment: { pos: new BABYLON.Vector3(-33, 1.7, -4.2), target: new BABYLON.Vector3(-33, 1.6, 1.5) },
    ai: { pos: new BABYLON.Vector3(0, 1.7, 31.5), target: new BABYLON.Vector3(0, 1.7, 36.5) },
    mentoring: { pos: new BABYLON.Vector3(33, 1.7, -4.2), target: new BABYLON.Vector3(33, 1.6, 1.5) },
    future: { pos: new BABYLON.Vector3(0, 1.7, -39.5), target: new BABYLON.Vector3(0, 1.7, -35) }
  };

  // ---------------- HUB ----------------
  room("hub", new BABYLON.Vector3(0, 0, 0), 20, 20, 4.2, M.accent);
  projectBoard("hub-main", "HR HUB · ИТОГИ 2026", "Центральный зал · 3 пилотные проектные зоны", new BABYLON.Vector3(0, 2.6, 2.2), "#a7e9ff");
  billboardText("hub-howto", ["КАК ПРОХОДИТЬ", "Выберите дверь → подойдите → нажмите E"], new BABYLON.Vector3(0, 1.35, 1.8), 5.4, 1.05, "#76ddff", 40);

  const hubRing = BABYLON.MeshBuilder.CreateTorus("hub-ring", { diameter: 4.6, thickness: 0.12, tessellation: 64 }, scene);
  hubRing.position = new BABYLON.Vector3(0, 0.35, 0);
  hubRing.rotation.x = Math.PI / 2;
  hubRing.material = M.accent;

  // Реальные дверные зоны, чтобы пространство читалось как помещение.
  door("door-rec", new BABYLON.Vector3(-9.55, 0, 0), Math.PI / 2, M.accent, "01 · ПРИЁМ", "EMPLOYEE ENTRY");
  door("door-ai", new BABYLON.Vector3(0, 0, 9.55), 0, M.green, "02 · AI LAB", "DIGITAL HR");
  door("door-mentor", new BABYLON.Vector3(9.55, 0, 0), Math.PI / 2, M.warm, "03 · НАСТАВНИЧЕСТВО", "PEOPLE DEVELOPMENT");
  const portalDoor = door("door-2027", new BABYLON.Vector3(0, 0, -9.55), 0, M.locked, "2027 · ЗАКРЫТО", "Откроется после 3 / 3");

  floorPath("path-rec", new BABYLON.Vector3(-1.2, 0, 0), new BABYLON.Vector3(-8.3, 0, 0), M.accent);
  floorPath("path-ai", new BABYLON.Vector3(0, 0, 1.2), new BABYLON.Vector3(0, 0, 8.3), M.green);
  floorPath("path-mentor", new BABYLON.Vector3(1.2, 0, 0), new BABYLON.Vector3(8.3, 0, 0), M.warm);
  floorPath("path-2027", new BABYLON.Vector3(0, 0, -1.2), new BABYLON.Vector3(0, 0, -8.3), M.locked);

  // ---------------- ПРИЁМ ----------------
  room("recruitment", new BABYLON.Vector3(-33, 0, 0), 18, 16, 4.1, M.accent);
  projectBoard("rec-main", "ПРОЕКТ 01 · ПРИЁМ", "Цифровой маршрут: кандидат → сотрудник", new BABYLON.Vector3(-33, 2.75, 5.8), "#a7e9ff");
  const stages = ["КАНДИДАТ", "ЗАЯВКА", "ДОКУМЕНТЫ", "ПРОВЕРКА", "ОФОРМЛЕНИЕ", "СОТРУДНИК"];
  stages.forEach((s, i) => {
    const x = -38 + i * 2;
    box(`rec-stage-${i}`, { width: 1.35, height: 0.12, depth: 1.35 }, new BABYLON.Vector3(x, 0.22, 0.8), i === 5 ? M.green : M.accent, false);
    billboardText(`rec-label-${i}`, s, new BABYLON.Vector3(x, 1.15, 0.8), 1.65, 0.48, i === 5 ? "#8fffd5" : "#b8ecff", 30);
    if (i < stages.length - 1) floorPath(`rec-link-${i}`, new BABYLON.Vector3(x + 0.7, 0, 0.8), new BABYLON.Vector3(x + 1.3, 0, 0.8), M.accent);
  });
  metricBoards("rec-metric", data.zones.recruitment.metrics, new BABYLON.Vector3(-33, 0, -2.2));
  const recAction = door("rec-action", new BABYLON.Vector3(-33, 0, -7.55), 0, M.green, "ЗАПУСТИТЬ РЕЗУЛЬТАТ", "E · отметить зону пройденной");
  door("rec-back", new BABYLON.Vector3(-41.55, 0, 0), Math.PI / 2, M.dark, "← HR HUB", "вернуться в центральный зал");

  // ---------------- AI LAB ----------------
  room("ai", new BABYLON.Vector3(0, 0, 36), 18, 18, 4.5, M.green);
  projectBoard("ai-main", "ПРОЕКТ 02 · AI LAB", "ИИ-решения, агенты и измеримый эффект", new BABYLON.Vector3(0, 3.0, 42.3), "#9effd8");
  const sphere = BABYLON.MeshBuilder.CreateSphere("ai-core", { diameter: 3.2, segments: 32 }, scene);
  sphere.position = new BABYLON.Vector3(0, 2.1, 36);
  sphere.material = M.green;
  [[-5.2,33], [5.2,33], [-5.2,39], [5.2,39]].forEach((p, i) => {
    box(`agent-base-${i}`, { width: 2.3, height: 0.18, depth: 2.3 }, new BABYLON.Vector3(p[0], 0.2, p[1]), M.accent, false);
    billboardText(`agent-${i}`, [`AI AGENT 0${i + 1}`, "данные 2026 будут подставлены"], new BABYLON.Vector3(p[0], 1.4, p[1]), 3.0, 0.9, "#a9f7ff", 36);
  });
  metricBoards("ai-metric", data.zones.ai.metrics, new BABYLON.Vector3(0, 0, 36), 3.1);
  door("ai-action", new BABYLON.Vector3(0, 0, 27.45), 0, M.green, "АКТИВИРОВАТЬ AI CORE", "E · отметить зону пройденной");
  door("ai-back", new BABYLON.Vector3(-8.55, 0, 36), Math.PI / 2, M.dark, "← HR HUB", "вернуться в центральный зал");

  // ---------------- НАСТАВНИЧЕСТВО ----------------
  room("mentoring", new BABYLON.Vector3(33, 0, 0), 18, 16, 4.1, M.warm);
  projectBoard("mentor-main", "ПРОЕКТ 03 · НАСТАВНИЧЕСТВО", "Сеть адаптации: новичок ↔ наставник", new BABYLON.Vector3(33, 2.75, 5.8), "#ffd2a4");
  for (let i = 0; i < 12; i++) {
    const x = 28.5 + (i % 6) * 1.8;
    const z = -0.2 + Math.floor(i / 6) * 3.0;
    const body = BABYLON.MeshBuilder.CreateCylinder(`person-${i}`, { height: 1.0, diameter: 0.42 }, scene);
    body.position = new BABYLON.Vector3(x, 0.78, z);
    body.material = i < 4 ? M.warm : M.white;
    const head = BABYLON.MeshBuilder.CreateSphere(`head-${i}`, { diameter: 0.48 }, scene);
    head.position = new BABYLON.Vector3(x, 1.55, z);
    head.material = body.material;
  }
  billboardText("mentor-legend", ["НАСТАВНИКИ · НОВИЧКИ", "после активации связи формируют сеть"], new BABYLON.Vector3(33, 1.25, 3.5), 5.4, 0.95, "#ffd2a4", 38);
  metricBoards("mentor-metric", data.zones.mentoring.metrics, new BABYLON.Vector3(33, 0, -2.2));
  door("mentor-action", new BABYLON.Vector3(33, 0, -7.55), 0, M.warm, "СОЗДАТЬ СВЯЗИ", "E · отметить зону пройденной");
  door("mentor-back", new BABYLON.Vector3(24.45, 0, 0), Math.PI / 2, M.dark, "← HR HUB", "вернуться в центральный зал");

  // ---------------- 2027 ----------------
  room("future", new BABYLON.Vector3(0, 0, -35), 18, 16, 4.5, M.violet);
  projectBoard("future-main", "2027 · NEXT CHAPTER", "Планы будут заполнены после утверждения итогов 2026", new BABYLON.Vector3(0, 3.0, -29.3), "#c9b5ff");
  ["AI", "АВТОМАТИЗАЦИЯ", "ЛЮДИ", "ЭФФЕКТИВНОСТЬ", "КЛИЕНТСКИЙ СЕРВИС"].forEach((s, i) => {
    const a = Math.PI * 2 * i / 5 - Math.PI / 2;
    const p = new BABYLON.Vector3(Math.cos(a) * 5.4, 1.45, -35 + Math.sin(a) * 4.2);
    billboardText(`future-${i}`, [`0${i + 1} · ${s}`, "план 2027"], p, 3.7, 0.9, "#d9ccff", 36);
  });
  door("future-back", new BABYLON.Vector3(-8.55, 0, -35), Math.PI / 2, M.dark, "← HR HUB", "вернуться в центральный зал");

  function addInteraction(position, radius, label, action) {
    interactions.push({ position, radius, label, action });
  }

  addInteraction(new BABYLON.Vector3(-8.6, 1, 0), 2.2, "E — войти в проект: ПРИЁМ", () => travel("recruitment"));
  addInteraction(new BABYLON.Vector3(0, 1, 8.6), 2.2, "E — войти в проект: AI LAB", () => travel("ai"));
  addInteraction(new BABYLON.Vector3(8.6, 1, 0), 2.2, "E — войти в проект: НАСТАВНИЧЕСТВО", () => travel("mentoring"));
  addInteraction(new BABYLON.Vector3(0, 1, -8.6), 2.2, "E — открыть портал 2027", () => {
    if (completed.size === data.totalZones) travel("future");
    else showToast(`Портал 2027 закрыт. Сначала пройдите 3 проектные зоны. Сейчас: ${completed.size} / ${data.totalZones}`, 5200);
  });

  addInteraction(new BABYLON.Vector3(-33, 1, -6.7), 2.4, "E — завершить демонстрацию проекта «Приём»", () => complete("recruitment"));
  addInteraction(new BABYLON.Vector3(-40.7, 1, 0), 2.2, "E — вернуться в HR HUB", () => travel("hub"));

  addInteraction(new BABYLON.Vector3(0, 1, 28.3), 2.4, "E — активировать AI CORE", () => complete("ai"));
  addInteraction(new BABYLON.Vector3(-7.7, 1, 36), 2.2, "E — вернуться в HR HUB", () => travel("hub"));

  addInteraction(new BABYLON.Vector3(33, 1, -6.7), 2.4, "E — создать сеть наставничества", () => complete("mentoring"));
  addInteraction(new BABYLON.Vector3(25.3, 1, 0), 2.2, "E — вернуться в HR HUB", () => travel("hub"));

  addInteraction(new BABYLON.Vector3(-7.7, 1, -35), 2.2, "E — вернуться в HR HUB", () => travel("hub"));

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
      row.querySelector("i").textContent = done ? "✓" : "○";
    });
    progressText.textContent = `${completed.size} / ${data.totalZones}`;
    if (completed.size === data.totalZones) {
      portalDoor.frame.material = M.green;
      showToast("Все 3 пилотные зоны пройдены. Портал 2027 разблокирован.", 5200);
    }
  }

  function travel(id) {
    currentZone = id;
    fade.classList.add("active");
    setTimeout(() => {
      camera.position.copyFrom(zones[id].pos);
      camera.setTarget(zones[id].target);
      zoneName.textContent = id === "hub" ? "HR HUB — ЦЕНТРАЛЬНЫЙ ЗАЛ" : data.zones[id].name;
      hubGuide.style.display = id === "hub" ? "block" : "none";
      fade.classList.remove("active");
      if (id === "hub") {
        showToast("Вы в центральном HR HUB. Здесь три пилотные проектные зоны. Идите по световой линии к нужной двери и нажмите E.", 6500);
      } else if (data.zones[id].intro) {
        showToast(data.zones[id].intro, 5200);
      } else if (id === "future") {
        showToast("Переход в 2027 открыт. В финальной версии здесь появятся реальные планы на 2027 год.", 5200);
      }
    }, 280);
  }

  function complete(id) {
    if (!completed.has(id)) {
      completed.add(id);
      updateGuide();
      showToast(`${data.zones[id].name}: проектная зона пройдена. Вернитесь в HR HUB.`, 4800);
    } else {
      showToast(`${data.zones[id].name}: эта зона уже пройдена.`, 3200);
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

    hubRing.rotation.z += 0.0025;
    sphere.rotation.y += 0.004;
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
    "Маршрут: HR HUB → проекты → 2027"
  ];
  let bootIndex = 0;
  const bootTimer = setInterval(() => {
    bootLog.textContent += `${bootLines[bootIndex]}\n`;
    bootIndex += 1;
    if (bootIndex >= bootLines.length) {
      clearInterval(bootTimer);
      enterButton.disabled = false;
    }
  }, 250);

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    camera.position.copyFrom(zones.hub.pos);
    camera.setTarget(zones.hub.target);
    canvas.focus();
    setTimeout(() => {
      canvas.requestPointerLock?.();
      showToast("Вы вошли в HR HUB — центральный зал итогов 2026. Перед вами три пилотные проектные зоны: Приём, AI LAB и Наставничество.", 7200);
    }, 250);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  if (scene.createDefaultXRExperienceAsync) {
    scene.createDefaultXRExperienceAsync({ floorMeshes: scene.meshes.filter(m => m.name.endsWith("-floor")) }).catch(() => {});
  }
})();
