import * as T from 'room-module/vendor/three.module.js';
import {plate} from 'room-module/src/retro.js';
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export function createElevatorVisual(root,width=2.4,height=3.4){
 root.clear();root.scale.set(1,1,1);const depth=3.4,leaves=[],strips=[],arrows=[];
 const dark=new T.MeshStandardMaterial({color:'#111722',metalness:.45,roughness:.47}),metal=new T.MeshStandardMaterial({color:'#252c38',metalness:.65,roughness:.36}),gold=new T.MeshStandardMaterial({color:'#b89154',metalness:.75,roughness:.3});
 const glow=new T.MeshStandardMaterial({color:'#75dcff',emissive:'#38bfff',emissiveIntensity:.2}),muted=new T.MeshStandardMaterial({color:'#355669',emissive:'#38bfff',emissiveIntensity:.1});
 function box(w,h,d,x,y,z,m=dark,parent=root){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
 // Door pockets are outside the original aperture; leaves slide parallel inside the wall.
 for(const sign of[-1,1]){box(.12,height+.12,.20,sign*(width/2+.07),height/2,0,gold);box(.025,height-.05,.025,sign*(width/2-.035),height/2,.12,glow);
 const leaf=box(width/2-.015,height-.06,.065,sign*width/4,height/2,0,metal);leaves.push(leaf);box(.018,height-.1,.015,-sign*(width/4-.025),0,.042,glow,leaf);box(.018,height-.1,.015,-sign*(width/4-.025),0,-.042,glow,leaf);
 box(.08,height,depth+ .1,sign*(width/2+.08),height/2,-depth/2,metal);for(const z of[-.45,-1.55,-2.65]){box(.025,height-.4,.045,sign*(width/2+.025),height/2,z,gold);box(.018,height-.55,.025,sign*(width/2+.005),height/2,z+.08,glow);}
 for(let j=0;j<5;j++)strips.push(box(.022,.15,.65,sign*(width/2-.01),.4+j*.55,-2,glow));}
 box(width+.28,.12,.22,0,height+.02,0,gold);box(width+.1,.08,depth,0,-.04,-depth/2,metal);box(width+.1,.08,depth,0,height,-depth/2,metal);box(width+.15,height,.10,0,height/2,-depth,metal);box(width,.018,.10,0,.015,.05,glow);
 for(const y of[.012,height-.055]){const ring=new T.Mesh(new T.TorusGeometry(.72,.018,8,56),glow);ring.rotation.x=Math.PI/2;ring.position.set(0,y,-1.55);root.add(ring);}
 // Translucent neon floor trigger outside the elevator.
  const pad=new T.Group();pad.name='neon-elevator-trigger';pad.position.set(0,.044,1.65);root.add(pad);
  const padFill=new T.MeshBasicMaterial({color:'#9b9aff',transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const padRim=new T.MeshBasicMaterial({color:'#bdabff',transparent:true,opacity:.54,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const disc=new T.Mesh(new T.CircleGeometry(.78,64),padFill);disc.rotation.x=-Math.PI/2;pad.add(disc);
  const rim=new T.Mesh(new T.RingGeometry(.75,.89,64),padRim);rim.rotation.x=-Math.PI/2;rim.position.y=.005;pad.add(rim);
  const title=plate('ОФИС БУДУЩЕГО',width,.31,'#9eeaff','#111722',65);title.position.set(0,height+.27,.12);root.add(title);
 const inside=plate('ОФИС БУДУЩЕГО',width*.77,.44,'#b6eaff','#111722',65);inside.position.set(0,2.25,-depth+.07);root.add(inside);
 const arrived=plate('ВЫ ПРИБЫЛИ',width*.77,.44,'#b6eaff','#111722',65);arrived.position.copy(inside.position);arrived.position.z+=.005;arrived.visible=false;root.add(arrived);
 const journey=plate('02 → 03',1.3,.25,'#b6eaff','#111722',70);journey.position.set(0,height-.32,-.06);journey.rotation.y=Math.PI;root.add(journey);
 for(let j=0;j<3;j++){const a=plate('↑',.15,.18,'#8eeaff','#111722',95);a.position.set((j-1)*.23,1.67,-depth+.065);root.add(a);arrows.push(a);}
 const panel=box(.22,.55,.10,width/2+.27,1.25,.08,metal);box(.12,.08,.014,0,-.11,.06,muted,panel);const button=new T.Mesh(new T.CylinderGeometry(.063,.063,.014,24),glow);button.rotation.x=Math.PI/2;button.position.set(0,.07,.06);panel.add(button);
 const light=new T.PointLight('#8bcfff',.45,5,2);light.position.set(0,2.6,-1.5);root.add(light);
 function doors(p){leaves.forEach((leaf,i)=>leaf.position.x=(i===0?-1:1)*(width/4+(width/2+.025)*p));}
 function update(time,state,p){doors(p);const unlocked=state!=='ELEVATOR_LOCKED',travel=state==='ELEVATOR_ASCENDING';padFill.opacity=unlocked?.22:.08;padRim.opacity=unlocked?.8:.20;glow.emissiveIntensity=unlocked?.7:.12;muted.emissiveIntensity=unlocked?.6:.04;light.intensity=unlocked?.85:.35;
 strips.forEach((o,j)=>{o.visible=travel;if(travel)o.position.y=.2+((j*.55-time*1.1)%2.7+2.7)%2.7;});arrows.forEach((a,j)=>{a.material.color.setScalar(travel?.35+.65*Math.max(0,Math.sin(time*4-j)):unlocked?1:.3);});arrived.visible=['ELEVATOR_ARRIVED','ELEVATOR_EXITING','ELEVATOR_COMPLETE'].includes(state);inside.visible=!arrived.visible;title.material.color.setScalar(unlocked?1:.45);
 }
 return {root,leaves,button,pad,update,doors,width,height,depth};
}
export function createElevatorController({hall,future,player,camera,enterDestination,onTransform,onExit}){
 const origin=createElevatorVisual(hall.gate.g,hall.gateWidth,hall.gateHeight),destination=createElevatorVisual(future.liftAnchor,hall.gateWidth,hall.gateHeight);hall.gate.leaves=origin.leaves;destination.pad.visible=false;
 let state='ELEVATOR_LOCKED',t=0,clock=0,door=0,current=origin,from=null,savedCamera=null,switched=false,moving=false,exitFrom=null,transformed=false;
 const flash=document.createElement('div');flash.id='lift-transform-flash';flash.setAttribute('aria-hidden','true');Object.assign(flash.style,{position:'fixed',inset:'0',background:'#e7deff',opacity:'0',pointerEvents:'none',zIndex:'20'});document.body.append(flash);
 const local=new T.Vector3(),dest=new T.Vector3(),look=new T.Vector3(),cp=new T.Vector3(),dummy=new T.PerspectiveCamera(),q=new T.Quaternion();
 function setState(s){state=s;t=0;}
 function world(v){current.root.updateWorldMatrix(true,false);return current.root.localToWorld(v);}
 function near(p){origin.root.updateWorldMatrix(true,false);local.copy(p);origin.root.worldToLocal(local);return Math.hypot(local.x,local.z-1.65)<=.89;}
 function start(){if(state!=='ELEVATOR_READY'||!near(player.position))return false;from=player.position.clone();savedCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone()};current=origin;setState('ELEVATOR_OPENING');return true;}
 function exit(){if(state!=='ELEVATOR_ARRIVED')return false;exitFrom=player.position.clone();setState('ELEVATOR_EXITING');return true;}
 function placeCamera(x,y,z,lx,ly,lz,f=1){cp.set(x,y,z);world(cp);look.set(lx,ly,lz);world(look);dummy.position.copy(cp);dummy.lookAt(look);camera.position.lerp(cp,f);camera.quaternion.slerp(dummy.quaternion,f);}
 function orientToward(point,dt){const dx=point.x-player.position.x,dz=point.z-player.position.z;if(Math.hypot(dx,dz)<.01)return;const a=Math.atan2(-dx,-dz);player.rotation.y+=Math.atan2(Math.sin(a-player.rotation.y),Math.cos(a-player.rotation.y))*(1-Math.exp(-dt*10));}
 function switchRooms(){if(switched)return;switched=true;const a=origin.root,b=destination.root;a.updateWorldMatrix(true,false);b.updateWorldMatrix(true,false);const pp=a.worldToLocal(player.position.clone()),cc=a.worldToLocal(camera.position.clone());const aq=a.getWorldQuaternion(new T.Quaternion()),bq=b.getWorldQuaternion(new T.Quaternion()),delta=bq.multiply(aq.invert());const cq=delta.clone().multiply(camera.quaternion);const fov=camera.fov;enterDestination();camera.fov=fov;camera.updateProjectionMatrix();current=destination;b.updateWorldMatrix(true,false);player.position.copy(b.localToWorld(pp));camera.position.copy(b.localToWorld(cc));camera.quaternion.copy(cq);player.rotation.y=current.root.rotation.y+Math.PI;}
 function update(dt){clock+=dt;moving=false;if(state==='ELEVATOR_LOCKED'&&hall.reactorFilled)setState('ELEVATOR_READY');if(state==='ELEVATOR_READY'&&near(player.position))start();
 t+=dt;const f=1-Math.exp(-dt*7);
 if(state==='ELEVATOR_OPENING'){door=smooth((t-.25)/1.3);placeCamera(.35,2.15,3.0,0,1.35,-.6,f);if(t>=1.8)setState('ELEVATOR_BOARDING');}
 else if(state==='ELEVATOR_BOARDING'){const p=smooth(t/2);const point=world(new T.Vector3(0,0,t<.65?.7:-1.45));orientToward(point,dt);if(t<.65){dest.copy(from).lerp(point,smooth(t/.65));}else{dest.copy(world(new T.Vector3(0,0,.7))).lerp(point,smooth((t-.65)/1.35));}player.position.copy(dest);moving=true;placeCamera(.65,2.05,3.0-5.85*p,0,1.25,-.15,f);if(t>=2){player.rotation.y=current.root.rotation.y+Math.PI;placeCamera(.65,2.05,-2.85,0,1.25,.15);setState('ELEVATOR_CLOSING');}}
 else if(state==='ELEVATOR_CLOSING'){door=1-smooth(t/1.4);placeCamera(.65,2.05,-2.85,0,1.25,.15);if(t>=1.4){door=0;setState('ELEVATOR_ASCENDING');}}
 else if(state==='ELEVATOR_ASCENDING'){if(t>=1.45)switchRooms();placeCamera(.65,2.05+.012*Math.sin(t*Math.PI/3),-2.85,0,1.25,.15);if(t>=3)setState('ELEVATOR_ARRIVING');}
 else if(state==='ELEVATOR_ARRIVING'){
  placeCamera(.65,2.05,-2.85,0,1.25,.15);
  // A single brief flash, entirely behind closed doors; pause freezes its timing.
  const opacity=t<.18?.7*smooth(t/.18):.7*(1-smooth((t-.18)/.4));flash.style.opacity=String(opacity);
  if(t>=.18&&!transformed){transformed=true;onTransform();}
  if(t>=.7){flash.style.opacity='0';setState('ELEVATOR_OPENING_DEST');}
 }
 else if(state==='ELEVATOR_OPENING_DEST'){door=smooth(t/1.5);placeCamera(.65,2.05,-2.85,0,1.25,.15);if(t>=1.5)setState('ELEVATOR_ARRIVED');}
 else if(state==='ELEVATOR_ARRIVED'){placeCamera(.65,2.05,-2.85,0,1.25,.15);}
 else if(state==='ELEVATOR_EXITING'){const p=smooth(t/1.7);dest.copy(world(new T.Vector3(0,0,2.7)));orientToward(dest,dt);player.position.copy(exitFrom).lerp(dest,p);moving=true; // Camera goes through the clear doorway behind the heroine, then joins normal orbit.
 camera.fov=62-9*p;camera.updateProjectionMatrix();placeCamera(.65*(1-p),2.05-.19*p,-2.85+3.56*p,0,1.2,-1.45+4.15*p,f);if(t>=1.7){player.position.copy(dest);setState('ELEVATOR_COMPLETE');onExit();}}
 else if(state==='ELEVATOR_COMPLETE'){
  door=1-smooth(t/1.4);
  // The heroine is clear of the cabin before its doors close and it descends.
  const descent=smooth((t-1.4)/2.2);
  destination.root.position.y=-(Math.max(future.height??4.875,destination.height)+.7)*descent;
  if(descent>=1&&destination.root.visible){destination.root.visible=false;future.sealLift();}
 }
 origin.update(clock,switched?'ELEVATOR_READY':state,switched?0:door);destination.update(clock,switched?state:'ELEVATOR_LOCKED',switched?door:0);hall.gate.open=door>.9&&!switched;hall.gate.progress=switched?0:door;
 }
 function reset(){transformed=false;flash.style.opacity='0';state='ELEVATOR_LOCKED';t=clock=door=0;current=origin;switched=false;moving=false;from=savedCamera=exitFrom=null;destination.root.position.y=0;destination.root.visible=true;origin.update(0,state,0);destination.update(0,state,0);}
 reset();return {origin,destination,near,start,exit,update,reset,get transformed(){return transformed;},get state(){return state;},get time(){return t;},get moving(){return moving;},get active(){return !['ELEVATOR_LOCKED','ELEVATOR_READY','ELEVATOR_COMPLETE'].includes(state);},get awaitingExit(){return state==='ELEVATOR_ARRIVED';},get complete(){return state==='ELEVATOR_COMPLETE';}};
}
