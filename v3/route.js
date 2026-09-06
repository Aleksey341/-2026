(() => {
  const H = window.HR3;
  if (!H?.vehicle) return;
  const { scene, glow, data, state } = H;
  const routeLength = data.routeLength;

  function pbr(name, hex, emissive = 0, metallic = 0.25, roughness = 0.28, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    return m;
  }
  const M = {
    road: pbr("hr3-road", "#07131f", 0, 0.46, 0.22),
    road2: pbr("hr3-road2", "#0a1925", 0, 0.42, 0.22),
    city: pbr("hr3-city", "#050c16", 0.01, 0.62, 0.24),
    steel: pbr("hr3-steel", "#132a39", 0.02, 0.72, 0.22),
    cyan: pbr("hr3-cyan", "#58ddff", 0.95, 0.08, 0.15),
    teal: pbr("hr3-teal", "#62e4bb", 0.95, 0.08, 0.15),
    violet: pbr("hr3-violet", "#bd9fff", 0.96, 0.08, 0.15),
    amber: pbr("hr3-amber", "#ffd06f", 0.96, 0.08, 0.15),
    red: pbr("hr3-red", "#ff5570", 0.96, 0.08, 0.15),
    white: pbr("hr3-white", "#eefcff", 0.82, 0.06, 0.15),
    glass: pbr("hr3-route-glass", "#80e9ff", 0.18, 0.08, 0.10, 0.18),
    dark: pbr("hr3-dark", "#02050a", 0, 0.35, 0.5)
  };

  function addGlow(mesh) { glow.addIncludedOnlyMesh(mesh); return mesh; }
  function pathX(d) { return Math.sin(d / 44) * 3.1 + Math.sin(d / 18) * 0.72; }
  function pathAngle(d) {
    const dx = pathX(d + 1) - pathX(d - 1);
    return Math.atan2(dx, 2);
  }
  function box(name, size, pos, mat, parent = null) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.isPickable = false;
    if (parent) m.parent = parent;
    return m;
  }
  function torus(name, diameter, thickness, pos, mat, parent = null) {
    const m = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 64 }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.isPickable = false;
    if (parent) m.parent = parent;
    addGlow(m);
    return m;
  }

  const ground = box("hr3-ground", { width: 120, height: 0.12, depth: 390 }, new BABYLON.Vector3(0, -0.12, routeLength / 2), M.dark);

  const segmentLength = 8;
  for (let d = 0, i = 0; d <= routeLength; d += segmentLength, i++) {
    const root = new BABYLON.TransformNode(`hr3-road-node-${i}`, scene);
    root.position.set(pathX(d), 0, d);
    root.rotation.y = pathAngle(d);
    box(`hr3-road-${i}`, { width: 10.8, height: 0.10, depth: segmentLength + 0.35 }, new BABYLON.Vector3(0, 0, 0), i % 2 ? M.road : M.road2, root);
    addGlow(box(`hr3-edge-l-${i}`, { width: 0.065, height: 0.025, depth: segmentLength - 0.45 }, new BABYLON.Vector3(-5.05, 0.072, 0), M.cyan, root));
    addGlow(box(`hr3-edge-r-${i}`, { width: 0.065, height: 0.025, depth: segmentLength - 0.45 }, new BABYLON.Vector3(5.05, 0.072, 0), M.teal, root));
    if (i % 2 === 0) addGlow(box(`hr3-dash-${i}`, { width: 0.05, height: 0.022, depth: 2.6 }, new BABYLON.Vector3(0, 0.074, 0), M.white, root));
  }

  // Skyline with deliberately large gaps: stronger parallax without visual clutter.
  for (let d = 12, i = 0; d < 286; d += 22, i++) {
    [-1, 1].forEach((side, s) => {
      const h = 7 + ((i * 5 + s * 3) % 10) * 1.05;
      const w = 3.0 + ((i + s) % 3) * 0.8;
      const x = pathX(d) + side * (13 + (i % 3) * 2.1);
      const b = box(`hr3-building-${i}-${s}`, { width: w, height: h, depth: 4.0 }, new BABYLON.Vector3(x, h / 2, d), M.city);
      b.rotation.y = pathAngle(d) * 0.35;
      const accent = (i + s) % 3 === 0 ? M.violet : ((i + s) % 2 ? M.teal : M.cyan);
      for (let y = 1.2, row = 0; y < h - .5; y += 1.8, row++) {
        const win = addGlow(box(`hr3-window-${i}-${s}-${row}`, { width: w * 0.62, height: 0.045, depth: 0.04 }, new BABYLON.Vector3(x, y, d + (side < 0 ? 2.02 : -2.02)), accent));
        win.visibility = 0.36 + ((row + i) % 3) * 0.13;
      }
    });
  }

  // Tunnel district.
  for (let d = 78, i = 0; d <= 132; d += 6, i++) {
    const ring = torus(`hr3-tunnel-${i}`, 9.7, 0.075, new BABYLON.Vector3(pathX(d), 3.7, d), i % 2 ? M.teal : M.cyan);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = pathAngle(d);
    ring.scaling.y = 0.86;
    ring.visibility = 0.52;
  }

  // Bridge district.
  for (let d = 146, i = 0; d <= 206; d += 7, i++) {
    [-1, 1].forEach(side => {
      const x = pathX(d) + side * 5.35;
      box(`hr3-bridge-post-${i}-${side}`, { width: 0.14, height: 2.25, depth: 0.14 }, new BABYLON.Vector3(x, 1.12, d), M.steel);
      addGlow(box(`hr3-bridge-light-${i}-${side}`, { width: 0.055, height: 1.7, depth: 0.045 }, new BABYLON.Vector3(x - side * 0.10, 1.15, d), side < 0 ? M.amber : M.violet));
    });
  }

  const chapterMats = [M.cyan, M.teal, M.violet, M.amber, M.red, M.violet];
  const gateRoots = [];
  data.chapters.forEach((ch, i) => {
    const root = new BABYLON.TransformNode(`hr3-gate-${ch.id}`, scene);
    root.position.set(pathX(ch.d), 0, ch.d);
    root.rotation.y = pathAngle(ch.d);
    const ring = torus(`hr3-gate-ring-${ch.id}`, ch.final ? 11.5 : 9.0, ch.final ? 0.17 : 0.11, new BABYLON.Vector3(0, 3.55, 0), chapterMats[i], root);
    ring.rotation.x = Math.PI / 2;
    ring.scaling.y = 0.9;
    [-1, 1].forEach(side => {
      box(`hr3-gate-pylon-${ch.id}-${side}`, { width: 0.36, height: 4.0, depth: 0.46 }, new BABYLON.Vector3(side * 4.25, 2.0, 0), M.steel, root);
      addGlow(box(`hr3-gate-line-${ch.id}-${side}`, { width: 0.09, height: 3.0, depth: 0.49 }, new BABYLON.Vector3(side * 4.25, 2.0, -0.25), chapterMats[i], root));
    });
    gateRoots.push({ ch, root, ring, phase: i * .8 });
  });

  // Final transition corridor into 2027.
  for (let i = 0; i < 8; i++) {
    const d = 288 + i * 3.0;
    const ring = torus(`hr3-future-ring-${i}`, 9.4 + i * .42, 0.035 + i * .004, new BABYLON.Vector3(pathX(d), 3.55, d), i % 2 ? M.violet : M.white);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = pathAngle(d);
    ring.scaling.y = 0.88;
    ring.visibility = 0.22 + i * .04;
  }

  let time = 0;
  let activeChapter = null;
  H.registerUpdate(dt => {
    time += dt;
    if (!state.running) return;
    const d = BABYLON.Scalar.Clamp(H.vehicle.root.position.z, 0, routeLength);
    state.routeDistance = d;
    document.getElementById("progressBar").style.width = `${(d / routeLength) * 100}%`;

    let current = data.chapters[0];
    for (const ch of data.chapters) {
      if (d >= ch.d - 18) current = ch;
    }
    if (current !== activeChapter) {
      activeChapter = current;
      state.chapter = current;
      document.getElementById("chapterNo").textContent = current.no;
      document.getElementById("chapterTitle").textContent = current.title;
      H.emit("chapter", current);
    }
    document.getElementById("chapterDistance").textContent = `${Math.round(d)} м / ${routeLength}`;

    gateRoots.forEach((g, i) => {
      const pulse = 1 + Math.sin(time * 2.0 + g.phase) * 0.03;
      g.ring.scaling.x = pulse;
      g.ring.scaling.y = 0.9 * pulse;
      g.ring.rotation.z += dt * (g.ch.final ? 0.24 : 0.08);
    });

    const k = BABYLON.Scalar.Clamp((d - 282) / 34, 0, 1);
    if (k > 0) {
      scene.fogColor = BABYLON.Color3.Lerp(new BABYLON.Color3(0.012, 0.024, 0.044), new BABYLON.Color3(0.068, 0.022, 0.11), k * 0.70);
      scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.Lerp(new BABYLON.Color3(0.004,0.008,0.018), new BABYLON.Color3(0.035,0.006,0.060), k * 0.60), 1);
    }
  });

  H.route = { routeLength, pathX, pathAngle, gateRoots };
})();
