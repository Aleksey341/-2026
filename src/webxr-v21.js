(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;
  const car = scene.getTransformNodeByName("v13-supercar");
  const chase = scene.getCameraByName("v13-chase-camera");
  if (!car || !chase) return;

  document.body.classList.add("webxr-v21");

  const speedEl = document.getElementById("v13Speed");
  const distanceEl = document.getElementById("v16Distance");
  const glow = scene.getGlowLayerByName?.("glow");

  const xrState = window.HR_XR_INPUT = {
    active: false,
    steer: 0,
    throttle: 0,
    brake: false
  };

  function readNumber(el) {
    const n = parseFloat(String(el?.textContent || "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const chip = document.createElement("button");
  chip.className = "v21-vr-chip checking";
  chip.type = "button";
  chip.innerHTML = '<span>WEBXR</span><strong>ПРОВЕРКА VR…</strong><i>QUEST</i>';
  document.body.appendChild(chip);
  const chipState = chip.querySelector("strong");

  const help = document.createElement("div");
  help.className = "v21-vr-help";
  help.innerHTML = '<span>VR COCKPIT</span><b>левый стик — газ и руль</b><i>триггер — тормоз · взгляд — свободно</i>';
  document.body.appendChild(help);

  // A real 3D dashboard: visible in the headset, not just in the browser DOM.
  const dash = BABYLON.MeshBuilder.CreatePlane("v21-vr-dashboard", {
    width: 0.86,
    height: 0.27,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE
  }, scene);
  dash.parent = car;
  dash.position.set(0, 0.91, 0.72);
  dash.rotation.y = Math.PI;
  dash.isPickable = false;
  dash.checkCollisions = false;

  const dashTex = new BABYLON.DynamicTexture("v21-vr-dashboard-tex", { width: 1024, height: 320 }, scene, true);
  dashTex.hasAlpha = true;
  const dashMat = new BABYLON.StandardMaterial("v21-vr-dashboard-mat", scene);
  dashMat.diffuseTexture = dashTex;
  dashMat.emissiveTexture = dashTex;
  dashMat.opacityTexture = dashTex;
  dashMat.useAlphaFromDiffuseTexture = true;
  dashMat.disableLighting = true;
  dashMat.backFaceCulling = false;
  dash.material = dashMat;
  dash.setEnabled(false);
  glow?.addIncludedOnlyMesh?.(dash);

  function drawDash() {
    const ctx = dashTex.getContext();
    const speed = Math.round(readNumber(speedEl));
    const distance = Math.round(readNumber(distanceEl));
    ctx.clearRect(0, 0, 1024, 320);
    const g = ctx.createLinearGradient(0, 0, 1024, 0);
    g.addColorStop(0, "rgba(2,10,16,.90)");
    g.addColorStop(1, "rgba(8,27,36,.72)");
    ctx.fillStyle = g;
    ctx.fillRect(10, 10, 1004, 300);
    ctx.strokeStyle = "#59ddff";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 1004, 300);
    ctx.fillStyle = "#59ddff";
    ctx.font = "700 30px Arial";
    ctx.fillText("ЦК БОРУП · VR DRIVE · DEMO 2025", 42, 58);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 116px Arial";
    ctx.fillText(String(speed), 42, 192);
    ctx.fillStyle = "rgba(230,245,250,.72)";
    ctx.font = "700 30px Arial";
    ctx.fillText("КМ/Ч", 270, 190);
    ctx.fillStyle = "#b99cff";
    ctx.font = "900 72px Arial";
    ctx.textAlign = "right";
    ctx.fillText(String(distance).padStart(3, "0"), 942, 184);
    ctx.fillStyle = "rgba(230,245,250,.70)";
    ctx.font = "700 26px Arial";
    ctx.fillText("/ 320 M", 942, 228);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(230,245,250,.56)";
    ctx.font = "600 24px Arial";
    ctx.fillText("ИТОГИ 2026 · ПРОСТРАНСТВЕННАЯ ПОДАЧА ДАННЫХ", 42, 274);
    dashTex.update();
  }
  drawDash();

  // The XR camera is attached to a cockpit rig. Head tracking stays natural while the rig follows the car.
  const xrRig = new BABYLON.TransformNode("v21-xr-cockpit-rig", scene);
  xrRig.parent = car;
  xrRig.position.set(0, 1.28, 0.12);

  const hiddenInXR = [
    scene.getMeshByName("v13-driver-head"),
    scene.getMeshByName("v13-driver-hair"),
    scene.getMeshByName("v13-driver-hair-l"),
    scene.getMeshByName("v13-driver-hair-r")
  ].filter(Boolean);
  const canopy = scene.getMeshByName("v13-canopy");
  let canopyVisibility = canopy?.visibility ?? 1;

  const syntheticPressed = new Set();
  function sendKey(code, down) {
    const isDown = syntheticPressed.has(code);
    if (down === isDown) return;
    if (down) syntheticPressed.add(code); else syntheticPressed.delete(code);
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
  }
  function releaseDrivingKeys() {
    ["KeyW", "KeyS", "KeyA", "KeyD", "Space"].forEach(code => sendKey(code, false));
    xrState.steer = 0;
    xrState.throttle = 0;
    xrState.brake = false;
  }
  function tapKey(code) {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  }

  let xr = null;
  let supported = false;
  let entering = false;
  let directorWasOn = false;
  let frame = 0;

  function setChip(state, text) {
    chip.classList.remove("checking", "ready", "active", "unsupported", "error");
    chip.classList.add(state);
    chipState.textContent = text;
  }

  function controllerInput() {
    if (!xrState.active || !xr?.input?.controllers) {
      releaseDrivingKeys();
      return;
    }

    let chosen = null;
    let fallback = null;
    let brake = false;

    for (const controller of xr.input.controllers) {
      const mc = controller.motionController;
      if (!mc) continue;
      const handedness = controller.inputSource?.handedness || "none";
      const components = mc.components || {};
      for (const [id, component] of Object.entries(components)) {
        const axes = component?.axes;
        if (axes && axes.length >= 2) {
          const candidate = { x: Number(axes[0]) || 0, y: Number(axes[1]) || 0, handedness };
          if (handedness === "left") chosen = candidate;
          else if (!fallback) fallback = candidate;
        }
        const looksLikeTrigger = id.toLowerCase().includes("trigger") || String(component?.type || "").toLowerCase().includes("trigger");
        if (looksLikeTrigger && (component?.pressed || (component?.value || 0) > 0.55)) brake = true;
      }
    }

    const stick = chosen || fallback || { x: 0, y: 0 };
    const dead = 0.22;
    xrState.steer = Math.abs(stick.x) > dead ? stick.x : 0;
    xrState.throttle = Math.abs(stick.y) > dead ? -stick.y : 0;
    xrState.brake = brake;

    sendKey("KeyW", xrState.throttle > dead);
    sendKey("KeyS", xrState.throttle < -dead);
    sendKey("KeyA", xrState.steer < -dead);
    sendKey("KeyD", xrState.steer > dead);
    sendKey("Space", brake);
  }

  function enterVisualState(xrCamera) {
    xrState.active = true;
    document.body.classList.add("xr-active-v21");
    setChip("active", "VR АКТИВЕН");
    help.classList.add("active");
    dash.setEnabled(true);

    hiddenInXR.forEach(m => m.setEnabled(false));
    if (canopy) {
      canopyVisibility = canopy.visibility;
      canopy.visibility = 0.16;
    }

    // Auto-director camera cuts are deliberately disabled in a headset for comfort.
    const directorState = document.querySelector(".v20-director-chip strong");
    directorWasOn = directorState?.textContent?.trim() === "ON";
    if (directorWasOn) tapKey("KeyX");

    xrCamera.parent = xrRig;
    // With the WebXR "local" reference space the first head pose is near the local origin,
    // so this cockpit offset remains seated and avoids using the user's physical floor height.
    xrCamera.position.set(0, 0, 0);
    xrCamera.rotationQuaternion = null;
  }

  function leaveVisualState() {
    xrState.active = false;
    document.body.classList.remove("xr-active-v21");
    setChip("ready", "ВОЙТИ В VR");
    help.classList.remove("active");
    dash.setEnabled(false);
    releaseDrivingKeys();
    hiddenInXR.forEach(m => m.setEnabled(true));
    if (canopy) canopy.visibility = canopyVisibility;
    if (directorWasOn) tapKey("KeyX");
    directorWasOn = false;
    scene.activeCamera = chase;
  }

  async function initXR() {
    try {
      supported = !!navigator.xr && await navigator.xr.isSessionSupported("immersive-vr");
      if (!supported) {
        setChip("unsupported", "VR НЕДОСТУПЕН");
        chip.title = "Immersive WebXR не поддерживается этим браузером или устройством";
        return;
      }

      xr = await scene.createDefaultXRExperienceAsync({
        disableDefaultUI: true,
        disableTeleportation: true,
        disablePointerSelection: true,
        disableNearInteraction: true,
        disableHandTracking: true,
        floorMeshes: []
      });

      xr.baseExperience.onStateChangedObservable.add(state => {
        if (state === BABYLON.WebXRState.IN_XR) {
          enterVisualState(xr.baseExperience.camera);
        } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
          leaveVisualState();
        }
      });

      setChip("ready", "ВОЙТИ В VR");
      chip.title = "Meta Quest / совместимый WebXR-шлем";
    } catch (err) {
      console.warn("WebXR init failed", err);
      setChip("error", "ОШИБКА VR");
    }
  }

  chip.addEventListener("pointerdown", async e => {
    e.preventDefault();
    if (!supported || !xr || entering || xrState.active) return;
    entering = true;
    setChip("checking", "ЗАПУСК VR…");
    try {
      // "local" keeps the cockpit at eye level independent of the physical guardian floor.
      await xr.baseExperience.enterXRAsync("immersive-vr", "local");
    } catch (err) {
      console.warn("VR entry failed", err);
      setChip("error", "НЕ УДАЛОСЬ ВОЙТИ");
      setTimeout(() => { if (!xrState.active) setChip("ready", "ВОЙТИ В VR"); }, 1800);
    } finally {
      entering = false;
    }
  });

  scene.onBeforeRenderObservable.add(() => {
    frame++;
    if (xrState.active) {
      controllerInput();
      if (frame % 6 === 0) drawDash();
    }
  });

  initXR();
})();