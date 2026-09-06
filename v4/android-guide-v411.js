(() => {
  const H = window.HR4;
  if (!H?.scene || !H?.glow) return;

  const { scene, state } = H;
  const V = (x = 0, y = 0, z = 0) => new BABYLON.Vector3(x, y, z);

  // v4.1.2 — the approved BORUP android is rendered from the supplied reference,
  // rather than being approximated with procedural primitive meshes.
  const root = new BABYLON.TransformNode('hr4-android-guide', scene);
  root.position.set(1.30, 0.02, -0.90);

  const texture = new BABYLON.Texture(
    './assets/borup-android-approved.webp?v=4120',
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
  androidMat.emissiveColor = new BABYLON.Color3(0.34, 0.47, 0.58);
  androidMat.specularColor = BABYLON.Color3.Black();
  androidMat.useAlphaFromDiffuseTexture = true;
  androidMat.disableLighting = true;
  androidMat.backFaceCulling = false;
  androidMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  androidMat.alpha = 1;

  const portrait = BABYLON.MeshBuilder.CreatePlane(
    'hr4-android-reference',
    { width: 2.10, height: 2.80, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  portrait.parent = root;
  portrait.position.y = 2.05;
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
  baseRing.setEnabled(false);
  H.glow.addIncludedOnlyMesh(baseRing);

  const scanMat = new BABYLON.StandardMaterial('hr4-android-scan-mat', scene);
  scanMat.emissiveColor = BABYLON.Color3.FromHexString('#83eaff');
  scanMat.disableLighting = true;
  scanMat.alpha = 0.0;
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
  point.intensity = 0.5;

  let destination = root.position.clone();
  let lastSection = null;
  let presenting = true;
  let presentationTime = 0;
  let elapsed = 0;

  // Before launch the approved android is the large hero on the right side of the screen.
  let targetScale = 1.34;
  let targetAlpha = 1.0;
  let targetPortraitY = 2.05;

  function setDestination(position) {
    destination = position.clone();
  }

  function sectionGuidePosition(section) {
    if (!section?.room) return V(2.9, 0, 2.2);
    if (section.final) return V(2.75, 0, 72.8);
    const side = Math.sign(section.room.x) || 1;
    return V(section.room.x * 0.5 - side * 0.9, 0, section.room.z - 1.55);
  }

  function enterHologramMode(alpha = 0.66) {
    targetScale = 0.92;
    targetAlpha = alpha;
    targetPortraitY = 1.40;
    baseRing.setEnabled(true);
    scanMat.alpha = 0.24;
  }

  H.on('mode', mode => {
    presenting = true;
    presentationTime = 0;
    enterHologramMode(mode === 'auto' ? 0.68 : 0.58);
    setDestination(mode === 'auto' ? V(2.7, 0, 1.6) : V(2.9, 0, 2.1));
  });

  H.on('board:show', ({ section }) => {
    lastSection = section;
    presenting = true;
    presentationTime = 0;
    enterHologramMode(0.72);
    setDestination(sectionGuidePosition(section));
  });

  H.on('board:hide', () => {
    presenting = false;
    targetAlpha = 0.48;
    if (lastSection?.room) setDestination(V(2.65, 0, lastSection.room.z + 1.8));
  });

  H.on('finale', () => {
    presenting = true;
    presentationTime = 0;
    enterHologramMode(0.70);
    setDestination(V(2.8, 0, 73.2));
  });

  H.registerUpdate(dt => {
    elapsed += dt;

    const moveEase = 1 - Math.exp(-3.8 * dt);
    root.position = BABYLON.Vector3.Lerp(root.position, destination, moveEase);
    root.position.y = 0.02 + Math.sin(elapsed * 2.1) * (state.running ? 0.025 : 0.012);

    const scaleEase = 1 - Math.exp(-5.2 * dt);
    const nextScale = BABYLON.Scalar.Lerp(portrait.scaling.x, targetScale, scaleEase);
    portrait.scaling.setAll(nextScale);
    portrait.position.y = BABYLON.Scalar.Lerp(
      portrait.position.y,
      targetPortraitY,
      1 - Math.exp(-5.2 * dt)
    );

    androidMat.alpha = BABYLON.Scalar.Lerp(
      androidMat.alpha,
      targetAlpha,
      1 - Math.exp(-4.2 * dt)
    );

    // A narrow travelling scan gives the exact image a holographic in-world treatment.
    scan.position.y = -1.08 + ((elapsed * 0.48) % 1) * 2.14;
    scanMat.alpha = BABYLON.Scalar.Lerp(
      scanMat.alpha,
      state.running ? (presenting ? 0.34 : 0.16) : 0,
      1 - Math.exp(-4 * dt)
    );

    baseRing.rotation.z -= dt * 0.34;
    const pulse = 1 + Math.sin(elapsed * 2.8) * 0.055;
    baseRing.scaling.setAll(pulse);

    if (state.running && presenting) {
      presentationTime += dt;
      if (presentationTime > 3.2) {
        presenting = false;
        targetAlpha = 0.54;
      }
    }

    point.intensity = state.running
      ? (presenting ? 0.42 : 0.25)
      : 0.52;
  });

  H.androidGuide = {
    root,
    portrait,
    setDestination,
    present(section) {
      lastSection = section;
      presenting = true;
      presentationTime = 0;
      enterHologramMode(0.72);
      setDestination(sectionGuidePosition(section));
    }
  };
})();