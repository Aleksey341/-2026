(() => {
  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (!NativeAC) return;

  // v2.6: кинематографическая музыка меняется по секторам маршрута.
  // Старый синтетический звук автомобиля из grand-route-v16 остаётся полностью выключенным.
  function muteLegacyRouteAudio(ctx) {
    if (!ctx || ctx.__v26LegacyMuted) return ctx;
    ctx.__v26LegacyMuted = true;

    const nativeCreateOscillator = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = function () {
      const osc = nativeCreateOscillator();
      osc.connect = function (destination) { return destination; };
      return osc;
    };
    return ctx;
  }

  function WrappedAudioContext(...args) {
    return muteLegacyRouteAudio(new NativeAC(...args));
  }
  WrappedAudioContext.prototype = NativeAC.prototype;
  try { Object.setPrototypeOf(WrappedAudioContext, NativeAC); } catch (_) {}
  window.AudioContext = WrappedAudioContext;
  if (window.webkitAudioContext) window.webkitAudioContext = WrappedAudioContext;

  let ctx = null;
  let master = null;
  let dry = null;
  let reverb = null;
  let reverbGain = null;
  let transitionBus = null;
  let activeSector = null;
  let patternStep = 0;
  let patternTimer = null;
  let stateTimer = null;
  const firedGates = new Set();
  const sectors = {};

  const GATES = [55, 105, 165, 220, 270, 310];

  const DEFINITIONS = {
    neon: {
      title: "НЕОНОВЫЙ ГОРОД",
      cutoff: 1450,
      reverb: 0.22,
      voices: [
        { f: 130.81, type: "sine", gain: 0.010 },
        { f: 196.00, type: "triangle", gain: 0.0050 },
        { f: 246.94, type: "sine", gain: 0.0045 }
      ],
      notes: [392.00, 493.88, 523.25, 659.25, 523.25, 493.88]
    },
    tunnel: {
      title: "СЕРВИСНЫЙ ТОННЕЛЬ",
      cutoff: 520,
      reverb: 0.48,
      voices: [
        { f: 65.41, type: "sine", gain: 0.014 },
        { f: 98.00, type: "triangle", gain: 0.0060 },
        { f: 146.83, type: "sine", gain: 0.0035 }
      ],
      notes: [146.83, 174.61, 196.00, 174.61]
    },
    ai: {
      title: "КВАРТАЛ ИИ",
      cutoff: 2200,
      reverb: 0.34,
      voices: [
        { f: 110.00, type: "sine", gain: 0.0080 },
        { f: 164.81, type: "sine", gain: 0.0040 },
        { f: 220.00, type: "triangle", gain: 0.0035 }
      ],
      notes: [523.25, 659.25, 783.99, 987.77, 880.00, 659.25, 587.33, 783.99]
    },
    people: {
      title: "МОСТ КОМАНДЫ",
      cutoff: 1100,
      reverb: 0.38,
      voices: [
        { f: 130.81, type: "triangle", gain: 0.0085 },
        { f: 164.81, type: "sine", gain: 0.0050 },
        { f: 196.00, type: "sine", gain: 0.0045 },
        { f: 261.63, type: "triangle", gain: 0.0025 }
      ],
      notes: [261.63, 329.63, 392.00, 440.00, 392.00, 329.63]
    }
  };

  function createImpulse(seconds = 3.4, decay = 3.0) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.48;
      }
    }
    return impulse;
  }

  function envelope(gainNode, when, peak, attack, hold, release) {
    const g = gainNode.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(0.0001, when);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    g.setValueAtTime(Math.max(0.0002, peak), when + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  }

  function note(freq, when, duration, level, type, pan, destination, cutoff = 1800) {
    if (!ctx || !destination) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, when);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.setValueAtTime(0.25, when);
    envelope(gain, when, level, 0.08, Math.max(0.03, duration * 0.18), Math.max(0.35, duration * 0.70));

    osc.connect(filter).connect(gain);
    if (panner) {
      panner.pan.setValueAtTime(pan || 0, when);
      gain.connect(panner).connect(destination);
    } else {
      gain.connect(destination);
    }

    osc.start(when);
    osc.stop(when + duration + 0.25);
  }

  function createSector(name, def) {
    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const wetSend = ctx.createGain();

    bus.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = def.cutoff;
    filter.Q.value = 0.20;
    wetSend.gain.value = def.reverb;

    filter.connect(bus);
    bus.connect(dry);
    bus.connect(wetSend).connect(reverb);

    const voices = def.voices.map((v, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = v.type;
      osc.frequency.value = v.f;
      osc.detune.value = (i - (def.voices.length - 1) / 2) * 2.1;
      gain.gain.value = v.gain;
      osc.connect(gain).connect(filter);
      osc.start();
      return { osc, gain };
    });

    sectors[name] = { name, def, bus, filter, wetSend, voices };
  }

  function readDistance() {
    const raw = document.getElementById("v16Distance")?.textContent || "0";
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function sectorForDistance(distance) {
    if (distance < 70) return "neon";
    if (distance < 145) return "tunnel";
    if (distance < 205) return "ai";
    return "people";
  }

  function transitionSignature(name) {
    if (!ctx || !transitionBus) return;
    const now = ctx.currentTime + 0.03;
    const signatures = {
      neon: [261.63, 329.63, 392.00],
      tunnel: [196.00, 146.83, 98.00],
      ai: [329.63, 493.88, 739.99],
      people: [261.63, 329.63, 392.00]
    };
    const seq = signatures[name] || signatures.neon;
    seq.forEach((f, i) => note(f, now + i * 0.18, 2.2 + i * 0.25, 0.0085 - i * 0.0012, i === 1 ? "triangle" : "sine", -0.18 + i * 0.18, transitionBus, name === "tunnel" ? 700 : 1900));
  }

  function switchSector(name, immediate = false) {
    if (!ctx || !sectors[name] || activeSector === name) return;
    const now = ctx.currentTime;
    const timeConstant = immediate ? 0.04 : 1.05;

    Object.values(sectors).forEach(s => {
      s.bus.gain.cancelScheduledValues(now);
      s.bus.gain.setTargetAtTime(s.name === name ? 1.0 : 0.0001, now, timeConstant);
    });

    activeSector = name;
    patternStep = 0;
    transitionSignature(name);
    window.dispatchEvent(new CustomEvent("hr-sector-sound-change", { detail: { sector: name, title: sectors[name].def.title } }));
  }

  function playSectorPattern() {
    if (!ctx || !activeSector) return;
    const sector = sectors[activeSector];
    const seq = sector.def.notes;
    const now = ctx.currentTime + 0.035;
    const index = patternStep % seq.length;
    const pan = index % 2 ? 0.24 : -0.24;

    if (activeSector === "neon") {
      if (patternStep % 2 === 0) note(seq[index], now, 2.7, 0.0052, "sine", pan, sector.filter, 1900);
    } else if (activeSector === "tunnel") {
      if (patternStep % 4 === 0) note(seq[index], now, 4.8, 0.0055, "sine", pan * 0.45, sector.filter, 650);
    } else if (activeSector === "ai") {
      note(seq[index], now, 1.35, 0.0044, index % 3 === 0 ? "triangle" : "sine", pan, sector.filter, 2600);
      if (patternStep % 3 === 0) note(seq[(index + 2) % seq.length] * 0.5, now + 0.16, 1.9, 0.0028, "sine", -pan, sector.filter, 1700);
    } else if (activeSector === "people") {
      if (patternStep % 3 === 0) {
        note(seq[index], now, 3.8, 0.0058, "triangle", pan * 0.55, sector.filter, 1500);
        note(seq[(index + 2) % seq.length] * 0.5, now + 0.20, 4.5, 0.0030, "sine", -pan * 0.45, sector.filter, 1100);
      }
    }

    patternStep += 1;
  }

  function gateAccent(index) {
    if (!ctx || !transitionBus) return;
    const now = ctx.currentTime + 0.04;
    const roots = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    const root = roots[Math.min(index, roots.length - 1)];
    note(root, now, 2.8, 0.011, "sine", -0.18, transitionBus, 1800);
    note(root * 1.25, now + 0.18, 3.0, 0.0085, "sine", 0.08, transitionBus, 1900);
    note(root * 1.5, now + 0.38, 3.2, 0.0065, "triangle", 0.24, transitionBus, 2000);
  }

  function updateState() {
    const distance = readDistance();
    const nextSector = sectorForDistance(distance);
    switchSector(nextSector, false);

    GATES.forEach((gate, index) => {
      if (distance >= gate && !firedGates.has(gate)) {
        firedGates.add(gate);
        gateAccent(index);
      }
    });
  }

  function startScore() {
    if (ctx) {
      ctx.resume?.();
      return;
    }

    try {
      ctx = new NativeAC();
      master = ctx.createGain();
      dry = ctx.createGain();
      reverb = ctx.createConvolver();
      reverbGain = ctx.createGain();
      transitionBus = ctx.createGain();

      master.gain.value = 0.60;
      dry.gain.value = 0.72;
      reverb.buffer = createImpulse();
      reverbGain.gain.value = 0.27;
      transitionBus.gain.value = 0.70;

      dry.connect(master);
      reverb.connect(reverbGain).connect(master);
      transitionBus.connect(dry);
      transitionBus.connect(reverb);
      master.connect(ctx.destination);

      Object.entries(DEFINITIONS).forEach(([name, def]) => createSector(name, def));
      switchSector(sectorForDistance(readDistance()), true);

      patternTimer = window.setInterval(playSectorPattern, 900);
      stateTimer = window.setInterval(updateState, 160);
    } catch (err) {
      console.warn("Не удалось запустить музыку по секторам", err);
      try { if (patternTimer) clearInterval(patternTimer); } catch (_) {}
      try { if (stateTimer) clearInterval(stateTimer); } catch (_) {}
      patternTimer = stateTimer = null;
      ctx = null;
    }
  }

  document.getElementById("enterButton")?.addEventListener("click", startScore, { once: true });

  window.__HR_SECTOR_SCORE_V26__ = {
    version: "2.6",
    engineSound: false,
    sectors: {
      neon: "Неоновый город — светлая футуристическая атмосфера",
      tunnel: "Сервисный тоннель — тёмная глубокая атмосфера",
      ai: "Квартал ИИ — кристаллическая цифровая атмосфера",
      people: "Мост команды — тёплая эмоциональная атмосфера"
    }
  };
})();
