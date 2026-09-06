(() => {
  const H = window.HR3;
  if (!H?.vehicle) return;

  let ctx = null;
  let master = null;
  let engineLow = null;
  let engineMid = null;
  let engineLowGain = null;
  let engineMidGain = null;
  let wind = null;
  let windGain = null;
  let muted = false;
  let started = false;

  const button = document.createElement("button");
  button.className = "hr3-audio-chip";
  button.type = "button";
  button.innerHTML = '<span>ЗВУК</span><strong>АВТО</strong>';
  document.body.appendChild(button);

  function makeNoiseBuffer(ac) {
    const seconds = 1.6;
    const length = Math.floor(ac.sampleRate * seconds);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function initAudio() {
    if (started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      button.querySelector("strong").textContent = "НЕТ";
      button.disabled = true;
      return;
    }

    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);

      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.value = 340;
      lowFilter.Q.value = 0.5;

      engineLow = ctx.createOscillator();
      engineLow.type = "sawtooth";
      engineLowGain = ctx.createGain();
      engineLowGain.gain.value = 0.018;
      engineLow.connect(lowFilter).connect(engineLowGain).connect(master);
      engineLow.start();

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = "bandpass";
      midFilter.frequency.value = 480;
      midFilter.Q.value = 0.8;

      engineMid = ctx.createOscillator();
      engineMid.type = "triangle";
      engineMidGain = ctx.createGain();
      engineMidGain.gain.value = 0.008;
      engineMid.connect(midFilter).connect(engineMidGain).connect(master);
      engineMid.start();

      wind = ctx.createBufferSource();
      wind.buffer = makeNoiseBuffer(ctx);
      wind.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "highpass";
      windFilter.frequency.value = 700;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0001;
      wind.connect(windFilter).connect(windGain).connect(master);
      wind.start();

      started = true;
      button.querySelector("strong").textContent = "ВКЛ";
      ctx.resume?.();
    } catch (err) {
      console.warn("HR3 audio init failed", err);
      button.querySelector("strong").textContent = "НЕТ";
      button.disabled = true;
    }
  }

  function chime(freq = 520, duration = 0.38, level = 0.04) {
    if (!ctx || muted || ctx.state === "suspended") return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.28, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_) {}
  }

  H.on("mode", () => {
    initAudio();
    ctx?.resume?.();
    window.setTimeout(() => chime(360, 0.48, 0.025), 90);
  });

  H.on("chapter", ch => {
    if (!ch) return;
    if (ch.final) {
      chime(220, 0.95, 0.055);
      window.setTimeout(() => chime(440, 0.92, 0.042), 180);
    } else {
      chime(430 + Number(ch.no || 0) * 32, 0.34, 0.026);
    }
  });

  button.addEventListener("click", () => {
    initAudio();
    muted = !muted;
    button.classList.toggle("muted", muted);
    button.querySelector("strong").textContent = muted ? "ВЫКЛ" : "ВКЛ";
    if (ctx) {
      ctx.resume?.();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.55, ctx.currentTime, 0.04);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!ctx || !master) return;
    const target = document.hidden || muted ? 0.0001 : 0.55;
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.06);
  });

  H.registerUpdate(() => {
    if (!started || !ctx || !H.state.running) return;
    const speed = Math.abs(H.vehicle.speed);
    const sf = BABYLON.Scalar.Clamp(speed / 10.8, 0, 1);
    const now = ctx.currentTime;
    const lowHz = 46 + sf * 92;
    const midHz = 92 + sf * 245;
    engineLow.frequency.setTargetAtTime(lowHz, now, 0.035);
    engineMid.frequency.setTargetAtTime(midHz, now, 0.030);
    engineLowGain.gain.setTargetAtTime(0.012 + sf * 0.036, now, 0.05);
    engineMidGain.gain.setTargetAtTime(0.004 + sf * 0.020, now, 0.05);
    windGain.gain.setTargetAtTime(0.0001 + sf * sf * 0.050, now, 0.06);
  });

  H.audio = {
    get started() { return started; },
    get muted() { return muted; },
    chime
  };
})();
