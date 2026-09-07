(() => {
  const H = window.HR4;
  if (!H?.scene || !H?.glow) return;

  const { scene, state } = H;
  const V = (x = 0, y = 0, z = 0) => new BABYLON.Vector3(x, y, z);

  // v4.1.3 — one approved android identity is used everywhere:
  // start-screen hero, atrium hologram, free-explore companion and episode presenter.
  const root = new BABYLON.TransformNode('hr4-android-guide', scene);
  root.position.set(1.30, 0.02, -0.90);

  const texture = new BABYLON.Texture(
    './assets/borup-android-approved.webp?v=4130',
    scene,
    true,
    false,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE
  );
  texture.hasAlpha = true;
  texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  const androidMat = new BABYLON.StandardMaterial('hr4-android-reference-mat', scene);
  androidMat.diffuseTexture = texture;
  androidMat.emissiveTexture = texture;
  androidMat.diffuseColor = BABYLON.Color3.White();
  androidMat.emissiveColor = new BABYLON.Color3(0.30, 0.52, 0.72);
  androidMat.specularColor = BABYLON.Color3.Black();
  androidMat.useAlphaFromDiffuseTexture = true;
  androidMat.disableLighting = true;
  androidMat.backFaceCulling = false;
  androidMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  androidMat.alpha = 0.70;

  const portrait = BABYLON.MeshBuilder.CreatePlane(
    'hr4-android-reference',
    { width: 2.10, height: 2.80, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  portrait.parent = root;
  portrait.position.y = 1.42;
  portrait.material = androidMat;
  portrait.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
  portrait.isPickable = false;
  portrait.checkCollisions = false;
  portrait.renderingGroupId = 2;
  portrait.alphaIndex = 30;

  const ringMat = new BABYLON.StandardMaterial('hr4-android-platform-mat', scene);
  ringMat.emissiveColor = BABYLON.Color3.FromHexString('#69dcff');
  ringMat.diffuseColor = BABYLON.Color3.FromHexString('#17384a');
  ringMat.disableLighting = true;
  ringMat.alpha = 0.75;
  ringMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const baseRing = BABYLON.MeshBuilder.CreateTorus(
    'hr4-android-base-ring',
    { diameter: 1.15, thickness: 0.026, tessellation: 72 },
    scene
  );
  baseRing.parent = root;
  baseRing.position.y = 0.035;
  baseRing.rotation.x = Math.PI / 2;
  baseRing.material = ringMat;
  baseRing.isPickable = false;
  H.glow.addIncludedOnlyMesh(baseRing);

  const scanMat = new BABYLON.StandardMaterial('hr4-android-scan-mat', scene);
  scanMat.emissiveColor = BABYLON.Color3.FromHexString('#83eaff');
  scanMat.disableLighting = true;
  scanMat.alpha = 0.24;
  scanMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const scan = BABYLON.MeshBuilder.CreatePlane(
    'hr4-android-scan',
    { width: 1.85, height: 0.018, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  scan.parent = portrait;
  scan.position.z = -0.015;
  scan.position.y = -1.15;
  scan.material = scanMat;
  scan.isPickable = false;
  scan.renderingGroupId = 3;
  H.glow.addIncludedOnlyMesh(scan);

  const point = new BABYLON.PointLight('hr4-android-light', V(0, 1.65, 0), scene);
  point.parent = root;
  point.diffuse = BABYLON.Color3.FromHexString('#7fe6ff');
  point.range = 5.8;
  point.intensity = 0.35;

  let destination = V(2.8,0,1.7);
  let lastSection = null;
  let presenting = false;
  let presentationTime = 0;
  let elapsed = 0;
  let boardActive = false;
  let followFree = false;
  let targetScale = 0.94;
  let targetAlpha = 0.64;

  function setDestination(position) { destination = position.clone(); }

  function sectionGuidePosition(section) {
    if (!section?.room) return V(2.9, 0, 2.2);
    if (section.final) return V(2.75, 0, 72.8);
    const side = Math.sign(section.room.x) || 1;
    return V(section.room.x * 0.5 - side * 0.85, 0, section.room.z - 1.45);
  }

  function presentHere(position, alpha = 0.74, scale = 1.02) {
    presenting = true;
    presentationTime = 0;
    targetAlpha = alpha;
    targetScale = scale;
    setDestination(position);
  }

  H.on('mode', mode => {
    boardActive = false;
    followFree = mode === 'free';
    baseRing.setEnabled(true);
    if (mode === 'auto') presentHere(V(2.7,0,1.6),0.70,1.00);
    else {
      presenting = false;
      targetAlpha = 0.60;
      targetScale = 0.92;
    }
  });

  H.on('board:show', ({ section }) => {
    boardActive = true;
    lastSection = section;
    presentHere(sectionGuidePosition(section),0.78,1.04);
  });

  H.on('board:hide', () => {
    boardActive = false;
    presenting = false;
    targetAlpha = state.mode === 'free' ? 0.58 : 0.48;
    targetScale = 0.92;
    if (state.mode === 'auto' && lastSection?.room) {
      setDestination(V(2.65, 0, lastSection.room.z + 1.8));
    }
  });

  H.on('finale', () => {
    boardActive = true;
    presentHere(V(2.8, 0, 73.2),0.76,1.02);
  });

  H.registerUpdate(dt => {
    elapsed += dt;

    // In FREE EXPLORE the same approved android becomes a floating companion
    // near the invisible navigation proxy. During a board presentation he
    // leaves the companion position and moves to the corresponding episode.
    if (followFree && !boardActive && H.character?.root) {
      const p = H.character.root.position;
      const yaw = H.character.root.rotation.y || 0;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      setDestination(V(p.x + rx*2.1 - fx*.25, 0, p.z + rz*2.1 - fz*.25));
    }

    const moveEase = 1 - Math.exp(-4.2 * dt);
    root.position = BABYLON.Vector3.Lerp(root.position, destination, moveEase);
    root.position.y = 0.02 + Math.sin(elapsed * 2.1) * 0.025;

    const scaleEase = 1 - Math.exp(-5.2 * dt);
    const nextScale = BABYLON.Scalar.Lerp(portrait.scaling.x, targetScale, scaleEase);
    portrait.scaling.setAll(nextScale);
    portrait.position.y = 1.40 + Math.sin(elapsed*1.6)*0.018;

    androidMat.alpha = BABYLON.Scalar.Lerp(
      androidMat.alpha,
      targetAlpha,
      1 - Math.exp(-4.4 * dt)
    );

    scan.position.y = -1.08 + ((elapsed * 0.48) % 1) * 2.14;
    const desiredScan = state.running ? (presenting ? 0.38 : 0.18) : 0.22;
    scanMat.alpha = BABYLON.Scalar.Lerp(scanMat.alpha, desiredScan, 1-Math.exp(-4*dt));

    baseRing.rotation.z -= dt * 0.34;
    const pulse = 1 + Math.sin(elapsed * 2.8) * 0.055;
    baseRing.scaling.setAll(pulse);

    if (state.running && presenting) {
      presentationTime += dt;
      if (presentationTime > 3.0) {
        presenting = false;
        targetAlpha = boardActive ? 0.62 : 0.54;
        targetScale = 0.94;
      }
    }

    point.intensity = state.running ? (presenting ? 0.48 : 0.28) : 0.30;
  });

  H.androidGuide = {
    root,
    portrait,
    setDestination,
    present(section) {
      lastSection = section;
      boardActive = true;
      presentHere(sectionGuidePosition(section),0.78,1.04);
    }
  };
})();
