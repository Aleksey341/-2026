(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  const chase = scene.getCameraByName("v13-chase-camera");
  if (!car || !chase) return;

  document.body.classList.add("spatial-data-v19");

  const glow = scene.getGlowLayerByName?.("glow");
  const anchorZ = -6.5;

  function pbr(name, hex, emissive = 0.0, alpha = 1, metallic = 0.15, roughness = 0.25) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.alpha = alpha;
    m.metallic = metallic;
    m.roughness = roughness;
    return m;
  }

  const M = {
    cyan: pbr("v19-cyan", "#58ddff", 0.95),
    teal: pbr("v19-teal", "#62e4bb", 0.92),
    violet: pbr("v19-violet", "#b99cff", 0.95),
    amber: pbr("v19-amber", "#ffc86e", 0.92),
    red: pbr("v19-red", "#ff526e", 0.92),
    white: pbr("v19-white", "#eafaff", 0.82),
    dark: pbr("v19-dark", "#061019", 0.02, 0.94, 0.55, 0.24),
    glass: pbr("v19-glass", "#8be8ff", 0.12, 0.18, 0.05, 0.12),
    gold: pbr("v19-gold", "#ffd36e", 0.88, 1, 0.32, 0.18)
  };

  const addGlow = mesh => { glow?.addIncludedOnlyMesh?.(mesh); return mesh; };

  function box(name, size, pos, mat, parent = null) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.isPickable = false;
    m.checkCollisions = false;
    if (parent) m.parent = parent;
    return m;
  }

  function sphere(name, diameter, pos, mat, parent = null, segments = 16) {
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.isPickable = false;
    m.checkCollisions = false;
    if (parent) m.parent = parent;
    return m;
  }

  function torus(name, diameter, thickness, pos, mat, parent = null) {
    const m = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 64 }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.isPickable = false;
    m.checkCollisions = false;
    if (parent) m.parent = parent;
    addGlow(m);
    return m;
  }

  function pathX(d) {
    return Math.sin(d / 47) * 1.55 + Math.sin(d / 19) * 0.48;
  }

  function pathAngle(d) {
    const dx = pathX(d + 1) - pathX(d - 1);
    return Math.atan2(dx, 2);
  }

  function readDistance() {
    const el = document.getElementById("v16Distance");
    if (!el) return 0;
    const n = parseFloat(String(el.textContent || "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function textPlane(name, headline, label, sub, accentHex, width = 5.7, height = 2.45) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    plane.isPickable = false;
    plane.checkCollisions = false;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;

    const tex = new BABYLON.DynamicTexture(`${name}-tex`, { width: 1024, height: 440 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 1024, 440);

    const grad = ctx.createLinearGradient(0, 0, 1024, 440);
    grad.addColorStop(0, "rgba(3,10,17,0.88)");
    grad.addColorStop(1, "rgba(8,24,34,0.64)");
    ctx.fillStyle = grad;
    ctx.fillRect(18, 18, 988, 404);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 988, 404);

    ctx.fillStyle = accentHex;
    ctx.font = "700 34px Arial";
    ctx.fillText("DEMO 2025 · DATA IN SPACE", 54, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 142px Arial";
    ctx.fillText(headline, 52, 218);

    ctx.fillStyle = "#eaf8ff";
    ctx.font = "700 42px Arial";
    ctx.fillText(label, 56, 284);

    ctx.fillStyle = "rgba(224,241,247,.78)";
    ctx.font = "500 28px Arial";
    ctx.fillText(sub, 56, 344);

    ctx.fillStyle = accentHex;
    ctx.fillRect(55, 376, 420, 7);
    tex.update();

    const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    addGlow(plane);
    return plane;
  }

  function humanIcon(name, parent, x, z, mat, scale = 1) {
    const root = new BABYLON.TransformNode(name, scene);
    root.parent = parent;
    root.position = new BABYLON.Vector3(x, 0, z);
    root.scaling.setAll(scale);
    const head = sphere(`${name}-head`, 0.30, new BABYLON.Vector3(0, 1.35, 0), mat, root, 12);
    const body = BABYLON.MeshBuilder.CreateCylinder(`${name}-body`, { height: 0.9, diameterTop: 0.34, diameterBottom: 0.48, tessellation: 12 }, scene);
    body.parent = root;
    body.position.y = 0.72;
    body.material = mat;
    body.isPickable = false;
    body.checkCollisions = false;
    addGlow(head); addGlow(body);
    return root;
  }

  function makeExhibitRoot(id, d, side) {
    const root = new BABYLON.TransformNode(`v19-exhibit-${id}`, scene);
    root.metadata = { d, side };
    return root;
  }

  const exhibits = [];

  // 01 — Recruitment: two KPI towers and a crowd flowing into the organisation.
  {
    const d = 55, side = -1, root = makeExhibitRoot("recruitment", d, side);
    const panel = textPlane("v19-text-recruitment", "65%", "ЦИФРОВЫХ ПРИЁМОВ", "ЦЕЛЬ 70% · 1 779 ШЕ", "#58ddff");
    panel.parent = root; panel.position = new BABYLON.Vector3(-0.3, 4.6, 0);

    const bars = [
      { x: -1.35, h: 4.8, mat: M.cyan, tag: "65" },
      { x: 0.1, h: 5.2, mat: M.white, tag: "70" }
    ];
    bars.forEach((b, i) => {
      const bar = box(`v19-recruit-bar-${i}`, { width: 0.78, height: b.h, depth: 0.78 }, new BABYLON.Vector3(b.x, b.h / 2, 0.2), b.mat, root);
      addGlow(bar);
      const cap = torus(`v19-recruit-cap-${i}`, 1.05, 0.05, new BABYLON.Vector3(b.x, b.h + 0.18, 0.2), b.mat, root);
      cap.rotation.x = Math.PI / 2;
    });
    for (let i = 0; i < 10; i++) {
      humanIcon(`v19-recruit-person-${i}`, root, -2.5 + (i % 5) * 0.72, -1.7 - Math.floor(i / 5) * 0.7, i % 3 === 0 ? M.white : M.cyan, 0.78);
    }
    const guide = addGlow(box("v19-recruit-guide", { width: 6.0, height: 0.03, depth: 0.06 }, new BABYLON.Vector3(2.9, 0.11, 0), M.cyan, root));
    exhibits.push({ id: "recruitment", d, side, root, panel, accent: M.cyan, guide, phase: 0.1 });
  }

  // 02 — HR Convergent: service network and SLA orbit.
  {
    const d = 105, side = 1, root = makeExhibitRoot("convergent", d, side);
    const panel = textPlane("v19-text-convergent", "98,2%", "В SLA", "SLA 1,8 ДНЯ · КВС 9,78", "#62e4bb");
    panel.parent = root; panel.position = new BABYLON.Vector3(0.2, 4.75, 0);

    const core = addGlow(sphere("v19-conv-core", 0.82, new BABYLON.Vector3(0, 2.0, 0), M.teal, root, 24));
    const ringA = torus("v19-conv-ring-a", 3.8, 0.055, new BABYLON.Vector3(0, 2.0, 0), M.teal, root);
    ringA.rotation.x = Math.PI / 2;
    const ringB = torus("v19-conv-ring-b", 2.7, 0.035, new BABYLON.Vector3(0, 2.0, 0), M.white, root);
    ringB.rotation.z = Math.PI / 2;
    const nodes = [];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const n = addGlow(sphere(`v19-conv-node-${i}`, 0.23, new BABYLON.Vector3(Math.cos(a) * 2.15, 2 + Math.sin(i * 1.9) * 0.75, Math.sin(a) * 1.4), i % 3 === 0 ? M.white : M.teal, root, 12));
      nodes.push(n);
    }
    exhibits.push({ id: "convergent", d, side, root, panel, accent: M.teal, ringA, ringB, nodes, phase: 1.1 });
  }

  // 03 — AI team: 29 people/agents orbit a core, 16 competence pillars around it.
  {
    const d = 165, side = -1, root = makeExhibitRoot("ai", d, side);
    const panel = textPlane("v19-text-ai", "29", "СОТРУДНИКОВ ИИ-КОМАНДЫ", "16 КОМПЕТЕНЦИЙ · 2 PYTHON + 3 iMBA", "#b99cff");
    panel.parent = root; panel.position = new BABYLON.Vector3(-0.2, 5.0, 0);

    const core = addGlow(sphere("v19-ai-core", 1.18, new BABYLON.Vector3(0, 2.15, 0), M.violet, root, 32));
    const aiRing1 = torus("v19-ai-ring1", 3.3, 0.055, new BABYLON.Vector3(0, 2.15, 0), M.violet, root);
    aiRing1.rotation.x = 0.65;
    const aiRing2 = torus("v19-ai-ring2", 4.2, 0.035, new BABYLON.Vector3(0, 2.15, 0), M.cyan, root);
    aiRing2.rotation.z = 1.1;
    const agents = [];
    for (let i = 0; i < 29; i++) {
      const orb = addGlow(sphere(`v19-ai-agent-${i}`, 0.11 + (i % 4) * 0.015, new BABYLON.Vector3(0, 0, 0), i % 5 === 0 ? M.cyan : M.violet, root, 8));
      agents.push(orb);
    }
    const pillars = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const h = 0.55 + (i % 5) * 0.22;
      const p = addGlow(box(`v19-ai-competence-${i}`, { width: 0.12, height: h, depth: 0.12 }, new BABYLON.Vector3(Math.cos(a) * 2.7, h / 2 + 0.15, Math.sin(a) * 1.9), i % 4 === 0 ? M.white : M.violet, root));
      pillars.push(p);
    }
    exhibits.push({ id: "ai", d, side, root, panel, accent: M.violet, core, aiRing1, aiRing2, agents, pillars, phase: 2.0 });
  }

  // 04 — Awards: 661 represented as a golden recognition skyline.
  {
    const d = 220, side = 1, root = makeExhibitRoot("awards", d, side);
    const panel = textPlane("v19-text-awards", "661", "КОРПОРАТИВНАЯ НАГРАДА", "100% SLA · ИНДЕКС 8,9 · +0,6", "#ffc86e");
    panel.parent = root; panel.position = new BABYLON.Vector3(0.2, 4.8, 0);

    const podium = box("v19-awards-podium", { width: 5.4, height: 0.18, depth: 3.1 }, new BABYLON.Vector3(0, 0.12, 0), M.dark, root);
    const spires = [];
    for (let i = 0; i < 13; i++) {
      const x = -2.5 + i * 0.42;
      const h = 0.9 + ((i * 7) % 11) * 0.27;
      const s = addGlow(box(`v19-award-spire-${i}`, { width: 0.22, height: h, depth: 0.45 }, new BABYLON.Vector3(x, h / 2 + 0.2, 0), i % 3 === 0 ? M.white : M.gold, root));
      spires.push(s);
    }
    const crown = torus("v19-awards-crown", 3.2, 0.07, new BABYLON.Vector3(0, 3.2, 0), M.gold, root);
    crown.rotation.x = Math.PI / 2;
    const stars = [];
    for (let i = 0; i < 18; i++) {
      const star = addGlow(sphere(`v19-award-star-${i}`, 0.09, new BABYLON.Vector3(0, 0, 0), i % 4 === 0 ? M.white : M.gold, root, 8));
      stars.push(star);
    }
    exhibits.push({ id: "awards", d, side, root, panel, accent: M.gold, podium, spires, crown, stars, phase: 3.0 });
  }

  // 05 — Harmful conditions: safety shield, coverage columns, reduction pulse.
  {
    const d = 270, side = -1, root = makeExhibitRoot("harmful", d, side);
    const panel = textPlane("v19-text-harmful", "95%", "ИСПОЛЬЗОВАЛИ ОТПУСК В 2025", "2 578 СОТРУДНИКОВ · 343 С ВУТ · −19%", "#ff526e");
    panel.parent = root; panel.position = new BABYLON.Vector3(-0.2, 4.9, 0);

    const shield = torus("v19-harm-shield", 4.2, 0.09, new BABYLON.Vector3(0, 2.2, 0), M.red, root);
    shield.rotation.x = Math.PI / 2;
    shield.scaling.y = 0.78;
    const shield2 = torus("v19-harm-shield2", 3.25, 0.035, new BABYLON.Vector3(0, 2.2, 0), M.white, root);
    shield2.rotation.z = Math.PI / 2;
    shield2.scaling.y = 0.78;
    const coverageBars = [];
    for (let i = 0; i < 10; i++) {
      const lit = i < 9 || i === 9;
      const h = i === 9 ? 2.5 : 2.8;
      const b = addGlow(box(`v19-harm-bar-${i}`, { width: 0.3, height: h, depth: 0.45 }, new BABYLON.Vector3(-2.25 + i * 0.5, h / 2, 0.7), i === 9 ? M.glass : M.red, root));
      b.metadata = { lit };
      coverageBars.push(b);
    }
    const scanner = addGlow(box("v19-harm-scanner", { width: 5.4, height: 0.035, depth: 0.05 }, new BABYLON.Vector3(0, 0.6, -0.3), M.red, root));
    exhibits.push({ id: "harmful", d, side, root, panel, accent: M.red, shield, shield2, coverageBars, scanner, phase: 4.0 });
  }

  // A subtle label confirms that numbers are now part of the world, not a flat card.
  const mode = document.createElement("div");
  mode.className = "v19-mode";
  mode.innerHTML = '<span>SPATIAL DATA</span><strong>3D STORY MODE</strong>';
  document.body.appendChild(mode);

  // Small reusable burst particles for each gate crossing.
  const bursts = exhibits.map((ex, exIndex) => {
    const dots = [];
    for (let i = 0; i < 16; i++) {
      const dot = addGlow(sphere(`v19-burst-${exIndex}-${i}`, 0.075 + (i % 3) * 0.02, new BABYLON.Vector3(0, 0, 0), ex.accent, ex.root, 8));
      dot.setEnabled(false);
      dots.push({ mesh: dot, a: (i / 16) * Math.PI * 2, lift: 1.2 + (i % 5) * 0.35, speed: 1.1 + (i % 4) * 0.18 });
    }
    return { ex, dots, t: -1 };
  });

  let previousDistance = readDistance();
  let time = 0;

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;
    const distance = readDistance();

    exhibits.forEach((ex, index) => {
      const dz = ex.d - distance;
      const relZ = anchorZ + dz;
      const enabled = dz > -30 && dz < 105;
      ex.root.setEnabled(enabled);
      if (!enabled) return;

      const centerX = pathX(ex.d) + ex.side * 8.6;
      ex.root.position.set(centerX, 0, relZ);
      ex.root.rotation.y = pathAngle(ex.d) * 0.4;

      // Objects rise out of the road as the car approaches, then recede naturally behind it.
      const proximity = BABYLON.Scalar.Clamp(1 - Math.abs(dz) / 60, 0, 1);
      const scale = 0.68 + proximity * 0.34;
      ex.root.scaling.setAll(scale);
      ex.root.position.y = -0.75 + proximity * 0.78;
      ex.panel.visibility = 0.28 + proximity * 0.72;

      if (ex.id === "convergent") {
        ex.ringA.rotation.z += dt * 0.22;
        ex.ringB.rotation.x -= dt * 0.31;
        ex.nodes.forEach((n, i) => {
          n.scaling.setAll(0.86 + Math.sin(time * 2.5 + i) * 0.18);
        });
      }

      if (ex.id === "ai") {
        ex.core.scaling.setAll(1 + Math.sin(time * 2.2) * 0.08);
        ex.aiRing1.rotation.y += dt * 0.42;
        ex.aiRing2.rotation.x -= dt * 0.34;
        ex.agents.forEach((a, i) => {
          const band = i % 3;
          const angle = time * (0.38 + band * 0.10) + i * 0.54;
          const r = 1.55 + band * 0.62;
          a.position.x = Math.cos(angle) * r;
          a.position.z = Math.sin(angle) * r * 0.72;
          a.position.y = 2.15 + Math.sin(angle * 1.6 + i) * (0.55 + band * 0.16);
        });
      }

      if (ex.id === "awards") {
        ex.crown.rotation.z += dt * 0.24;
        ex.stars.forEach((s, i) => {
          const a = time * (0.45 + (i % 3) * 0.08) + i * 0.63;
          s.position.x = Math.cos(a) * (1.8 + (i % 3) * 0.45);
          s.position.z = Math.sin(a) * 1.15;
          s.position.y = 2.1 + ((i * 0.47 + time * 0.5) % 2.8);
        });
      }

      if (ex.id === "harmful") {
        ex.shield.rotation.z += dt * 0.18;
        ex.shield2.rotation.x -= dt * 0.21;
        ex.scanner.position.y = 0.55 + ((time * 1.15) % 2.7);
        ex.scanner.visibility = 0.35 + proximity * 0.55;
      }

      // Trigger a physical light burst when the car reaches each data sculpture.
      const crossed = previousDistance < ex.d && distance >= ex.d;
      if (crossed) {
        const burst = bursts[index];
        burst.t = 0;
        burst.dots.forEach((p, i) => {
          p.mesh.setEnabled(true);
          p.mesh.position.set(0, 1.4, 0);
          p.mesh.scaling.setAll(1);
        });
        navigator.vibrate?.([18, 24, 18]);
      }
    });

    bursts.forEach(b => {
      if (b.t < 0) return;
      b.t += dt;
      b.dots.forEach((p, i) => {
        const rr = p.speed * b.t * 2.2;
        p.mesh.position.x = Math.cos(p.a) * rr;
        p.mesh.position.z = Math.sin(p.a) * rr * 0.65;
        p.mesh.position.y = 1.4 + p.lift * b.t - 0.7 * b.t * b.t;
        p.mesh.scaling.setAll(Math.max(0.05, 1 - b.t * 0.65));
        p.mesh.visibility = Math.max(0, 1 - b.t * 0.55);
      });
      if (b.t > 1.7) {
        b.dots.forEach(p => p.mesh.setEnabled(false));
        b.t = -1;
      }
    });

    previousDistance = distance;
  });
})();
