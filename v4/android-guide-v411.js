(() => {
  const H = window.HR4;
  if (!H?.scene || !H?.glow) return;

  const { scene, glow, state } = H;
  const V = (x = 0, y = 0, z = 0) => new BABYLON.Vector3(x, y, z);

  function mat(name, hex, emissive = 0, alpha = 1, metallic = 0.28, roughness = 0.24) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = m.albedoColor.scale(emissive);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    graphite: mat('hr4-android-graphite', '#0f171f', 0.04, 0.94, 0.72, 0.2),
    shell: mat('hr4-android-shell', '#c7f4ff', 0.1, 0.7, 0.12, 0.16),
    holo: mat('hr4-android-holo', '#78e8ff', 0.72, 0.52, 0.04, 0.12),
    darkGlass: mat('hr4-android-face-glass', '#07131b', 0.08, 0.76, 0.18, 0.12)
  };

  const root = new BABYLON.TransformNode('hr4-android-guide', scene);
  root.position.set(3.1, 0.02, -2.55);
  root.rotation.y = -0.18;

  const torso = BABYLON.MeshBuilder.CreateCylinder('hr4-android-torso', {
    height: 1.05, diameterTop: 0.48, diameterBottom: 0.62, tessellation: 20
  }, scene);
  torso.parent = root;
  torso.position.y = 1.28;
  torso.material = M.graphite;

  const chest = BABYLON.MeshBuilder.CreateBox('hr4-android-chest', {
    width: 0.39, height: 0.5, depth: 0.06
  }, scene);
  chest.parent = root;
  chest.position.set(0, 1.34, -0.31);
  chest.material = M.shell;

  const chestCore = BABYLON.MeshBuilder.CreateBox('hr4-android-chest-core', {
    width: 0.085, height: 0.28, depth: 0.025
  }, scene);
  chestCore.parent = root;
  chestCore.position.set(0, 1.35, -0.35);
  chestCore.material = M.holo;
  glow.addIncludedOnlyMesh(chestCore);

  const neck = BABYLON.MeshBuilder.CreateCylinder('hr4-android-neck', {
    height: 0.19, diameter: 0.2, tessellation: 14
  }, scene);
  neck.parent = root;
  neck.position.y = 1.87;
  neck.material = M.graphite;

  const head = BABYLON.MeshBuilder.CreateSphere('hr4-android-head', {
    diameter: 0.5, segments: 24
  }, scene);
  head.parent = root;
  head.position.y = 2.12;
  head.scaling.y = 1.08;
  head.material = M.shell;

  const face = BABYLON.MeshBuilder.CreateBox('hr4-android-face', {
    width: 0.31, height: 0.18, depth: 0.055
  }, scene);
  face.parent = root;
  face.position.set(0, 2.12, -0.235);
  face.material = M.darkGlass;

  const eyeLine = BABYLON.MeshBuilder.CreateBox('hr4-android-eye-line', {
    width: 0.2, height: 0.018, depth: 0.012
  }, scene);
  eyeLine.parent = root;
  eyeLine.position.set(0, 2.14, -0.27);
  eyeLine.material = M.holo;
  glow.addIncludedOnlyMesh(eyeLine);

  const temple = BABYLON.MeshBuilder.CreateSphere('hr4-android-temple-led', {
    diameter: 0.058, segments: 14
  }, scene);
  temple.parent = root;
  temple.position.set(0.23, 2.13, -0.08);
  temple.material = M.holo;
  glow.addIncludedOnlyMesh(temple);

  const limbPivots = {};
  function limb(name, x, y, length = 0.72, diameter = 0.16) {
    const pivot = new BABYLON.TransformNode(`hr4-android-${name}-pivot`, scene);
    pivot.parent = root;
    pivot.position.set(x, y, 0);
    const mesh = BABYLON.MeshBuilder.CreateCylinder(`hr4-android-${name}`, {
      height: length, diameter, tessellation: 14
    }, scene);
    mesh.parent = pivot;
    mesh.position.y = -length * 0.46;
    mesh.material = M.graphite;
    limbPivots[name] = pivot;
    return pivot;
  }

  const armL = limb('arm-l', -0.39, 1.63);
  const armR = limb('arm-r', 0.39, 1.63);
  limb('leg-l', -0.18, 0.76, 0.74, 0.17);
  limb('leg-r', 0.18, 0.76, 0.74, 0.17);

  for (const [name, x] of [['foot-l', -0.18], ['foot-r', 0.18]]) {
    const foot = BABYLON.MeshBuilder.CreateBox(`hr4-android-${name}`, {
      width: 0.22, height: 0.12, depth: 0.36
    }, scene);
    foot.parent = root;
    foot.position.set(x, 0.08, -0.08);
    foot.material = M.graphite;
  }

  const palm = BABYLON.MeshBuilder.CreateSphere('hr4-android-palm-light', {
    diameter: 0.09, segments: 14
  }, scene);
  palm.parent = armR;
  palm.position.set(0, -0.72, -0.02);
  palm.material = M.holo;
  glow.addIncludedOnlyMesh(palm);

  const holoRing = BABYLON.MeshBuilder.CreateTorus('hr4-android-holo-ring', {
    diameter: 0.62, thickness: 0.018, tessellation: 64
  }, scene);
  holoRing.parent = armR;
  holoRing.position.set(0, -0.76, -0.13);
  holoRing.rotation.x = Math.PI / 2;
  holoRing.material = M.holo;
  glow.addIncludedOnlyMesh(holoRing);

  const baseRing = BABYLON.MeshBuilder.CreateTorus('hr4-android-base-ring', {
    diameter: 0.92, thickness: 0.026, tessellation: 64
  }, scene);
  baseRing.parent = root;
  baseRing.position.y = 0.04;
  baseRing.rotation.x = Math.PI / 2;
  baseRing.material = M.holo;
  baseRing.setEnabled(false);
  glow.addIncludedOnlyMesh(baseRing);

  const point = new BABYLON.PointLight('hr4-android-light', V(0, 1.8, 0), scene);
  point.parent = root;
  point.diffuse = BABYLON.Color3.FromHexString('#87eaff');
  point.intensity = 0.48;
  point.range = 5.5;

  let destination = root.position.clone();
  let gesture = true;
  let lastSection = null;
  let presentationFade = 0;
  let elapsed = 0;

  function setDestination(position) {
    destination = position.clone();
  }

  function faceTarget(target) {
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    if (Math.hypot(dx, dz) > 0.01) root.rotation.y = Math.atan2(dx, dz);
  }

  function sectionGuidePosition(section) {
    if (!section?.room) return V(2.8, 0, 2.4);
    if (section.final) return V(2.8, 0, 72.8);
    const side = Math.sign(section.room.x) || 1;
    return V(section.room.x * 0.5 - side * 0.9, 0, section.room.z - 1.6);
  }

  H.on('mode', mode => {
    baseRing.setEnabled(true);
    gesture = true;
    presentationFade = 0;
    setDestination(mode === 'auto' ? V(2.7, 0, 1.6) : V(2.9, 0, 2.1));
  });

  H.on('board:show', ({ section }) => {
    lastSection = section;
    presentationFade = 0;
    gesture = true;
    setDestination(sectionGuidePosition(section));
  });

  H.on('board:hide', () => {
    gesture = false;
    if (lastSection?.room) setDestination(V(2.65, 0, lastSection.room.z + 1.8));
  });

  H.on('finale', () => {
    gesture = true;
    setDestination(V(2.8, 0, 73.2));
  });

  H.registerUpdate(dt => {
    elapsed += dt;
    const ease = 1 - Math.exp(-3.8 * dt);
    root.position = BABYLON.Vector3.Lerp(root.position, destination, ease);
    root.position.y = 0.02 + Math.sin(elapsed * 2.1) * 0.025;

    const player = H.character?.root;
    if (state.running && player) faceTarget(player.position.add(V(0, 0, 1.2)));
    else root.rotation.y = -0.18 + Math.sin(elapsed * 0.45) * 0.04;

    const introGesture = !state.running;
    const targetArm = (gesture || introGesture) ? -0.92 : -0.12;
    armR.rotation.x = BABYLON.Scalar.Lerp(armR.rotation.x, targetArm, 1 - Math.exp(-5 * dt));
    armR.rotation.z = BABYLON.Scalar.Lerp(armR.rotation.z, (gesture || introGesture) ? -0.3 : 0.05, 1 - Math.exp(-5 * dt));
    armL.rotation.x = BABYLON.Scalar.Lerp(armL.rotation.x, 0.08, 1 - Math.exp(-4 * dt));

    holoRing.rotation.z += dt * 0.8;
    const pulse = 1 + Math.sin(elapsed * 3.2) * 0.08;
    holoRing.scaling.setAll(pulse);
    baseRing.rotation.z -= dt * 0.42;
    baseRing.scaling.setAll(1 + Math.sin(elapsed * 2.6) * 0.055);

    if (state.running && gesture) {
      presentationFade += dt;
      if (presentationFade > 3.1) gesture = false;
    }

    const hologramAlpha = state.running ? 0.5 : 0.82;
    M.shell.alpha += (hologramAlpha - M.shell.alpha) * Math.min(1, dt * 4);
    M.holo.alpha += ((state.running ? 0.46 : 0.72) - M.holo.alpha) * Math.min(1, dt * 4);
    point.intensity = state.running ? 0.3 : 0.52;
  });

  H.androidGuide = {
    root,
    setDestination,
    present(section) {
      lastSection = section;
      gesture = true;
      presentationFade = 0;
      setDestination(sectionGuidePosition(section));
    }
  };
})();
