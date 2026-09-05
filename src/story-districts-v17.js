(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  const routeProgress = document.getElementById("v16ProgressBar");
  if (!car || !routeProgress) return;

  document.body.classList.add("story-districts-v17");

  const makeMat = (name, hex, emissive = 0, alpha = 1, metallic = 0.16, roughness = 0.28) => {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.alpha = alpha;
    m.metallic = metallic;
    m.roughness = roughness;
    return m;
  };

  const M = {
    cyan: makeMat("v17-cyan", "#59ddff", 0.92),
    teal: makeMat("v17-teal", "#63e5bc", 0.88),
    violet: makeMat("v17-violet", "#b89cff", 0.9),
    amber: makeMat("v17-amber", "#ffc66f", 0.9),
    red: makeMat("v17-red", "#ff526e", 0.86),
    white: makeMat("v17-white", "#effcff", 0.66),
    dark: makeMat("v17-dark", "#030912", 0.01, 1, 0.55, 0.25),
    glass: makeMat("v17-glass", "#8be7ff", 0.12, 0.18, 0.08, 0.08)
  };

  const glow = scene.getGlowLayerByName?.("glow");
  const box = (name, size, pos, mat, parent) => {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    return mesh;
  };
  const sphere = (name, diameter, pos, mat, parent) => {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 18 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    return mesh;
  };
  const cyl = (name, opts, pos, mat, parent) => {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, opts, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    return mesh;
  };
  const torus = (name, diameter, thickness, pos, mat, parent) => {
    const mesh = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 60 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (parent) mesh.parent = parent;
    glow?.addIncludedOnlyMesh?.(mesh);
    return mesh;
  };
  const glowMesh = mesh => { glow?.addIncludedOnlyMesh?.(mesh); return mesh; };

  const pathX = d => Math.sin(d / 47) * 1.55 + Math.sin(d / 19) * 0.48;
  const pathAngle = d => {
    const dx = pathX(d + 1) - pathX(d - 1);
    return Math.atan2(dx, 2);
  };
  const getDistance = () => {
    const pct = parseFloat(routeProgress.style.width || "0");
    return Number.isFinite(pct) ? BABYLON.Scalar.Clamp(pct, 0, 100) * 3.2 : 0;
  };
  const anchorZ = -6.5;

  const districts = [
    { id: "recruitment", d: 55, no: "01", title: "ПРИЁМ", subtitle: "ЦИФРОВОЙ ВХОД СОТРУДНИКА", color: "#59ddff", mat: M.cyan },
    { id: "convergent", d: 105, no: "02", title: "HR-КОНВЕРГЕНТ", subtitle: "СЕРВИС КАК СЕТЬ", color: "#63e5bc", mat: M.teal },
    { id: "ai", d: 165, no: "03", title: "ИИ-КОМАНДА", subtitle: "ИНТЕЛЛЕКТУАЛЬНОЕ ЯДРО", color: "#b89cff", mat: M.violet },
    { id: "awards", d: 220, no: "04", title: "КОРПОРАТИВНЫЕ НАГРАДЫ", subtitle: "ПРОСТРАНСТВО ПРИЗНАНИЯ", color: "#ffc66f", mat: M.amber },
    { id: "harmful", d: 270, no: "05", title: "ВРЕДНЫЕ УСЛОВИЯ ТРУДА", subtitle: "КОНТУР БЕЗОПАСНОСТИ", color: "#ff526e", mat: M.red },
    { id: "future", d: 310, no: "2027", title: "NEXT CHAPTER", subtitle: "ПОРТАЛ БУДУЩЕГО", color: "#b89cff", mat: M.violet }
  ];

  const roots = [];
  const animated = [];

  function makePerson(parent, x, z, mat, index) {
    const body = cyl(`v17-person-body-${parent.name}-${index}`, { height: 1.0, diameterTop: 0.28, diameterBottom: 0.42, tessellation: 12 }, new BABYLON.Vector3(x, 0.75, z), mat, parent);
    const head = sphere(`v17-person-head-${parent.name}-${index}`, 0.34, new BABYLON.Vector3(x, 1.47, z), mat, parent);
    glowMesh(body); glowMesh(head);
  }

  function createRecruitment(district) {
    const root = new BABYLON.TransformNode("v17-district-recruitment", scene);
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      makePerson(root, side * (6.6 + (i % 3) * 0.85), -5 + i * 1.05, district.mat, i);
    }
    for (let i = 0; i < 6; i++) {
      const panel = box(`v17-doc-${i}`, { width: 0.9, height: 1.25, depth: 0.04 }, new BABYLON.Vector3((i % 2 ? 1 : -1) * 8.8, 1.5 + (i % 3) * 0.42, -3.5 + i * 1.4), i % 2 ? M.white : district.mat, root);
      panel.rotation.y = i % 2 ? -0.22 : 0.22;
      panel.visibility = 0.48;
      glowMesh(panel);
      animated.push({ type: "float", mesh: panel, baseY: panel.position.y, phase: i * 0.8, speed: 1.1 });
    }
    roots.push({ ...district, root });
  }

  function createConvergent(district) {
    const root = new BABYLON.TransformNode("v17-district-convergent", scene);
    const nodes = [];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const r = 6.2 + (i % 3) * 0.7;
      const node = sphere(`v17-net-node-${i}`, 0.22 + (i % 3) * 0.04, new BABYLON.Vector3(Math.cos(a) * r, 1.3 + (i % 4) * 0.55, Math.sin(a) * 3.8), i % 3 === 0 ? M.white : district.mat, root);
      glowMesh(node);
      nodes.push(node);
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i].position;
      const b = nodes[(i + 3) % nodes.length].position;
      const line = BABYLON.MeshBuilder.CreateLines(`v17-net-line-${i}`, { points: [a, b] }, scene);
      line.parent = root;
      line.color = BABYLON.Color3.FromHexString(district.color);
      line.alpha = 0.34;
      line.isPickable = false;
    }
    const pulse = torus("v17-net-pulse", 5.2, 0.055, new BABYLON.Vector3(0, 2.4, 0), district.mat, root);
    pulse.rotation.x = Math.PI / 2;
    animated.push({ type: "pulse", mesh: pulse, phase: 0 });
    roots.push({ ...district, root });
  }

  function createAI(district) {
    const root = new BABYLON.TransformNode("v17-district-ai", scene);
    const core = BABYLON.MeshBuilder.CreatePolyhedron("v17-ai-core", { type: 2, size: 1.25 }, scene);
    core.parent = root;
    core.position = new BABYLON.Vector3(0, 2.7, 0);
    core.material = district.mat;
    glowMesh(core);
    const r1 = torus("v17-ai-ring-1", 4.1, 0.055, new BABYLON.Vector3(0, 2.7, 0), district.mat, root);
    const r2 = torus("v17-ai-ring-2", 5.4, 0.03, new BABYLON.Vector3(0, 2.7, 0), M.white, root);
    r1.rotation.x = 0.9; r1.rotation.z = 0.25;
    r2.rotation.x = 1.45; r2.rotation.z = 1.1;
    for (let i = 0; i < 8; i++) {
      const orb = sphere(`v17-ai-agent-${i}`, 0.16, new BABYLON.Vector3(0, 0, 0), i % 2 ? M.white : district.mat, root);
      glowMesh(orb);
      animated.push({ type: "orbit", mesh: orb, phase: i * Math.PI / 4, radius: 3.2 + (i % 2) * 0.7, y: 2.7, speed: 0.55 + (i % 3) * 0.08 });
    }
    animated.push({ type: "spin", mesh: core, speed: 0.42 }, { type: "spin2", mesh: r1, speed: 0.36 }, { type: "spin3", mesh: r2, speed: -0.28 });
    roots.push({ ...district, root });
  }

  function createAwards(district) {
    const root = new BABYLON.TransformNode("v17-district-awards", scene);
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (6.1 + (i % 3) * 0.95);
      const z = -5 + i * 1.25;
      const h = 1.4 + (i % 4) * 0.5;
      const spire = cyl(`v17-award-spire-${i}`, { height: h, diameterTop: 0.08, diameterBottom: 0.45, tessellation: 18 }, new BABYLON.Vector3(x, h / 2, z), district.mat, root);
      glowMesh(spire);
      const star = BABYLON.MeshBuilder.CreatePolyhedron(`v17-award-star-${i}`, { type: 1, size: 0.38 }, scene);
      star.parent = root;
      star.position = new BABYLON.Vector3(x, h + 0.35, z);
      star.material = i % 3 === 0 ? M.white : district.mat;
      glowMesh(star);
      animated.push({ type: "spin", mesh: star, speed: 0.35 + i * 0.015 });
    }
    roots.push({ ...district, root });
  }

  function createSafety(district) {
    const root = new BABYLON.TransformNode("v17-district-safety", scene);
    for (let i = 0; i < 7; i++) {
      const z = -7 + i * 2.2;
      [-1, 1].forEach(side => {
        const bar = box(`v17-safety-bar-${i}-${side}`, { width: 0.12, height: 2.5, depth: 0.28 }, new BABYLON.Vector3(side * 6.15, 1.25, z), district.mat, root);
        bar.rotation.z = side * 0.18;
        glowMesh(bar);
      });
      const scan = box(`v17-safety-scan-${i}`, { width: 10.8, height: 0.035, depth: 0.06 }, new BABYLON.Vector3(0, 2.8 + (i % 2) * 0.4, z), i % 2 ? M.white : district.mat, root);
      scan.visibility = 0.28;
      glowMesh(scan);
      animated.push({ type: "scan", mesh: scan, phase: i * 0.6 });
    }
    const shield = torus("v17-safety-shield", 6.0, 0.07, new BABYLON.Vector3(0, 3.1, 1.8), district.mat, root);
    shield.rotation.x = Math.PI / 2;
    shield.scaling.y = 0.72;
    animated.push({ type: "pulse", mesh: shield, phase: 1.2 });
    roots.push({ ...district, root });
  }

  function createFuture(district) {
    const root = new BABYLON.TransformNode("v17-district-future", scene);
    for (let i = 0; i < 5; i++) {
      const ring = torus(`v17-future-ring-${i}`, 7.4 + i * 1.35, 0.05 - i * 0.005, new BABYLON.Vector3(0, 3.7 + i * 0.2, i * 1.0), i % 2 ? M.white : district.mat, root);
      ring.rotation.x = Math.PI / 2;
      ring.scaling.y = 0.86;
      animated.push({ type: "futureRing", mesh: ring, index: i, speed: (i % 2 ? -1 : 1) * (0.08 + i * 0.015) });
    }
    for (let i = 0; i < 14; i++) {
      const orb = sphere(`v17-future-orb-${i}`, 0.09 + (i % 3) * 0.03, new BABYLON.Vector3(0, 0, 0), i % 3 === 0 ? M.white : district.mat, root);
      glowMesh(orb);
      animated.push({ type: "helix", mesh: orb, phase: i * 0.55, radius: 4.2 + (i % 4) * 0.4, y: 2.8 + (i % 5) * 0.45, speed: 0.35 + (i % 3) * 0.06 });
    }
    roots.push({ ...district, root });
  }

  createRecruitment(districts[0]);
  createConvergent(districts[1]);
  createAI(districts[2]);
  createAwards(districts[3]);
  createSafety(districts[4]);
  createFuture(districts[5]);

  roots.forEach(item => item.root.setEnabled(false));

  const nav = document.createElement("div");
  nav.className = "v17-next-gate";
  nav.innerHTML = `
    <div class="v17-nav-arrow">▲</div>
    <div class="v17-nav-copy"><span>NEXT EXPERIENCE</span><strong id="v17NextTitle">ПРИЁМ</strong></div>
    <div class="v17-nav-distance"><b id="v17NextDistance">55</b><span>м</span></div>
  `;
  document.body.appendChild(nav);
  const navTitle = document.getElementById("v17NextTitle");
  const navDistance = document.getElementById("v17NextDistance");

  const banner = document.createElement("div");
  banner.className = "v17-district-banner hidden";
  banner.innerHTML = `
    <span id="v17BannerNo"></span>
    <div><small>ENTERING DISTRICT</small><strong id="v17BannerTitle"></strong><i id="v17BannerSub"></i></div>
  `;
  document.body.appendChild(banner);
  const bannerNo = document.getElementById("v17BannerNo");
  const bannerTitle = document.getElementById("v17BannerTitle");
  const bannerSub = document.getElementById("v17BannerSub");
  const announced = new Set();
  let bannerTimer = null;

  function showBanner(d) {
    banner.style.setProperty("--v17-accent", d.color);
    bannerNo.textContent = d.no;
    bannerTitle.textContent = d.title;
    bannerSub.textContent = d.subtitle;
    banner.classList.remove("hidden");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.add("hidden"), 2400);
    navigator.vibrate?.(18);
  }

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;
    const vd = getDistance();

    roots.forEach(item => {
      const relZ = anchorZ + (item.d - vd);
      const enabled = relZ > anchorZ - 26 && relZ < anchorZ + 95;
      item.root.setEnabled(enabled);
      if (!enabled) return;
      item.root.position.set(pathX(item.d), 0, relZ);
      item.root.rotation.y = pathAngle(item.d);
      const proximity = Math.abs(item.d - vd);
      if (proximity < 23 && !announced.has(item.id)) {
        announced.add(item.id);
        showBanner(item);
      }
    });

    animated.forEach((a, i) => {
      if (!a.mesh?.isEnabled()) return;
      if (a.type === "float") a.mesh.position.y = a.baseY + Math.sin(time * a.speed + a.phase) * 0.18;
      else if (a.type === "pulse") {
        const s = 1 + Math.sin(time * 2.2 + a.phase) * 0.08;
        a.mesh.scaling.x = s; a.mesh.scaling.z = s;
        a.mesh.visibility = 0.5 + Math.sin(time * 1.7 + a.phase) * 0.22;
      } else if (a.type === "orbit") {
        const ang = time * a.speed + a.phase;
        a.mesh.position.x = Math.cos(ang) * a.radius;
        a.mesh.position.z = Math.sin(ang) * a.radius * 0.7;
        a.mesh.position.y = a.y + Math.sin(ang * 1.8) * 0.55;
      } else if (a.type === "spin") {
        a.mesh.rotation.y += dt * a.speed;
        a.mesh.rotation.x += dt * a.speed * 0.45;
      } else if (a.type === "spin2") {
        a.mesh.rotation.y += dt * a.speed;
        a.mesh.rotation.z += dt * a.speed * 0.6;
      } else if (a.type === "spin3") {
        a.mesh.rotation.x += dt * a.speed;
        a.mesh.rotation.z += dt * a.speed * 0.45;
      } else if (a.type === "scan") {
        a.mesh.visibility = 0.18 + Math.abs(Math.sin(time * 3 + a.phase)) * 0.38;
      } else if (a.type === "futureRing") {
        a.mesh.rotation.z += dt * a.speed;
        a.mesh.visibility = 0.28 + Math.abs(Math.sin(time * 1.2 + a.index)) * 0.35;
      } else if (a.type === "helix") {
        const ang = time * a.speed + a.phase;
        a.mesh.position.x = Math.cos(ang) * a.radius;
        a.mesh.position.z = Math.sin(ang) * a.radius * 0.55;
        a.mesh.position.y = a.y + Math.sin(ang * 1.6) * 0.8;
      }
    });

    let next = districts.find(d => d.d > vd + 2) || districts[districts.length - 1];
    nav.style.setProperty("--v17-accent", next.color);
    navTitle.textContent = next.title;
    navDistance.textContent = String(Math.max(0, Math.round(next.d - vd)));
    nav.classList.toggle("near", next.d - vd < 22);
  });
})();
