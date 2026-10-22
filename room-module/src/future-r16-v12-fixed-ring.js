import {darkSlide} from 'room-module/src/slide-theme.js';
import * as T from 'room-module/vendor/three.module.js';
import {assetURL} from 'room-module/src/assets.js';

const PAD_RADIUS=1.32;
const PAD_ENTER=1.28;
const PAD_EXIT=1.70;
const TITLE_HOVER_Y=.45;
const TITLE_FLAT_Y=.028;
const TITLE_WIDTH=PAD_RADIUS*2*.76;
const ACTIVATE_DUR=1.5;
const RESTORE_DUR=1.5;
const STATES={IDLE:'IDLE',ACTIVATING:'ACTIVATING',PRESENTATION:'PRESENTATION',RESTORING:'RESTORING',WAIT_FOR_EXIT:'WAIT_FOR_EXIT'};

function makeTitleTexture(phrase){
 const w=2048,h=512,c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d');
 ctx.clearRect(0,0,w,h);
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='900 210px Arial, Helvetica, sans-serif';
 ctx.lineJoin='round';ctx.miterLimit=2;
 ctx.lineWidth=28;ctx.strokeStyle='rgba(40,90,160,.55)';ctx.strokeText(phrase,w/2,h/2+8);
 ctx.lineWidth=14;ctx.strokeStyle='rgba(120,180,255,.9)';ctx.strokeText(phrase,w/2,h/2);
 ctx.fillStyle='#ffffff';ctx.fillText(phrase,w/2,h/2);
 ctx.fillStyle='rgba(180,220,255,.35)';ctx.fillText(phrase,w/2,h/2-6);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;tex.needsUpdate=true;return tex;
}

function makeFloatingTitle(phrase){
 const root=new T.Group();root.name='future-title';
 const map=makeTitleTexture(phrase);
 const aspect=2048/512;
 const h=TITLE_WIDTH/aspect;
 const layers=7;
 for(let i=0;i<layers;i++){
  const t=i/(layers-1);
  const mat=new T.MeshBasicMaterial({
   map,transparent:true,opacity:.22+.78*(1-t*.55),side:T.DoubleSide,depthWrite:i===0,toneMapped:false,
   color:new T.Color().setHSL(.58,.35,.92+.08*(1-t))
  });
  const plane=new T.Mesh(new T.PlaneGeometry(TITLE_WIDTH,h),mat);
  plane.rotation.x=-Math.PI/2;
  plane.position.y=i*.012;
  plane.renderOrder=10+i;
  root.add(plane);
 }
 // Soft neon glow sheet under the letters
 const glowMat=new T.MeshBasicMaterial({color:'#7eb6ff',transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const glow=new T.Mesh(new T.PlaneGeometry(TITLE_WIDTH*1.08,h*1.35),glowMat);
 glow.rotation.x=-Math.PI/2;glow.position.y=-.008;glow.renderOrder=9;root.add(glow);
 root.userData={baseY:TITLE_HOVER_Y,layers,glowMat,height:h};
 root.position.y=TITLE_HOVER_Y;
 return root;
}

// The player remains in the pavilion. The camera can orbit through its glass.
export async function makeFuture(scene,config){
 const {width:W,depth:D,height:H}=config.room, group=new T.Group();group.position.set(50,0,0);scene.add(group);
 const env=config.future.environment,R=env.radius,bottom=env.bottom,top=env.top;
 const textures={};for(const [key,path] of Object.entries(env.textures)){const t=await new T.TextureLoader().loadAsync(assetURL(path));t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures[key]=t;}
 const uniforms={};for(const [key,t] of Object.entries(textures)){uniforms[key]={value:t};}
 const material=new T.ShaderMaterial({uniforms,side:T.BackSide,depthWrite:false,toneMapped:false,
 vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D px;uniform sampler2D nx;uniform sampler2D py;uniform sampler2D ny;uniform sampler2D pz;uniform sampler2D nz;varying vec3 ray;
 vec4 face(sampler2D tex,vec2 plane,float depth){if(depth<=0.)return vec4(0.);vec2 q=plane/depth;float edge=max(abs(q.x),abs(q.y));float w=(1.-smoothstep(1.03,1.1917536,edge))*pow(depth,4.);if(w<=0.)return vec4(0.);return vec4(texture2D(tex,.5+.5*q/1.1917536).rgb*w,w);}
 void main(){vec3 d=normalize(ray);vec4 c=face(px,vec2(d.z,d.y),d.x)+face(nx,vec2(-d.z,d.y),-d.x)+face(pz,vec2(-d.x,d.y),d.z)+face(nz,vec2(d.x,d.y),-d.z)+face(py,vec2(-d.x,-d.z),d.y)+face(ny,vec2(-d.x,d.z),-d.y);gl_FragColor=vec4(c.rgb/max(c.a,.00001),1.);
 #include <colorspace_fragment>
 }`});
 const sphere=new T.Mesh(new T.SphereGeometry(R,192,96),material);group.add(sphere);
 function box(w,h,d,x,y,z,color,metalness=0){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.55,metalness}));o.position.set(x,y,z);o.receiveShadow=true;group.add(o);return o;}
 box(W+.16,.28,D+.16,0,-.14,0,'#817669');
 const floorPanels=new T.Group();group.add(floorPanels);floorPanels.name='warm-panel-floor';
 const floorBaseColors=[];
 for(let ix=0;ix<6;ix++)for(let iz=0;iz<5;iz++){const o=new T.Mesh(new T.BoxGeometry(W/6-.018,.016,D/5-.018),new T.MeshStandardMaterial({color:['#a19483','#a89a88','#998d7d'][(ix+iz)%3],roughness:.68,metalness:.18}));o.position.set(-W/2+(ix+.5)*W/6,.002,-D/2+(iz+.5)*D/5);floorPanels.add(o);floorBaseColors.push(o.material.color.clone());}
 const floorRails=[];
 for(let ix=1;ix<6;ix++){const q=box(.012,.005,D,-W/2+ix*W/6,.013,0,ix%2?'#756343':'#8c7752',.65);q.material.roughness=.6;floorRails.push(q);}
 for(let iz=1;iz<5;iz++){const q=box(W,.005,.012,0,.013,-D/2+iz*D/5,iz%2?'#756343':'#8c7752',.65);q.material.roughness=.6;floorRails.push(q);}
 const floorRailBase=floorRails.map(o=>o.material.color.clone());
 const floorDarkColor=new T.Color('#14131a');
 const trim='#57432b',panels=[];
 const glassClear=new T.Color('#d5ecff'),glassTint=new T.Color('#0f1a28');
 function glass(w,h,x,y,z,rx,ry){const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshPhysicalMaterial({color:glassClear.clone(),metalness:.05,roughness:.15,transparent:true,opacity:.085,side:T.DoubleSide,depthWrite:false}));o.position.set(x,y,z);o.rotation.set(rx,ry,0);o.renderOrder=5;group.add(o);panels.push(o);return o;}
 glass(W,H,0,H/2,-D/2,0,0);glass(W,H,0,H/2,D/2,0,0);
 glass(D,H,-W/2,H/2,0,0,Math.PI/2);glass((D-3.1)/2,H,W/2,H/2,-(D+3.1)/4,0,Math.PI/2);glass((D-3.1)/2,H,W/2,H/2,(D+3.1)/4,0,Math.PI/2);glass(W,D,0,H,0,-Math.PI/2,0);
 for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])box(.055,H,.055,x,H/2,z,trim,.6);
 for(const y of [.045,H]){for(const z of [-D/2,D/2])box(W,.045,.045,0,y,z,trim,.6);for(const x of [-W/2,W/2])box(.045,.045,D,x,y,0,trim,.6);}
 for(const x of [-W/4,0,W/4])for(const z of [-D/2,D/2])box(.014,H,.014,x,H/2,z,'#a8b4c0',.5);
 box(.014,H,.014,-W/2,H/2,0,'#a8b4c0',.5);
 for(const z of [-D/2-.035,D/2+.035]){box(W+.25,.32,.18,0,-.06,z,trim,.7);box(W+.25,.16,.13,0,H,z,trim,.7);}
 for(const x of [-W/2-.035,W/2+.035]){box(.18,.32,D+.25,x,-.06,0,trim,.7);box(.13,.16,D+.25,x,H,0,trim,.7);}
 const liftGlass=glass(3.1,H,W/2,H/2,0,0,Math.PI/2);liftGlass.name='lift-glass-wall';liftGlass.visible=false;
 const front=W/2-1.21;
 const liftAnchor=new T.Group();liftAnchor.position.set(front,0,0);liftAnchor.rotation.y=-Math.PI/2;group.add(liftAnchor);
 const liftBody=liftAnchor;
 const hover=new T.Group();group.add(hover);let hoverTime=0;
 let liftRetracted=false;
 function sealLift(){liftRetracted=true;liftGlass.visible=true;}
 function blocked(x,z){const lx=x-group.position.x,lz=z-group.position.z;return !liftRetracted&&lx>front-.23&&Math.abs(lz)<1.55;}
 function inspectNear(){return false;}
 const panel=new T.Group();group.add(panel);panel.position.set(-W/2+.06,H/2,0);panel.rotation.y=Math.PI/2;
 const shade=new T.Mesh(new T.PlaneGeometry(D,H),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));shade.renderOrder=6;panel.add(shade);
 const finalTexture=await new T.TextureLoader().loadAsync(assetURL(config.future.finalSlide));finalTexture.colorSpace=T.SRGBColorSpace;
 const display=new T.Mesh(new T.PlaneGeometry(Math.min(D-.06,(H-.06)*16/9),Math.min(H-.06,(D-.06)*9/16)),new T.MeshBasicMaterial({map:finalTexture,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false}));display.position.set(0,0,.025);display.renderOrder=7;panel.add(display);
 function label(text,w,h){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#7700ff';ctx.fillRect(0,0,768,192);ctx.fillStyle='white';ctx.font='bold 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,side:T.DoubleSide,transparent:true}));m.renderOrder=9;return m;}
 const inspectButton=label('Рассмотреть',1.8,.45);inspectButton.position.set(0,-H/2+.26,.08);inspectButton.visible=false;panel.add(inspectButton);

 // Single dark-blue pad + one neon rim (no concentric rings, no ticker).
 const floorPad=new T.Group();floorPad.name='future-floor-pad';floorPad.position.set(0,.02,0);group.add(floorPad);
 const padFaceMat=new T.MeshStandardMaterial({
  color:'#0d1a33',emissive:'#1a3a6e',emissiveIntensity:.42,roughness:.55,metalness:.25,
  polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1
 });
 const padFace=new T.Mesh(new T.CylinderGeometry(PAD_RADIUS,PAD_RADIUS,.03,96),padFaceMat);
 padFace.position.y=.01;floorPad.add(padFace);
 const padNeonMat=new T.MeshStandardMaterial({color:'#9ec8ff',emissive:'#5aa0ff',emissiveIntensity:2.35,roughness:.22,metalness:.5});
 const padNeon=new T.Mesh(new T.TorusGeometry(PAD_RADIUS+.02,.048,16,96),padNeonMat);
 padNeon.rotation.x=Math.PI/2;padNeon.position.y=.038;floorPad.add(padNeon);

 const title=makeFloatingTitle('БУДУЩЕЕ ЗДЕСЬ');
 floorPad.add(title);

 let fsm=STATES.IDLE;
 let phaseT=0;
 let dimFactor=0;
 let titleProgress=0; // 0=hover volumetric, 1=flat on pad
 let presentationCue=false;
 let ready=false;

 function padDistance(position){
  const lx=position.x-group.position.x,lz=position.z-group.position.z;
  return Math.hypot(lx,lz);
 }
 function padInside(position,radius=PAD_ENTER){return padDistance(position)<radius;}
 function padNear(position){return fsm===STATES.IDLE&&padInside(position,PAD_ENTER);}
 function activate(){
  if(fsm!==STATES.IDLE)return false;
  fsm=STATES.ACTIVATING;phaseT=0;presentationCue=false;ready=false;return true;
 }
 function takePresentationCue(){
  if(!presentationCue)return false;
  presentationCue=false;return true;
 }
 function onPresentationClosed(){
  if(fsm!==STATES.PRESENTATION)return;
  fsm=STATES.RESTORING;phaseT=0;ready=false;
 }
 function applyTitleVisual(p,bob=0){
  titleProgress=p;
  const y=T.MathUtils.lerp(TITLE_HOVER_Y,TITLE_FLAT_Y,p)+bob*(1-p);
  title.position.y=y;
  let li=0;
  const nLayers=title.userData.layers;
  title.children.forEach((child)=>{
   if(!child.isMesh)return;
   if(child.material&&child.material.blending===T.AdditiveBlending){
    child.material.opacity=T.MathUtils.lerp(.22,.05,p);
    child.scale.setScalar(T.MathUtils.lerp(1,.9,p));
    child.position.y=T.MathUtils.lerp(-.008,-.002,p);
    return;
   }
   const t=nLayers>1?li/(nLayers-1):0;
   child.position.y=T.MathUtils.lerp(li*.012,.0008*li,p);
   // Flatten volume: keep one sharp letter plane, fade depth plates
   const idleOp=.22+.78*(1-t*.55);
   const flatOp=t<.12?1:.04;
   child.material.opacity=T.MathUtils.lerp(idleOp,flatOp,p);
   li++;
  });
  const s=T.MathUtils.lerp(1,.96,p);
  title.scale.set(s,1,s);
 }
 function applyRoomPresent(present){
  dimFactor=present;
  floorPanels.children.forEach((o,i)=>o.material.color.copy(floorBaseColors[i]).lerp(floorDarkColor,present));
  floorRails.forEach((o,i)=>o.material.color.copy(floorRailBase[i]).lerp(floorDarkColor,present*.9));
 }
 function applyGlass(present,camera){
  const local=group.worldToLocal(camera.position.clone());
  panels.forEach(p=>{
   const near=local.distanceTo(p.position)<2;
   const clearOp=near?.025:.085;
   const tintOp=near?.38:.58;
   p.material.opacity=T.MathUtils.lerp(clearOp,tintOp,present);
   p.material.color.copy(glassClear).lerp(glassTint,present);
  });
 }
 function pulseNeon(active){
  if(!active){padNeonMat.emissiveIntensity=.55;padFaceMat.emissiveIntensity=.18;return;}
  const pulse=.55+.45*Math.sin(hoverTime*2.4);
  padNeonMat.emissiveIntensity=1.85+pulse*.7;
  padFaceMat.emissiveIntensity=.32+pulse*.16;
 }

 const drones=[];
 const white=new T.MeshStandardMaterial({color:'#ffffff',metalness:.15,roughness:.28});const visor=new T.MeshStandardMaterial({color:'#506574',roughness:.3});
 for(let i=0;i<5;i++){const d=new T.Group();group.add(d);const body=new T.Mesh(new T.SphereGeometry(.32,24,16),white);body.scale.set(1.3,.65,.9);d.add(body);const face=new T.Mesh(new T.SphereGeometry(.19,20,12),visor);face.scale.set(1.25,.55,.35);face.position.set(0,.01,.25);d.add(face);for(const x of [-.09,.09]){const eye=new T.Mesh(new T.SphereGeometry(.025,12,8),new T.MeshBasicMaterial({color:'#8ee9e2'}));eye.position.set(x,.025,.315);d.add(eye);}for(const x of [-.48,.48]){const ring=new T.Mesh(new T.TorusGeometry(.2,.04,8,24),white);ring.rotation.x=Math.PI/2;ring.position.x=x;d.add(ring);const prop=new T.Mesh(new T.BoxGeometry(.32,.012,.045),visor);prop.position.x=x;d.add(prop);d.userData.props??=[];d.userData.props.push(prop);}drones.push(d);}

 function update(camera,dt=0){
  hoverTime+=dt;
  if(fsm===STATES.IDLE){
   const bob=Math.sin(hoverTime*1.55)*.028;
   applyTitleVisual(0,bob);
   applyRoomPresent(0);
   pulseNeon(true);
  }else if(fsm===STATES.ACTIVATING){
   phaseT+=dt;
   const u=Math.min(1,phaseT/ACTIVATE_DUR);
   const e=u*u*(3-2*u);
   applyTitleVisual(e,0);
   applyRoomPresent(e);
   pulseNeon(false);
   if(u>=1){fsm=STATES.PRESENTATION;presentationCue=true;ready=true;applyTitleVisual(1,0);applyRoomPresent(1);}
  }else if(fsm===STATES.PRESENTATION){
   applyTitleVisual(1,0);
   applyRoomPresent(1);
   pulseNeon(false);
  }else if(fsm===STATES.RESTORING){
   phaseT+=dt;
   const u=Math.min(1,phaseT/RESTORE_DUR);
   const e=u*u*(3-2*u);
   applyTitleVisual(1-e,0);
   applyRoomPresent(1-e);
   pulseNeon(e>.6);
   if(u>=1){fsm=STATES.WAIT_FOR_EXIT;applyTitleVisual(0,0);applyRoomPresent(0);pulseNeon(true);}
  }else if(fsm===STATES.WAIT_FOR_EXIT){
   const bob=Math.sin(hoverTime*1.55)*.028;
   applyTitleVisual(0,bob);
   applyRoomPresent(0);
   pulseNeon(true);
  }
  applyGlass(dimFactor,camera);
  shade.material.opacity=0;display.material.opacity=0;inspectButton.visible=false;
  drones.forEach((d,i)=>{const t=hoverTime*.09+i*Math.PI*2/5;const x=Math.cos(t)*(W/2+3.5),z=Math.sin(t)*(D/2+4);d.position.set(x,2.4+Math.sin(hoverTime*.5+i)*.6+i*.25,z);d.rotation.y=Math.atan2(-Math.sin(t),Math.cos(t));d.rotation.z=Math.sin(hoverTime+i)*.035;d.userData.props.forEach(p=>p.rotation.y+=dt*20);});
 }

 function notifyPlayerPosition(position){
  if(fsm===STATES.WAIT_FOR_EXIT&&padDistance(position)>PAD_EXIT)fsm=STATES.IDLE;
 }

 function reset(){
  fsm=STATES.IDLE;phaseT=0;dimFactor=0;titleProgress=0;presentationCue=false;ready=false;hoverTime=0;
  liftRetracted=false;liftGlass.visible=false;liftAnchor.position.y=0;liftAnchor.visible=true;
  shade.material.opacity=0;display.material.opacity=0;inspectButton.visible=false;
  floorPanels.children.forEach((o,i)=>o.material.color.copy(floorBaseColors[i]));
  floorRails.forEach((o,i)=>o.material.color.copy(floorRailBase[i]));
  panels.forEach(p=>{p.material.color.copy(glassClear);p.material.opacity=.085;});
  applyTitleVisual(0,0);pulseNeon(true);title.scale.set(1,1,1);
 }

 return {
  reset,sealLift,liftGlass,liftAnchor,group,panel,floorPad,padNear,padInside,padDistance,
  inspectButton,activate,inspectNear,takePresentationCue,onPresentationClosed,notifyPlayerPosition,
  get ready(){return ready;},
  get started(){return fsm!==STATES.IDLE&&fsm!==STATES.WAIT_FOR_EXIT;},
  get state(){return fsm;},
  get dimFactor(){return dimFactor;},
  get controlsLocked(){return fsm===STATES.ACTIVATING||fsm===STATES.PRESENTATION;},
  shade,display,drones,hover,blocked,center:group.position.clone(),width:W,depth:D,height:H,radius:R,bottom,top,panels,update,liftBody
 };
}
