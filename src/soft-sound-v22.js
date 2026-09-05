(() => {
  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (!NativeAC) return;

  // Keep the existing synthetic drive sound, but remove the harsh sawtooth character.
  // grand-route-v16 creates its AudioContext only after the START click, so replacing
  // the constructor here lets us soften that context without changing route logic.
  function softenContext(ctx) {
    if (!ctx || ctx.__softenedByV22) return ctx;
    ctx.__softenedByV22 = true;

    const nativeCreateOscillator = ctx.createOscillator.bind(ctx);
    const nativeCreateBiquadFilter = ctx.createBiquadFilter.bind(ctx);
    const nativeCreateGain = ctx.createGain.bind(ctx);

    ctx.createOscillator = function () {
      const osc = nativeCreateOscillator();

      // v16 asks for sawtooth for the motor. Translate it to sine so acceleration
      // remains audible but loses the aggressive buzzing harmonics.
      try {
        const proto = Object.getPrototypeOf(osc);
        const desc = Object.getOwnPropertyDescriptor(proto, "type") ||
          Object.getOwnPropertyDescriptor(window.OscillatorNode?.prototype || {}, "type");
        if (desc?.get && desc?.set) {
          Object.defineProperty(osc, "type", {
            configurable: true,
            enumerable: true,
            get() { return desc.get.call(osc); },
            set(value) {
              const mapped = value === "sawtooth" ? "sine" : (value === "square" ? "triangle" : value);
              desc.set.call(osc, mapped);
            }
          });
        }
      } catch (_) {}

      // Add a gentle low-pass and attenuation before the original v16 gain nodes.
      const originalConnect = osc.connect.bind(osc);
      osc.connect = function (destination, ...args) {
        try {
          const filter = nativeCreateBiquadFilter();
          const trim = nativeCreateGain();
          filter.type = "lowpass";
          filter.frequency.value = 520;
          filter.Q.value = 0.25;
          trim.gain.value = 0.42;
          originalConnect(filter);
          filter.connect(trim);
          trim.connect(destination);
          return destination;
        } catch (_) {
          return originalConnect(destination, ...args);
        }
      };

      return osc;
    };

    return ctx;
  }

  function WrappedAudioContext(...args) {
    return softenContext(new NativeAC(...args));
  }
  WrappedAudioContext.prototype = NativeAC.prototype;
  try { Object.setPrototypeOf(WrappedAudioContext, NativeAC); } catch (_) {}
  window.AudioContext = WrappedAudioContext;
  if (window.webkitAudioContext) window.webkitAudioContext = WrappedAudioContext;

  let musicCtx = null;
  let master = null;
  let padA = null;
  let padB = null;
  let padGainA = null;
  let padGainB = null;
  let timer = null;
  let step = 0;
  const firedGates = new Set();

  const SCALE = [220.00, 246.94, 293.66, 329.63, 392.00, 329.63, 293.66, 246.94];
  const GATES = [55, 105, 165, 220, 270, 310];

  function softNote(freq, when, duration = 1.1, level = 0.010) {
    if (!musicCtx || !master) return;
    const osc = musicCtx.createOscillator();
    const gain = musicCtx.createGain();
    const filter = musicCtx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, when);
    filter.Q.setValueAtTime(0.35, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(filter).connect(gain).connect(master);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  function gateChime(index) {
    if (!musicCtx) return;
    const now = musicCtx.currentTime + 0.02;
    const roots = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    const root = roots[Math.min(index, roots.length - 1)];
    softNote(root, now, 1.6, 0.016);
    softNote(root * 1.25, now + 0.11, 1.5, 0.012);
    softNote(root * 1.5, now + 0.23, 1.7, 0.010);
  }

  function startMelodicLayer() {
    if (musicCtx) {
      musicCtx.resume?.();
      return;
    }

    try {
      // Use the native constructor saved before the compatibility wrapper so the
      // melodic layer keeps its own exact timbre.
      musicCtx = new NativeAC();
      master = musicCtx.createGain();
      const masterFilter = musicCtx.createBiquadFilter();
      master.gain.value = 0.55;
      masterFilter.type = "lowpass";
      masterFilter.frequency.value = 2200;
      masterFilter.Q.value = 0.25;
      master.connect(masterFilter).connect(musicCtx.destination);

      padA = musicCtx.createOscillator();
      padB = musicCtx.createOscillator();
      padGainA = musicCtx.createGain();
      padGainB = musicCtx.createGain();
      const padFilter = musicCtx.createBiquadFilter();

      padA.type = "sine";
      padB.type = "triangle";
      padA.frequency.value = 110;
      padB.frequency.value = 164.81;
      padGainA.gain.value = 0.008;
      padGainB.gain.value = 0.0035;
      padFilter.type = "lowpass";
      padFilter.frequency.value = 720;
      padFilter.Q.value = 0.18;

      padA.connect(padGainA).connect(padFilter);
      padB.connect(padGainB).connect(padFilter);
      padFilter.connect(master);
      padA.start();
      padB.start();

      const tick = () => {
        if (!musicCtx) return;
        const speed = Math.max(0, Math.min(160, parseFloat(document.getElementById("v13Speed")?.textContent || "0") || 0));
        const speed01 = speed / 160;
        const now = musicCtx.currentTime + 0.025;

        // A slow major-pentatonic pulse. It becomes a little brighter with speed,
        // but never turns into a hard engine-like buzz.
        const freq = SCALE[step % SCALE.length] * (step % 4 === 3 ? 2 : 1);
        softNote(freq, now, 0.78 + (1 - speed01) * 0.32, 0.006 + speed01 * 0.004);
        if (step % 4 === 0) softNote(freq / 2, now, 1.35, 0.0045);
        step += 1;

        const distance = parseFloat(document.getElementById("v16Distance")?.textContent || "0") || 0;
        GATES.forEach((gate, index) => {
          if (distance >= gate && !firedGates.has(gate)) {
            firedGates.add(gate);
            gateChime(index);
          }
        });

        if (padGainA && padGainB) {
          padGainA.gain.setTargetAtTime(0.006 + speed01 * 0.005, now, 0.45);
          padGainB.gain.setTargetAtTime(0.0025 + speed01 * 0.003, now, 0.5);
          padA.frequency.setTargetAtTime(110 + speed01 * 16, now, 0.65);
          padB.frequency.setTargetAtTime(164.81 + speed01 * 20, now, 0.65);
        }
      };

      tick();
      timer = window.setInterval(tick, 1050);
    } catch (_) {
      try { if (timer) clearInterval(timer); } catch (_) {}
      timer = null;
      musicCtx = null;
    }
  }

  document.getElementById("enterButton")?.addEventListener("click", startMelodicLayer, { once: true });

  window.__HR_SOFT_SOUND_V22__ = {
    version: "2.2",
    description: "soft sine drive + melodic pentatonic layer + gate chimes"
  };
})();
