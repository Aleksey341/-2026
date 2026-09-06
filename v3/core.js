(() => {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: "high-performance" });
  const isMobile = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  if (isMobile) engine.setHardwareScalingLevel(Math.max(1.35, Math.min(2, window.devicePixelRatio || 1.5)));

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.004, 0.008, 0.018, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0026;
  scene.fogColor = new BABYLON.Color3(0.012, 0.024, 0.044);
  scene.collisionsEnabled = false;

  const camera = new BABYLON.UniversalCamera("hr3-camera", new BABYLON.Vector3(0, 3.2, -7), scene);
  camera.minZ = 0.05;
  camera.maxZ = 600;
  camera.fov = 0.92;
  camera.inertia = 0;
  scene.activeCamera = camera;

  const hemi = new BABYLON.HemisphericLight("hr3-hemi", new BABYLON.Vector3(0.1, 1, -0.2), scene);
  hemi.intensity = 0.55;
  hemi.diffuse = new BABYLON.Color3(0.62, 0.78, 1.0);
  hemi.groundColor = new BABYLON.Color3(0.04, 0.06, 0.10);

  const keyLight = new BABYLON.DirectionalLight("hr3-key", new BABYLON.Vector3(-0.35, -1, 0.45), scene);
  keyLight.position = new BABYLON.Vector3(20, 35, -20);
  keyLight.intensity = 1.25;
  keyLight.diffuse = new BABYLON.Color3(0.72, 0.88, 1.0);

  const glow = new BABYLON.GlowLayer("hr3-glow", scene, { blurKernelSize: isMobile ? 24 : 40 });
  glow.intensity = isMobile ? 0.68 : 0.82;

  let pipeline = null;
  try {
    pipeline = new BABYLON.DefaultRenderingPipeline("hr3-pipeline", true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = !isMobile;
    if (pipeline.bloomEnabled) {
      pipeline.bloomThreshold = 0.72;
      pipeline.bloomWeight = 0.18;
      pipeline.bloomKernel = 48;
      pipeline.bloomScale = 0.55;
    }
  } catch (_) {}

  const skyMat = new BABYLON.StandardMaterial("hr3-sky-mat", scene);
  skyMat.diffuseColor = new BABYLON.Color3(0.006, 0.012, 0.028);
  skyMat.emissiveColor = new BABYLON.Color3(0.008, 0.018, 0.040);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  const sky = BABYLON.MeshBuilder.CreateSphere("hr3-sky", { diameter: 520, segments: 20, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  sky.material = skyMat;
  sky.isPickable = false;

  const listeners = new Map();
  const updates = [];
  const state = {
    mode: "idle",
    running: false,
    paused: false,
    routeDistance: 0,
    chapter: null,
    xrActive: false,
    startAt: 0
  };

  function on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name)?.delete(fn);
  }
  function emit(name, payload) {
    listeners.get(name)?.forEach(fn => { try { fn(payload); } catch (err) { console.error(err); } });
  }
  function registerUpdate(fn) { updates.push(fn); return () => { const i = updates.indexOf(fn); if (i >= 0) updates.splice(i, 1); }; }
  function setMode(mode) {
    state.mode = mode;
    state.running = true;
    state.paused = false;
    state.startAt = performance.now();
    document.getElementById("startScreen")?.classList.add("hidden");
    document.getElementById("hud")?.classList.remove("hidden");
    document.getElementById("presenter")?.classList.remove("hidden");
    document.getElementById("modeLabel").textContent = mode === "auto" ? "ПРЕЗЕНТАЦИЯ" : "СВОБОДНО";
    emit("mode", mode);
  }

  window.HR3 = {
    version: "3.0.0",
    data: window.HR3_DATA,
    canvas, engine, scene, camera, glow, pipeline, isMobile,
    state, on, emit, registerUpdate, setMode,
    clamp: BABYLON.Scalar.Clamp,
    lerp: BABYLON.Scalar.Lerp
  };

  document.getElementById("autoMode")?.addEventListener("click", () => setMode("auto"));
  document.getElementById("freeMode")?.addEventListener("click", () => setMode("free"));

  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    for (const fn of [...updates]) {
      try { fn(dt); } catch (err) { console.error("HR3 update error", err); }
    }
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());
  window.setTimeout(() => {
    const boot = document.getElementById("bootState");
    if (boot) boot.textContent = "Сцена готова · чистая архитектура v3.0";
    emit("ready");
  }, 350);
})();
