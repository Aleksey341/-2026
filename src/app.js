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
  const data = window.HR2026;

  const completed = new Set();
  let currentInteraction = null;
  let toastTimer = null;

  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.012, 0.035, 0.052, 1);
  scene.gravity = new BABYLON.Vector3(0, -0.32, 0);
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.018, 0.055, 0.078);

  const camera = new BABYLON.UniversalCamera("player", new BABYLON.Vector3(0, 1.7, -5.5), scene);
  camera.speed = 0.22;
  camera.angularSensibility = 3000;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.42, 0.85, 0.42);
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];
  camera.attachControl(canvas, true);

  const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.35;

  const makeMaterial = (name, hex, emissive = 0) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.04, 0.05, 0.06);
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    return m;
  };

  const M = {
    wall: makeMaterial("wall", "#152632"),
    wallAlt: makeMaterial("wallAlt", "#0f1d26"),
    floor: makeMaterial("floor", "#0b151c"),
    ceiling: makeMaterial("ceiling", "#101f29"),
    accent: makeMaterial("accent", "#47cfff", 0.72),
    green: makeMaterial("green", "#77ffcf", 0.52),
    warm: makeMaterial("warm", "#f0b66b", 0.33),
    locked: makeMaterial("locked", "#6e3340", 0.25),
    dark: makeMaterial("dark", "#071019"),
    white: makeMaterial("white", "#dbeef6", 0.08)
  };

  function box(name, size, p, material, collisions = true) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(p);
    mesh.material = material;
    mesh.checkCollisions = collisions;
    return mesh;
  }

  function textPlane(name, text, p, ry = 0, width = 4, height = 1, color = "#ecfaff") {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene);
    plane.position.copyFrom(p);
    plane.rotation.y = ry;
    const tex = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1024, height: 256 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.fillStyle = "rgba(3,12,18,.78)";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = "rgba(71,207,255,.42)";
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 1018, 250);
    ctx.fillStyle = color;
    ctx.font = "700 62px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 128, 930);
    tex.update();
    const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.backFaceCulling = false;
    plane.material = mat;
    return plane;
  }

  function room(id, center, width, depth, height = 3.7, accent = M.accent) {
    const t = 0.28;
    box(`${id}-floor`, { width, height: 0.2, depth }, new BABYLON.Vector3(center.x, 0, center.z), M.floor);
    box(`${id}-ceiling`, { width, height: 0.18, depth }, new BABYLON.Vector3(center.x, height, center.z), M.ceiling);
    box(`${id}-north`, { width, height, depth: t }, new BABYLON.Vector3(center.x, height / 2, center.z + depth / 2), M.wall);
    box(`${id}-south`, { width, height, depth: t }, new BABYLON.Vector3(center.x, height / 2, center.z - depth / 2), M.wall);
    box(`${id}-west`, { width: t, height, depth }, new BABYLON.Vector3(center.x - width / 2, height / 2, center.z), M.wallAlt);
    box(`${id}-east`, { width: t, height, depth }, new BABYLON.Vector3(center.x + width / 2, height / 2, center.z), M.wallAlt);
    const light = new BABYLON.PointLight(`${id}-light`, new BABYLON.Vector3(center.x, height - 0.5, center.z), scene);
    light.diffuse = accent.diffuseColor;
    light.intensity = 0.48;
    light.range = 14;
  }

  function pedestal(name, p, label, material) {
    box(`${name}-base`, { width: 1.6, height: 0.22, depth: 1.6 }, new BABYLON.Vector3(p.x, 0.2, p.z), M.dark);
    box(`${name}-column`, { width: 0.95, height: 0.75, depth: 0.95 }, new BABYLON.Vector3(p.x, 0.68, p.z), material);
    textPlane(`${name}-label`, label, new BABYLON.Vector3(p.x, 1.55, p.z - 0.5), 0, 2.5, 0.55);
  }

  const spawn = {
    hub: new BABYLON.Vector3(0, 1.7, -5.5),
    recruitment: new BABYLON.Vector3(-33, 1.7, -1),
    ai: new BABYLON.Vector3(0, 1.7, 35),
    mentoring: new BABYLON.Vector3(33, 1.7, -1),
    future: new BABYLON.Vector3(0, 1.7, -34)
  };

  room("hub", new BABYLON.Vector3(0,0,0), 18, 18, 3.8, M.accent);
  textPlane("hub-title", "HR 2026", new BABYLON.Vector3(0,2.55,8.82), Math.PI, 5.5, 1.2);
  const ring = BABYLON.MeshBuilder.CreateTorus("ring", { diameter: 4.7, thickness: 0.16, tessellation: 64 }, scene);
  ring.position = new BABYLON.Vector3(0,2,0);
  ring.rotation.x = Math.PI / 2;
  ring.material = M.accent;
  textPlane("core-label", "RESULTS 0 / 3", new BABYLON.Vector3(0,2,-0.15), 0, 3.3, 0.65);
  pedestal("recruitment-door", new BABYLON.Vector3(-6.1,0,0), "ПРИЁМ", M.accent);
  pedestal("ai-door", new BABYLON.Vector3(0,0,5.8), "AI LAB", M.green);
  pedestal("mentoring-door", new BABYLON.Vector3(6.1,0,0), "НАСТАВНИЧЕСТВО", M.warm);
  pedestal("portal", new BABYLON.Vector3(0,0,-6.2), "2027", M.locked);

  room("recruitment", new BABYLON.Vector3(-33,0,0), 16, 14, 3.6, M.accent);
  textPlane("rec-title", "ПРИЁМ · 2026", new BABYLON.Vector3(-33,2.6,6.82), Math.PI, 5.6, 1.05);
  ["КАНДИДАТ","ЗАЯВКА","ДОКУМЕНТЫ","ПРОВЕРКА","ОФОРМЛЕНИЕ","СОТРУДНИК"].forEach((s,i) => {
    const x = -38.2 + i * 2.1;
    box(`stage-${i}`, { width: 1.45, height: 0.08, depth: 1.45 }, new BABYLON.Vector3(x,0.24,0.7), i === 5 ? M.green : M.accent, false);
    textPlane(`stage-label-${i}`, s, new BABYLON.Vector3(x,1.15,0.05), 0, 1.75, 0.48);
  });
  pedestal("rec-run", new BABYLON.Vector3(-33,0,-3.6), "ЗАПУСТИТЬ", M.green);
  pedestal("rec-exit", new BABYLON.Vector3(-38.4,0,-5.3), "HR HUB", M.dark);

  room("ai", new BABYLON.Vector3(0,0,36), 16, 16, 4.2, M.green);
  textPlane("ai-title", "HR AI CORE", new BABYLON.Vector3(0,3,43.82), Math.PI, 5.4, 1.05);
  const sphere = BABYLON.MeshBuilder.CreateSphere("ai-core", { diameter: 3.4, segments: 32 }, scene);
  sphere.position = new BABYLON.Vector3(0,2,36);
  sphere.material = M.green;
  [[-5,33],[5,33],[-5,39],[5,39]].forEach((p,i) => pedestal(`agent-${i}`, new BABYLON.Vector3(p[0],0,p[1]), `AGENT 0${i+1}`, M.accent));
  pedestal("ai-run", new BABYLON.Vector3(0,0,30.5), "АКТИВИРОВАТЬ", M.green);
  pedestal("ai-exit", new BABYLON.Vector3(-5.6,0,30.5), "HR HUB", M.dark);

  room("mentoring", new BABYLON.Vector3(33,0,0), 16, 14, 3.8, M.warm);
  textPlane("mentor-title", "НАСТАВНИЧЕСТВО", new BABYLON.Vector3(33,2.65,6.82), Math.PI, 6.1, 1.05);
  for (let i = 0; i < 10; i++) {
    const x = 28.5 + (i % 5) * 2.2;
    const z = -0.5 + Math.floor(i / 5) * 3;
    const body = BABYLON.MeshBuilder.CreateCylinder(`person-${i}`, { height: 1, diameter: .42 }, scene);
    body.position = new BABYLON.Vector3(x,.75,z);
    body.material = i < 4 ? M.warm : M.white;
    const head = BABYLON.MeshBuilder.CreateSphere(`head-${i}`, { diameter: .48 }, scene);
    head.position = new BABYLON.Vector3(x,1.5,z);
    head.material = body.material;
  }
  pedestal("mentor-run", new BABYLON.Vector3(33,0,-3.9), "СОЗДАТЬ СВЯЗИ", M.warm);
  pedestal("mentor-exit", new BABYLON.Vector3(27.7,0,-5.3), "HR HUB", M.dark);

  room("future", new BABYLON.Vector3(0,0,-35), 16, 14, 4.2, M.green);
  textPlane("future-title", "2027 · NEXT CHAPTER", new BABYLON.Vector3(0,2.85,-28.18), 0, 6.6, 1.15);
  ["AI","АВТОМАТИЗАЦИЯ","ЛЮДИ","ЭФФЕКТИВНОСТЬ","КЛИЕНТСКИЙ СЕРВИС"].forEach((s,i) => {
    const a = Math.PI * 2 * i / 5 - Math.PI / 2;
    pedestal(`future-${i}`, new BABYLON.Vector3(Math.cos(a)*5,0,-35 + Math.sin(a)*4), s, M.green);
  });
  pedestal("future-exit", new BABYLON.Vector3(-5.5,0,-40.5), "HR HUB", M.dark);

  const interactions = [];
  const add = (position, radius, label, action) => interactions.push({ position, radius, label, action });
  add(new BABYLON.Vector3(-6.1,1,0),2,"E — войти: ПРИЁМ",() => travel("recruitment"));
  add(new BABYLON.Vector3(0,1,5.8),2,"E — войти: AI LAB",() => travel("ai"));
  add(new BABYLON.Vector3(6.1,1,0),2,"E — войти: НАСТАВНИЧЕСТВО",() => travel("mentoring"));
  add(new BABYLON.Vector3(0,1,-6.2),2.1,"E — открыть 2027",() => completed.size === data.totalZones ? travel("future") : showToast(`Портал заблокирован: ${completed.size} / ${data.totalZones}`));
  add(new BABYLON.Vector3(-33,1,-3.6),2,"E — запустить процесс",() => complete("recruitment"));
  add(new BABYLON.Vector3(-38.4,1,-5.3),2,"E — HR HUB",() => travel("hub"));
  add(new BABYLON.Vector3(0,1,30.5),2,"E — активировать AI CORE",() => complete("ai"));
  add(new BABYLON.Vector3(-5.6,1,30.5),2,"E — HR HUB",() => travel("hub"));
  add(new BABYLON.Vector3(33,1,-3.9),2,"E — создать связи",() => complete("mentoring"));
  add(new BABYLON.Vector3(27.7,1,-5.3),2,"E — HR HUB",() => travel("hub"));
  add(new BABYLON.Vector3(-5.5,1,-40.5),2,"E — HR HUB",() => travel("hub"));

  function showToast(text, ms = 3800) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function travel(id) {
    fade.classList.add("active");
    setTimeout(() => {
      camera.position.copyFrom(spawn[id]);
      camera.rotation = BABYLON.Vector3.Zero();
      zoneName.textContent = data.zones[id].name;
      fade.classList.remove("active");
      if (data.zones[id].intro) showToast(data.zones[id].intro);
      if (id === "future") showToast("2027 · NEXT CHAPTER", 4500);
    }, 300);
  }

  function complete(id) {
    completed.add(id);
    updateProgress();
    const z = data.zones[id];
    showToast(`${z.name}: ${z.metrics.map(([v,l]) => `${v} — ${l}`).join(" · ")}`, 6200);
    if (completed.size === data.totalZones) setTimeout(() => showToast("Все направления подтверждены. Портал 2027 разблокирован.", 5000), 900);
  }

  function updateProgress() {
    progressText.textContent = `${completed.size} / ${data.totalZones}`;
    if (completed.size === data.totalZones) scene.getMeshByName("portal-column").material = M.green;
  }

  scene.onBeforeRenderObservable.add(() => {
    ring.rotation.z += 0.0015;
    sphere.rotation.y += 0.004;
    let best = null;
    let bestDistance = Infinity;
    for (const i of interactions) {
      const d = BABYLON.Vector3.Distance(camera.position, i.position);
      if (d <= i.radius && d < bestDistance) { best = i; bestDistance = d; }
    }
    currentInteraction = best;
    if (best) { prompt.textContent = best.label; prompt.classList.remove("hidden"); }
    else prompt.classList.add("hidden");
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyE" && currentInteraction && boot.classList.contains("hidden")) currentInteraction.action();
  });
  canvas.addEventListener("click", () => {
    if (boot.classList.contains("hidden") && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
  });

  const lines = ["HR SERVICES ........ OK","AUTOMATION .......... OK","AI .................. OK","PEOPLE .............. OK","YEAR 2026 ........... PENDING"];
  let bi = 0;
  (function bootSequence() {
    if (bi < lines.length) {
      bootLog.textContent += `${lines[bi++] }\n`;
      setTimeout(bootSequence, 420);
    } else {
      bootLog.textContent += "\nДля завершения 2026 года подтвердите результаты направлений.";
      enterButton.disabled = false;
    }
  })();

  enterButton.addEventListener("click", () => {
    boot.classList.add("hidden");
    hud.classList.remove("hidden");
    canvas.focus();
    canvas.requestPointerLock?.();
    showToast("HR HUB · выберите направление и подойдите к терминалу.", 4300);
  });

  scene.createDefaultXRExperienceAsync({ floorMeshes: [scene.getMeshByName("hub-floor")] }).catch(() => {});
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
})();
