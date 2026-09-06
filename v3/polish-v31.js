(() => {
  const H = window.HR3;
  if (!H?.engine || !H?.vehicle) return;

  const { engine, camera, state, vehicle, pipeline, isMobile } = H;
  const autoButton = document.getElementById("autoMode");
  const freeButton = document.getElementById("freeMode");
  const bootState = document.getElementById("bootState");

  let premiumResolved = false;
  let premiumOk = false;
  let startUnlocked = false;
  let fpsSamples = [];
  let qualityAdjustments = 0;
  let lastQualityChange = 0;
  let lastYaw = 0;
  let time = 0;

  function setStartEnabled(enabled, text) {
    [autoButton, freeButton].forEach(btn => {
      if (!btn) return;
      btn.disabled = !enabled;
      btn.classList.toggle("loading", !enabled);
    });
    if (bootState && text) bootState.textContent = text;
    if (enabled) startUnlocked = true;
  }

  setStartEnabled(false, "Подготовка трассы и 3D-автомобиля…");

  H.on("vehicle:premium-ready", info => {
    premiumResolved = true;
    premiumOk = !!info?.ok;
    setStartEnabled(true, premiumOk
      ? "Готово · premium 3D-автомобиль загружен"
      : "Готово · включён резервный автомобиль");
  });

  window.setTimeout(() => {
    if (!startUnlocked) {
      setStartEnabled(true, "Готово · автомобиль может продолжить загрузку в фоне");
    }
  }, 5200);

  const chip = document.createElement("div");
  chip.className = "hr3-quality-chip";
  chip.innerHTML = '<span>КАЧЕСТВО</span><strong>АВТО</strong>';
  document.body.appendChild(chip);

  function flashQuality(text) {
    chip.querySelector("strong").textContent = text;
    chip.classList.add("active");
    window.setTimeout(() => chip.classList.remove("active"), 2300);
  }

  function adjustQuality(direction) {
    if (qualityAdjustments >= 2) return;
    const now = performance.now();
    if (now - lastQualityChange < 8000) return;

    const current = engine.getHardwareScalingLevel();
    let next = current;
    if (direction === "down") next = Math.min(2.5, current + (isMobile ? 0.28 : 0.22));
    else next = Math.max(1, current - 0.14);
    if (Math.abs(next - current) < 0.05) return;

    engine.setHardwareScalingLevel(next);
    if (direction === "down" && pipeline?.bloomEnabled) pipeline.bloomEnabled = false;
    qualityAdjustments += 1;
    lastQualityChange = now;
    flashQuality(direction === "down" ? "FPS" : "ЧЁТЧЕ");
  }

  window.setInterval(() => {
    if (!state.running || state.xrActive) return;
    const fps = engine.getFps();
    if (!Number.isFinite(fps) || fps <= 0) return;
    fpsSamples.push(fps);
    if (fpsSamples.length > 5) fpsSamples.shift();
    if (fpsSamples.length < 4) return;
    const avg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    const lowThreshold = isMobile ? 33 : 43;
    if (avg < lowThreshold) adjustQuality("down");
    else if (avg > 58 && engine.getHardwareScalingLevel() > (isMobile ? 1.35 : 1.08)) adjustQuality("up");
  }, 1200);

  H.registerUpdate(dt => {
    if (!state.running || state.xrActive) return;
    time += dt;

    const speed01 = BABYLON.Scalar.Clamp(Math.abs(vehicle.speed) / 10.8, 0, 1);
    let yawDelta = vehicle.yaw - lastYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    const yawRate = yawDelta / Math.max(dt, 0.016);

    const targetRoll = BABYLON.Scalar.Clamp(-yawRate * speed01 * 0.055, -0.030, 0.030);
    camera.rotation.z = BABYLON.Scalar.Lerp(camera.rotation.z || 0, targetRoll, 1 - Math.exp(-6.5 * dt));

    // A very small camera-local movement gives speed without making the presentation uncomfortable.
    const bob = Math.sin(time * 11.5) * 0.0055 * speed01;
    camera.position.y += bob;

    lastYaw = vehicle.yaw;
  });

  window.addEventListener("error", event => {
    if (!bootState || state.running) return;
    bootState.textContent = "Сцена запущена с резервными настройками";
    console.warn("HR3 runtime warning", event.error || event.message);
  });

  H.polish = {
    version: "3.1.0",
    get premiumResolved() { return premiumResolved; },
    get premiumOk() { return premiumOk; },
    get qualityAdjustments() { return qualityAdjustments; }
  };
})();
