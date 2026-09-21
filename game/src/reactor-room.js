import * as T from '../vendor/three.module.js';
import {assetURL} from './assets.js';
import {plate,showcase,markProject,animateShowcase,energyReactor,energyPipe,shutter} from './retro.js';

export async function makeReactorRoom(scene,config){
 const {width:W,depth:D,height:H,centerZ:Z,themes}=config;
 const group=new T.Group();group.visible=false;scene.add(group);
 const mat=(color,roughness=.65,metalness=.15)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const dark=mat('#24363a'),stone=mat('#a0aaa8'),trim=mat('#818c93',.32,.65);
 function box(w,h,d,m,x,y,z){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;group.add(o);return o;}
 box(W,.12,D,stone,0,-.06,Z);box(W,.08,D,mat('#d6d7cf'),0,H+.04,Z);
 const textures={};for(const [key,path] of Object.entries(config.textures||{})){const t=await new T.TextureLoader().loadAsync(assetURL(path));t.colorSpace=T.SRGBColorSpace;textures[key]=t;}
 const roof=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshBasicMaterial({map:textures.ceilingOff}));roof.rotation.x=Math.PI/2;roof.position.set(0,H-.01,Z);group.add(roof);
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
 for(let z=Z-D/2+2;z<Z+D/2-2;z+=6)for(const side of [-1,1])box(.3,H-.2,.65,stone,side*(W/2-.3),(H-.2)/2,z);
 const reactor=energyReactor(themes.map(t=>t.color));reactor.g.position.set(0,0,Z);group.add(reactor.g);
 const positions=[[-6,Z-1.4],[-3.5,Z-5],[3.5,Z-5],[6,Z-1.4]],pods=[],pipes=[],done=new Set(),projects=themes.map(()=>new Set());
 positions.forEach(([x,z],i)=>{const p=showcase(i,themes[i]);p.g.position.set(x,0,z);p.g.rotation.y=Math.atan2(-x,Z+8-z);group.add(p.g);pods.push(p);const base=p.g.children.find(o=>o.geometry?.type==='CylinderGeometry'&&Math.abs(o.position.y-.34)<.01);if(base&&textures.base){const m=base.material.clone();m.color.set('#ffffff');m.map=textures.base;m.metalness=.3;m.roughness=.65;base.material=[m,base.material,base.material];}const pipe=energyPipe(new T.Vector3(x,.14,z),new T.Vector3(0,.14,Z),themes[i].color);pipes.push(pipe);group.add(pipe.g);});
 gate.behind.material=new T.MeshStandardMaterial({color:'#9c91a6',roughness:.45,metalness:.5});
 const liftSign=plate('ЛИФТ / ОФИС БУДУЩЕГО',3.1,.43);liftSign.position.set(0,3.48,.15);gate.g.add(liftSign);

 const lamps=[];for(const z of [Z+5,Z,Z-5]){const l=new T.SpotLight('#ddeeff',90,20,Math.PI*.37,.85,2);l.position.set(0,H-.3,z);l.target.position.set(0,0,z);group.add(l,l.target);lamps.push(l);}
 const sign=plate('МУЗЕЙ ТЕХНОЛОГИЙ / ИТОГИ 2026',5.8,1.08);sign.position.set(0,3.7,Z+D/2-.15);sign.rotation.y=Math.PI;group.add(sign);
 function completeProject(i,j){if(!themes[i]?.cards[j]||projects[i].has(j))return;projects[i].add(j);markProject(pods[i],j,themes[i].color,themes[i].cards.length);if(projects[i].size===themes[i].cards.length){done.add(i);pods[i].activated=true;pods[i].opened=false;pods[i].openedAt=performance.now()/1000;pipes[i].active=true;if(done.size===4){gate.open=true;gate.behind.visible=true;}}}
 function nearest(player){let best=null,distance=3.8;pods.forEach((p,i)=>{const d=Math.hypot(player.x-p.g.position.x,player.z-p.g.position.z);if(d<distance){best=i;distance=d;}});return best;}
 function exitNear(player){return gate.open&&gate.progress>.9&&player.x>W/2-2.4&&Math.abs(player.z-gateZ)<gateWidth/2+.4;}
 function blocked(x,z){if(x< -W/2+.35||x>W/2-.35||z<Z-D/2+.35||z>Z+D/2-.35)return true;if(Math.hypot(x,z-Z)<1.95)return true;return pods.some(p=>Math.abs(x-p.g.position.x)<1.7&&Math.abs(z-p.g.position.z-.15)<1.9);}
 function update(dt,time){roof.material.map=done.size===4?textures.ceilingOn:textures.ceilingOff;pods.forEach((p,i)=>animateShowcase(p,dt,time,themes[i].color));pipes.forEach(e=>{e.line.visible=e.active;e.sparks.forEach((s,j)=>{s.visible=e.active;if(e.active)s.position.copy(e.curve.getPoint((time*.17+j*.2)%1));});});reactor.fills.forEach((f,i)=>{f.scale.y=T.MathUtils.damp(f.scale.y,done.has(i)?1:.001,1.5,dt);f.position.y=.76+1.125*f.scale.y;});reactor.core.rotation.y+=dt*done.size*.3;gate.progress=T.MathUtils.damp(gate.progress,gate.open?1:0,1.7,dt);gate.leaves.forEach((leaf,i)=>leaf.position.x=(i===0?-1:1)*(.865+1.65*gate.progress));lamps.forEach(l=>l.intensity=70+done.size*18);}
 function reset(){done.clear();projects.forEach(s=>s.clear());gate.open=false;gate.behind.visible=false;gate.progress=0;gate.leaves.forEach((leaf,i)=>leaf.position.x=(i===0?-1:1)*.865);pods.forEach((p,i)=>{p.opened=false;p.activated=false;p.panel.position.y=.05;p.ring.material.color.set('#182c2e');p.ring.material.emissive.set('#182c2e');p.illumination.intensity=0;p.lamps.forEach(l=>l.material=new T.MeshStandardMaterial({color:'#494e40'}));const replacement=plate('0 / '+themes[i].cards.length,2.12,.1);p.meter.material=replacement.material;p.buttons.forEach(b=>{if(b.geometry.type==='CylinderGeometry'){b.position.z=.14;b.material=dark.clone();}});pipes[i].active=false;reactor.fills[i].scale.y=.001;reactor.fills[i].position.y=.761;});update(0,0);}
 return {group,pods,pipes,reactor,gate,gateWidth,gateHeight,gateZ,done,projects,themes,completeProject,nearest,exitNear,blocked,update,reset,bounds:{minX:-W/2,maxX:W/2,minZ:Z-D/2,maxZ:Z+D/2}};
}
