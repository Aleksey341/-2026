(() => {
  const H = window.HR3;
  if (!H?.scene || !H?.route || !H?.vehicle) return;
  const { scene, glow, state, route } = H;

  function pbr(name, hex, emissive = .9, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.metallic = .08;
    m.roughness = .16;
    m.alpha = alpha;
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const violet = pbr("hr3-final-violet", "#c29cff", 1.05);
  const cyan = pbr("hr3-final-cyan", "#66e4ff", .95);
  const white = pbr("hr3-final-white", "#f3fbff", .9);
  const dark = pbr("hr3-final-dark", "#03060d", .01, .94);
  const addGlow = mesh => { glow.addIncludedOnlyMesh(mesh); return mesh; };

  // v3.2: final area contains only abstract spatial effects.
  // All words, years and numbers are shown exclusively on the final DOM board.
  const portalRoot = new BABYLON.TransformNode("hr3-final-portal-root", scene);
  portalRoot.position.set(route.pathX(309), 0, 309);
  const rings = [];
  for (let i = 0; i < 9; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`hr3-final-portal-${i}`, {
      diameter: 9.0 + i * .5,
      thickness: .035 + i * .006,
      tessellation: 72
    }, scene);
    ring.parent = portalRoot;
    ring.position.z = i * .52;
    ring.position.y = 3.55;
    ring.rotation.x = Math.PI / 2;
    ring.scaling.y = .87;
    ring.material = i % 2 ? violet : white;
    ring.visibility = .12;
    ring.isPickable = false;
    addGlow(ring);
    rings.push(ring);
  }

  const plaza = BABYLON.MeshBuilder.CreateCylinder("hr3-final-plaza", { diameter: 26, height: .14, tessellation: 72 }, scene);
  plaza.position.set(route.pathX(318), .02, 322);
  plaza.material = dark;
  plaza.isPickable = false;

  for (let i = 0; i < 5; i++) {
    const a = (-2 + i) * .38;
    const pedestal = BABYLON.MeshBuilder.CreateCylinder(`hr3-final-goal-${i}`, { diameter: 1.05, height: .2, tessellation: 32 }, scene);
    pedestal.position.set(route.pathX(318) + Math.sin(a) * 7.0, .16, 322 + Math.cos(a) * 5.8);
    pedestal.material = i % 2 ? violet : cyan;
    pedestal.visibility = .24;
    pedestal.isPickable = false;
    addGlow(pedestal);
  }

  const particles = [];
  for (let i = 0; i < 52; i++) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(`hr3-final-particle-${i}`, { diameter: .035 + (i % 4) * .012, segments: 6 }, scene);
    mesh.position.set(route.pathX(289), 4.0, 289);
    mesh.material = i % 3 ? cyan : white;
    mesh.visibility = 0;
    mesh.isPickable = false;
    addGlow(mesh);
    particles.push({
      mesh,
      x: ((i * 37) % 101) / 101 - .5,
      y: ((i * 53) % 97) / 97 - .5,
      z: ((i * 71) % 89) / 89,
      phase: i * .41
    });
  }

  let time = 0;
  H.registerUpdate(dt => {
    time += dt;
    if (!state.running) return;
    const d = state.routeDistance || 0;

    particles.forEach(p => {
      const k = BABYLON.Scalar.Clamp((d - 284) / 15, 0, 1);
      p.mesh.visibility = k * (1 - BABYLON.Scalar.Clamp((d - 304) / 7, 0, 1));
      p.mesh.position.x = route.pathX(289) + p.x * (2 + k * 12) + Math.sin(time * 1.7 + p.phase) * .25;
      p.mesh.position.y = 4.0 + p.y * (1.5 + k * 7) + Math.cos(time * 1.3 + p.phase) * .18;
      p.mesh.position.z = 289 + p.z * (1 + k * 18);
    });

    const portalK = BABYLON.Scalar.Clamp((d - 294) / 17, 0, 1);
    rings.forEach((ring, i) => {
      ring.visibility = .12 + portalK * .72;
      ring.rotation.z += dt * (.16 + i * .025 + portalK * .22);
      const pulse = 1 + Math.sin(time * 2.6 + i * .6) * (.018 + portalK * .035);
      ring.scaling.x = pulse;
      ring.scaling.y = .87 * pulse;
    });

    const futureK = BABYLON.Scalar.Clamp((d - 303) / 9, 0, 1);
    if (futureK > .02) {
      scene.fogDensity = BABYLON.Scalar.Lerp(scene.fogDensity, .008 + futureK * .004, 1 - Math.exp(-2.2 * dt));
    }
  });

  H.finale2027 = { portalRoot, plaza, version: "3.2.0" };
})();
