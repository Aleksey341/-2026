(() => {
  const H = window.HR3;
  if (!H?.scene || !H?.route) return;
  const { scene, glow, state, route, data } = H;

  function pbr(name, hex, emissive = 0, metallic = .24, roughness = .34, alpha = 1) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(emissive);
    m.metallic = metallic;
    m.roughness = roughness;
    m.alpha = alpha;
    if (alpha < 1) {
      m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      m.backFaceCulling = false;
    }
    return m;
  }

  const M = {
    dark: pbr("hr3-v34-dark", "#050b12", .01, .62, .28),
    steel: pbr("hr3-v34-steel", "#162633", .02, .72, .22),
    glass: pbr("hr3-v34-glass", "#9be9ff", .08, .08, .10, .22),
    cyan: pbr("hr3-v34-cyan", "#58ddff", .78, .08, .18),
    teal: pbr("hr3-v34-teal", "#62e4bb", .76, .08, .18),
    violet: pbr("hr3-v34-violet", "#bd9fff", .80, .08, .17),
    amber: pbr("hr3-v34-amber", "#ffd06f", .80, .08, .18),
    red: pbr("hr3-v34-red", "#ff5570", .76, .08, .18),
    white: pbr("hr3-v34-white", "#eefcff", .56, .06, .18),
    safety: pbr("hr3-v34-safety", "#f2b84a", .16, .28, .30),
    concrete: pbr("hr3-v34-concrete", "#24313a", .01, .10, .72)
  };

  function glowMesh(mesh) { glow.addIncludedOnlyMesh(mesh); return mesh; }
  function box(name, size, pos, mat, parent = null, glowIt = false) {
    const m = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    m.isPickable = false;
    return glowIt ? glowMesh(m) : m;
  }
  function cyl(name, options, pos, mat, parent = null, glowIt = false) {
    const m = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    m.isPickable = false;
    return glowIt ? glowMesh(m) : m;
  }
  function sphere(name, diameter, pos, mat, parent = null, glowIt = false) {
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    m.isPickable = false;
    return glowIt ? glowMesh(m) : m;
  }
  function rootAt(name, d, side = 0) {
    const root = new BABYLON.TransformNode(name, scene);
    root.position.set(route.pathX(d) + side, 0, d);
    root.rotation.y = route.pathAngle(d);
    return root;
  }

  // Retire most repeated rings from the previous route build. Keep only a few
  // framing moments so the road reads as districts rather than one long tunnel.
  const tunnel = scene.meshes.filter(m => m.name.startsWith("hr3-tunnel-"));
  tunnel.forEach((m, i) => m.setEnabled(i === 0 || i === 4 || i === tunnel.length - 1));
  const futureRings = scene.meshes.filter(m => m.name.startsWith("hr3-future-ring-"));
  futureRings.forEach((m, i) => m.setEnabled(i === 0 || i === 3 || i === futureRings.length - 1));

  const districtRoots = [];

  // 01 · Entry / recruitment district — airport-like arrival architecture.
  for (let d = 24, i = 0; d <= 70; d += 11, i++) {
    const r = rootAt(`hr3-v34-entry-${i}`, d);
    districtRoots.push(r);
    [-1, 1].forEach(side => {
      const x = side * 8.4;
      box(`hr3-v34-entry-pier-${i}-${side}`, { width:.42, height:3.2, depth:.42 }, new BABYLON.Vector3(x,1.6,0), M.steel, r);
      box(`hr3-v34-entry-light-${i}-${side}`, { width:.07, height:2.25, depth:.08 }, new BABYLON.Vector3(x - side*.24,1.55,-.22), M.cyan, r, true);
      const canopy = box(`hr3-v34-entry-canopy-${i}-${side}`, { width:4.0, height:.13, depth:2.8 }, new BABYLON.Vector3(side*10.1,3.0,0), M.glass, r);
      canopy.rotation.z = side * .08;
    });
    if (i % 2 === 0) box(`hr3-v34-entry-roadwash-${i}`, { width:8.4, height:.018, depth:2.4 }, new BABYLON.Vector3(0,.085,0), M.cyan, r, true).visibility = .14;
  }

  // 02 · Service district — calm glass pavilions and customer-service bays.
  for (let d = 82, i = 0; d <= 124; d += 14, i++) {
    const r = rootAt(`hr3-v34-service-${i}`, d);
    districtRoots.push(r);
    [-1, 1].forEach(side => {
      const pavilion = box(`hr3-v34-service-box-${i}-${side}`, { width:4.4, height:2.15, depth:4.2 }, new BABYLON.Vector3(side*11.0,1.08,0), M.glass, r);
      pavilion.visibility = .44;
      box(`hr3-v34-service-roof-${i}-${side}`, { width:4.8, height:.12, depth:4.5 }, new BABYLON.Vector3(side*11.0,2.22,0), M.steel, r);
      const desk = box(`hr3-v34-service-desk-${i}-${side}`, { width:2.5, height:.76, depth:.66 }, new BABYLON.Vector3(side*9.85,.46,-.55), M.concrete, r);
      desk.rotation.y = side * .08;
      box(`hr3-v34-service-desk-light-${i}-${side}`, { width:2.1, height:.04, depth:.07 }, new BABYLON.Vector3(side*9.85,.86,-.90), M.teal, r, true);
      cyl(`hr3-v34-service-lamp-${i}-${side}`, { diameter:.42, height:2.7, tessellation:18 }, new BABYLON.Vector3(side*7.2,1.35,1.3), M.steel, r);
      sphere(`hr3-v34-service-lampglow-${i}-${side}`, .32, new BABYLON.Vector3(side*7.2,2.55,1.3), M.teal, r, true);
    });
  }

  // 03 · AI district — recognizable research campus, not a KPI/data sculpture.
  for (let d = 137, i = 0; d <= 178; d += 13.5, i++) {
    const r = rootAt(`hr3-v34-ai-campus-${i}`, d);
    districtRoots.push(r);
    [-1, 1].forEach(side => {
      const baseX = side * 10.7;
      const lab = cyl(`hr3-v34-ai-lab-${i}-${side}`, { diameter:4.6, height:1.35, tessellation:10 }, new BABYLON.Vector3(baseX,.72,0), M.dark, r);
      lab.scaling.z = .72;
      const roof = cyl(`hr3-v34-ai-roof-${i}-${side}`, { diameter:4.15, height:.10, tessellation:10 }, new BABYLON.Vector3(baseX,1.45,0), M.violet, r, true);
      roof.scaling.z = .72;
      const mast = cyl(`hr3-v34-ai-mast-${i}-${side}`, { diameter:.16, height:3.2, tessellation:12 }, new BABYLON.Vector3(baseX,3.02,.2), M.steel, r);
      const orb = sphere(`hr3-v34-ai-orb-${i}-${side}`, .42, new BABYLON.Vector3(baseX,4.55,.2), i % 2 ? M.white : M.violet, r, true);
      orb.visibility = .82;
      for (let k = -1; k <= 1; k++) {
        const panel = box(`hr3-v34-ai-panel-${i}-${side}-${k}`, { width:.72, height:1.15, depth:.06 }, new BABYLON.Vector3(baseX + side*2.6,k*.03+.78,k*.92), M.glass, r);
        panel.rotation.y = side * -.18;
      }
    });
    if (i === 1) {
      const bridge = box("hr3-v34-ai-skybridge", { width:12.8, height:.30, depth:.72 }, new BABYLON.Vector3(0,4.25,0), M.glass, r);
      bridge.visibility = .55;
      box("hr3-v34-ai-skybridge-line", { width:11.8, height:.055, depth:.08 }, new BABYLON.Vector3(0,4.25,-.42), M.violet, r, true);
    }
  }

  // 04 · Awards district — open ceremonial boulevard with warm light.
  for (let d = 191, i = 0; d <= 228; d += 12.5, i++) {
    const r = rootAt(`hr3-v34-awards-boulevard-${i}`, d);
    districtRoots.push(r);
    [-1, 1].forEach(side => {
      const x = side * 8.1;
      cyl(`hr3-v34-awards-column-${i}-${side}`, { diameter:.65, height:4.3, tessellation:24 }, new BABYLON.Vector3(x,2.15,0), M.concrete, r);
      cyl(`hr3-v34-awards-cap-${i}-${side}`, { diameter:1.05, height:.16, tessellation:24 }, new BABYLON.Vector3(x,4.36,0), M.amber, r, true);
      const beam = cyl(`hr3-v34-awards-beam-${i}-${side}`, { height:5.5, diameterTop:.05, diameterBottom:1.6, tessellation:24 }, new BABYLON.Vector3(x,4.8,0), M.glass, r, true);
      beam.rotation.z = side * .22;
      beam.visibility = .14;
    });
    const carpet = box(`hr3-v34-awards-roadwash-${i}`, { width:7.0, height:.018, depth:4.8 }, new BABYLON.Vector3(0,.088,0), M.amber, r, true);
    carpet.visibility = .10;
  }

  // 05 · Safety / harmful-conditions district — industrial geometry and controlled access.
  for (let d = 239, i = 0; d <= 279; d += 10, i++) {
    const r = rootAt(`hr3-v34-safety-${i}`, d);
    districtRoots.push(r);
    [-1, 1].forEach(side => {
      const x = side * 10.2;
      cyl(`hr3-v34-safety-stack-${i}-${side}`, { diameter:1.1, height:4.2 + (i%2)*1.1, tessellation:16 }, new BABYLON.Vector3(x,2.1+(i%2)*.55,0), M.steel, r);
      cyl(`hr3-v34-safety-cap-${i}-${side}`, { diameter:1.38, height:.18, tessellation:16 }, new BABYLON.Vector3(x,4.26+(i%2)*1.1,0), M.red, r, true);
      const rail = box(`hr3-v34-safety-rail-${i}-${side}`, { width:3.8, height:.18, depth:.18 }, new BABYLON.Vector3(side*7.3,.85,0), M.safety, r);
      rail.rotation.z = side * .05;
      box(`hr3-v34-safety-lamp-${i}-${side}`, { width:.12, height:2.0, depth:.12 }, new BABYLON.Vector3(side*6.1,1.0,1.4), M.steel, r);
      sphere(`hr3-v34-safety-lamphead-${i}-${side}`, .28, new BABYLON.Vector3(side*6.1,2.05,1.4), i%2 ? M.red : M.white, r, true);
    });
    if (i % 2 === 0) {
      for (let s = -1; s <= 1; s += 2) {
        for (let k = 0; k < 3; k++) {
          const stripe = box(`hr3-v34-safety-stripe-${i}-${s}-${k}`, { width:.16, height:.022, depth:2.5 }, new BABYLON.Vector3(s*(4.45-k*.28),.095,0), k%2 ? M.dark : M.safety, r);
          stripe.rotation.y = .35;
        }
      }
    }
  }

  // Sparse transition to 2027 — broad open space, no additional repeated tunnel.
  for (let d = 286, i = 0; d <= 306; d += 10, i++) {
    const r = rootAt(`hr3-v34-future-approach-${i}`, d);
    districtRoots.push(r);
    [-1, 1].forEach(side => {
      const x = side * (9.3 + i * .7);
      box(`hr3-v34-future-monolith-${i}-${side}`, { width:.7, height:5.5 + i*1.2, depth:1.2 }, new BABYLON.Vector3(x,2.75+i*.6,0), M.dark, r);
      box(`hr3-v34-future-cut-${i}-${side}`, { width:.09, height:4.5+i*.9, depth:1.24 }, new BABYLON.Vector3(x-side*.22,2.8+i*.55,-.03), i%2 ? M.violet : M.white, r, true);
    });
  }

  const palettes = [
    { d:0,   clear:"#02050d", fog:"#071625", density:.0025, glow:.80 },
    { d:76,  clear:"#03100f", fog:"#0b2420", density:.0027, glow:.72 },
    { d:132, clear:"#080514", fog:"#1a1030", density:.0029, glow:.86 },
    { d:186, clear:"#120a05", fog:"#2b1d10", density:.0024, glow:.76 },
    { d:233, clear:"#100709", fog:"#2a1015", density:.0030, glow:.73 },
    { d:284, clear:"#090411", fog:"#24103b", density:.0035, glow:.88 }
  ].map(p => ({ ...p, clearC: BABYLON.Color3.FromHexString(p.clear), fogC: BABYLON.Color3.FromHexString(p.fog) }));

  function paletteAt(d) {
    let a = palettes[0], b = palettes[palettes.length - 1];
    for (let i = 0; i < palettes.length - 1; i++) {
      if (d >= palettes[i].d && d <= palettes[i + 1].d) { a = palettes[i]; b = palettes[i + 1]; break; }
    }
    const span = Math.max(1, b.d - a.d);
    const t = BABYLON.Scalar.Clamp((d - a.d) / span, 0, 1);
    return { a, b, t };
  }

  let time = 0;
  H.registerUpdate(dt => {
    time += dt;
    if (!state.running) return;
    const d = state.routeDistance || 0;
    const { a, b, t } = paletteAt(d);
    scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.Lerp(a.clearC, b.clearC, t), 1);
    scene.fogColor = BABYLON.Color3.Lerp(a.fogC, b.fogC, t);
    scene.fogDensity = BABYLON.Scalar.Lerp(a.density, b.density, t);
    glow.intensity = BABYLON.Scalar.Lerp(a.glow, b.glow, t);

    // Gentle architectural life; no semantic numbers are encoded in motion.
    scene.meshes.forEach(m => {
      if (m.name.startsWith("hr3-v34-ai-orb-")) m.position.y += Math.sin(time*1.25 + m.uniqueId*.07) * .0009;
      if (m.name.startsWith("hr3-v34-awards-beam-")) m.visibility = .10 + (Math.sin(time*.8 + m.uniqueId*.1)+1)*.035;
    });
  });

  H.districtWorld = { version:"3.4.0", roots: districtRoots, palettes };
})();
