(() => {
  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (!NativeAC) return;

  // v2.4: presentation soundscape.
  // The old route engine/air synthesis is silenced completely. The experience keeps
  // only a soft ambient score and restrained musical accents at data gates.
  function muteLegacyRouteAudio(ctx) {
    if (!ctx || ctx.__v24LegacyMuted) return ctx;
    ctx.__v24LegacyMuted = true;

    const nativeCreateOscillator = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = function () {
      const osc = nativeCreateOscillator();
      const nativeConnect = osc.connect.bind(osc);

      // grand-route-v16 creates its motor and air oscillators after START.
      // Do not wire those oscillators into their gain chain at all.
      osc.connect = function (destination) {
        return destination;
      };

      osc.__v24NativeConnect = nativeConnect;
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
  let wet = null;
  let reverb = null;
  let padFilter = null;
  let padGain = null;
  let padVoices = [];
  let chordTimer = null;
  let shimmerTimer = null;
  let gateTimer = null;
  let chordIndex = 0;
  let shimmerIndex = 0;
  const firedGates = new Set();

  // Gentle cinematic progression. Frequencies are deliberately kept in a warm,
  // mid-low register so the score supports the presentation instead of dominating it.
  const CHORDS = [
    [130.81, 164.81, 196.00, 246.94], // Cmaj7
    [110.00, 130.81, 164.81, 196.00], // Am7
    [87.31, 130.81, 174.61, 220.00],  // Fmaj7
    [98.00, 146.83, 196.00, 220.00]   // Gsus/add9
  ];

  const SHIMMER = [329.63, 392.00, 493.88, 523.25, 493.88, 392.00, 349.23, 293.66];
  const GATES = [55, 105, 165, 220, 270, 310];

  function createImpulse(seconds = 2.8, decay = 3.1) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.pow(1 - t, decay);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.55;
      }
    }
    return impulse;
  }

  function makeEnvelope(gainNode, when, peak, attack, hold, release) {
    const g = gainNode.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(0.0001, when);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    g.setValueAtTime(Math.max(0.0002, peak), when + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  }

  function softTone(freq, when, duration = 2.8, level = 0.012, type = "sine", pan = 0) {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(type === "sine" ? 1700 : 1150, when);
    filter.Q.setValueAtTime(0.22, when);
    makeEnvelope(gain, when, level, 0.12, Math.max(0.02, duration * 0.18), Math.max(0.3, duration * 0.70));

    osc.connect(filter).connect(gain);
    if (panner) {
      panner.pan.setValueAtTime(pan, when);
      gain.connect(panner).connect(dry);
      panner.connect(wet);
    } else {
      gain.connect(dry);
      gain.connect(wet);
    }

    osc.start(when);
    osc.stop(when + duration + 0.35);
  }

  function buildPadVoices() {
    padVoices.forEach(v => {
      try { v.osc.stop(); } catch (_) {}
      try { v.osc.disconnect(); } catch (_) {}
    });
    padVoices = [];

    const chord = CHORDS[chordIndex % CHORDS.length];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      osc.type = i % 3 === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 2.3;
      voiceGain.gain.value = i === 0 ? 0.010 : 0.0065;
      osc.connect(voiceGain).connect(padFilter);
      osc.start();
      padVoices.push({ osc, gain: voiceGain });
    });
  }

  function moveToChord(nextIndex) {
    if (!ctx || !padVoices.length) return;
    chordIndex = nextIndex % CHORDS.length;
    const chord = CHORDS[chordIndex];
    const now = ctx.currentTime;
    padVoices.forEach((v, i) => {
      v.osc.frequency.cancelScheduledValues(now);
      v.osc.frequency.setTargetAtTime(chord[i], now, 2.4);
    });
  }

  function gateAccent(index) {
    if (!ctx) return;
    const now = ctx.currentTime + 0.04;
    const roots = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    const root = roots[Math.min(index, roots.length - 1)];

    // Soft, spacious three-note signature instead of a game-like alert.
    softTone(root, now, 3.0, 0.018, "sine", -0.18);
    softTone(root * 1.25, now + 0.22, 3.2, 0.013, "sine", 0.12);
    softTone(root * 1.5, now + 0.47, 3.4, 0.010, "triangle", 0.28);
  }

  function startAmbient() {
    if (ctx) {
      ctx.resume?.();
      return;
    }

    try {
      // NativeAC is intentional: only the legacy v16 context is muted by the wrapper.
      ctx = new NativeAC();
      master = ctx.createGain();
      dry = ctx.createGain();
      wet = ctx.createGain();
      reverb = ctx.createConvolver();
      padFilter = ctx.createBiquadFilter();
      padGain = ctx.createGain();

      master.gain.value = 0.58;
      dry.gain.value = 0.72;
      wet.gain.value = 0.30;
      reverb.buffer = createImpulse();

      padFilter.type = "lowpass";
      padFilter.frequency.value = 760;
      padFilter.Q.value = 0.18;
      padGain.gain.value = 0.72;

      padFilter.connect(padGain);
      padGain.connect(dry);
      padGain.connect(wet);
      dry.connect(master);
      wet.connect(reverb).connect(master);
      master.connect(ctx.destination);

      buildPadVoices();

      chordTimer = window.setInterval(() => {
        moveToChord(chordIndex + 1);
      }, 10000);

      shimmerTimer = window.setInterval(() => {
        if (!ctx) return;
        const speed = Math.max(0, Math.min(160, parseFloat(document.getElementById("v13Speed")?.textContent || "0") || 0));
        const speed01 = speed / 160;
        const now = ctx.currentTime + 0.05;
        const freq = SHIMMER[shimmerIndex % SHIMMER.length];

        // Sparse notes: at low speed they are almost meditative; motion only adds a
        // little presence, never a racing-engine sensation.
        softTone(freq, now, 3.1, 0.006 + speed01 * 0.003, "sine", shimmerIndex % 2 ? 0.22 : -0.22);
        shimmerIndex += 1;

        padFilter.frequency.setTargetAtTime(700 + speed01 * 230, now, 1.2);
        padGain.gain.setTargetAtTime(0.66 + speed01 * 0.10, now, 1.3);
      }, 3400);

      gateTimer = window.setInterval(() => {
        const distance = parseFloat(document.getElementById("v16Distance")?.textContent || "0") || 0;
        GATES.forEach((gate, index) => {
          if (distance >= gate && !firedGates.has(gate)) {
            firedGates.add(gate);
            gateAccent(index);
          }
        });
      }, 180);
    } catch (_) {
      try { if (chordTimer) clearInterval(chordTimer); } catch (_) {}
      try { if (shimmerTimer) clearInterval(shimmerTimer); } catch (_) {}
      try { if (gateTimer) clearInterval(gateTimer); } catch (_) {}
      chordTimer = shimmerTimer = gateTimer = null;
      ctx = null;
    }
  }

  document.getElementById("enterButton")?.addEventListener("click", startAmbient, { once: true });

  window.__HR_AMBIENT_SOUND_V24__ = {
    version: "2.4",
    engineSound: false,
    description: "ambient cinematic pads + sparse shimmer + soft gate accents"
  };
})();
