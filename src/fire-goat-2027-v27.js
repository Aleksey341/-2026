(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;

  const engine = scene.getEngine();
  const gateRoot = scene.getTransformNodeByName("v16-gate-node-future");
  const oldFutureDistrict = scene.getTransformNodeByName("v17-district-future");
  if (!gateRoot) return;

  document.body.classList.add("fire-goat-2027-v27");

  // Replace the old generic violet tunnel with a dedicated 2027 environment.
  oldFutureDistrict?.setEnabled(false);
  [
    "v16-gate-ring-future",
    "v16-gate-halo-future",
    "v16-gate-pylon-light-future--1",
    "v16-gate-pylon-light-future-1"
  ].forEach(name => {
    const mesh = scene.getMeshByName(name);
    if (mesh) mesh.visibility = 0.12;
  });

  const glow = scene.getGlowLayerByName?.("glow");
  const addGlow = mesh => { glow?.addIncludedOnlyMesh?.(mesh); return mesh; };

  function pbr(name, hex, emissive = 0, alpha = 1, metallic = 0.18, roughness = 0.26) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.alpha = alpha;
    m.metallic = metallic;
    m.roughness = roughness;
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    obsidian: pbr("v27-obsidian", "#070405", 0.01, 1, 0.62, 0.20),
    wine: pbr("v27-wine", "#2b0508", 0.05, 1, 0.34, 0.24),
    ember: pbr("v27-ember", "#ff4f24", 1.20, 1, 0.05, 0.18),
    orange: pbr("v27-orange", "#ff7a2f", 1.05, 1, 0.06, 0.17),
    gold: pbr("v27-gold", "#ffc86a", 0.92, 1, 0.46, 0.15),
    ivory: pbr("v27-ivory", "#ffe9cf", 0.74, 1, 0.12, 0.22),
    smoke: pbr("v27-smoke", "#8c3d28", 0.12, 0.10, 0.02, 0.55),
    glass: pbr("v27-glass", "#ffad72", 0.18, 0.12, 0.05, 0.10)
  };

  const root = new BABYLON.TransformNode("v27-fire-goat-world", scene);
  root.parent = gateRoot;

  function box(name, size, pos, mat, parent = root) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    return mesh;
  }

  function sphere(name, diameter, pos, mat, parent = root, segments = 22) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    return mesh;
  }

  function cylinder(name, opts, pos, mat, parent = root) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, opts, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    return mesh;
  }

  function torus(name, diameter, thickness, pos, mat, parent = root) {
    const mesh = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 80 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    addGlow(mesh);
    return mesh;
  }

  function cubic(p0, p1, p2, p3, steps = 32) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      points.push(new BABYLON.Vector3(
        u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
        u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
        u*u*u*p0.z + 3*u*u*t*p1.z + 3*u*t*t*p2.z + t*t*t*p3.z
      ));
    }
    return points;
  }

  function tube(name, points, radius, mat, parent = root) {
    const mesh = BABYLON.MeshBuilder.CreateTube(name, {
      path: points,
      radius,
      tessellation: 18,
      cap: BABYLON.Mesh.CAP_ALL
    }, scene);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    addGlow(mesh);
    return mesh;
  }

  function textPlane(name, lines, width, height, pos, opts = {}) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, {
      width,
      height,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    plane.parent = opts.parent || root;
    plane.position.copyFrom(pos);
    plane.isPickable = false;
    plane.checkCollisions = false;

    const texture = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1536, height: 640 }, scene, true);
    texture.hasAlpha = true;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 1536, 640);

    if (opts.panel !== false) {
      const grad = ctx.createLinearGradient(0, 0, 1536, 640);
      grad.addColorStop(0, "rgba(18,5,6,.80)");
      grad.addColorStop(0.55, "rgba(35,7,8,.66)");
      grad.addColorStop(1, "rgba(10,5,6,.24)");
      ctx.fillStyle = grad;
      ctx.fillRect(12, 12, 1512, 616);
      ctx.strokeStyle = opts.stroke || "rgba(255,193,103,.42)";
      ctx.lineWidth = 4;
      ctx.strokeRect(14, 14, 1508, 612);
    }

    const center = 768;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      const y = line.y ?? (120 + i * 105);
      ctx.font = line.font || "700 58px Arial";
      ctx.fillStyle = line.color || "#ffe7cf";
      ctx.shadowColor = line.shadow || "rgba(255,119,45,.30)";
      ctx.shadowBlur = line.blur ?? 18;
      ctx.fillText(line.text, center, y);
    });
    texture.update();

    const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = texture;
    mat.emissiveTexture = texture;
    mat.opacityTexture = texture;
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    return plane;
  }

  // -------------------- EXTERIOR / PORTAL --------------------
  const exterior = new BABYLON.TransformNode("v27-exterior", scene);
  exterior.parent = root;

  // Obsidian gate pylons with warm vertical light cuts.
  [-1, 1].forEach(side => {
    const pylon = box(`v27-pylon-${side}`, { width: 1.05, height: 6.9, depth: 1.2 }, new BABYLON.Vector3(side * 5.05, 3.45, 0.2), M.obsidian, exterior);
    pylon.rotation.z = side * 0.045;
    const strip = addGlow(box(`v27-pylon-strip-${side}`, { width: 0.12, height: 5.4, depth: 1.24 }, new BABYLON.Vector3(side * 5.05, 3.4, -0.43), side < 0 ? M.ember : M.gold, exterior));
    strip.visibility = 0.92;
  });

  // Horn-shaped light sculpture. It reads as goat symbolism without becoming literal or cartoonish.
  const leftHorn = cubic(
    new BABYLON.Vector3(-0.95, 4.65, 0.05),
    new BABYLON.Vector3(-1.55, 6.15, 0.00),
    new BABYLON.Vector3(-4.75, 5.45, -0.08),
    new BABYLON.Vector3(-4.10, 7.35, -0.18),
    42
  );
  const rightHorn = leftHorn.map(p => new BABYLON.Vector3(-p.x, p.y, p.z));
  tube("v27-horn-left", leftHorn, 0.105, M.gold, exterior);
  tube("v27-horn-right", rightHorn, 0.105, M.gold, exterior);

  const leftInner = cubic(
    new BABYLON.Vector3(-1.15, 4.45, 0.10),
    new BABYLON.Vector3(-2.1, 5.55, 0.05),
    new BABYLON.Vector3(-3.7, 5.10, -0.02),
    new BABYLON.Vector3(-3.55, 6.40, -0.08),
    34
  );
  const rightInner = leftInner.map(p => new BABYLON.Vector3(-p.x, p.y, p.z));
  tube("v27-horn-inner-left", leftInner, 0.045, M.ember, exterior);
  tube("v27-horn-inner-right", rightInner, 0.045, M.ember, exterior);

  // Warm arch layers replace the old violet portal hierarchy.
  const archA = torus("v27-arch-a", 9.35, 0.12, new BABYLON.Vector3(0, 3.75, 0.55), M.ember, exterior);
  archA.rotation.x = Math.PI / 2;
  archA.scaling.y = 0.82;
  const archB = torus("v27-arch-b", 10.15, 0.055, new BABYLON.Vector3(0, 3.75, 0.35), M.gold, exterior);
  archB.rotation.x = Math.PI / 2;
  archB.scaling.y = 0.82;

  // Central emblem: faceted head + fire core + horn geometry.
  const emblem = BABYLON.MeshBuilder.CreatePolyhedron("v27-goat-emblem", { type: 2, size: 0.92 }, scene);
  emblem.parent = exterior;
  emblem.position = new BABYLON.Vector3(0, 5.15, 0.12);
  emblem.scaling = new BABYLON.Vector3(0.78, 1.05, 0.48);
  emblem.material = M.obsidian;
  emblem.isPickable = false;
  const brow = addGlow(box("v27-emblem-brow", { width: 1.55, height: 0.10, depth: 0.12 }, new BABYLON.Vector3(0, 5.52, -0.36), M.gold, exterior));
  brow.rotation.z = 0.02;

  const fireCore = addGlow(sphere("v27-fire-core", 0.68, new BABYLON.Vector3(0, 4.64, -0.08), M.ember, exterior, 28));
  const coreHalo = torus("v27-fire-core-halo", 1.25, 0.035, new BABYLON.Vector3(0, 4.64, -0.10), M.gold, exterior);
  coreHalo.rotation.x = Math.PI / 2;

  const coreLight = new BABYLON.PointLight("v27-core-light", new BABYLON.Vector3(0, 4.55, -0.6), scene);
  coreLight.parent = exterior;
  coreLight.diffuse = BABYLON.Color3.FromHexString("#ff7337");
  coreLight.intensity = 2.3;
  coreLight.range = 13;

  // Ceremonial runway, visible well before the portal.
  for (let i = 0; i < 15; i++) {
    const z = -14 + i * 1.15;
    const width = 6.4 - Math.abs(i - 7) * 0.08;
    const strip = addGlow(box(`v27-runway-${i}`, { width, height: 0.025, depth: 0.055 }, new BABYLON.Vector3(0, 0.10, z), i % 3 === 0 ? M.gold : M.ember, exterior));
    strip.visibility = 0.34 + (i % 4) * 0.09;
  }
  [-1, 1].forEach(side => {
    addGlow(box(`v27-runway-edge-${side}`, { width: 0.06, height: 0.035, depth: 17.5 }, new BABYLON.Vector3(side * 3.45, 0.08, -5.0), side < 0 ? M.ember : M.gold, exterior));
  });

  const title = textPlane("v27-title", [
    { text: "2027", font: "900 176px Arial", color: "#fff4e7", y: 180, blur: 28 },
    { text: "ГОД ОГНЕННОЙ КОЗЫ", font: "800 58px Arial", color: "#ffc86a", y: 365, blur: 18 },
    { text: "СЛЕДУЮЩАЯ ГЛАВА", font: "600 34px Arial", color: "#ff8b4b", y: 470, blur: 12 }
  ], 7.5, 3.15, new BABYLON.Vector3(0, 3.15, 0.92), { parent: exterior, panel: false });

  // Ember field around the facade.
  const embers = [];
  for (let i = 0; i < 36; i++) {
    const e = addGlow(sphere(`v27-ember-${i}`, 0.045 + (i % 3) * 0.018, new BABYLON.Vector3(0, 0, 0), i % 4 === 0 ? M.gold : M.ember, exterior, 8));
    embers.push({
      mesh: e,
      side: i % 2 ? 1 : -1,
      seed: i * 0.71,
      radius: 2.1 + (i % 7) * 0.48,
      height: 0.7 + (i % 9) * 0.55,
      speed: 0.35 + (i % 5) * 0.08
    });
  }

  // -------------------- INTERIOR / STRATEGY PAVILION --------------------
  const interior = new BABYLON.TransformNode("v27-interior", scene);
  interior.parent = root;

  // Floor and ceiling frame behind the portal, so after crossing it the route becomes a real room.
  box("v27-hall-floor", { width: 13.0, height: 0.10, depth: 16.5 }, new BABYLON.Vector3(0, -0.02, 8.4), M.obsidian, interior);
  box("v27-hall-ceiling", { width: 13.0, height: 0.12, depth: 16.5 }, new BABYLON.Vector3(0, 7.0, 8.4), M.wine, interior).visibility = 0.62;

  [-1, 1].forEach(side => {
    for (let i = 0; i < 5; i++) {
      const z = 3.3 + i * 2.7;
      const column = box(`v27-hall-column-${side}-${i}`, { width: 0.52, height: 6.3, depth: 0.62 }, new BABYLON.Vector3(side * 5.7, 3.15, z), M.obsidian, interior);
      column.rotation.z = side * 0.018;
      addGlow(box(`v27-hall-column-light-${side}-${i}`, { width: 0.075, height: 5.15, depth: 0.66 }, new BABYLON.Vector3(side * 5.7, 3.15, z - 0.34), i % 2 ? M.gold : M.ember, interior));
    }
  });

  // Fire lines lead toward the central strategy sculpture.
  for (let i = 0; i < 11; i++) {
    const z = 2.5 + i * 1.18;
    const line = addGlow(box(`v27-floor-line-${i}`, { width: 5.9 - i * 0.16, height: 0.022, depth: 0.05 }, new BABYLON.Vector3(0, 0.065, z), i % 2 ? M.gold : M.ember, interior));
    line.visibility = 0.34 + (i % 3) * 0.10;
  }

  // Central sculpture: not a literal animal, but a premium geometric goat/fire emblem.
  const pedestal = cylinder("v27-pedestal", { height: 0.75, diameterTop: 2.4, diameterBottom: 3.1, tessellation: 48 }, new BABYLON.Vector3(0, 0.38, 11.7), M.obsidian, interior);
  const pedestalRing = torus("v27-pedestal-ring", 3.25, 0.07, new BABYLON.Vector3(0, 0.78, 11.7), M.gold, interior);
  pedestalRing.rotation.x = Math.PI / 2;

  const sculpture = BABYLON.MeshBuilder.CreatePolyhedron("v27-strategy-core", { type: 2, size: 1.35 }, scene);
  sculpture.parent = interior;
  sculpture.position = new BABYLON.Vector3(0, 2.55, 11.7);
  sculpture.material = M.wine;
  sculpture.isPickable = false;
  addGlow(sculpture);

  const sculptureCore = addGlow(sphere("v27-strategy-fire", 0.92, new BABYLON.Vector3(0, 2.55, 11.15), M.orange, interior, 28));
  const sculptureHaloA = torus("v27-strategy-halo-a", 3.6, 0.055, new BABYLON.Vector3(0, 2.65, 11.7), M.ember, interior);
  sculptureHaloA.rotation.x = 0.82;
  const sculptureHaloB = torus("v27-strategy-halo-b", 4.4, 0.035, new BABYLON.Vector3(0, 2.65, 11.7), M.gold, interior);
  sculptureHaloB.rotation.z = 0.95;

  const sculptureHornLeft = cubic(
    new BABYLON.Vector3(-0.72, 3.05, 11.55),
    new BABYLON.Vector3(-1.25, 4.25, 11.45),
    new BABYLON.Vector3(-2.65, 4.0, 11.25),
    new BABYLON.Vector3(-2.25, 5.1, 11.0),
    34
  );
  const sculptureHornRight = sculptureHornLeft.map(p => new BABYLON.Vector3(-p.x, p.y, p.z));
  tube("v27-sculpture-horn-left", sculptureHornLeft, 0.07, M.gold, interior);
  tube("v27-sculpture-horn-right", sculptureHornRight, 0.07, M.gold, interior);

  const hallLight = new BABYLON.PointLight("v27-hall-light", new BABYLON.Vector3(0, 3.0, 11.2), scene);
  hallLight.parent = interior;
  hallLight.diffuse = BABYLON.Color3.FromHexString("#ff8a46");
  hallLight.intensity = 2.0;
  hallLight.range = 14;

  // Strategy panels: content-oriented interior, not decoration only.
  const panelLeftA = textPlane("v27-panel-left-a", [
    { text: "ЭНЕРГИЯ ИЗМЕНЕНИЙ", font: "800 54px Arial", color: "#ffc86a", y: 205 },
    { text: "СКОРОСТЬ ВНЕДРЕНИЯ", font: "600 38px Arial", color: "#ffe8d3", y: 340 },
    { text: "2027", font: "900 74px Arial", color: "#ff6b35", y: 480 }
  ], 4.15, 2.0, new BABYLON.Vector3(-4.35, 2.25, 7.1), { parent: interior });
  panelLeftA.rotation.y = 0.22;

  const panelRightA = textPlane("v27-panel-right-a", [
    { text: "ИНТЕЛЛЕКТУАЛЬНАЯ", font: "800 48px Arial", color: "#ffc86a", y: 185 },
    { text: "АВТОМАТИЗАЦИЯ", font: "800 52px Arial", color: "#ffc86a", y: 300 },
    { text: "ЧЕЛОВЕКОЦЕНТРИЧНЫЙ СЕРВИС", font: "600 31px Arial", color: "#ffe8d3", y: 445 }
  ], 4.15, 2.0, new BABYLON.Vector3(4.35, 2.25, 7.1), { parent: interior });
  panelRightA.rotation.y = -0.22;

  const panelLeftB = textPlane("v27-panel-left-b", [
    { text: "СКВОЗНАЯ АНАЛИТИКА", font: "800 48px Arial", color: "#ffc86a", y: 210 },
    { text: "ЕДИНАЯ КАРТИНА ДАННЫХ", font: "600 38px Arial", color: "#ffe8d3", y: 355 },
    { text: "РЕШЕНИЯ НА ОСНОВЕ ФАКТОВ", font: "600 32px Arial", color: "#ff8b4b", y: 480 }
  ], 4.15, 2.0, new BABYLON.Vector3(-4.35, 2.25, 12.1), { parent: interior });
  panelLeftB.rotation.y = 0.20;

  const panelRightB = textPlane("v27-panel-right-b", [
    { text: "ПУТЬ СОТРУДНИКА", font: "800 50px Arial", color: "#ffc86a", y: 210 },
    { text: "ПЕРСОНАЛИЗИРОВАННЫЙ СЕРВИС", font: "600 36px Arial", color: "#ffe8d3", y: 350 },
    { text: "БЫСТРЕЕ · ПРОЩЕ · ТОЧНЕЕ", font: "600 32px Arial", color: "#ff8b4b", y: 482 }
  ], 4.15, 2.0, new BABYLON.Vector3(4.35, 2.25, 12.1), { parent: interior });
  panelRightB.rotation.y = -0.20;

  const backTitle = textPlane("v27-back-title", [
    { text: "2027", font: "900 158px Arial", color: "#fff3e5", y: 190, blur: 26 },
    { text: "НОВАЯ АРХИТЕКТУРА HR-ПРОЦЕССОВ", font: "800 42px Arial", color: "#ffc86a", y: 385 },
    { text: "ЦК БОРУП · СЛЕДУЮЩАЯ ГЛАВА", font: "600 31px Arial", color: "#ff8b4b", y: 500 }
  ], 7.4, 3.0, new BABYLON.Vector3(0, 3.0, 16.0), { parent: interior, panel: false });

  // Warm smoke volumes. These are geometric translucent layers, intentionally restrained.
  for (let i = 0; i < 8; i++) {
    const cloud = sphere(`v27-smoke-${i}`, 2.1 + (i % 3) * 0.7, new BABYLON.Vector3((i % 2 ? 1 : -1) * (2.7 + (i % 4) * 0.7), 1.0 + (i % 3) * 0.8, 5.0 + i * 1.35), M.smoke, interior, 14);
    cloud.scaling.y = 0.45;
    cloud.visibility = 0.08 + (i % 3) * 0.025;
  }

  // -------------------- FINAL CINEMATIC COPY --------------------
  const portalCopy = document.querySelector(".v18-portal-copy");
  if (portalCopy) {
    portalCopy.innerHTML = `
      <span>ПОРТАЛ 2027 · ГОД ОГНЕННОЙ КОЗЫ</span>
      <strong>2027</strong>
      <b>ЭНЕРГИЯ НОВОЙ ГЛАВЫ</b>
      <i>Въезд в стратегический павильон 2027</i>
    `;
  }

  const flash = document.querySelector(".v18-flash");
  if (flash) flash.classList.add("v27-warm-flash");

  const readDistance = () => {
    const raw = document.getElementById("v16Distance")?.textContent || "0";
    const value = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(value) ? value : 0;
  };

  let time = 0;
  let finalClass = false;

  function updateFinalLabels(distance) {
    const nav = document.querySelector(".v17-next-gate");
    if (!nav || distance < 270) return;
    const kicker = nav.querySelector(".v17-nav-copy span");
    const strong = nav.querySelector(".v17-nav-copy strong");
    if (kicker) kicker.textContent = "ПОРТАЛ БУДУЩЕГО";
    if (strong) strong.textContent = "2027 · ОГНЕННАЯ КОЗА";
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;
    const distance = readDistance();

    // The pavilion gradually appears as the route approaches its final 60 metres.
    const enabled = distance >= 248;
    root.setEnabled(enabled);
    if (!enabled) return;

    const approach = BABYLON.Scalar.Clamp((distance - 248) / 62, 0, 1);
    exterior.scaling.setAll(0.92 + approach * 0.08);

    fireCore.scaling.setAll(1 + Math.sin(time * 2.5) * 0.10);
    coreHalo.rotation.z += dt * 0.22;
    archA.rotation.z += dt * 0.014;
    archB.rotation.z -= dt * 0.011;
    sculpture.rotation.y += dt * 0.18;
    sculptureHaloA.rotation.z += dt * 0.18;
    sculptureHaloB.rotation.x -= dt * 0.14;
    sculptureCore.scaling.setAll(1 + Math.sin(time * 2.0) * 0.08);

    coreLight.intensity = 1.4 + approach * 2.2 + Math.sin(time * 2.3) * 0.22;
    hallLight.intensity = 1.15 + BABYLON.Scalar.Clamp((distance - 304) / 14, 0, 1) * 2.1;

    embers.forEach((item, i) => {
      const a = time * item.speed + item.seed;
      item.mesh.position.x = item.side * (item.radius + Math.sin(a * 1.8) * 0.35);
      item.mesh.position.y = item.height + ((time * (0.55 + (i % 5) * 0.07) + item.seed) % 5.6);
      item.mesh.position.z = -1.4 + Math.cos(a) * 1.15;
      item.mesh.visibility = 0.18 + approach * 0.62;
    });

    const warm = BABYLON.Scalar.Clamp((distance - 286) / 28, 0, 1);
    if (warm > 0) {
      const cold = new BABYLON.Color3(0.012, 0.025, 0.045);
      const fireFog = BABYLON.Color3.FromHexString("#2a0b08");
      scene.fogColor = BABYLON.Color3.Lerp(cold, fireFog, warm * 0.72);
    }

    if (distance >= 302 && !finalClass) {
      finalClass = true;
      document.body.classList.add("v27-final-active");
    } else if (distance < 298 && finalClass) {
      finalClass = false;
      document.body.classList.remove("v27-final-active");
    }

    updateFinalLabels(distance);
  });

  // Start hidden until the final sector approaches.
  root.setEnabled(false);

  window.__HR_FIRE_GOAT_2027_V27__ = {
    version: "2.7",
    concept: "2027 · Год Огненной Козы",
    exterior: "обсидиановый портал, световые рога, огненно-золотой фасад",
    interior: "стратегический павильон 2027 с четырьмя смысловыми панелями"
  };
})();
