(() => {
  const H = window.HR3;
  if (!H?.vehicle || !H.route) return;
  const { scene, glow, data, state, vehicle, route } = H;

  function pbr(name, hex, emissive = 0.85, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.metallic = 0.08;
    m.roughness = 0.18;
    m.alpha = alpha;
    return m;
  }
  const mats = {};
  data.chapters.forEach(ch => { mats[ch.id] = pbr(`hr3-story-${ch.id}`, ch.accent, .90); });
  const white = pbr("hr3-story-white", "#effcff", .78);
  const dark = pbr("hr3-story-dark", "#071018", .02);

  function addGlow(m) { glow.addIncludedOnlyMesh(m); return m; }
  function box(name, size, pos, mat, parent) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos); m.material = mat; m.parent = parent; m.isPickable = false; return m;
  }
  function sphere(name, diameter, pos, mat, parent, segments = 16) {
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments }, scene);
    m.position.copyFrom(pos); m.material = mat; m.parent = parent; m.isPickable = false; return m;
  }
  function torus(name, diameter, thickness, pos, mat, parent) {
    const m = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 56 }, scene);
    m.position.copyFrom(pos); m.material = mat; m.parent = parent; m.isPickable = false; addGlow(m); return m;
  }
  function person(name, parent, x, z, mat, scale = 1) {
    const r = new BABYLON.TransformNode(name, scene); r.parent = parent; r.position.set(x, 0, z); r.scaling.setAll(scale);
    addGlow(sphere(`${name}-head`, .25, new BABYLON.Vector3(0, 1.25, 0), mat, r, 10));
    const body = BABYLON.MeshBuilder.CreateCylinder(`${name}-body`, { height:.82, diameterTop:.30, diameterBottom:.45, tessellation:10 }, scene);
    body.parent = r; body.position.y=.68; body.material=mat; body.isPickable=false; addGlow(body); return r;
  }

  const storyRoots = [];
  for (const ch of data.chapters.filter(x => !x.final)) {
    const root = new BABYLON.TransformNode(`hr3-story-root-${ch.id}`, scene);
    root.position.set(route.pathX(ch.d) + ch.side * 10.6, 0, ch.d);
    root.rotation.y = route.pathAngle(ch.d) * .25;
    root.scaling.setAll(.001);
    const mat = mats[ch.id];

    if (ch.id === "recruitment") {
      [3.3,4.2].forEach((h,i) => addGlow(box(`hr3-rec-bar-${i}`, {width:.72,height:h,depth:.72}, new BABYLON.Vector3(-1.1+i*1.25,h/2,0), i?white:mat, root)));
      for (let i=0;i<10;i++) person(`hr3-rec-person-${i}`, root, -2.2+(i%5)*.82, -1.5-Math.floor(i/5)*.75, i%3===0?white:mat,.75);
    }
    if (ch.id === "convergent") {
      addGlow(sphere("hr3-conv-core", .82, new BABYLON.Vector3(0,2,0), mat, root, 22));
      const a=torus("hr3-conv-ring-a",3.8,.05,new BABYLON.Vector3(0,2,0),mat,root); a.rotation.x=Math.PI/2;
      const b=torus("hr3-conv-ring-b",2.8,.035,new BABYLON.Vector3(0,2,0),white,root); b.rotation.z=Math.PI/2;
      for(let i=0;i<9;i++){const ang=i/9*Math.PI*2;addGlow(sphere(`hr3-conv-node-${i}`,.2,new BABYLON.Vector3(Math.cos(ang)*2.1,2+Math.sin(i)*.7,Math.sin(ang)*1.35),i%3===0?white:mat,root,10));}
    }
    if (ch.id === "ai") {
      addGlow(sphere("hr3-ai-core",1.08,new BABYLON.Vector3(0,2.1,0),mat,root,24));
      const r1=torus("hr3-ai-ring-a",3.3,.05,new BABYLON.Vector3(0,2.1,0),mat,root);r1.rotation.x=.65;
      const r2=torus("hr3-ai-ring-b",4.1,.035,new BABYLON.Vector3(0,2.1,0),white,root);r2.rotation.z=1.05;
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const h=.5+(i%5)*.22;addGlow(box(`hr3-ai-pillar-${i}`,{width:.11,height:h,depth:.11},new BABYLON.Vector3(Math.cos(a)*2.55,h/2+.12,Math.sin(a)*1.7),i%4===0?white:mat,root));}
      for(let i=0;i<29;i++){const a=i/29*Math.PI*2;addGlow(sphere(`hr3-ai-orb-${i}`,.085,new BABYLON.Vector3(Math.cos(a)*(2.0+(i%3)*.35),1.9+Math.sin(i*1.7)*.7,Math.sin(a)*(1.3+(i%2)*.3)),i%5===0?white:mat,root,7));}
    }
    if (ch.id === "awards") {
      box("hr3-awards-base",{width:5.4,height:.16,depth:3},new BABYLON.Vector3(0,.1,0),dark,root);
      for(let i=0;i<13;i++){const x=-2.45+i*.41;const h=.8+((i*7)%11)*.24;addGlow(box(`hr3-award-${i}`,{width:.2,height:h,depth:.4},new BABYLON.Vector3(x,h/2+.18,0),i%3===0?white:mat,root));}
      const crown=torus("hr3-awards-crown",3.1,.065,new BABYLON.Vector3(0,3.05,0),mat,root);crown.rotation.x=Math.PI/2;
    }
    if (ch.id === "harmful") {
      const shield=torus("hr3-harm-shield",4.4,.08,new BABYLON.Vector3(0,2.1,0),mat,root);shield.rotation.x=Math.PI/2;
      const scan=addGlow(box("hr3-harm-scan",{width:4.9,height:.035,depth:.09},new BABYLON.Vector3(0,1.9,0),white,root));
      for(let i=0;i<12;i++) person(`hr3-harm-person-${i}`,root,-2.2+(i%6)*.82,-1.25-Math.floor(i/6)*.72,i<10?mat:white,.68);
      root.metadata={scan};
    }
    storyRoots.push({ ch, root, mat, phase: Math.random()*4 });
  }

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
  let time = 0;
  const freeShown = new Set();
  let hideCardAt = 0;

  function normalizeAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
  function showCard(ch, phase="result") {
    if (!ch || ch.final) return;
    const phaseLabel = phase === "problem" ? "ЗАДАЧА" : phase === "action" ? "ЧТО СДЕЛАЛИ" : "РЕЗУЛЬТАТ";
    const text = phase === "problem" ? ch.problem : phase === "action" ? ch.action : ch.result;
    card.style.setProperty("--accent", ch.accent);
    card.innerHTML = `<div class="story-kicker">${ch.no} · ${ch.title} · ${phaseLabel}</div><h2>${phaseLabel}</h2><p>${text}</p>${phase === "result" ? `<div class="metrics">${ch.metrics.map(m=>`<div class="metric"><b>${m[0]}</b><span>${m[1]}</span></div>`).join("")}</div>` : ""}`;
    card.classList.remove("hidden");
  }
  function hideCard(){card.classList.add("hidden");}

  function beginAuto() {
    autoPhase = "cruise";
    autoGateIndex = 0;
    userPaused = false;
    skipPause = false;
    finale.classList.add("hidden");
    vehicle.setPose(route.pathX(0), 0, route.pathAngle(0));
    vehicle.setAutoInput({ throttle:.75, steer:0, brake:false });
  }
  function beginFree() {
    autoPhase = "idle";
    vehicle.clearAutoInput();
    finale.classList.add("hidden");
  }
  H.on("mode", mode => mode === "auto" ? beginAuto() : beginFree());

  pauseButton.addEventListener("click", () => {
    if (state.mode !== "auto") return;
    userPaused = !userPaused;
    pauseButton.textContent = userPaused ? "ПРОДОЛЖИТЬ" : "ПАУЗА";
  });
  continueButton.addEventListener("click", () => { if (state.mode === "auto" && autoPhase === "pause") skipPause = true; });

  function autoDrive(dt) {
    if (state.mode !== "auto") return;
    const d = state.routeDistance;
    const ch = data.chapters[autoGateIndex];
    if (!ch) return;
    if (userPaused) { vehicle.setAutoInput({throttle:0,steer:0,brake:true}); return; }

    if (autoPhase === "pause") {
      vehicle.setAutoInput({throttle:0,steer:0,brake:true});
      const elapsed = performance.now() - pauseStarted;
      if (!ch.final) {
        if (elapsed < 18000) showCard(ch,"problem");
        else if (elapsed < 40000) showCard(ch,"action");
        else showCard(ch,"result");
      }
      if (ch.final) {
        finale.classList.remove("hidden");
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
    if (autoPhase === "final") { vehicle.setAutoInput({throttle:0,steer:0,brake:true}); return; }

    const targetStop = ch.d - (ch.final ? 2.5 : 4.5);
    const remaining = targetStop - d;
    if (remaining <= .7 && vehicle.speedKmh < 9) {
      autoPhase = "pause";
      pauseStarted = performance.now();
      pauseDuration = ch.final ? Infinity : 65000;
      vehicle.setAutoInput({throttle:0,steer:0,brake:true});
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

  H.registerUpdate(dt => {
    time += dt;
    if (!state.running) return;

    // Physical story scenes wake up as the car approaches, then settle back down.
    storyRoots.forEach((s,i) => {
      const delta = Math.abs(state.routeDistance - s.ch.d);
      const target = delta < 34 ? 1 : delta < 55 ? .35 : .001;
      const scale = BABYLON.Scalar.Lerp(s.root.scaling.x, target, 1 - Math.exp(-5*dt));
      s.root.scaling.setAll(scale);
      s.root.rotation.y = route.pathAngle(s.ch.d) * .25 + Math.sin(time*.35+s.phase)*.02;
      if (s.ch.id === "harmful" && s.root.metadata?.scan) s.root.metadata.scan.position.y = 1.3 + (Math.sin(time*1.7)+1)*.8;
    });

    autoDrive(dt);

    if (state.mode === "free") {
      for (const ch of data.chapters) {
        if (ch.final) continue;
        if (!freeShown.has(ch.id) && Math.abs(state.routeDistance - ch.d) < 4.5) {
          freeShown.add(ch.id); showCard(ch,"result"); hideCardAt = performance.now()+8500;
        }
      }
      if (hideCardAt && performance.now() > hideCardAt) { hideCardAt=0; hideCard(); }
      const future = data.chapters.find(x=>x.final);
      if (future && state.routeDistance >= future.d-1.5) finale.classList.remove("hidden");
    }
  });

  H.presentation = { storyRoots, showCard, hideCard };
})();
