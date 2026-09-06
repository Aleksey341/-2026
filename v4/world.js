(() => {
  const H = window.HR4; if(!H) return;
  const { scene, glow, data } = H;
  const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
  function mat(name,hex,em=.0,metal=.28,rough=.34,alpha=1){
    const m=new BABYLON.PBRMaterial(name,scene); m.albedoColor=BABYLON.Color3.FromHexString(hex); m.emissiveColor=m.albedoColor.scale(em); m.metallic=metal; m.roughness=rough; m.alpha=alpha;
    if(alpha<1){m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;m.backFaceCulling=false;} return m;
  }
  const M={floor:mat('hr4-floor','#11181f',.01,.62,.24),wall:mat('hr4-wall','#1b252d',.01,.35,.42),dark:mat('hr4-dark','#070b10',.005,.5,.28),glass:mat('hr4-glass','#b8eaff',.05,.08,.12,.18),white:mat('hr4-white','#edf8fc',.38,.08,.18),cyan:mat('hr4-cyan','#7fe4ff',.72,.08,.16),teal:mat('hr4-teal','#77e4c5',.62,.08,.18),violet:mat('hr4-violet','#b9a8ff',.68,.08,.16),gold:mat('hr4-gold','#f3d28a',.58,.18,.22),red:mat('hr4-red','#ff7f91',.62,.08,.18),amber:mat('hr4-amber','#efb858',.36,.18,.28)};
  const glowIt=m=>{glow.addIncludedOnlyMesh(m);return m;};
  function box(name,size,pos,material,parent=null,g=false){const m=BABYLON.MeshBuilder.CreateBox(name,size,scene);m.position.copyFrom(pos);m.material=material;m.parent=parent;m.isPickable=false;return g?glowIt(m):m;}
  function cyl(name,opt,pos,material,parent=null,g=false){const m=BABYLON.MeshBuilder.CreateCylinder(name,opt,scene);m.position.copyFrom(pos);m.material=material;m.parent=parent;m.isPickable=false;return g?glowIt(m):m;}
  function sphere(name,d,pos,material,parent=null,g=false){const m=BABYLON.MeshBuilder.CreateSphere(name,{diameter:d,segments:16},scene);m.position.copyFrom(pos);m.material=material;m.parent=parent;m.isPickable=false;return g?glowIt(m):m;}
  function person(name,parent,x,z,material,helmet=false){const r=new BABYLON.TransformNode(name,scene);r.parent=parent;r.position.set(x,0,z);cyl(name+'-body',{height:.9,diameterTop:.31,diameterBottom:.43,tessellation:12},V(0,.72,0),material,r);sphere(name+'-head',.27,V(0,1.31,0),material,r);if(helmet)cyl(name+'-helmet',{height:.11,diameter:.34,tessellation:18},V(0,1.46,0),M.amber,r,true);return r;}

  // Atrium and central gallery.
  box('hr4-atrium-floor',{width:18,height:.16,depth:13},V(0,-.08,1.5),M.floor);
  box('hr4-gallery-floor',{width:7.2,height:.12,depth:78},V(0,-.06,39),M.floor);
  for(let z=4;z<=76;z+=4){const strip=box('hr4-floor-line-'+z,{width:.035,height:.018,depth:2.6},V(0,.015,z),M.white,null,true);strip.visibility=.25;}
  for(const side of [-1,1]){
    box('hr4-atrium-wall-'+side,{width:.3,height:7.5,depth:12.5},V(side*8.8,3.75,1.8),M.wall);
    for(let z=8;z<=73;z+=8){box(`hr4-gallery-pier-${side}-${z}`,{width:.28,height:5.4,depth:.42},V(side*4.9,2.7,z),M.wall);box(`hr4-gallery-light-${side}-${z}`,{width:.035,height:3.6,depth:.08},V(side*4.73,2.7,z-.18),M.white,null,true).visibility=.32;}
  }
  const core=cyl('hr4-atrium-core',{diameter:2.7,height:7.4,tessellation:36},V(0,3.7,1.5),M.glass);core.visibility=.38;
  cyl('hr4-atrium-core-inner',{diameter:.62,height:7.7,tessellation:28},V(0,3.85,1.5),M.cyan,null,true).visibility=.48;
  const ring=cyl('hr4-atrium-ring',{diameter:6.8,height:.12,tessellation:48},V(0,6.8,1.5),M.white,null,true);ring.scaling.z=.74;ring.visibility=.35;

  const targets={};
  const roomRoots={};
  const accentFor=id=>id==='recruitment'?M.cyan:id==='convergent'?M.teal:id==='ai'?M.violet:id==='awards'?M.gold:id==='harmful'?M.red:M.white;

  for(const section of data.sections){
    const {x,z}=section.room; const side=Math.sign(x); const root=new BABYLON.TransformNode('hr4-room-'+section.id,scene);root.position.set(x,0,z);roomRoots[section.id]=root;
    const accent=accentFor(section.id);
    if(section.final){
      box('hr4-future-floor',{width:15,height:.15,depth:11},V(0,-.07,0),M.white,root).visibility=.85;
      for(const s of [-1,1]){box('hr4-future-monolith-'+s,{width:1.0,height:7.5,depth:1.7},V(s*5.2,3.75,1.1),M.dark,root);box('hr4-future-cut-'+s,{width:.08,height:5.8,depth:1.74},V(s*4.72,3.75,1.1),M.violet,root,true);}
      const arch=cyl('hr4-future-arch',{diameter:7.5,height:.24,tessellation:64},V(0,4.0,1),M.violet,root,true);arch.rotation.x=Math.PI/2;arch.scaling.y=.56;
      targets[section.id]=V(0,0,z-2.4);continue;
    }
    // Branch floor and glass room shell.
    box('hr4-branch-'+section.id,{width:Math.abs(x)*2,height:.10,depth:4.8},V(-x/2,-.05,0),M.floor,root);
    box('hr4-room-floor-'+section.id,{width:10.5,height:.14,depth:9.2},V(0,-.07,0),M.floor,root);
    box('hr4-room-back-'+section.id,{width:10.5,height:5.8,depth:.22},V(0,2.9,4.55),M.wall,root);
    for(const s of [-1,1]){box(`hr4-room-side-${section.id}-${s}`,{width:.22,height:5.8,depth:9.0},V(s*5.15,2.9,0),M.glass,root).visibility=.42;box(`hr4-room-edge-${section.id}-${s}`,{width:.035,height:4.1,depth:.08},V(s*5.02,2.85,-4.0),accent,root,true);}
    box('hr4-room-ceiling-'+section.id,{width:9.8,height:.12,depth:8.4},V(0,5.7,0),M.dark,root);
    box('hr4-room-light-'+section.id,{width:5.8,height:.035,depth:.18},V(0,5.58,.5),accent,root,true).visibility=.55;

    if(section.id==='recruitment'){
      for(const s of [-1,1]) box('hr4-rec-gate-'+s,{width:.16,height:2.6,depth:.25},V(s*1.25,1.3,.6),M.wall,root);
      box('hr4-rec-gate-top',{width:2.65,height:.16,depth:.25},V(0,2.58,.6),accent,root,true);
      box('hr4-rec-scan',{width:2.2,height:.035,depth:.08},V(0,1.3,.43),accent,root,true);
      [-2.4,-1.35,-.25,.9,2.1].forEach((px,i)=>person('hr4-rec-person-'+i,root,px,-2.3-(i%2)*.45,i%2?M.wall:M.white));
    } else if(section.id==='convergent'){
      const desk=cyl('hr4-conv-desk',{diameter:3.1,height:.8,tessellation:36},V(0,.4,.4),M.wall,root);desk.scaling.z=.68;
      cyl('hr4-conv-desk-light',{diameter:2.7,height:.035,tessellation:36},V(0,.82,.4),accent,root,true).scaling.z=.68;
      for(let i=-1;i<=1;i++){box('hr4-conv-terminal-'+i,{width:.8,height:1.35,depth:.55},V(i*2.25,.72,2.6),M.wall,root);box('hr4-conv-screen-'+i,{width:.56,height:.42,depth:.025},V(i*2.25,.92,2.31),accent,root,true);}
      [-2.2,-.8,.8,2.1].forEach((px,i)=>person('hr4-conv-person-'+i,root,px,-2.4+(i%2)*.25,i%2?M.teal:M.wall));
    } else if(section.id==='ai'){
      const table=cyl('hr4-ai-table',{diameter:4.2,height:.28,tessellation:42},V(0,.72,.6),M.wall,root);table.scaling.z=.72;
      sphere('hr4-ai-core',1.0,V(0,2.15,.6),accent,root,true);
      cyl('hr4-ai-beam',{height:1.5,diameterTop:.12,diameterBottom:.9,tessellation:24},V(0,1.35,.6),M.glass,root,true).visibility=.28;
      [[-2.4,-.4],[-1.5,2],[0,2.8],[1.7,1.8],[2.5,-.5]].forEach((p,i)=>person('hr4-ai-person-'+i,root,p[0],p[1],i%2?M.violet:M.wall));
    } else if(section.id==='awards'){
      const stage=cyl('hr4-award-stage',{diameter:4.8,height:.32,tessellation:48},V(0,.16,.8),M.wall,root);
      cyl('hr4-award-base',{diameter:.75,height:.2,tessellation:26},V(0,.4,.8),M.dark,root);
      cyl('hr4-award-stem',{diameter:.18,height:.72,tessellation:20},V(0,.85,.8),accent,root,true);
      cyl('hr4-award-cup',{diameterTop:1.0,diameterBottom:.46,height:.76,tessellation:30},V(0,1.56,.8),accent,root,true);
      [-2.6,-1.25,1.25,2.6].forEach((px,i)=>person('hr4-award-person-'+i,root,px,-2.2,i%2?M.gold:M.wall));
    } else if(section.id==='harmful'){
      for(const s of [-1,1]) box('hr4-safe-gate-'+s,{width:.18,height:2.8,depth:.26},V(s*1.45,1.4,.8),M.wall,root);
      box('hr4-safe-gate-top',{width:3.05,height:.18,depth:.26},V(0,2.78,.8),accent,root,true);
      box('hr4-safe-scan',{width:2.65,height:.04,depth:.08},V(0,1.45,.58),M.white,root,true);
      [-2.2,-.75,.75,2.2].forEach((px,i)=>person('hr4-safe-person-'+i,root,px,-2.25,i%2?M.red:M.wall,true));
    }
    targets[section.id]=V(x*.58,0,z);
  }

  H.world={targets,roomRoots,materials:M};
})();