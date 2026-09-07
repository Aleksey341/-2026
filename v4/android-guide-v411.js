(() => {
  const H = window.HR4;
  if (!H?.scene || !H?.glow) return;

  const { scene, state, camera } = H;
  const V = (x = 0, y = 0, z = 0) => new BABYLON.Vector3(x, y, z);

  // v4.1.4 — the approved android is now tied to the navigation proxy.
  // He physically travels through the complex in AUTO and FREE modes instead
  // of teleporting independently as a decorative billboard.
  const root = new BABYLON.TransformNode('hr4-android-guide', scene);
  root.position.set(0, 0.02, -3.2);
  root.setEnabled(false);

  const texture = new BABYLON.Texture(
    './assets/borup-android-approved.webp?v=4140',
    scene,
    true,
    false,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE
  );
  texture.hasAlpha = true;
  texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  const androidMat = new BABYLON.StandardMaterial('hr4-android-reference-mat', scene);
  androidMat.diffuseTexture = texture;
  // Do NOT reuse the portrait as an emissive texture: that was the main source
  // of the smeared/ghosted silhouette visible through bloom and fog.
  androidMat.emissiveTexture = null;
  androidMat.diffuseColor = BABYLON.Color3.White();
  androidMat.emissiveColor = new BABYLON.Color3(0.06, 0.12, 0.16);
  androidMat.specularColor = BABYLON.Color3.Black();
  androidMat.useAlphaFromDiffuseTexture = true;
  androidMat.disableLighting = false;
  androidMat.backFaceCulling = false;
  androidMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATESTANDBLEND;
  androidMat.alphaCutOff = 0.16;
  androidMat.alpha = 0.88;

  const portrait = BABYLON.MeshBuilder.CreatePlane(
    'hr4-android-reference',
    { width: 1.62, height: 2.16, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  portrait.parent = root;
  portrait.position.y = 1.18;
  portrait.material = androidMat;
  portrait.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
  portrait.isPickable = false;
  portrait.checkCollisions = false;
  portrait.renderingGroupId = 1;
  portrait.alphaIndex = 8;

  const ringMat = new BABYLON.StandardMaterial('hr4-android-platform-mat', scene);
  ringMat.emissiveColor = BABYLON.Color3.FromHexString('#63d7f5');
  ringMat.diffuseColor = BABYLON.Color3.FromHexString('#102936');
  ringMat.disableLighting = true;
  ringMat.alpha = 0.52;
  ringMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const baseRing = BABYLON.MeshBuilder.CreateTorus(
    'hr4-android-base-ring',
    { diameter: 0.98, thickness: 0.018, tessellation: 64 },
    scene
  );
  baseRing.parent = root;
  baseRing.position.y = 0.025;
  baseRing.rotation.x = Math.PI / 2;
  baseRing.material = ringMat;
  baseRing.isPickable = false;
  H.glow.addIncludedOnlyMesh(baseRing);

  const scanMat = new BABYLON.StandardMaterial('hr4-android-scan-mat', scene);
  scanMat.emissiveColor = BABYLON.Color3.FromHexString('#7be4ff');
  scanMat.disableLighting = true;
  scanMat.alpha = 0.10;
  scanMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const scan = BABYLON.MeshBuilder.CreatePlane(
    'hr4-android-scan',
    { width: 1.28, height: 0.012, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  scan.parent = portrait;
  scan.position.z = -0.02;
  scan.position.y = -0.88;
  scan.material = scanMat;
  scan.isPickable = false;
  scan.renderingGroupId = 2;
  H.glow.addIncludedOnlyMesh(scan);

  const point = new BABYLON.PointLight('hr4-android-light', V(0, 1.25, 0), scene);
  point.parent = root;
  point.diffuse = BABYLON.Color3.FromHexString('#75dff8');
  point.range = 3.6;
  point.intensity = 0.16;

  let elapsed = 0;
  let walkCycle = 0;
  let boardActive = false;
  let presenting = false;
  let presentationTime = 0;
  let lastNav = V(0,0,-3.2);
  let smoothSpeed = 0;

  function navPosition() {
    return H.character?.root?.position || lastNav;
  }

  function presentationOffset() {
    // The board is on the right side of the screen, therefore the guide moves
    // a little to camera-left while presenting so he never sits underneath it.
    const right = camera.getDirection(BABYLON.Axis.X).clone();
    right.y = 0;
    if (right.lengthSquared() > 0.001) right.normalize();
    return right.scale(-1.18);
  }

  function beginPresentation() {
    boardActive = true;
    presenting = true;
    presentationTime = 0;
  }

  H.on('mode', () => {
    root.setEnabled(true);
    const p = navPosition();
    root.position.set(p.x, 0.02, p.z);
    lastNav = p.clone();
    boardActive = false;
    presenting = false;
  });

  H.on('board:show', beginPresentation);
  H.on('board:hide', () => {
    boardActive = false;
    presenting = false;
  });
  H.on('finale', beginPresentation);

  H.registerUpdate(dt => {
    if (!state.running || !root.isEnabled()) return;
    elapsed += dt;

    const nav = navPosition();
    const delta = nav.subtract(lastNav);
    const rawSpeed = delta.length() / Math.max(dt, 0.001);
    smoothSpeed = BABYLON.Scalar.Lerp(smoothSpeed, Math.min(rawSpeed, 4), 1 - Math.exp(-8 * dt));
    const moving = smoothSpeed > 0.10;
    lastNav.copyFrom(nav);

    const target = nav.clone();
    if (boardActive) target.addInPlace(presentationOffset());

    // Fast but smooth positional tracking makes the android visibly travel with
    // the actual route rather than remain in a fixed presentation position.
    const follow = 1 - Math.exp(-10 * dt);
    root.position.x = BABYLON.Scalar.Lerp(root.position.x, target.x, follow);
    root.position.z = BABYLON.Scalar.Lerp(root.position.z, target.z, follow);
    root.position.y = 0.02;

    if (moving) walkCycle += dt * (4.2 + smoothSpeed * 2.1);
    const locomotion = BABYLON.Scalar.Clamp(smoothSpeed / 2.7, 0, 1);

    // 2.5D locomotion: stride/bob/lean on the approved art. It is deliberately
    // subtle, so the artwork does not rubber-band or distort.
    const bob = moving ? Math.abs(Math.sin(walkCycle)) * 0.035 * locomotion : 0;
    const sway = moving ? Math.sin(walkCycle * 0.5) * 0.022 * locomotion : 0;
    portrait.position.y = 1.18 + bob;
    portrait.position.x = sway;
    portrait.rotation.z = moving ? Math.sin(walkCycle * 0.5) * 0.010 * locomotion : BABYLON.Scalar.Lerp(portrait.rotation.z,0,0.12);

    let desiredScale = boardActive ? 0.84 : 0.76;
    if (presenting) desiredScale = 0.89;
    const nextScale = BABYLON.Scalar.Lerp(portrait.scaling.x, desiredScale, 1 - Math.exp(-5 * dt));
    portrait.scaling.setAll(nextScale);

    // Never allow the cutout to pass through the camera. This removes the giant
    // cropped face/body artifact that was visible on the supplied screenshot.
    const distToCamera = BABYLON.Vector3.Distance(root.position, camera.position);
    const cameraSafe = BABYLON.Scalar.Clamp((distToCamera - 1.45) / 1.35, 0, 1);
    const baseAlpha = boardActive ? (presenting ? 0.82 : 0.70) : 0.78;
    androidMat.alpha = BABYLON.Scalar.Lerp(androidMat.alpha, baseAlpha * cameraSafe, 1 - Math.exp(-8 * dt));

    scan.position.y = -0.82 + ((elapsed * 0.34) % 1) * 1.62;
    const desiredScan = presenting ? 0.18 : (moving ? 0.09 : 0.06);
    scanMat.alpha = BABYLON.Scalar.Lerp(scanMat.alpha, desiredScan * cameraSafe, 1 - Math.exp(-5 * dt));

    baseRing.rotation.z -= dt * (moving ? 0.62 : 0.22);
    const pulse = 1 + Math.sin(elapsed * 2.4) * 0.028;
    baseRing.scaling.setAll(pulse);
    ringMat.alpha = 0.34 + locomotion * 0.18 + (presenting ? 0.10 : 0);

    if (presenting) {
      presentationTime += dt;
      if (presentationTime > 2.4) presenting = false;
    }

    point.intensity = (0.10 + locomotion * 0.07 + (presenting ? 0.08 : 0)) * cameraSafe;
  });

  H.androidGuide = {
    root,
    portrait,
    present() { beginPresentation(); }
  };
})();
