(() => {
  const H = window.HR3;
  if (!H?.vehicle || !H.scene) return;

  const scene = H.scene;
  const sourceUrl = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb";
  const creditText = "Car Concept · Eric Chadwick / Darmstadt Graphics Group · CC BY 4.0";

  let motionRoot = null;
  let lastSpeed = 0;
  let lastYaw = 0;

  function isDescendant(node, parent) {
    let current = node;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  function descendants(root) {
    return scene.meshes.filter(mesh => mesh && isDescendant(mesh, root));
  }

  function bounds(meshes) {
    let min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    let max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    let count = 0;
    meshes.forEach(mesh => {
      if (!mesh.getBoundingInfo || !mesh.isEnabled()) return;
      mesh.computeWorldMatrix(true);
      const b = mesh.getBoundingInfo()?.boundingBox;
      if (!b) return;
      min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
      count += 1;
    });
    return count ? { min, max, size: max.subtract(min), center: min.add(max).scale(0.5) } : null;
  }

  function styleImportedModel(modelRoot) {
    const meshes = descendants(modelRoot);
    const logoRx = /(khronos|3d.?commerce|logo)/i;

    meshes.forEach(mesh => {
      const materialName = mesh.material?.name || "";
      const combined = `${mesh.name || ""} ${materialName}`;
      if (logoRx.test(combined)) {
        mesh.setEnabled(false);
        return;
      }

      mesh.isPickable = false;
      mesh.checkCollisions = false;
      const mat = mesh.material;
      if (!(mat instanceof BABYLON.PBRMaterial)) return;

      const name = `${mesh.name || ""} ${mat.name || ""}`.toLowerCase();
      if (/body|paint|exterior|carbody|car_body/.test(name)) {
        mat.albedoColor = BABYLON.Color3.FromHexString("#c90822");
        mat.metallic = 0.62;
        mat.roughness = 0.14;
        if (mat.clearCoat) {
          mat.clearCoat.isEnabled = true;
          mat.clearCoat.intensity = 1.0;
          mat.clearCoat.roughness = 0.045;
        }
      }
      if (/glass|window|windscreen/.test(name)) {
        mat.alpha = Math.min(mat.alpha ?? 1, 0.40);
        mat.roughness = 0.065;
      }
      if (/wheel|rim|tire|tyre|carbon|trim/.test(name)) {
        mat.metallic = Math.max(mat.metallic ?? 0, 0.48);
        mat.roughness = Math.min(mat.roughness ?? 0.4, 0.26);
      }
    });

    return meshes.filter(mesh => mesh.isEnabled());
  }

  function normalizeModel(modelRoot) {
    let meshes = styleImportedModel(modelRoot);
    let b = bounds(meshes);
    if (!b) return false;

    // Align the longest horizontal axis with the route direction (+Z).
    if (b.size.x > b.size.z * 1.12) {
      modelRoot.rotationQuaternion = null;
      modelRoot.rotation.y += Math.PI / 2;
      modelRoot.computeWorldMatrix(true);
      meshes.forEach(mesh => mesh.computeWorldMatrix(true));
      b = bounds(meshes);
    }

    if (!b) return false;
    const longSide = Math.max(b.size.x, b.size.z);
    if (!Number.isFinite(longSide) || longSide < 0.001) return false;

    const targetLength = 4.05;
    const scale = targetLength / longSide;
    modelRoot.scaling.setAll(scale);
    modelRoot.computeWorldMatrix(true);
    meshes.forEach(mesh => mesh.computeWorldMatrix(true));
    b = bounds(meshes);
    if (!b) return false;

    // Center around the driving root and place tyres visually on the floor.
    const parentPos = H.vehicle.root.getAbsolutePosition();
    modelRoot.position.x += parentPos.x - b.center.x;
    modelRoot.position.z += parentPos.z - b.center.z;
    modelRoot.position.y += parentPos.y + 0.02 - b.min.y;

    modelRoot.computeWorldMatrix(true);
    meshes.forEach(mesh => mesh.computeWorldMatrix(true));
    b = bounds(meshes);

    modelRoot.metadata = {
      ...(modelRoot.metadata || {}),
      hr3Premium: true,
      source: sourceUrl,
      license: "CC-BY-4.0",
      credit: creditText,
      normalizedLength: b ? Math.max(b.size.x, b.size.z) : targetLength
    };
    return true;
  }

  function addMotionRig(modelRoot) {
    motionRoot = new BABYLON.TransformNode("hr3-premium-motion", scene);
    motionRoot.parent = H.vehicle.root;
    modelRoot.parent = motionRoot;
    lastSpeed = H.vehicle.speed;
    lastYaw = H.vehicle.yaw;
  }

  function addStatusBadge(text, state = "loading") {
    let badge = document.getElementById("hr3PremiumBadge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "hr3PremiumBadge";
      badge.style.cssText = "position:fixed;z-index:31;left:18px;top:102px;padding:7px 10px;border-radius:9px;border:1px solid rgba(108,225,255,.16);background:rgba(3,10,17,.76);backdrop-filter:blur(9px);font:700 8px/1.25 Inter,Arial,sans-serif;letter-spacing:.08em;color:rgba(233,248,252,.68);pointer-events:none;max-width:min(360px,70vw);transition:.45s opacity,.45s transform";
      document.body.appendChild(badge);
    }
    badge.dataset.state = state;
    badge.style.opacity = "1";
    badge.style.transform = "translateY(0)";
    badge.textContent = text;
    if (state === "ok") badge.style.borderColor = "rgba(88,224,185,.26)";
    if (state === "fallback") badge.style.borderColor = "rgba(255,197,103,.22)";
    if (state !== "loading") {
      window.setTimeout(() => {
        badge.style.opacity = ".22";
        badge.style.transform = "translateY(-3px)";
      }, 6500);
    }
  }

  async function bootPremium() {
    addStatusBadge("АВТОМОБИЛЬ · загрузка premium GLB…");
    const ok = await H.vehicle.loadPremiumModel(sourceUrl);
    if (!ok) {
      addStatusBadge("АВТОМОБИЛЬ · процедурный резервный режим", "fallback");
      H.emit?.("vehicle:premium-ready", { ok: false, fallback: true });
      return;
    }

    const modelRoot = scene.getTransformNodeByName("hr3-premium-car");
    if (!modelRoot || !normalizeModel(modelRoot)) {
      modelRoot?.setEnabled(false);
      H.vehicle.fallback?.setEnabled(true);
      addStatusBadge("АВТОМОБИЛЬ · GLB не нормализован, включён резерв", "fallback");
      H.emit?.("vehicle:premium-ready", { ok: false, fallback: true });
      return;
    }

    addMotionRig(modelRoot);
    addStatusBadge("2027 CONCEPT · premium 3D prototype · CC BY 4.0", "ok");
    H.emit?.("vehicle:premium-ready", { ok: true, modelRoot, motionRoot, sourceUrl, credit: creditText });
  }

  H.registerUpdate(dt => {
    if (!motionRoot || !H.state.running) return;
    const speed = H.vehicle.speed;
    const sf = BABYLON.Scalar.Clamp(Math.abs(speed) / 10.8, 0, 1);
    const accel = (speed - lastSpeed) / Math.max(dt, 0.016);
    let yawDelta = H.vehicle.yaw - lastYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    const yawRate = yawDelta / Math.max(dt, 0.016);

    const targetPitch = BABYLON.Scalar.Clamp(-accel * 0.0032, -0.040, 0.045);
    const targetRoll = BABYLON.Scalar.Clamp(-yawRate * sf * 0.050, -0.052, 0.052);
    const alpha = 1 - Math.exp(-7.5 * dt);
    motionRoot.rotation.x = BABYLON.Scalar.Lerp(motionRoot.rotation.x, targetPitch, alpha);
    motionRoot.rotation.z = BABYLON.Scalar.Lerp(motionRoot.rotation.z, targetRoll, alpha);

    lastSpeed = speed;
    lastYaw = H.vehicle.yaw;
  });

  // Start after the base vehicle has registered its update loop.
  window.setTimeout(bootPremium, 80);
})();
