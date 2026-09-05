(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const engine = scene.getEngine();
  const car = scene.getTransformNodeByName("v13-supercar");
  const chase = scene.getCameraByName("v13-chase-camera");
  if (!car || !chase) return;

  document.body.classList.add("director-v20");

  const glow = scene.getGlowLayerByName?.("glow");
  const anchorZ = -6.5;
  const speedEl = document.getElementById("v13Speed");
  const distanceEl = document.getElementById("v16Distance");

  function readNumber(el) {
    const n = parseFloat(String(el?.textContent || "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  function pathX(d) {
    return Math.sin(d / 47) * 1.55 + Math.sin(d / 19) * 0.48;
  }
  function smoothstep(a, b, x) {
    const t = BABYLON.Scalar.Clamp((x - a) / Math.max(0.0001, b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function pbr(name, hex, emissive = 0.9, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.alpha = alpha;
    m.metallic = 0.08;
    m.roughness = 0.18;
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    cyan: pbr("v20-cyan", "#58ddff", 1.0),
    teal: pbr("v20-teal", "#62e4bb", 0.96),
    violet: pbr("v20-violet", "#bd9fff", 1.0),
    amber: pbr("v20-amber", "#ffd06f", 0.98),
    red: pbr("v20-red", "#ff5570", 0.98),
    white: pbr("v20-white", "#effcff", 0.92),
    glass: pbr("v20-glass", "#a0efff", 0.28, 0.12)
  };

  const addGlow = mesh => { glow?.addIncludedOnlyMesh?.(mesh); return mesh; };

  const gates = [
    { d: 55, no: "01", title: "ПРИЁМ", value: "65%", label: "ЦИФРОВЫХ ПРИЁМОВ", sub: "ЦЕЛЬ 70% · 1 779 ШЕ", color: "#58ddff", mat: M.cyan, side: -1 },
    { d: 105, no: "02", title: "HR-КОНВЕРГЕНТ", value: "98,2%", label: "В SLA", sub: "SLA 1,8 ДНЯ · КВС 9,78", color: "#62e4bb", mat: M.teal, side: 1 },
    { d: 165, no: "03", title: "ИИ-КОМАНДА", value: "29", label: "СОТРУДНИКОВ", sub: "16 КОМПЕТЕНЦИЙ · 2 PYTHON + 3 iMBA", color: "#bd9fff", mat: M.violet, side: -1 },
    { d: 220, no: "04", title: "КОРПОРАТИВНЫЕ НАГРАДЫ", value: "661", label: "НАГРАДА", sub: "100% SLA · ИНДЕКС 8,9 · +0,6", color: "#ffd06f", mat: M.amber, side: 1 },
    { d: 270, no: "05", title: "ВРЕДНЫЕ УСЛОВИЯ ТРУДА", value: "95%", label: "ИСПОЛЬЗОВАЛИ ОТПУСК", sub: "2 578 СОТРУДНИКОВ · 343 С ВУТ · −19%", color: "#ff5570", mat: M.red, side: -1 }
  ];

  function createTextTexture(name, value, label, sub, accent) {
    const tex = new BABYLON.DynamicTexture(name, { width: 1024, height: 512 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 1024, 512);
    const g = ctx.createLinearGradient(0, 0, 1024, 0);
    g.addColorStop(0, "rgba(2,7,13,.92)");
    g.addColorStop(0.72, "rgba(6,19,29,.66)");
    g.addColorStop(1, "rgba(6,19,29,.18)");
    ctx.fillStyle = g;
    ctx.fillRect(16, 16, 992, 480);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, 992, 480);
    ctx.fillStyle = accent;
    ctx.font = "700 28px Arial";
    ctx.fillText("DEMO 2025 · SPATIAL KPI", 50, 64);
    ctx.fillStyle = "#ffffff";
    ctx.font = value.length > 5 ? "900 132px Arial" : "900 166px Arial";
    ctx.fillText(value, 48, 245);
    ctx.fillStyle = "#eaf8ff";
    ctx.font = "800 38px Arial";
    ctx.fillText(label, 52, 318);
    ctx.fillStyle = "rgba(226,242,248,.78)";
    ctx.font = "500 25px Arial";
    ctx.fillText(sub, 52, 372);
    ctx.fillStyle = accent;
    ctx.fillRect(52, 418, 330, 8);
    tex.update();
    return tex;
  }

  const holograms = [];
  gates.forEach((g, index) => {
    const root = new BABYLON.TransformNode(`v20-holo-root-${g.no}`, scene);
    root.setEnabled(false);

    const tex = createTextTexture(`v20-kpi-tex-${g.no}`, g.value, g.label, g.sub, g.color);
    const frontMat = new BABYLON.StandardMaterial(`v20-kpi-front-mat-${g.no}`, scene);
    frontMat.diffuseTexture = tex;
    frontMat.emissiveTexture = tex;
    frontMat.opacityTexture = tex;
    frontMat.useAlphaFromDiffuseTexture = true;
    frontMat.disableLighting = true;
    frontMat.backFaceCulling = false;

    const layers = [];
    for (let i = 4; i >= 0; i--) {
      const plane = BABYLON.MeshBuilder.CreatePlane(`v20-kpi-plane-${g.no}-${i}`, {
        width: 6.2 + i * 0.05,
        height: 3.1 + i * 0.03,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
      }, scene);
      plane.parent = root;
      plane.position.z = i * 0.026;
      plane.position.x = i * 0.018 * (g.side < 0 ? -1 : 1);
      plane.position.y = i * 0.012;
      plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      plane.isPickable = false;
      plane.checkCollisions = false;
      if (i === 0) {
        plane.material = frontMat;
      } else {
        const shadow = new BABYLON.StandardMaterial(`v20-kpi-shadow-${g.no}-${i}`, scene);
        shadow.diffuseColor = BABYLON.Color3.FromHexString(g.color).scale(0.14 + i * 0.025);
        shadow.emissiveColor = BABYLON.Color3.FromHexString(g.color).scale(0.18 + i * 0.03);
        shadow.alpha = 0.08 + i * 0.025;
        shadow.disableLighting = true;
        shadow.backFaceCulling = false;
        plane.material = shadow;
      }
      addGlow(plane);
      layers.push(plane);
    }

    const ring = BABYLON.MeshBuilder.CreateTorus(`v20-kpi-ring-${g.no}`, {
      diameter: 6.9,
      thickness: 0.04,
      tessellation: 80
    }, scene);
    ring.parent = root;
    ring.position.y = -0.1;
    ring.rotation.x = Math.PI / 2;
    ring.material = g.mat;
    ring.isPickable = false;
    ring.checkCollisions = false;
    addGlow(ring);

    const orbit = BABYLON.MeshBuilder.CreateTorus(`v20-kpi-orbit-${g.no}`, {
      diameter: 7.7,
      thickness: 0.018,
      tessellation: 80
    }, scene);
    orbit.parent = root;
    orbit.rotation.z = 0.62;
    orbit.material = M.glass;
    orbit.isPickable = false;
    orbit.checkCollisions = false;
    addGlow(orbit);

    holograms.push({ ...g, index, root, ring, orbit, layers });
  });

  // Inter-district transition volumes: concentric rings move past the car before each new chapter.
  const transitions = [82, 136, 194, 244].map((d, idx) => {
    const root = new BABYLON.TransformNode(`v20-transition-${idx}`, scene);
    const rings = [];
    for (let i = 0; i < 4; i++) {
      const ring = BABYLON.MeshBuilder.CreateTorus(`v20-transition-ring-${idx}-${i}`, {
        diameter: 8.7 + i * 0.55,
        thickness: 0.025 + i * 0.006,
        tessellation: 72
      }, scene);
      ring.parent = root;
      ring.position.z = i * 0.65;
      ring.rotation.x = Math.PI / 2;
      ring.scaling.y = 0.86;
      ring.material = idx % 2 ? M.violet : M.cyan;
      ring.isPickable = false;
      ring.checkCollisions = false;
      addGlow(ring);
      rings.push(ring);
    }
    root.setEnabled(false);
    return { d, idx, root, rings };
  });

  // Camera foreground particles: intentionally camera-local so they always sweep past the viewer.
  const dust = [];
  for (let i = 0; i < 34; i++) {
    const orb = BABYLON.MeshBuilder.CreateSphere(`v20-camera-dust-${i}`, { diameter: 0.018 + (i % 4) * 0.008, segments: 6 }, scene);
    orb.parent = chase;
    orb.material = i % 5 === 0 ? M.white : (i % 2 ? M.cyan : M.violet);
    orb.isPickable = false;
    orb.checkCollisions = false;
    orb.position.set(
      -4.8 + ((i * 37) % 97) / 97 * 9.6,
      -2.4 + ((i * 53) % 89) / 89 * 4.8,
      2.5 + ((i * 71) % 101) / 101 * 11.5
    );
    orb.visibility = 0;
    addGlow(orb);
    dust.push({ mesh: orb, seed: i * 0.73 });
  }

  const bars = document.createElement("div");
  bars.className = "v20-cinema-bars";
  bars.innerHTML = '<div class="top"></div><div class="bottom"></div>';
  document.body.appendChild(bars);

  const shotLabel = document.createElement("div");
  shotLabel.className = "v20-shot-label";
  shotLabel.innerHTML = '<span>AUTO DIRECTOR</span><strong></strong><i></i>';
  document.body.appendChild(shotLabel);

  const directorChip = document.createElement("button");
  directorChip.className = "v20-director-chip";
  directorChip.type = "button";
  directorChip.innerHTML = '<span>DIRECTOR</span><strong>ON</strong><i>X</i>';
  document.body.appendChild(directorChip);
  const directorState = directorChip.querySelector("strong");

  let directorOn = true;
  function toggleDirector() {
    directorOn = !directorOn;
    directorState.textContent = directorOn ? "ON" : "OFF";
    directorChip.classList.toggle("off", !directorOn);
    if (!directorOn) endShot(true);
    navigator.vibrate?.(10);
  }
  directorChip.addEventListener("pointerdown", e => { e.preventDefault(); toggleDirector(); });
  window.addEventListener("keydown", e => { if (e.code === "KeyX") toggleDirector(); });

  let activeShot = null;
  let lastDistance = 0;
  const fired = new Set();

  function startShot(g) {
    if (!directorOn || activeShot) return;
    activeShot = { gate: g, start: performance.now(), duration: 2550 };
    bars.classList.add("active");
    shotLabel.style.setProperty("--v20-accent", g.color);
    shotLabel.querySelector("strong").textContent = `${g.no} · ${g.title}`;
    shotLabel.querySelector("i").textContent = `${g.value} · ${g.label}`;
    shotLabel.classList.add("active");
    navigator.vibrate?.([16, 22, 16]);
  }

  function endShot(immediate = false) {
    activeShot = null;
    if (immediate) {
      bars.classList.remove("active");
      shotLabel.classList.remove("active");
    } else {
      bars.classList.remove("active");
      shotLabel.classList.remove("active");
    }
  }

  function updateDirectorCamera(dt) {
    if (!activeShot || !directorOn) return;
    const elapsed = performance.now() - activeShot.start;
    const p = elapsed / activeShot.duration;
    if (p >= 1) {
      endShot();
      return;
    }
    const g = activeShot.gate;
    const yaw = car.rotation.y || 0;
    const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const side = g.side;
    const target = car.position.add(new BABYLON.Vector3(0, 0.78, 0)).add(forward.scale(1.15));

    let desired;
    const style = g.index % 3;
    if (style === 0) {
      desired = car.position.subtract(forward.scale(1.7)).add(right.scale(side * 4.35)).add(new BABYLON.Vector3(0, 1.75, 0));
    } else if (style === 1) {
      desired = car.position.subtract(forward.scale(2.4)).add(right.scale(side * 3.35)).add(new BABYLON.Vector3(0, 3.65, 0));
    } else {
      desired = car.position.subtract(forward.scale(5.8)).add(right.scale(side * 2.75)).add(new BABYLON.Vector3(0, 2.55, 0));
    }

    const intro = smoothstep(0, 0.18, p);
    const outro = 1 - smoothstep(0.78, 1, p);
    const strength = Math.min(intro, outro);
    const alpha = 1 - Math.exp(-(5.5 + strength * 6.5) * dt);
    chase.position = BABYLON.Vector3.Lerp(chase.position, desired, alpha * strength);
    chase.setTarget(BABYLON.Vector3.Lerp(target, car.position.add(new BABYLON.Vector3(0, 0.72, 0)), 1 - strength));
    chase.rotation.z = BABYLON.Scalar.Lerp(chase.rotation.z || 0, side * 0.015 * strength, 0.16);
    chase.fov = BABYLON.Scalar.Lerp(chase.fov, 0.82 + (1 - strength) * 0.08, 0.09);
  }

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;
    const distance = readNumber(distanceEl);
    const speedKmh = readNumber(speedEl);
    const speed01 = BABYLON.Scalar.Clamp(speedKmh / 145, 0, 1);

    // Holographic KPI objects remain in the 3D world rather than becoming another HUD card.
    holograms.forEach(h => {
      const rel = h.d - distance;
      const enabled = rel > -18 && rel < 42;
      h.root.setEnabled(enabled);
      if (!enabled) return;
      h.root.position.set(pathX(h.d) + h.side * 4.0, 3.15, anchorZ + rel);
      const proximity = 1 - BABYLON.Scalar.Clamp(Math.abs(rel) / 36, 0, 1);
      const pop = 0.72 + smoothstep(0, 1, proximity) * 0.32;
      h.root.scaling.setAll(pop);
      h.ring.rotation.z += dt * (0.18 + h.index * 0.02);
      h.orbit.rotation.y += dt * (0.12 + h.index * 0.025);
      h.orbit.rotation.z -= dt * 0.08;
      h.layers[0].visibility = 0.62 + proximity * 0.38;
      for (let i = 1; i < h.layers.length; i++) h.layers[i].visibility = (0.04 + proximity * 0.07) * i;
    });

    transitions.forEach(t => {
      const rel = t.d - distance;
      const enabled = rel > -10 && rel < 34;
      t.root.setEnabled(enabled);
      if (!enabled) return;
      t.root.position.set(pathX(t.d), 0, anchorZ + rel);
      t.rings.forEach((r, i) => {
        r.rotation.z += dt * (0.14 + i * 0.04) * (i % 2 ? -1 : 1);
        r.visibility = 0.14 + Math.sin(time * 2.0 + i) * 0.05;
      });
    });

    // Particles accelerate towards the camera as the car speeds up.
    dust.forEach((p, i) => {
      p.mesh.visibility = speed01 < 0.12 ? 0 : (speed01 - 0.12) * (0.20 + (i % 4) * 0.06);
      p.mesh.position.z -= dt * (3.2 + speed01 * (17 + (i % 5) * 2.2));
      if (p.mesh.position.z < 0.55) {
        p.mesh.position.z = 9.5 + ((i * 19 + Math.floor(time * 7)) % 70) / 70 * 7.0;
        p.mesh.position.x = -5.2 + ((i * 43 + Math.floor(time * 11)) % 100) / 100 * 10.4;
        p.mesh.position.y = -2.5 + ((i * 61 + Math.floor(time * 5)) % 100) / 100 * 5.0;
      }
      p.mesh.scaling.z = 1 + speed01 * 3.8;
    });

    gates.forEach(g => {
      const trigger = g.d - 5.5;
      if (!fired.has(g.no) && lastDistance < trigger && distance >= trigger) {
        fired.add(g.no);
        startShot(g);
      }
    });
    lastDistance = distance;

    // Registered last, so this becomes the final camera pass after the normal chase-camera controllers.
    updateDirectorCamera(dt);
  });
})();
