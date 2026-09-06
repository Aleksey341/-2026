(() => {
  const H = window.HR3;
  if (!H?.presentation || !H?.route || !H?.scene) return;
  const { scene, state, route, presentation } = H;
  const card = document.getElementById("storyCard");
  const roots = presentation.storyRoots || [];
  let time = 0;

  function phaseFromUI(ch, delta) {
    const text = String(card?.textContent || "");
    const visible = card && !card.classList.contains("hidden") && text.includes(ch.title);
    if (visible) {
      if (text.includes("ЗАДАЧА")) return "problem";
      if (text.includes("ЧТО СДЕЛАЛИ")) return "action";
      if (text.includes("РЕЗУЛЬТАТ")) return "result";
    }
    if (delta < 6.5) return "result";
    if (delta < 15) return "action";
    if (delta < 28) return "problem";
    return "idle";
  }

  function damp(v, target, lambda, dt) {
    return BABYLON.Scalar.Lerp(v, target, 1 - Math.exp(-lambda * dt));
  }

  const sceneState = new Map();
  roots.forEach(entry => {
    const root = entry.root;
    const data = { originals: new Map() };
    root.getChildTransformNodes(false).forEach(n => data.originals.set(n.name, n.position.clone()));
    root.getChildMeshes(false).forEach(m => data.originals.set(m.name, m.position.clone()));
    sceneState.set(entry.ch.id, data);
  });

  function animateRecruitment(entry, phase, dt) {
    const root = entry.root;
    const bars = [scene.getMeshByName("hr3-rec-bar-0"), scene.getMeshByName("hr3-rec-bar-1")].filter(Boolean);
    const targetBar = phase === "result" ? 1 : phase === "action" ? .62 : phase === "problem" ? .22 : .08;
    bars.forEach((b, i) => {
      b.scaling.y = damp(b.scaling.y || 1, targetBar, 5.5, dt);
      b.visibility = .28 + targetBar * .72;
      b.rotation.y += dt * (.12 + i * .04);
    });
    for (let i = 0; i < 10; i++) {
      const p = scene.getTransformNodeByName(`hr3-rec-person-${i}`);
      if (!p) continue;
      const baseX = -2.2 + (i % 5) * .82;
      const rowZ = -1.5 - Math.floor(i / 5) * .75;
      const actionK = phase === "action" ? .68 : phase === "result" ? 1 : 0;
      const targetX = BABYLON.Scalar.Lerp(baseX, -1.2 + (i % 5) * .58, actionK);
      const targetZ = BABYLON.Scalar.Lerp(rowZ, -.6 - Math.floor(i / 5) * .45, actionK);
      p.position.x = damp(p.position.x, targetX, 4.8, dt);
      p.position.z = damp(p.position.z, targetZ, 4.8, dt);
      p.position.y = Math.sin(time * 2.1 + i) * .025 * actionK;
    }
  }

  function animateConvergent(entry, phase, dt) {
    const ringA = scene.getMeshByName("hr3-conv-ring-a");
    const ringB = scene.getMeshByName("hr3-conv-ring-b");
    if (ringA) ringA.rotation.z += dt * (phase === "result" ? .62 : .18);
    if (ringB) ringB.rotation.y += dt * (phase === "action" ? .85 : .28);
    for (let i = 0; i < 9; i++) {
      const n = scene.getMeshByName(`hr3-conv-node-${i}`);
      if (!n) continue;
      const a = i / 9 * Math.PI * 2 + time * (phase === "result" ? .22 : .05);
      const radius = phase === "problem" ? 2.9 : phase === "action" ? 2.35 : 2.05;
      const tx = Math.cos(a) * radius;
      const tz = Math.sin(a) * (phase === "problem" ? 1.75 : 1.35);
      const ty = 2 + Math.sin(i * 1.4 + time) * (phase === "problem" ? 1.15 : .62);
      n.position.x = damp(n.position.x, tx, 4.2, dt);
      n.position.y = damp(n.position.y, ty, 4.2, dt);
      n.position.z = damp(n.position.z, tz, 4.2, dt);
      n.scaling.setAll(damp(n.scaling.x, phase === "idle" ? .55 : 1, 5, dt));
    }
  }

  function animateAI(entry, phase, dt) {
    const core = scene.getMeshByName("hr3-ai-core");
    const r1 = scene.getMeshByName("hr3-ai-ring-a");
    const r2 = scene.getMeshByName("hr3-ai-ring-b");
    if (core) {
      const s = phase === "result" ? 1.12 + Math.sin(time * 2.8) * .05 : phase === "action" ? .92 : .68;
      core.scaling.setAll(damp(core.scaling.x, s, 5.4, dt));
    }
    if (r1) r1.rotation.y += dt * (phase === "result" ? .95 : .24);
    if (r2) r2.rotation.x += dt * (phase === "action" ? .7 : .18);
    for (let i = 0; i < 29; i++) {
      const orb = scene.getMeshByName(`hr3-ai-orb-${i}`);
      if (!orb) continue;
      const a = i / 29 * Math.PI * 2 + time * (phase === "result" ? .55 : .16);
      const baseR = 2 + (i % 3) * .35;
      const radius = phase === "problem" ? baseR * 1.55 : phase === "action" ? baseR * .92 : baseR;
      orb.position.x = damp(orb.position.x, Math.cos(a) * radius, 4.4, dt);
      orb.position.z = damp(orb.position.z, Math.sin(a) * radius * .66, 4.4, dt);
      orb.position.y = damp(orb.position.y, 1.95 + Math.sin(a * 2.2 + i) * (phase === "problem" ? 1.1 : .72), 4.4, dt);
    }
    for (let i = 0; i < 16; i++) {
      const p = scene.getMeshByName(`hr3-ai-pillar-${i}`);
      if (!p) continue;
      const target = phase === "result" ? 1 : phase === "action" ? .58 : .16;
      p.scaling.y = damp(p.scaling.y || 1, target, 5, dt);
      p.visibility = .25 + target * .75;
    }
  }

  function animateAwards(entry, phase, dt) {
    const crown = scene.getMeshByName("hr3-awards-crown");
    if (crown) {
      crown.rotation.z += dt * (phase === "result" ? .72 : .16);
      const cs = phase === "result" ? 1.08 + Math.sin(time * 2.5) * .04 : .78;
      crown.scaling.setAll(damp(crown.scaling.x, cs, 4.5, dt));
    }
    for (let i = 0; i < 13; i++) {
      const s = scene.getMeshByName(`hr3-award-${i}`);
      if (!s) continue;
      const wave = phase === "result" ? Math.min(1, Math.max(.12, (time * .7 + i * .08) % 1.2)) : phase === "action" ? .48 : .16;
      s.scaling.y = damp(s.scaling.y || 1, wave, 5.5, dt);
      s.visibility = .25 + wave * .75;
    }
  }

  function animateHarmful(entry, phase, dt) {
    const shield = scene.getMeshByName("hr3-harm-shield");
    const scan = scene.getMeshByName("hr3-harm-scan");
    if (shield) {
      shield.rotation.z += dt * (phase === "result" ? .54 : .14);
      const s = phase === "result" ? 1.06 : phase === "action" ? .92 : .68;
      shield.scaling.setAll(damp(shield.scaling.x, s, 4.8, dt));
    }
    if (scan) {
      const amp = phase === "action" ? 1.15 : phase === "result" ? .72 : .25;
      scan.position.y = 1.3 + (Math.sin(time * (phase === "action" ? 3.4 : 1.6)) + 1) * amp;
      scan.visibility = phase === "idle" ? .12 : .85;
    }
    for (let i = 0; i < 12; i++) {
      const p = scene.getTransformNodeByName(`hr3-harm-person-${i}`);
      if (!p) continue;
      const highlight = phase === "result" && i < 10;
      p.scaling.setAll(damp(p.scaling.x, highlight ? 1.08 : phase === "problem" ? .82 : 1, 4.4, dt));
    }
  }

  H.registerUpdate(dt => {
    time += dt;
    if (!state.running) return;
    roots.forEach(entry => {
      const delta = Math.abs(state.routeDistance - entry.ch.d);
      const phase = phaseFromUI(entry.ch, delta);
      if (entry.ch.id === "recruitment") animateRecruitment(entry, phase, dt);
      if (entry.ch.id === "convergent") animateConvergent(entry, phase, dt);
      if (entry.ch.id === "ai") animateAI(entry, phase, dt);
      if (entry.ch.id === "awards") animateAwards(entry, phase, dt);
      if (entry.ch.id === "harmful") animateHarmful(entry, phase, dt);
    });
  });

  H.storyTransform = { version: "3.0.3" };
})();
