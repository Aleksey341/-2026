(() => {
  const H = window.HR3;
  if (!H?.vehicle || !H.route) return;
  const { data, state, vehicle, route } = H;

  const card = document.getElementById("storyCard");
  const finale = document.getElementById("finale");
  const pauseButton = document.getElementById("pauseAuto");
  const continueButton = document.getElementById("continueAuto");

  let autoPhase = "idle";
  let autoGateIndex = 0;
  let pauseStarted = 0;
  let pauseDuration = 65000;
  let userPaused = false;
  let skipPause = false;
  let hideCardAt = 0;
  let activeBoardKey = "";
  const freeShown = new Set();

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function phaseLabel(phase) {
    if (phase === "problem") return "ЗАДАЧА";
    if (phase === "action") return "ЧТО СДЕЛАЛИ";
    return "РЕЗУЛЬТАТ";
  }

  function showCard(ch, phase = "result") {
    if (!ch || ch.final || !card) return;
    const key = `${ch.id}:${phase}`;
    const label = phaseLabel(phase);
    const text = phase === "problem" ? ch.problem : phase === "action" ? ch.action : ch.result;

    if (key !== activeBoardKey) {
      activeBoardKey = key;
      card.style.setProperty("--accent", ch.accent);
      card.dataset.block = ch.id;
      card.dataset.phase = phase;
      card.innerHTML = `
        <div class="story-kicker">${ch.no} · DEMO ${data.demoYear}</div>
        <h2 class="block-title">${ch.title}</h2>
        <div class="phase-label">${label}</div>
        <p>${text}</p>
        ${phase === "result" ? `<div class="metrics">${ch.metrics.map(m => `<div class="metric"><b>${m[0]}</b><span>${m[1]}</span></div>`).join("")}</div>` : ""}
      `;
      H.emit?.("board:show", { ch, phase });
    }
    card.classList.remove("hidden");
  }

  function hideCard() {
    if (!card) return;
    if (!card.classList.contains("hidden")) H.emit?.("board:hide");
    card.classList.add("hidden");
    activeBoardKey = "";
  }

  function beginAuto() {
    autoPhase = "cruise";
    autoGateIndex = 0;
    userPaused = false;
    skipPause = false;
    freeShown.clear();
    hideCard();
    finale?.classList.add("hidden");
    if (pauseButton) pauseButton.textContent = "ПАУЗА";
    vehicle.setPose(route.pathX(0), 0, route.pathAngle(0));
    vehicle.setAutoInput({ throttle: .75, steer: 0, brake: false });
  }

  function beginFree() {
    autoPhase = "idle";
    freeShown.clear();
    hideCard();
    vehicle.clearAutoInput();
    finale?.classList.add("hidden");
  }

  H.on("mode", mode => mode === "auto" ? beginAuto() : beginFree());

  pauseButton?.addEventListener("click", () => {
    if (state.mode !== "auto") return;
    userPaused = !userPaused;
    pauseButton.textContent = userPaused ? "ПРОДОЛЖИТЬ" : "ПАУЗА";
  });

  continueButton?.addEventListener("click", () => {
    if (state.mode === "auto" && autoPhase === "pause") skipPause = true;
  });

  function autoDrive() {
    if (state.mode !== "auto") return;
    const d = state.routeDistance;
    const ch = data.chapters[autoGateIndex];
    if (!ch) return;

    if (userPaused) {
      vehicle.setAutoInput({ throttle: 0, steer: 0, brake: true });
      return;
    }

    if (autoPhase === "pause") {
      vehicle.setAutoInput({ throttle: 0, steer: 0, brake: true });
      const elapsed = performance.now() - pauseStarted;

      if (!ch.final) {
        if (elapsed < 18000) showCard(ch, "problem");
        else if (elapsed < 40000) showCard(ch, "action");
        else showCard(ch, "result");
      }

      if (ch.final) {
        hideCard();
        finale?.classList.remove("hidden");
        H.emit?.("finale:show", ch);
        autoPhase = "final";
        return;
      }

      if (skipPause || elapsed >= pauseDuration) {
        skipPause = false;
        hideCard();
        autoGateIndex += 1;
        autoPhase = "cruise";
      }
      return;
    }

    if (autoPhase === "final") {
      vehicle.setAutoInput({ throttle: 0, steer: 0, brake: true });
      return;
    }

    const targetStop = ch.d - (ch.final ? 2.5 : 4.5);
    const remaining = targetStop - d;
    if (remaining <= .7 && vehicle.speedKmh < 9) {
      autoPhase = "pause";
      pauseStarted = performance.now();
      pauseDuration = ch.final ? Infinity : 65000;
      vehicle.setAutoInput({ throttle: 0, steer: 0, brake: true });
      return;
    }

    const lookD = Math.min(route.routeLength, d + 6.5);
    const targetX = route.pathX(lookD);
    const targetYaw = route.pathAngle(lookD);
    const yawError = normalizeAngle(targetYaw - vehicle.yaw);
    const lateralError = targetX - vehicle.root.position.x;
    const steer = BABYLON.Scalar.Clamp(yawError * 1.55 + lateralError * .12, -1, 1);
    const brakingZone = Math.max(9, Math.abs(vehicle.speed) * 2.8);
    const brake = remaining < brakingZone && vehicle.speedKmh > Math.max(10, remaining * 2.3);
    const throttle = brake ? 0 : remaining < 18 ? .28 : .72;
    vehicle.setAutoInput({ throttle, steer, brake });
  }

  H.registerUpdate(() => {
    if (!state.running) return;
    autoDrive();

    if (state.mode === "free") {
      for (const ch of data.chapters) {
        if (ch.final) continue;
        if (!freeShown.has(ch.id) && Math.abs(state.routeDistance - ch.d) < 4.5) {
          freeShown.add(ch.id);
          showCard(ch, "result");
          hideCardAt = performance.now() + 8500;
        }
      }
      if (hideCardAt && performance.now() > hideCardAt) {
        hideCardAt = 0;
        hideCard();
      }
      const future = data.chapters.find(x => x.final);
      if (future && state.routeDistance >= future.d - 1.5) {
        hideCard();
        finale?.classList.remove("hidden");
      }
    }
  });

  H.presentation = {
    showCard,
    hideCard,
    get autoPhase() { return autoPhase; },
    version: "3.3.0"
  };
})();