import * as T from 'room-module/vendor/three.module.js';
import {assetURL} from 'room-module/src/assets.js';
import {plate,showcase,markProject,animateShowcase,energyReactor,energyPipe,shutter} from 'room-module/src/retro.js';

export async function makeReactorRoom(scene,config){
 const {width:W,depth:D,height:H,centerZ:Z,themes}=config;
 const group=new T.Group();group.visible=false;scene.add(group);
 const mat=(color,roughness=.65,metalness=.15)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const dark=mat('#030407',.16,.8),stone=mat('#080a0e',.2,.7),trim=mat('#57432b',.25,.75);
 function box(w,h,d,m,x,y,z){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;group.add(o);return o;}
 box(W,.12,D,stone,0,-.06,Z);box(W,.08,D,dark,0,H+.04,Z);
 const textures={};for(const [key,path] of Object.entries(config.textures||{})){const t=await new T.TextureLoader().loadAsync(assetURL(path));t.colorSpace=T.SRGBColorSpace;textures[key]=t;}
 const roof=new T.Mesh(new T.PlaneGeometry(W,D),mat('#101217',.28,.76));roof.rotation.x=Math.PI/2;roof.position.set(0,H-.085,Z);group.add(roof);
 const ceilingPanels=new T.Group();group.add(ceilingPanels);const cols=8,rows=6,panelMats=['#191b21','#202127','#181a20'];
 for(let ix=0;ix<cols;ix++)for(let iz=0;iz<rows;iz++){const panel=new T.Mesh(new T.BoxGeometry(W/cols-.035,.042,D/rows-.035),mat(panelMats[(ix+iz)%panelMats.length],.26,.78));panel.position.set(-W/2+(ix+.5)*W/cols,H-.045,Z-D/2+(iz+.5)*D/rows);ceilingPanels.add(panel);}
 const stripMat=new T.MeshStandardMaterial({color:'#d8d9e6',emissive:'#a7b7ff',emissiveIntensity:1.25,roughness:.22,metalness:.28});
 for(const x of [-W*.34,-W*.17,0,W*.17,W*.34]){const strip=new T.Mesh(new T.BoxGeometry(.018,.007,D-.7),stripMat);strip.position.set(x,H-.016,Z);ceilingPanels.add(strip);}
 box(.24,H,D,dark,-W/2,H/2,Z);
 box(W,H,.24,dark,0,H/2,Z+D/2);box(W,H,.24,dark,0,H/2,Z-D/2);
 const gate={g:new T.Group(),door:new T.Group(),open:false,progress:0,leaves:[]};gate.g.add(gate.door);
 function liftBox(w,h,d,x,y,z,color,parent=gate.g){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color,.4,.6));o.position.set(x,y,z);parent.add(o);return o;}
 for(const side of [-1,1]){const leaf=liftBox(1.72,3.38,.08,side*.865,1.69,0,'#8f929c',gate.door);gate.leaves.push(leaf);liftBox(.16,3.5,.3,side*1.83,1.75,0,'#52415f');liftBox(.025,3.36,.035,side*1.74,1.68,.12,'#d4b1ff');}
 liftBox(3.8,.16,.3,0,3.47,0,'#52415f');gate.behind=liftBox(3.5,3.4,.05,0,1.7,-1.1,'#9c91a6');gate.behind.visible=false;
 for(const side of [-1,1])liftBox(.05,3.4,1.1,side*1.73,1.7,-.55,'#6b6976');liftBox(3.5,.04,1.1,0,.01,-.55,'#d2cbd5');
 const gateWidth=config.gateWidth,gateHeight=config.gateHeight,gateZ=Z+3;
 gate.g.scale.set(gateWidth/3.5,gateHeight/3.452,1);gate.g.rotation.y=-Math.PI/2;gate.g.position.set(W/2-.15,0,gateZ);group.add(gate.g);
 for(const [lo,hi] of [[Z-D/2,gateZ-gateWidth/2],[gateZ+gateWidth/2,Z+D/2]])box(.24,H,hi-lo,dark,W/2,H/2,(lo+hi)/2);
 box(.24,H-gateHeight,gateWidth,dark,W/2,(H+gateHeight)/2,gateZ);


 // Approved floor artwork sampled directly without rescaling its source pixels.
 const ft=textures.approved.clone();ft.repeat.set((989-166)/1156,(1325-494)/1360);ft.offset.set(166/1156,1-1325/1360);ft.needsUpdate=true;
 const floorArt=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshStandardMaterial({map:ft,roughness:.57,metalness:.25}));floorArt.rotation.x=-Math.PI/2;floorArt.position.set(0,.006,Z);group.add(floorArt);
 function wallArt(tex,w,h,x,y,z,angle=0,u0=0,u1=1,v0=0,v1=1){
 const geo=new T.PlaneGeometry(w,h),uv=geo.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,u0+uv.getX(k)*(u1-u0),v0+uv.getY(k)*(v1-v0));
 const m=new T.MeshStandardMaterial({map:tex,color:'#ffffff',roughness:.55,metalness:.2,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.32});const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.rotation.y=angle;group.add(o);return o;}
 const mw=Math.min(W,H*3);wallArt(textures.mapWall,mw,H,0,H/2,Z-D/2+.135);
 for(const side of [-1,1])if(W>mw)wallArt(textures.sideWall,(W-mw)/2,H,side*(mw/2+(W-mw)/4),H/2,Z-D/2+.135,0,side<0?0:.9,side<0?.1:1);
 wallArt(textures.sideWall,D,H,-W/2+.135,H/2,Z,Math.PI/2);
 wallArt(textures.sideWall,W,H,0,H/2,Z+D/2-.135,Math.PI);
 const leftLen=Z+D/2-(gateZ+gateWidth/2),rightLen=gateZ-gateWidth/2-(Z-D/2);
 wallArt(textures.entryWall,leftLen,H,W/2-.135,H/2,gateZ+gateWidth/2+leftLen/2,-Math.PI/2,0,.417);
 wallArt(textures.entryWall,rightLen,H,W/2-.135,H/2,gateZ-gateWidth/2-rightLen/2,-Math.PI/2,.583,1);
 wallArt(textures.sideWall,gateWidth,H-gateHeight,W/2-.135,(H+gateHeight)/2,gateZ,-Math.PI/2,.4,.6,.88,1);
 const reactor=energyReactor(themes.map(t=>t.color));reactor.g.position.set(0,0,Z);group.add(reactor.g);
 const positions=[[-6,Z-1.4],[-3.5,Z-5],[3.5,Z-5],[6,Z-1.4]],pods=[],pipes=[],done=new Set(),projects=themes.map(()=>new Set());
 positions.forEach(([x,z],i)=>{const p=showcase(i,themes[i]);p.g.position.set(x,0,z);p.g.rotation.y=Math.atan2(-x,Z+8-z);group.add(p.g);pods.push(p);const base=p.g.children.find(o=>o.geometry?.type==='CylinderGeometry'&&Math.abs(o.position.y-.34)<.01);if(base&&textures.base){const m=base.material.clone();m.color.set('#ffffff');m.map=textures.base;m.metalness=.3;m.roughness=.65;base.material=[m,base.material,base.material];}const pipe=energyPipe(new T.Vector3(x,.14,z),new T.Vector3(0,.14,Z),themes[i].color);pipes.push(pipe);group.add(pipe.g);});
 gate.behind.material=new T.MeshStandardMaterial({color:'#9c91a6',roughness:.45,metalness:.5});
 const liftSign=plate('ЛИФТ / ОФИС БУДУЩЕГО',3.1,.43);liftSign.position.set(0,3.48,.15);gate.g.add(liftSign);

 // Soft layered ribbon follows the floor from the original R11 reactor to the lift.
 const guide=new T.Group();group.add(guide);let guideOpacity=0;
 const guideCurve=new T.CatmullRomCurve3([new T.Vector3(1.55,.022,Z+.35),new T.Vector3(3.1,.022,Z+1.2),new T.Vector3(W/2-3,.022,gateZ),new T.Vector3(W/2-.28,.022,gateZ)]);
 for(const [width,opacity] of [[.55,.035],[.32,.07],[.16,.15],[.055,.4]]){
  const vertices=[],indices=[];for(let i=0;i<=64;i++){const c=guideCurve.getPoint(i/64),d=guideCurve.getTangent(i/64),n=new T.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width/2);vertices.push(c.x+n.x,c.y,c.z+n.z,c.x-n.x,c.y,c.z-n.z);if(i<64){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);const material=new T.MeshBasicMaterial({color:'#b6b0ff',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});const mesh=new T.Mesh(geo,material);mesh.userData.opacity=opacity;guide.add(mesh);
 }
 function reactorFilled(){return done.size===4&&reactor.fills.every(f=>f.scale.y>=.985);}
 function updateGuide(dt,time){guideOpacity=T.MathUtils.damp(guideOpacity,reactorFilled()?1:0,2,dt);guide.visible=guideOpacity>.001;guide.children.forEach(m=>m.material.opacity=m.userData.opacity*guideOpacity*(.94+.06*Math.sin(time*1.5)));}
 const lamps=[];group.add(new T.HemisphereLight('#d8def3','#4a4050',.8));const broad=new T.DirectionalLight('#e4deff',.8);broad.position.set(-3,H,4);group.add(broad);lamps.push(broad);
 function completeProject(i,j){if(!themes[i]?.cards[j]||projects[i].has(j))return;projects[i].add(j);pods[i].fillLevel=projects[i].size/themes[i].cards.length;pods[i].progressPulse=1;markProject(pods[i],j,themes[i].color,themes[i].cards.length);}
 function activateShowcase(i){if(!themes[i]||projects[i].size!==themes[i].cards.length||done.has(i)||pods[i].completing||pods[i].activated)return;pods[i].completing=true;pods[i].completion=0;pods[i].opened=false;}
 function nearest(player){let best=null,distance=3.8;pods.forEach((p,i)=>{const d=Math.hypot(player.x-p.g.position.x,player.z-p.g.position.z);if(d<distance){best=i;distance=d;}});return best;}
 function exitNear(player){return gate.open&&gate.progress>.9&&player.x>W/2-2.4&&Math.abs(player.z-gateZ)<gateWidth/2+.4;}
 function blocked(x,z){if(x< -W/2+.35||x>W/2-.35||z<Z-D/2+.35||z>Z+D/2-.35)return true;if(Math.hypot(x,z-Z)<1.95)return true;return pods.some(p=>Math.abs(x-p.g.position.x)<1.7&&Math.abs(z-p.g.position.z-.15)<1.9);}
 function update(dt,time,player){reactor.update(dt);const nearIndex=player?nearest(player):null;pods.forEach((p,i)=>{p.near=i===nearIndex;animateShowcase(p,dt,time,themes[i].color);if(p.energyReady&&!done.has(i)){done.add(i);pipes[i].active=true;}});pipes.forEach(e=>{e.line.visible=e.active;e.sparks.forEach((s,j)=>{s.visible=e.active;if(e.active)s.position.copy(e.curve.getPoint((time*.17+j*.2)%1));});});reactor.fills.forEach((f,i)=>{f.scale.y=T.MathUtils.damp(f.scale.y,pipes[i].active?1:.001,1.5,dt);f.position.y=.76+1.125*f.scale.y;});reactor.core.rotation.y+=dt*done.size*.3;updateGuide(dt,time);lamps.forEach(l=>l.intensity=.8+done.size*.07);}
 function reset(){reactor.reset();pods.forEach(p=>p.title.material.map.offset.x=0);guideOpacity=0;guide.visible=false;guide.children.forEach(m=>m.material.opacity=0);done.clear();projects.forEach(s=>s.clear());gate.open=false;gate.behind.visible=false;gate.progress=0;gate.leaves.forEach((leaf,i)=>leaf.position.x=(i===0?-1:1)*.865);pods.forEach((p,i)=>{p.opened=false;p.activated=false;p.completing=false;p.completion=0;p.energyReady=false;p.clock=i*1.37;p.progressPulse=0;p.near=false;p.wasNear=false;p.nearTime=99;p.state="IDLE";p.fillLevel=0;p.panel.position.y=.05;p.ring.material.color.set('#182c2e');p.ring.material.emissive.set('#182c2e');p.illumination.intensity=0;p.lamps.forEach(l=>l.material=new T.MeshStandardMaterial({color:'#494e40'}));const replacement=plate('0 / '+themes[i].cards.length,2.12,.1);p.meter.material=replacement.material;p.buttons.forEach(b=>{if(b.geometry.type==='CylinderGeometry'){b.position.z=.14;b.material=dark.clone();b.material.emissive.set(themes[i].color);b.material.emissiveIntensity=.95;}});pipes[i].active=false;reactor.fills[i].scale.y=.001;reactor.fills[i].position.y=.761;});update(0,0);}
 return {group,pods,pipes,reactor,guide,get reactorFilled(){return reactorFilled();},gate,gateWidth,gateHeight,gateZ,done,projects,themes,completeProject,activateShowcase,nearest,exitNear,blocked,update,reset,bounds:{minX:-W/2,maxX:W/2,minZ:Z-D/2,maxZ:Z+D/2}};
}
