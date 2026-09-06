(() => {
  const H = window.HR3;
  if (!H?.scene || !H?.route || !H?.presentation) return;
  const { scene, glow, data, state, route } = H;

  function pbr(name, hex, emissive = 0, metallic = .18, roughness = .32, alpha = 1) {
    const mat = new BABYLON.PBRMaterial(name, scene);
    mat.albedoColor = BABYLON.Color3.FromHexString(hex);
    mat.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    mat.metallic = metallic;
    mat.roughness = roughness;
    mat.alpha = alpha;
    if (alpha < 1) {
      mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      mat.backFaceCulling = false;
    }
    return mat;
  }

  const accent = {};
  data.chapters.filter(ch => !ch.final).forEach(ch => {
    accent[ch.id] = pbr(`hr3-v33-accent-${ch.id}`, ch.accent, .58, .12, .22);
  });
  const dark = pbr("hr3-v33-dark", "#071019", .01, .58, .3);
  const steel = pbr("hr3-v33-steel", "#233847", .02, .72, .2);
  const pale = pbr("hr3-v33-pale", "#e9f8ff", .25, .12, .24);
  const glass = pbr("hr3-v33-glass", "#9fe9ff", .18, .08, .14, .28);
  const soft = pbr("hr3-v33-soft", "#8aa4b4", .02, .08, .65);

  const addGlow = mesh => { glow.addIncludedOnlyMesh(mesh); return mesh; };
  const v3 = (x = 0, y = 0, z = 0) => new BABYLON.Vector3(x, y, z);

  function box(name, size, pos, mat, parent, glowing = false) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return glowing ? addGlow(mesh) : mesh;
  }

  function cylinder(name, options, pos, mat, parent, glowing = false) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return glowing ? addGlow(mesh) : mesh;
  }

  function sphere(name, diameter, pos, mat, parent, glowing = false) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 14 }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return glowing ? addGlow(mesh) : mesh;
  }

  function person(name, parent, x, z, mat, options = {}) {
    const root = new BABYLON.TransformNode(name, scene);
    root.parent = parent;
    root.position.set(x, 0, z);
    const body = cylinder(`${name}-body`, { height: .86, diameterTop: .30, diameterBottom: .42, tessellation: 10 }, v3(0, .72, 0), mat, root);
    const head = sphere(`${name}-head`, .26, v3(0, 1.30, 0), options.highlight ? pale : mat, root, !!options.highlight);
    if (options.helmet) {
      const helmet = cylinder(`${name}-helmet`, { height: .10, diameter: .32, tessellation: 16 }, v3(0, 1.45, 0), options.helmetMat || mat, root, true);
      helmet.scaling.z = .84;
    }
    root.scaling.setAll(options.scale || .9);
    return root;
  }

  function platform(name, root, mat) {
    box(`${name}-base`, { width: 6.4, height: .12, depth: 5.4 }, v3(0, .02, 0), dark, root);
    box(`${name}-edge`, { width: 6.0, height: .035, depth: .06 }, v3(0, .10, -2.47), mat, root, true);
  }

  function gateFrame(name, root, mat, width = 2.6, height = 2.6) {
    const half = width / 2;
    const left = box(`${name}-left`, { width: .16, height, depth: .18 }, v3(-half, height / 2, 0), steel, root);
    const right = box(`${name}-right`, { width: .16, height, depth: .18 }, v3(half, height / 2, 0), steel, root);
    const top = box(`${name}-top`, { width: width + .16, height: .16, depth: .18 }, v3(0, height, 0), mat, root, true);
    const sideL = box(`${name}-light-l`, { width: .035, height: height * .74, depth: .20 }, v3(-half + .095, height * .52, -.02), mat, root, true);
    const sideR = box(`${name}-light-r`, { width: .035, height: height * .74, depth: .20 }, v3(half - .095, height * .52, -.02), mat, root, true);
    return { left, right, top, sideL, sideR };
  }

  function damp(value, target, lambda, dt) {
    return BABYLON.Scalar.Lerp(value, target, 1 - Math.exp(-lambda * dt));
  }

  function dampVec(node, target, lambda, dt) {
    node.position.x = damp(node.position.x, target.x, lambda, dt);
    node.position.y = damp(node.position.y, target.y, lambda, dt);
    node.position.z = damp(node.position.z, target.z, lambda, dt);
  }

  const scenes = [];

  for (const ch of data.chapters.filter(x => !x.final)) {
    const root = new BABYLON.TransformNode(`hr3-v33-scene-${ch.id}`, scene);
    root.position.set(route.pathX(ch.d) + ch.side * 9.0, 0, ch.d);
    root.rotation.y = route.pathAngle(ch.d) * .30;
    root.scaling.setAll(.001);
    const mat = accent[ch.id];
    platform(`hr3-v33-${ch.id}`, root, mat);
    const refs = {};

    if (ch.id === "recruitment") {
      refs.gate = gateFrame("hr3-v33-recruit-gate", root, mat, 2.5, 2.55);
      refs.scanner = box("hr3-v33-recruit-scan", { width: 2.18, height: .035, depth: .08 }, v3(0, 1.25, -.04), mat, root, true);
      refs.people = [
        person("hr3-v33-recruit-person-a", root, -1.45, -1.85, soft),
        person("hr3-v33-recruit-person-b", root, -.65, -2.25, mat),
        person("hr3-v33-recruit-person-c", root, .15, -1.80, soft),
        person("hr3-v33-recruit-person-d", root, .95, -2.18, mat),
        person("hr3-v33-recruit-person-e", root, 1.55, -1.65, soft)
      ];
      refs.lane = box("hr3-v33-recruit-lane", { width: 1.7, height: .025, depth: 3.8 }, v3(0, .10, .35), glass, root, true);
    }

    if (ch.id === "convergent") {
      refs.desk = cylinder("hr3-v33-conv-desk", { diameter: 2.0, height: .72, tessellation: 32 }, v3(0, .46, .15), steel, root);
      refs.deskLight = cylinder("hr3-v33-conv-desk-light", { diameter: 1.73, height: .035, tessellation: 32 }, v3(0, .84, .15), mat, root, true);
      refs.terminals = [];
      [-1.75, 0, 1.75].forEach((x, i) => {
        const terminal = new BABYLON.TransformNode(`hr3-v33-conv-terminal-${i}`, scene);
        terminal.parent = root;
        terminal.position.set(x, 0, 1.50);
        box(`hr3-v33-conv-terminal-body-${i}`, { width: .62, height: 1.05, depth: .48 }, v3(0, .62, 0), steel, terminal);
        box(`hr3-v33-conv-terminal-face-${i}`, { width: .47, height: .39, depth: .025 }, v3(0, .77, -.255), i === 1 ? pale : mat, terminal, true);
        refs.terminals.push(terminal);
      });
      refs.people = [
        person("hr3-v33-conv-person-a", root, -2.35, -1.75, soft),
        person("hr3-v33-conv-person-b", root, -.75, -2.10, mat),
        person("hr3-v33-conv-person-c", root, .85, -1.85, soft),
        person("hr3-v33-conv-person-d", root, 2.35, -1.55, mat)
      ];
    }

    if (ch.id === "ai") {
      refs.table = cylinder("hr3-v33-ai-table", { diameter: 3.15, height: .22, tessellation: 40 }, v3(0, .72, .05), steel, root);
      refs.core = sphere("hr3-v33-ai-core", .95, v3(0, 1.70, .05), mat, root, true);
      refs.beam = cylinder("hr3-v33-ai-beam", { height: 1.10, diameterTop: .18, diameterBottom: .70, tessellation: 28 }, v3(0, 1.19, .05), glass, root, true);
      refs.cubes = [
        box("hr3-v33-ai-cube-a", { width: .28, height: .28, depth: .28 }, v3(-1.05, 1.65, 0), pale, root, true),
        box("hr3-v33-ai-cube-b", { width: .24, height: .24, depth: .24 }, v3(.55, 2.20, .20), mat, root, true),
        box("hr3-v33-ai-cube-c", { width: .26, height: .26, depth: .26 }, v3(1.10, 1.55, -.15), pale, root, true)
      ];
      refs.people = [];
      const positions = [[-2.0,-.90],[-1.35,1.70],[0,2.15],[1.45,1.55],[2.05,-.75]];
      positions.forEach((p, i) => refs.people.push(person(`hr3-v33-ai-person-${i}`, root, p[0], p[1], i % 2 ? mat : soft)));
    }

    if (ch.id === "awards") {
      refs.stage = cylinder("hr3-v33-awards-stage", { diameter: 4.0, height: .28, tessellation: 44 }, v3(0, .18, .25), steel, root);
      refs.trophy = new BABYLON.TransformNode("hr3-v33-awards-trophy", scene);
      refs.trophy.parent = root;
      refs.trophy.position.set(0, .28, .15);
      cylinder("hr3-v33-awards-trophy-base", { diameter: .72, height: .18, tessellation: 28 }, v3(0, .10, 0), dark, refs.trophy);
      cylinder("hr3-v33-awards-trophy-stem", { diameter: .18, height: .70, tessellation: 20 }, v3(0, .51, 0), mat, refs.trophy, true);
      cylinder("hr3-v33-awards-trophy-cup", { diameterTop: .96, diameterBottom: .44, height: .72, tessellation: 32 }, v3(0, 1.03, 0), mat, refs.trophy, true);
      refs.spotL = cylinder("hr3-v33-awards-spot-l", { height: 3.5, diameterTop: .05, diameterBottom: 1.5, tessellation: 24 }, v3(-1.55, 2.35, .25), glass, root, true);
      refs.spotR = cylinder("hr3-v33-awards-spot-r", { height: 3.5, diameterTop: .05, diameterBottom: 1.5, tessellation: 24 }, v3(1.55, 2.35, .25), glass, root, true);
      refs.spotL.rotation.z = -.26;
      refs.spotR.rotation.z = .26;
      refs.people = [
        person("hr3-v33-awards-person-a", root, -2.25, -1.55, soft),
        person("hr3-v33-awards-person-b", root, -.85, -1.95, mat),
        person("hr3-v33-awards-person-c", root, .90, -1.90, soft),
        person("hr3-v33-awards-person-d", root, 2.25, -1.50, mat)
      ];
    }

    if (ch.id === "harmful") {
      refs.gate = gateFrame("hr3-v33-harm-gate", root, mat, 2.9, 2.65);
      refs.scanner = box("hr3-v33-harm-scan", { width: 2.55, height: .045, depth: .09 }, v3(0, 1.35, -.05), pale, root, true);
      refs.barrier = box("hr3-v33-harm-barrier", { width: 2.45, height: .10, depth: .12 }, v3(0, .92, .58), mat, root, true);
      refs.people = [
        person("hr3-v33-harm-person-a", root, -1.45, -2.00, soft, { helmet: true, helmetMat: mat }),
        person("hr3-v33-harm-person-b", root, -.48, -2.30, mat, { helmet: true, helmetMat: pale }),
        person("hr3-v33-harm-person-c", root, .48, -1.95, soft, { helmet: true, helmetMat: mat }),
        person("hr3-v33-harm-person-d", root, 1.45, -2.25, mat, { helmet: true, helmetMat: pale })
      ];
    }

    scenes.push({ ch, root, refs, phaseSeed: Math.random() * 5 });
  }

  let boardState = { id: null, phase: null };
  let time = 0;

  H.on("board:show", ({ ch, phase }) => { boardState = { id: ch?.id || null, phase: phase || null }; });
  H.on("board:hide", () => { boardState = { id: null, phase: null }; });

  function phaseFor(entry, delta) {
    if (boardState.id === entry.ch.id) return boardState.phase || "result";
    if (delta < 7) return "result";
    if (delta < 14) return "action";
    if (delta < 26) return "problem";
    return "idle";
  }

  function recruitment(entry, phase, dt) {
    const { people, scanner } = entry.refs;
    const progress = phase === "result" ? 1 : phase === "action" ? .48 : 0;
    people.forEach((p, i) => {
      const spreadX = [-1.45,-.65,.15,.95,1.55][i];
      const queueX = -.45 + (i % 2) * .90;
      const tx = BABYLON.Scalar.Lerp(spreadX, queueX, progress);
      const tz = phase === "result" ? .65 + i * .30 : BABYLON.Scalar.Lerp(-2.20 + (i % 3) * .28, -.75 - i * .34, progress);
      dampVec(p, v3(tx, Math.sin(time * 2 + i) * .015 * progress, tz), 4.5, dt);
    });
    scanner.visibility = phase === "idle" ? .12 : phase === "problem" ? .28 : .95;
    scanner.position.y = phase === "action" ? 1.1 + (Math.sin(time * 2.6) + 1) * .55 : phase === "result" ? 1.45 : 1.05;
  }

  function convergent(entry, phase, dt) {
    const { people, deskLight, terminals } = entry.refs;
    const radius = phase === "problem" ? 3.0 : phase === "action" ? 2.15 : phase === "result" ? 1.72 : 3.25;
    people.forEach((p, i) => {
      const a = -.85 + i * .58;
      const tx = Math.sin(a) * radius;
      const tz = -.35 - Math.cos(a) * radius * .56;
      dampVec(p, v3(tx, 0, tz), 4.2, dt);
      p.rotation.y = damp(p.rotation.y, -a * .35, 4, dt);
    });
    terminals.forEach((t, i) => {
      const targetZ = phase === "problem" ? 1.82 : 1.45;
      t.position.z = damp(t.position.z, targetZ, 4, dt);
      t.scaling.setAll(damp(t.scaling.x, phase === "idle" ? .72 : 1, 4, dt));
    });
    deskLight.scaling.setAll(damp(deskLight.scaling.x, phase === "result" ? 1.08 : .92, 4, dt));
  }

  function ai(entry, phase, dt) {
    const { core, beam, cubes, people } = entry.refs;
    const targetCore = phase === "result" ? 1.18 : phase === "action" ? .92 : phase === "problem" ? .58 : .42;
    core.scaling.setAll(damp(core.scaling.x, targetCore, 5, dt));
    beam.visibility = phase === "idle" ? .06 : phase === "problem" ? .16 : phase === "action" ? .48 : .72;
    cubes.forEach((cube, i) => {
      const a = time * (phase === "result" ? .72 : .36) + i * 2.08;
      const r = phase === "problem" ? 1.85 : phase === "action" ? 1.35 : 1.18;
      cube.position.x = damp(cube.position.x, Math.cos(a) * r, 4, dt);
      cube.position.z = damp(cube.position.z, .05 + Math.sin(a) * r * .62, 4, dt);
      cube.position.y = damp(cube.position.y, 1.75 + Math.sin(a * 1.5) * .42, 4, dt);
      cube.rotation.y += dt * (.35 + i * .08);
    });
    people.forEach((p, i) => {
      const a = i / people.length * Math.PI * 2 + .35;
      const r = phase === "problem" ? 2.75 : 2.20;
      dampVec(p, v3(Math.cos(a) * r, 0, .05 + Math.sin(a) * r * .76), 4, dt);
      p.rotation.y = -a + Math.PI / 2;
    });
  }

  function awards(entry, phase, dt) {
    const { trophy, spotL, spotR, people } = entry.refs;
    const y = phase === "result" ? .72 : phase === "action" ? .46 : .28;
    trophy.position.y = damp(trophy.position.y, y, 4.2, dt);
    const s = phase === "result" ? 1.12 : phase === "action" ? .92 : .72;
    trophy.scaling.setAll(damp(trophy.scaling.x, s, 4.5, dt));
    const spot = phase === "result" ? .52 : phase === "action" ? .30 : .08;
    spotL.visibility = damp(spotL.visibility, spot, 4, dt);
    spotR.visibility = damp(spotR.visibility, spot, 4, dt);
    people.forEach((p, i) => {
      const tx = [-2.0,-.75,.75,2.0][i];
      const tz = phase === "result" ? -1.45 : -1.85;
      dampVec(p, v3(tx, 0, tz), 4, dt);
    });
  }

  function harmful(entry, phase, dt) {
    const { people, scanner, barrier } = entry.refs;
    const pass = phase === "result" ? 1 : phase === "action" ? .42 : 0;
    people.forEach((p, i) => {
      const tx = [-1.2,-.40,.40,1.2][i];
      const tz = phase === "result" ? .65 + i * .34 : BABYLON.Scalar.Lerp(-2.15 - (i % 2) * .20, -.75 - i * .30, pass);
      dampVec(p, v3(tx, 0, tz), 4.5, dt);
    });
    scanner.visibility = phase === "idle" ? .08 : phase === "problem" ? .22 : .92;
    scanner.position.y = phase === "action" ? 1.0 + (Math.sin(time * 3.0) + 1) * .68 : phase === "result" ? 1.48 : 1.05;
    barrier.rotation.z = damp(barrier.rotation.z, phase === "result" ? -1.05 : phase === "action" ? -.45 : 0, 4.5, dt);
  }

  H.registerUpdate(dt => {
    time += dt;
    if (!state.running) return;

    scenes.forEach(entry => {
      const delta = Math.abs(state.routeDistance - entry.ch.d);
      const targetScale = delta < 29 ? 1 : delta < 47 ? .36 : .001;
      const next = damp(entry.root.scaling.x, targetScale, 5, dt);
      entry.root.scaling.setAll(next);
      const phase = phaseFor(entry, delta);

      if (entry.ch.id === "recruitment") recruitment(entry, phase, dt);
      if (entry.ch.id === "convergent") convergent(entry, phase, dt);
      if (entry.ch.id === "ai") ai(entry, phase, dt);
      if (entry.ch.id === "awards") awards(entry, phase, dt);
      if (entry.ch.id === "harmful") harmful(entry, phase, dt);
    });
  });

  H.processScenes = { scenes, version: "3.3.0" };
})();