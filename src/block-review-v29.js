(() => {
  const attach = () => {
    const scene = BABYLON.EngineStore.LastCreatedScene;
    const auto = window.__HR_AUTO_PRESENTATION_V28__;
    const car = scene?.getTransformNodeByName("v13-supercar");
    const chase = scene?.getCameraByName("v13-chase-camera");
    if (!scene || !auto || !car || !chase) {
      window.setTimeout(attach, 120);
      return;
    }

    document.body.classList.add("block-review-v29");

    const engine = scene.getEngine();
    const results = window.HR2026?.results2026 || window.HR2026?.demoResults2025 || [];
    const gates = [
      { d: 55, no: "01", id: "recruitment", title: "ПРИЁМ", color: "#56dcff", district: "v17-district-recruitment" },
      { d: 105, no: "02", id: "convergent", title: "КАДРОВЫЙ КОНВЕРГЕНТ", color: "#62e4bb", district: "v17-district-convergent" },
      { d: 165, no: "03", id: "ai", title: "ИИ-КОМАНДА", color: "#ba9eff", district: "v17-district-ai" },
      { d: 220, no: "04", id: "awards", title: "КОРПОРАТИВНЫЕ НАГРАДЫ", color: "#ffc66d", district: "v17-district-awards" },
      { d: 270, no: "05", id: "harmful", title: "ВРЕДНЫЕ УСЛОВИЯ ТРУДА", color: "#ff4c69", district: "v17-district-safety" }
    ];

    // Числа и подписи старых пространственных панелей больше не дублируют итоговый блок.
    // В автоматической презентации фактические итоги показываются только в одной карточке v29.
    scene.meshes.forEach(mesh => {
      if (mesh.name?.startsWith("v19-text-")) mesh.setEnabled(false);
    });

    function pbr(name, hex, emissive = 0, metallic = 0.06, roughness = 0.62, alpha = 1) {
      const mat = new BABYLON.PBRMaterial(name, scene);
      mat.albedoColor = BABYLON.Color3.FromHexString(hex);
      mat.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
      mat.metallic = metallic;
      mat.roughness = roughness;
      mat.alpha = alpha;
      return mat;
    }

    const M = {
      skin: pbr("v29-skin", "#efb08c", 0, 0.01, 0.68),
      hair: pbr("v29-hair", "#6a4735", 0, 0.02, 0.78),
      jacket: pbr("v29-jacket", "#d0c0ad", 0, 0.02, 0.60),
      blouse: pbr("v29-blouse", "#f5eee8", 0, 0.01, 0.72),
      pants: pbr("v29-pants", "#273645", 0, 0.02, 0.70),
      shoes: pbr("v29-shoes", "#101318", 0, 0.05, 0.72),
      dark: pbr("v29-terminal-dark", "#061019", 0.02, 0.48, 0.23),
      terminal: pbr("v29-terminal-light", "#56dcff", 0.92, 0.04, 0.20)
    };

    const glow = scene.getGlowLayerByName?.("glow");
    const addGlow = mesh => { glow?.addIncludedOnlyMesh?.(mesh); return mesh; };

    function cylinder(name, opts, pos, mat, parent) {
      const mesh = BABYLON.MeshBuilder.CreateCylinder(name, opts, scene);
      mesh.position.copyFrom(pos);
      mesh.material = mat;
      mesh.parent = parent;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      return mesh;
    }
    function sphere(name, diameter, pos, mat, parent) {
      const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 22 }, scene);
      mesh.position.copyFrom(pos);
      mesh.material = mat;
      mesh.parent = parent;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      return mesh;
    }
    function box(name, size, pos, mat, parent) {
      const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
      mesh.position.copyFrom(pos);
      mesh.material = mat;
      mesh.parent = parent;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      return mesh;
    }

    // Отдельная стоящая версия водителя. Во время движения она скрыта,
    // а на остановке появляется у двери и подходит к терминалу результатов.
    const standing = new BABYLON.TransformNode("v29-standing-driver", scene);
    standing.parent = car;
    standing.position.set(-0.58, -0.13, -0.22);
    standing.rotation.y = -Math.PI / 2;

    const torso = cylinder("v29-driver-torso", { height: 0.70, diameterTop: 0.38, diameterBottom: 0.49, tessellation: 18 }, new BABYLON.Vector3(0, 1.03, 0), M.jacket, standing);
    box("v29-driver-blouse", { width: 0.20, height: 0.38, depth: 0.045 }, new BABYLON.Vector3(-0.245, 1.05, 0), M.blouse, standing).rotation.y = Math.PI / 2;
    sphere("v29-driver-head", 0.42, new BABYLON.Vector3(0, 1.55, 0), M.skin, standing);
    const hair = sphere("v29-driver-hair", 0.46, new BABYLON.Vector3(0.02, 1.62, 0), M.hair, standing);
    hair.scaling.y = 0.72;
    sphere("v29-driver-hair-l", 0.19, new BABYLON.Vector3(0.02, 1.55, -0.18), M.hair, standing);
    sphere("v29-driver-hair-r", 0.19, new BABYLON.Vector3(0.02, 1.55, 0.18), M.hair, standing);

    const armL = cylinder("v29-driver-arm-l", { height: 0.58, diameter: 0.12, tessellation: 12 }, new BABYLON.Vector3(0, 1.02, -0.29), M.jacket, standing);
    const armR = cylinder("v29-driver-arm-r", { height: 0.58, diameter: 0.12, tessellation: 12 }, new BABYLON.Vector3(0, 1.02, 0.29), M.jacket, standing);
    const legL = cylinder("v29-driver-leg-l", { height: 0.78, diameter: 0.15, tessellation: 12 }, new BABYLON.Vector3(0, 0.43, -0.13), M.pants, standing);
    const legR = cylinder("v29-driver-leg-r", { height: 0.78, diameter: 0.15, tessellation: 12 }, new BABYLON.Vector3(0, 0.43, 0.13), M.pants, standing);
    box("v29-driver-shoe-l", { width: 0.28, height: 0.12, depth: 0.17 }, new BABYLON.Vector3(-0.06, 0.06, -0.13), M.shoes, standing);
    box("v29-driver-shoe-r", { width: 0.28, height: 0.12, depth: 0.17 }, new BABYLON.Vector3(-0.06, 0.06, 0.13), M.shoes, standing);
    standing.setEnabled(false);

    // Небольшой физический терминал рядом с автомобилем. Он служит точкой,
    // к которой подходит персонаж; сами цифры остаются в единой экранной карточке.
    const terminal = new BABYLON.TransformNode("v29-review-terminal", scene);
    terminal.parent = car;
    terminal.position.set(-3.25, -0.13, 0.62);
    const panel = box("v29-review-panel", { width: 0.08, height: 1.55, depth: 1.95 }, new BABYLON.Vector3(0, 1.45, 0), M.dark, terminal);
    const lightPanel = addGlow(box("v29-review-panel-light", { width: 0.085, height: 1.22, depth: 1.62 }, new BABYLON.Vector3(0.045, 1.45, 0), M.terminal, terminal));
    lightPanel.visibility = 0.22;
    [-0.82, 0.82].forEach(z => addGlow(box(`v29-review-edge-${z}`, { width: 0.10, height: 1.50, depth: 0.045 }, new BABYLON.Vector3(0.08, 1.45, z), M.terminal, terminal)));
    addGlow(box("v29-review-base", { width: 0.42, height: 0.08, depth: 2.12 }, new BABYLON.Vector3(0, 0.65, 0), M.terminal, terminal));
    const terminalLight = new BABYLON.PointLight("v29-review-light", new BABYLON.Vector3(-0.15, 1.55, 0), scene);
    terminalLight.parent = terminal;
    terminalLight.diffuse = BABYLON.Color3.FromHexString("#56dcff");
    terminalLight.intensity = 1.1;
    terminalLight.range = 5;
    terminal.setEnabled(false);

    const seatedNames = [
      "v13-driver-torso", "v13-driver-blouse", "v13-driver-head", "v13-driver-hair",
      "v13-driver-hair-l", "v13-driver-hair-r", "v13-arm-l", "v13-arm-r", "v13-leg-l", "v13-leg-r"
    ];
    const seatedMeshes = seatedNames.map(name => scene.getMeshByName(name)).filter(Boolean);
    function showSeated(visible) {
      seatedMeshes.forEach(mesh => { mesh.visibility = visible ? 1 : 0; });
    }

    const summary = document.createElement("section");
    summary.className = "v29-summary";
    summary.innerHTML = `
      <div class="v29-summary-kicker"></div>
      <div class="v29-summary-title"></div>
      <div class="v29-summary-subtitle"></div>
      <div class="v29-summary-metrics"></div>
      <div class="v29-summary-state"></div>
    `;
    document.body.appendChild(summary);
    const kickerEl = summary.querySelector(".v29-summary-kicker");
    const titleEl = summary.querySelector(".v29-summary-title");
    const subtitleEl = summary.querySelector(".v29-summary-subtitle");
    const metricsEl = summary.querySelector(".v29-summary-metrics");
    const stateEl = summary.querySelector(".v29-summary-state");

    let currentGate = null;
    let currentResult = null;
    let reviewStartedAt = 0;
    let previousAutoPhase = auto.phase;
    let internalPauseExtended = false;
    let extendTimer = null;
    let releaseTimer = null;
    let hiddenDistrict = null;
    let hiddenDistrictWasEnabled = false;
    let reviewFinishedVisual = false;

    const smooth = t => t * t * (3 - 2 * t);
    const clamp01 = v => Math.max(0, Math.min(1, v));

    function nearestGate() {
      const distance = Number(auto.distance || 0);
      let best = null;
      let bestDelta = Infinity;
      gates.forEach((gate, index) => {
        const delta = Math.abs(gate.d - distance);
        if (delta < bestDelta) { best = { ...gate, index }; bestDelta = delta; }
      });
      return bestDelta <= 2.2 ? best : null;
    }

    function setTerminalColor(hex) {
      const c = BABYLON.Color3.FromHexString(hex);
      M.terminal.albedoColor = c;
      M.terminal.emissiveColor = c.scale(0.92);
      terminalLight.diffuse = c;
    }

    function fillSummary(gate) {
      currentResult = results[gate.index] || { title: gate.title, subtitle: "Итоги 2026", metrics: [] };
      summary.style.setProperty("--v29-accent", gate.color);
      kickerEl.textContent = `ИТОГИ БЛОКА · ${gate.no}`;
      titleEl.textContent = currentResult.title || gate.title;
      subtitleEl.textContent = currentResult.subtitle || "Итоги 2026";
      metricsEl.innerHTML = "";
      (currentResult.metrics || []).slice(0, 4).forEach(([value, label]) => {
        const cell = document.createElement("div");
        cell.className = "v29-summary-metric";
        cell.innerHTML = `<b>${value}</b><span>${label}</span>`;
        metricsEl.appendChild(cell);
      });
      stateEl.textContent = "ВОДИТЕЛЬ ВЫХОДИТ К ТОЧКЕ РЕЗУЛЬТАТОВ";
    }

    function extendPauseForReview() {
      clearTimeout(extendTimer);
      clearTimeout(releaseTimer);
      extendTimer = window.setTimeout(() => {
        if (!currentGate || auto.phase !== "pause" || !auto.active) return;
        if (document.body.classList.contains("v28-auto-paused")) return;
        auto.togglePause();
        internalPauseExtended = true;
        releaseTimer = window.setTimeout(() => {
          if (!internalPauseExtended) return;
          if (auto.active && document.body.classList.contains("v28-auto-paused")) auto.togglePause();
          internalPauseExtended = false;
        }, 3000);
      }, 140);
    }

    function startReview(gate) {
      currentGate = gate;
      reviewStartedAt = performance.now();
      reviewFinishedVisual = false;
      fillSummary(gate);
      setTerminalColor(gate.color);

      document.body.classList.add("v29-block-reading");
      document.body.classList.remove("v29-returning");
      summary.classList.add("visible");
      summary.classList.remove("returning");

      showSeated(false);
      standing.position.set(-0.58, -0.13, -0.22);
      standing.rotation.y = -Math.PI / 2;
      standing.setEnabled(true);
      terminal.setEnabled(true);

      hiddenDistrict = scene.getTransformNodeByName(gate.district);
      hiddenDistrictWasEnabled = !!hiddenDistrict?.isEnabled();
      hiddenDistrict?.setEnabled(false);

      extendPauseForReview();
    }

    function finishVisualReturn() {
      if (reviewFinishedVisual) return;
      reviewFinishedVisual = true;
      showSeated(true);
      standing.setEnabled(false);
      terminal.setEnabled(false);
      summary.classList.remove("visible", "returning");
      document.body.classList.remove("v29-block-reading", "v29-returning");
      if (hiddenDistrict && hiddenDistrictWasEnabled) hiddenDistrict.setEnabled(true);
      hiddenDistrict = null;
    }

    function cleanupReview() {
      clearTimeout(extendTimer);
      clearTimeout(releaseTimer);
      if (internalPauseExtended && auto.active && document.body.classList.contains("v28-auto-paused")) {
        auto.togglePause();
      }
      internalPauseExtended = false;
      finishVisualReturn();
      currentGate = null;
      currentResult = null;
    }

    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
      const autoPhase = auto.phase;

      if (autoPhase !== previousAutoPhase) {
        if (autoPhase === "pause") {
          const gate = nearestGate();
          if (gate) startReview(gate);
        } else if (previousAutoPhase === "pause" && currentGate) {
          cleanupReview();
        }
        previousAutoPhase = autoPhase;
      }

      if (!currentGate) return;

      const elapsed = performance.now() - reviewStartedAt;
      let moving = false;

      if (elapsed < 1250) {
        const t = smooth(clamp01(elapsed / 1250));
        standing.position.x = BABYLON.Scalar.Lerp(-0.58, -1.82, t);
        standing.position.z = BABYLON.Scalar.Lerp(-0.22, 0.42, t);
        moving = true;
        stateEl.textContent = "ВОДИТЕЛЬ ВЫХОДИТ ИЗ АВТОМОБИЛЯ";
      } else if (elapsed < 6250) {
        standing.position.x = -1.82;
        standing.position.z = 0.42;
        standing.rotation.y = -Math.PI / 2;
        stateEl.textContent = "ВОДИТЕЛЬ ИЗУЧАЕТ ИТОГИ БЛОКА";
      } else if (elapsed < 7520) {
        const t = smooth(clamp01((elapsed - 6250) / 1270));
        standing.position.x = BABYLON.Scalar.Lerp(-1.82, -0.58, t);
        standing.position.z = BABYLON.Scalar.Lerp(0.42, -0.22, t);
        moving = true;
        summary.classList.add("returning");
        document.body.classList.add("v29-returning");
        stateEl.textContent = "ИТОГИ ПРОСМОТРЕНЫ · ВОЗВРАЩЕНИЕ В АВТОМОБИЛЬ";
      } else {
        finishVisualReturn();
      }

      if (moving && standing.isEnabled()) {
        const stride = Math.sin(elapsed * 0.014) * 0.42;
        armL.rotation.z = stride;
        armR.rotation.z = -stride;
        legL.rotation.z = -stride * 0.42;
        legR.rotation.z = stride * 0.42;
        standing.position.y = -0.13 + Math.abs(Math.sin(elapsed * 0.014)) * 0.025;
      } else {
        armL.rotation.z = BABYLON.Scalar.Lerp(armL.rotation.z, 0.04, 1 - Math.exp(-8 * dt));
        armR.rotation.z = BABYLON.Scalar.Lerp(armR.rotation.z, -0.04, 1 - Math.exp(-8 * dt));
        legL.rotation.z = BABYLON.Scalar.Lerp(legL.rotation.z, 0, 1 - Math.exp(-8 * dt));
        legR.rotation.z = BABYLON.Scalar.Lerp(legR.rotation.z, 0, 1 - Math.exp(-8 * dt));
      }

      // Отдельный чистый ракурс на остановке: автомобиль + вышедший водитель + терминал.
      // Этот обработчик загружен последним и поэтому мягко переопределяет режиссёрскую камеру
      // только на время чтения итогов.
      if (!reviewFinishedVisual) {
        const yaw = car.rotation.y || 0;
        const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const desired = car.position
          .subtract(forward.scale(4.6))
          .add(right.scale(3.45))
          .add(new BABYLON.Vector3(0, 2.65, 0));
        const target = car.position
          .subtract(right.scale(0.85))
          .add(forward.scale(0.55))
          .add(new BABYLON.Vector3(0, 1.02, 0));
        chase.position = BABYLON.Vector3.Lerp(chase.position, desired, 1 - Math.exp(-4.8 * dt));
        chase.setTarget(target);
        chase.fov = BABYLON.Scalar.Lerp(chase.fov, 0.88, 1 - Math.exp(-4 * dt));
        scene.activeCamera = chase;
      }
    });

    window.addEventListener("hr-auto-presentation-stop", cleanupReview);

    window.__HR_BLOCK_REVIEW_V29__ = {
      version: "2.9",
      get active() { return !!currentGate; },
      get gate() { return currentGate; }
    };
  };

  attach();
})();