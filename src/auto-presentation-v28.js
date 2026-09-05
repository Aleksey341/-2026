(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;

  const car = scene.getTransformNodeByName("v13-supercar");
  const enterButton = document.getElementById("enterButton");
  if (!car || !enterButton) return;

  document.body.classList.add("auto-presentation-v28");

  const gates = [
    { d: 55, title: "ПРИЁМ", pause: 5200 },
    { d: 105, title: "КАДРОВЫЙ КОНВЕРГЕНТ", pause: 5200 },
    { d: 165, title: "ИИ-КОМАНДА", pause: 5200 },
    { d: 220, title: "КОРПОРАТИВНЫЕ НАГРАДЫ", pause: 5200 },
    { d: 270, title: "ВРЕДНЫЕ УСЛОВИЯ ТРУДА", pause: 5400 },
    { d: 310, title: "2027 · ГОД ОГНЕННОГО КОЗЛА", pause: Infinity, final: true }
  ];

  const held = new Set();
  const keyNames = {
    KeyW: "w", ArrowUp: "ArrowUp",
    KeyS: "s", ArrowDown: "ArrowDown",
    KeyA: "a", ArrowLeft: "ArrowLeft",
    KeyD: "d", ArrowRight: "ArrowRight",
    Space: " ", KeyV: "v", KeyX: "x"
  };

  function dispatchKey(type, code) {
    window.dispatchEvent(new KeyboardEvent(type, {
      code,
      key: keyNames[code] || code,
      bubbles: true,
      cancelable: true
    }));
  }

  function hold(code) {
    if (held.has(code)) return;
    held.add(code);
    dispatchKey("keydown", code);
  }

  function release(code) {
    if (!held.has(code)) return;
    held.delete(code);
    dispatchKey("keyup", code);
  }

  function releaseDrivingKeys() {
    ["KeyW", "KeyS", "KeyA", "KeyD", "Space"].forEach(release);
  }

  function tap(code, duration = 80) {
    dispatchKey("keydown", code);
    window.setTimeout(() => dispatchKey("keyup", code), duration);
  }

  function readNumber(id) {
    const raw = document.getElementById(id)?.textContent || "0";
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function pathX(d) {
    return Math.sin(d / 47) * 1.55 + Math.sin(d / 19) * 0.48;
  }

  function pathAngle(d) {
    const dx = pathX(d + 1) - pathX(d - 1);
    return Math.atan2(dx, 2);
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  const presenter = document.createElement("div");
  presenter.className = "v28-presenter";
  presenter.innerHTML = `
    <div class="v28-presenter-copy">
      <span>АВТОМАТИЧЕСКАЯ ПРЕЗЕНТАЦИЯ</span>
      <strong id="v28PresenterStatus">Подготовка маршрута</strong>
    </div>
    <button class="v28-toggle-auto" type="button">ПАУЗА</button>
    <button class="v28-stop-auto" type="button">РУЧНОЙ РЕЖИМ</button>
  `;
  document.body.appendChild(presenter);

  const statusEl = presenter.querySelector("#v28PresenterStatus");
  const pauseButton = presenter.querySelector(".v28-toggle-auto");
  const stopButton = presenter.querySelector(".v28-stop-auto");

  let active = false;
  let userPaused = false;
  let phase = "idle";
  let nextGateIndex = 0;
  let pauseUntil = 0;
  let loopTimer = null;
  let pendingMode = "auto";
  let modeChooserReady = false;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function ensureDirectorOn() {
    const state = document.querySelector(".v20-director-chip strong");
    if (state && String(state.textContent || "").trim() === "OFF") tap("KeyX");
  }

  function steerAutomatically(distance) {
    if (!active || userPaused || phase === "pause" || phase === "final") {
      release("KeyA");
      release("KeyD");
      return;
    }

    const targetX = pathX(distance + 3.5);
    const targetYaw = pathAngle(distance + 6.0);
    const currentYaw = car.rotation.y || 0;
    const yawError = normalizeAngle(targetYaw - currentYaw);
    const lateralError = targetX - car.position.x;
    const command = yawError * 1.5 + lateralError * 0.12;

    if (command > 0.045) {
      release("KeyA");
      hold("KeyD");
    } else if (command < -0.045) {
      release("KeyD");
      hold("KeyA");
    } else {
      release("KeyA");
      release("KeyD");
    }
  }

  function beginCruise() {
    phase = "cruise";
    release("Space");
    release("KeyS");
    hold("KeyW");
    const next = gates[nextGateIndex];
    if (next) setStatus(`Следующий блок: ${next.title}`);
  }

  function beginPause(gate) {
    phase = gate.final ? "final" : "pause";
    release("KeyW");
    release("KeyA");
    release("KeyD");
    hold("Space");
    tap("KeyV");

    if (gate.final) {
      setStatus("Финал: 2027 · Год Огненного Козла");
      pauseUntil = Infinity;
    } else {
      pauseUntil = performance.now() + gate.pause;
      setStatus(`Показ результатов: ${gate.title}`);
    }
  }

  function autoStep() {
    if (!active) return;

    const distance = readNumber("v16Distance");
    const speedKmh = readNumber("v13Speed");

    if (userPaused) {
      release("KeyW");
      release("KeyA");
      release("KeyD");
      hold("Space");
      setStatus("Презентация приостановлена");
      return;
    }

    const gate = gates[nextGateIndex];
    if (!gate) {
      releaseDrivingKeys();
      setStatus("Маршрут завершён");
      return;
    }

    if (phase === "pause") {
      hold("Space");
      if (performance.now() >= pauseUntil) {
        nextGateIndex += 1;
        tap("KeyV");
        beginCruise();
      }
      return;
    }

    if (phase === "final") {
      release("KeyW");
      release("KeyA");
      release("KeyD");
      hold("Space");
      return;
    }

    steerAutomatically(distance);

    if (phase === "cruise") {
      // Рассчитываем точку начала торможения по фактической скорости.
      // Так автомобиль проходит контрольную отметку и останавливается сразу за ней.
      const localSpeed = Math.max(0, speedKmh / 18);
      const virtualStopDistance = (localSpeed * localSpeed / (2 * 10.5)) * 1.55;
      const brakeStart = gate.d + 1.25 - virtualStopDistance;

      if (distance >= brakeStart) {
        phase = "brake";
        release("KeyW");
        hold("Space");
        setStatus(`Подъезд к блоку: ${gate.title}`);
      } else {
        release("Space");
        hold("KeyW");
      }
    }

    if (phase === "brake") {
      if (distance < gate.d && speedKmh < 6) {
        // Если торможение началось слишком рано, аккуратно дотягиваем автомобиль до точки.
        release("Space");
        hold("KeyW");
      } else {
        release("KeyW");
        hold("Space");
      }

      if (distance >= gate.d + 0.05 && speedKmh <= 7) beginPause(gate);
    }
  }

  function startAuto() {
    if (active) return;
    active = true;
    userPaused = false;
    document.body.classList.add("v28-auto-active");
    document.body.classList.remove("v28-auto-paused");
    pauseButton.textContent = "ПАУЗА";

    const distance = readNumber("v16Distance");
    const found = gates.findIndex(g => g.d > distance + 0.2);
    nextGateIndex = found >= 0 ? found : gates.length - 1;

    ensureDirectorOn();
    beginCruise();
    loopTimer = window.setInterval(autoStep, 70);

    window.dispatchEvent(new CustomEvent("hr-auto-presentation-start", { detail: { version: "2.8" } }));
  }

  function stopAuto() {
    active = false;
    userPaused = false;
    phase = "idle";
    if (loopTimer) window.clearInterval(loopTimer);
    loopTimer = null;
    releaseDrivingKeys();
    document.body.classList.remove("v28-auto-active", "v28-auto-paused");
    setStatus("Ручное управление");
    window.dispatchEvent(new CustomEvent("hr-auto-presentation-stop", { detail: { version: "2.8" } }));
  }

  function togglePause() {
    if (!active) return;
    userPaused = !userPaused;
    document.body.classList.toggle("v28-auto-paused", userPaused);
    pauseButton.textContent = userPaused ? "ПРОДОЛЖИТЬ" : "ПАУЗА";
    if (!userPaused && phase === "cruise") hold("KeyW");
  }

  pauseButton.addEventListener("click", togglePause);
  stopButton.addEventListener("click", stopAuto);

  function setupModeChooser() {
    if (modeChooserReady || !enterButton.parentElement) return;
    modeChooserReady = true;

    const card = enterButton.closest(".boot-card") || enterButton.parentElement;
    const note = document.createElement("div");
    note.className = "v28-mode-note";
    note.textContent = "Выберите режим: автоматический показ с режиссёрскими остановками или свободное управление автомобилем.";

    const row = document.createElement("div");
    row.className = "v28-mode-row";
    const manualButton = document.createElement("button");
    manualButton.type = "button";
    manualButton.className = "v28-manual-button";
    manualButton.textContent = "УПРАВЛЯТЬ САМОМУ";

    enterButton.textContent = "СМОТРЕТЬ ПРЕЗЕНТАЦИЮ";
    card.insertBefore(note, enterButton);
    card.insertBefore(row, enterButton);
    row.appendChild(enterButton);
    row.appendChild(manualButton);

    enterButton.addEventListener("click", () => {
      const mode = pendingMode || "auto";
      pendingMode = "auto";
      if (mode === "auto") window.setTimeout(startAuto, 700);
      else window.setTimeout(stopAuto, 100);
    });

    manualButton.addEventListener("click", () => {
      pendingMode = "manual";
      enterButton.click();
    });
  }

  // grand-route-v16 переписывает текст стартовой кнопки через 1.2 сек., поэтому
  // устанавливаем выбор режима сразу после его загрузочной последовательности.
  window.setTimeout(setupModeChooser, 1450);

  window.__HR_AUTO_PRESENTATION_V28__ = {
    version: "2.8",
    start: startAuto,
    stop: stopAuto,
    togglePause,
    get active() { return active; },
    get phase() { return phase; }
  };
})();
