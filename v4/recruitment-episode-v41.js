(() => {
  const H = window.HR4;
  if (!H?.scene || !H?.world || !H?.character) return;

  const { scene, camera, glow, state, world, data, character } = H;
  const section = data.sections.find(s => s.id === 'recruitment');
  const room = world.roomRoots.recruitment;
  if (!section || !room) return;

  const V = (x=0,y=0,z=0) => new BABYLON.Vector3(x,y,z);
  const people = Array.from({ length: 5 }, (_, i) => scene.getTransformNodeByName(`hr4-rec-person-${i}`)).filter(Boolean);
  const scanner = scene.getMeshByName('hr4-rec-scan');
  const gateTop = scene.getMeshByName('hr4-rec-gate-top');
  const roomLightMesh = scene.getMeshByName('hr4-room-light-recruitment');
  const basePeople = people.map(p => p.position.clone());

  const cyan = new BABYLON.PBRMaterial('hr4-v41-cyan', scene);
  cyan.albedoColor = BABYLON.Color3.FromHexString('#8be9ff');
  cyan.emissiveColor = BABYLON.Color3.FromHexString('#8be9ff').scale(.86);
  cyan.metallic = .06;
  cyan.roughness = .18;

  const dark = new BABYLON.PBRMaterial('hr4-v41-dark', scene);
  dark.albedoColor = BABYLON.Color3.FromHexString('#101820');
  dark.metallic = .55;
  dark.roughness = .28;

  const laneRoot = new BABYLON.TransformNode('hr4-v41-lane-root', scene);
  laneRoot.parent = room;
  laneRoot.position.set(0, 0, 0);

  [-.92, .92].forEach((x, i) => {
    const rail = BABYLON.MeshBuilder.CreateBox(`hr4-v41-lane-rail-${i}`, { width:.055, height:.055, depth:4.7 }, scene);
    rail.parent = laneRoot;
    rail.position.set(x, .08, -.55);
    rail.material = cyan;
    rail.visibility = .34;
    rail.isPickable = false;
    glow.addIncludedOnlyMesh(rail);
  });

  const scannerHalo = BABYLON.MeshBuilder.CreateTorus('hr4-v41-scanner-halo', { diameter:2.85, thickness:.035, tessellation:64 }, scene);
  scannerHalo.parent = room;
  scannerHalo.position.set(0, 1.42, .58);
  scannerHalo.rotation.x = Math.PI / 2;
  scannerHalo.material = cyan;
  scannerHalo.visibility = 0;
  scannerHalo.isPickable = false;
  glow.addIncludedOnlyMesh(scannerHalo);

  const roomLight = new BABYLON.PointLight('hr4-v41-room-light', V(section.room.x, 3.3, section.room.z - .4), scene);
  roomLight.diffuse = BABYLON.Color3.FromHexString('#91eaff');
  roomLight.specular = BABYLON.Color3.FromHexString('#dffaff');
  roomLight.range = 12;
  roomLight.intensity = .15;

  const particles = [];
  for (let i = 0; i < 18; i++) {
    const p = BABYLON.MeshBuilder.CreateBox(`hr4-v41-flow-${i}`, { width:.035, height:.035, depth:.16 }, scene);
    p.parent = room;
    p.position.set(((i%6)-2.5)*.28, .35 + (i%3)*.36, -2.1 - Math.floor(i/6)*.25);
    p.material = cyan;
    p.visibility = 0;
    p.isPickable = false;
    glow.addIncludedOnlyMesh(p);
    particles.push(p);
  }

  const shots = {
    problem: {
      pos: V(section.room.x + 3.7, 3.2, section.room.z - 4.0),
      target: V(section.room.x, 1.25, section.room.z - .55),
      fov: .78
    },
    action: {
      pos: V(section.room.x + 2.65, 2.35, section.room.z - .05),
      target: V(section.room.x, 1.35, section.room.z + .65),
      fov: .70
    },
    result: {
      pos: V(section.room.x - 3.25, 3.0, section.room.z - 3.05),
      target: V(section.room.x, 1.35, section.room.z + 1.15),
      fov: .80
    }
  };

  let phase = 'idle';
  let phaseAge = 0;
  let director = false;
  let wasNear = false;
  let time = 0;

  function setDirector(on) {
    director = on && state.mode === 'auto' && !state.xrActive;
    document.body.classList.toggle('v41-director', director);
    document.body.classList.toggle('v41-recruitment', on);
  }

  H.on('board:show', ({ section: s, phase: p }) => {
    if (s?.id !== 'recruitment') return;
    phase = p || 'result';
    phaseAge = 0;
    setDirector(true);
  });

  H.on('board:hide', () => {
    if (phase === 'idle') return;
    phase = 'idle';
    phaseAge = 0;
    setDirector(false);
  });

  H.on('mode', () => {
    phase = 'idle';
    phaseAge = 0;
    setDirector(false);
    people.forEach((p, i) => p.position.copyFrom(basePeople[i]));
  });

  function damp(a, b, lambda, dt) {
    return BABYLON.Scalar.Lerp(a, b, 1 - Math.exp(-lambda * dt));
  }

  function movePerson(p, target, dt) {
    p.position.x = damp(p.position.x, target.x, 4.8, dt);
    p.position.z = damp(p.position.z, target.z, 4.8, dt);
    const dir = target.subtract(p.position);
    if (Math.abs(dir.x) + Math.abs(dir.z) > .02) {
      const yaw = Math.atan2(dir.x, dir.z);
      p.rotation.y = damp(p.rotation.y, yaw, 5.5, dt);
    }
  }

  H.registerUpdate(dt => {
    if (!state.running) return;
    time += dt;
    phaseAge += dt;

    const dist = BABYLON.Vector3.Distance(character.root.position, world.targets.recruitment);
    const near = dist < 10.5;
    if (near !== wasNear) {
      wasNear = near;
      document.body.classList.toggle('v41-recruitment-near', near);
    }

    const phaseBoost = phase === 'action' ? 1.65 : phase === 'result' ? 1.15 : phase === 'problem' ? .78 : 0;
    const nearBoost = near ? .48 : .10;
    roomLight.intensity = damp(roomLight.intensity, Math.max(nearBoost, phaseBoost), 4.5, dt);
    if (roomLightMesh) roomLightMesh.visibility = damp(roomLightMesh.visibility, near ? .88 : .55, 4, dt);
    if (gateTop) gateTop.scaling.x = 1 + (phase === 'action' ? Math.sin(time * 4.1) * .035 : 0);

    if (scanner) {
      const active = phase === 'action' || phase === 'result';
      const y = active ? .62 + ((Math.sin(time * 2.7) + 1) * .78) : 1.30;
      scanner.position.y = damp(scanner.position.y, y, 7, dt);
      scanner.visibility = active ? .92 : .48;
    }
    scannerHalo.visibility = damp(scannerHalo.visibility, phase === 'action' ? .54 : phase === 'result' ? .22 : 0, 5, dt);
    scannerHalo.rotation.z += dt * (phase === 'action' ? .55 : .15);

    people.forEach((p, i) => {
      const base = basePeople[i];
      if (phase === 'problem' || phase === 'idle') {
        movePerson(p, V(base.x, 0, base.z + Math.sin(time*.55+i)*.05), dt);
      } else if (phase === 'action') {
        const progress = BABYLON.Scalar.Clamp((phaseAge - i*.65) / 2.5, 0, 1);
        const tx = BABYLON.Scalar.Lerp(base.x, (i-2)*.17, progress);
        const tz = BABYLON.Scalar.Lerp(base.z, 1.55 + (i%2)*.28, progress);
        movePerson(p, V(tx,0,tz), dt);
      } else if (phase === 'result') {
        const resultX = [-1.45,-.72,0,.72,1.45][i] || 0;
        const resultZ = 2.15 + (i%2)*.48;
        movePerson(p, V(resultX,0,resultZ), dt);
      }
    });

    particles.forEach((p, i) => {
      if (phase !== 'action') {
        p.visibility = damp(p.visibility, 0, 7, dt);
        return;
      }
      p.visibility = .38 + (i%4)*.08;
      const cycle = (time * .62 + i * .085) % 1;
      p.position.z = -2.2 + cycle * 4.45;
      p.position.y = .38 + (i%4)*.32 + Math.sin(time*2+i)*.08;
      p.position.x = ((i%6)-2.5)*.24 + Math.sin(i*2.1)*.08;
    });

    if (state.xrActive && director) setDirector(false);
    if (director && !state.xrActive) {
      const shot = shots[phase] || shots.problem;
      const drift = phase === 'action' ? Math.sin(time*.32)*.16 : Math.sin(time*.22)*.10;
      const desired = shot.pos.add(V(drift, Math.sin(time*.28)*.035, 0));
      camera.position = BABYLON.Vector3.Lerp(camera.position, desired, 1 - Math.exp(-3.2 * dt));
      camera.fov = damp(camera.fov, shot.fov, 4.2, dt);
      camera.setTarget(shot.target);
    } else if (!state.xrActive) {
      camera.fov = damp(camera.fov, .82, 3.5, dt);
    }
  });

  H.recruitmentEpisode = { roomLight, scannerHalo, people };
})();