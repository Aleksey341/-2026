import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {BASE_POSITIONS} from './defaults.js';
export function assetURL(path){return globalThis.ROOM_EMBEDDED?.[path]||path;}
export async function readConfig(){const c=globalThis.ROOM_CONFIG||await fetch('config/room.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Не найден config/room.json');return r.json()});validateConfig(c);return c;}
function vec(x,n,label){if(!Array.isArray(x)||x.length!==n||!x.every(Number.isFinite))throw Error(`Неверное поле ${label}`)}
export function validateConfig(c){if(c.version!==1)throw Error('Неверная версия room.json');vec(c.character.spawn,3,'character.spawn');vec(c.character.rotation,3,'character.rotation');if(!(c.character.height>0))throw Error('Рост должен быть положительным');for(const [id,o] of Object.entries(c.objects)){vec(o.position,3,id+'.position');vec(o.rotation,3,id+'.rotation');vec(o.fit,3,id+'.fit');if(o.fit.some(x=>x<=0)||!(o.scale>0))throw Error('Размер должен быть положительным: '+id);if(o.parent&&!c.objects[o.parent])throw Error('Неизвестный родитель: '+o.parent);let seen=new Set([id]),p=o.parent;while(p){if(seen.has(p))throw Error('Цикл родителей '+id);seen.add(p);p=c.objects[p].parent}}for(const w of ['left','right','front','back']){vec(c.walls[w].repeat,2,w+'.repeat');if(c.walls[w].repeat.some(x=>x<=0))throw Error('Повтор текстуры должен быть положительным')}vec(c.glasses.tableOffset,3,'glasses.tableOffset');}
export function fitModel(root,size,rotation=[0,0,0],heightOnly=false){const wrapper=new T.Group();root.rotation.x+=T.MathUtils.degToRad(rotation[0]);root.rotation.y+=T.MathUtils.degToRad(rotation[1]);root.rotation.z+=T.MathUtils.degToRad(rotation[2]);wrapper.add(root);wrapper.updateMatrixWorld(true);let box=new T.Box3().setFromObject(wrapper),dims=box.getSize(new T.Vector3());if(!Number.isFinite(dims.length())||dims.y<1e-6)throw Error('Модель имеет пустые или некорректные размеры');const ratio=heightOnly?size[1]/dims.y:Math.min(...size.map((x,i)=>x/Math.max(dims.getComponent(i),1e-6)));root.scale.multiplyScalar(ratio);wrapper.updateMatrixWorld(true);box.setFromObject(wrapper);const center=box.getCenter(new T.Vector3());root.position.sub(new T.Vector3(center.x,box.min.y,center.z));wrapper.updateMatrixWorld(true);return wrapper;}

const MOTION_NAMES={
 idle:'NaturalIdle',start:'NaturalStart',walk:'NaturalWalk',stop:'NaturalStop',
 turnLeft:'NaturalTurnLeft',turnRight:'NaturalTurnRight',interact:'NaturalInteract',
 reach:'NaturalReach',wear:'NaturalWear'
};
function smooth01(t){return t*t*(3-2*t)}
function pulse(t,a,b){if(t<=a||t>=b)return 0;const m=(a+b)/2;return t<m?smooth01((t-a)/(m-a)):smooth01((b-t)/(b-m));}
function addEuler(base,x=0,y=0,z=0){return base.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z,'XYZ'))).toArray()}

export class AssetSystem{
 constructor(x){Object.assign(this,x);this.groups=new Map();this.fallback=new Map();this.errors=[];this.hero=null;this.activeClip=null;this.mixer=null;this.actions={};this.loader=new GLTFLoader();this.cache=new Map();this.motionState='idle';this.motionTime=0;this.motionSpeed=0;this.gesture=null;this.characterTime=0;this.lastPlayerPos=null;this.lastPlayerYaw=0;this.visualLag=new T.Vector3();this.visualYawLag=0;}
 warn(name,e){this.errors.push(`${name}: ${e.message||e}`);console.warn(name,e);const node=document.getElementById('asset-status');if(node){node.hidden=false;node.textContent='Не загружено ассетов: '+this.errors.length;node.title=this.errors.join('\n')}const details=document.getElementById('asset-errors');if(details)details.textContent=this.errors.join('\n');}
 async load(path){if(!path)return null;if(!this.cache.has(path))this.cache.set(path,this.loader.loadAsync(assetURL(path)));const r=await this.cache.get(path);if(path===this.config.character.model)return r;return {...r,scene:r.scene.clone(true)};}
 async initialize(){
  for(const [id,objects] of Object.entries(this.records)){const g=new T.Group();g.name=id;g.position.fromArray(BASE_POSITIONS[id]||[0,0,0]);this.world.add(g);this.world.updateMatrixWorld(true);for(const o of objects)g.attach(o);this.groups.set(id,g);this.fallback.set(id,[...g.children]);}
  for(const id of Object.keys(this.config.objects)){if(!this.groups.has(id)){const g=new T.Group();g.name=id;this.world.add(g);this.groups.set(id,g);this.fallback.set(id,[])}}
  for(const [id,c] of Object.entries(this.config.objects)){let g=this.groups.get(id);if(!g){g=new T.Group();g.name=id;this.world.add(g);this.groups.set(id,g);this.fallback.set(id,[])}const parent=c.parent?this.groups.get(c.parent):this.world;parent.add(g);g.position.fromArray(c.position);g.rotation.set(...c.rotation.map(T.MathUtils.degToRad));g.scale.setScalar(c.scale);}
  if(globalThis.ROOM_EXPORT_MODE)return;
  for(const [id,c] of Object.entries(this.config.objects)){if(c.enabled===false){this.groups.get(id).visible=false;continue;}if(!c.model)continue;try{const result=await this.load(c.model);const visual=fitModel(result.scene,c.fit);const g=this.groups.get(id);for(const o of this.fallback.get(id))o.visible=false;g.add(visual);this.prepare(visual);}catch(e){this.warn(id,e)}}
  this.world.updateMatrixWorld(true);this.rebuildCollisions();
  await Promise.all(Object.entries(this.wallSurfaces).map(async([id,surfaces])=>{const c=this.config.walls[id];try{const tex=c.texture?await new T.TextureLoader().loadAsync(assetURL(c.texture)):null;if(tex){tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.fromArray(c.repeat);tex.center.set(.5,.5);tex.rotation=T.MathUtils.degToRad(c.rotation||0);tex.anisotropy=4}for(const o of surfaces){o.material.map=tex;o.material.color.set(c.color||'#ffffff');o.material.needsUpdate=true}}catch(e){this.warn('Стена '+id,e)}}));
  try{if(this.config.glasses.model){const r=await this.load(this.config.glasses.model);const v=fitModel(r.scene,this.config.glasses.size,this.config.glasses.rotation);for(const o of this.headset.children)o.visible=false;this.headset.add(v);this.prepare(v)}}catch(e){this.warn('VR-очки',e)}
  this.characters={};
  for(const [variant,path] of Object.entries({base:this.config.character.model,future:this.config.character.futureModel})){
   try{
    const c=this.config.character,r=await this.loader.loadAsync(assetURL(path));
    const hero=fitModel(r.scene,[1,c.height,1],c.rotation,true);this.player.add(hero);hero.visible=false;this.prepare(hero);
    const mixer=new T.AnimationMixer(r.scene),actions={},heroBones={},boneRest={};
    hero.traverse(o=>{if(o.isBone){heroBones[o.name]=o;boneRest[o.name]={q:o.quaternion.clone(),p:o.position.clone()}}});
    const generated=this.makeNaturalClips(heroBones,boneRest);
    const clips=[...(r.animations||[]),...generated];
    const configured={...(c.animations||{}),...MOTION_NAMES};
    for(const [key,name] of Object.entries(configured)){const clip=clips.find(x=>x.name===name);if(clip){const a=mixer.clipAction(clip);a.enabled=true;actions[key]=a;}}
    this.characters[variant]={hero,mixer,actions,heroBones,boneRest,clips};
   }catch(e){this.warn('Персонаж '+variant,e);}
  }
  this.selectCharacter('base');
 }
 prepare(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false}})}
 rebuildCollisions(){for(let i=this.obstacles.length-1;i>=0;i--)if(this.groups.has(this.obstacles[i].slot))this.obstacles.splice(i,1);for(const [id,c] of Object.entries(this.config.objects)){if(!c.collision||c.enabled===false)continue;const group=this.groups.get(id);let b=new T.Box3();group.traverse(o=>{if(o.isMesh&&this.visible(o,group)){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))}});if(b.isEmpty())continue;const d=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());this.obstacles.push({slot:id,x:center.x,z:center.z,w:d.x/2+.23,d:d.z/2+.23});}}
 visible(o,root){for(let p=o;p&&p!==root;p=p.parent)if(!p.visible)return false;return true}

 makeNaturalClips(bones,rest){
  const clips=[];
  const has=n=>bones[n]&&rest[n];
  const qtrack=(name,times,fn)=>{if(!has(name))return null;const values=[];for(const t of times)values.push(...addEuler(rest[name].q,...fn(t)));return new T.QuaternionKeyframeTrack(`${name}.quaternion`,times,values)};
  const ptrack=(name,times,fn)=>{if(!has(name))return null;const values=[];for(const t of times){const o=fn(t),p=rest[name].p;values.push(p.x+(o[0]||0),p.y+(o[1]||0),p.z+(o[2]||0))}return new T.VectorKeyframeTrack(`${name}.position`,times,values)};
  const clip=(name,duration,times,defs,posDefs={})=>{const tracks=[];for(const [bone,fn] of Object.entries(defs)){const tr=qtrack(bone,times,fn);if(tr)tracks.push(tr)}for(const [bone,fn] of Object.entries(posDefs)){const tr=ptrack(bone,times,fn);if(tr)tracks.push(tr)}const c=new T.AnimationClip(name,duration,tracks);clips.push(c);return c};

  const idleTimes=[0,1,2,3,4];
  clip('NaturalIdle',4,idleTimes,{
   Hips:t=>[.004*Math.sin(t*Math.PI/2),.006*Math.sin(t*Math.PI/2),.008*Math.sin(t*Math.PI/2)],
   Spine:t=>[.012*Math.sin(t*Math.PI/2),-.006*Math.sin(t*Math.PI/2),-.008*Math.sin(t*Math.PI/2)],
   Chest:t=>[-.008*Math.sin(t*Math.PI/2),.010*Math.sin(t*Math.PI/2),.006*Math.sin(t*Math.PI/2)],
   Head:t=>[.004*Math.sin(t*Math.PI),.028*Math.sin(t*Math.PI/2+.6),.010*Math.sin(t*Math.PI/2)],
   LeftUpperArm:t=>[-.015+.012*Math.sin(t*Math.PI/2),0,.018],RightUpperArm:t=>[-.015-.012*Math.sin(t*Math.PI/2),0,-.018],
   LeftForeArm:t=>[-.10+.012*Math.sin(t*Math.PI/2),0,0],RightForeArm:t=>[-.10-.012*Math.sin(t*Math.PI/2),0,0]
  },{Hips:t=>[.005*Math.sin(t*Math.PI/2),.003*(1-Math.cos(t*Math.PI)),0]});

  const walkTimes=Array.from({length:17},(_,i)=>i/16);
  clip('NaturalWalk',1,walkTimes,{
   Hips:t=>{const p=t*Math.PI*2;return [.018*Math.sin(p*2),.055*Math.sin(p),.032*Math.sin(p+Math.PI/2)]},
   Spine:t=>{const p=t*Math.PI*2;return [-.015*Math.cos(p*2),-.035*Math.sin(p),-.018*Math.sin(p+Math.PI/2)]},
   Chest:t=>{const p=t*Math.PI*2;return [.012*Math.cos(p*2),-.055*Math.sin(p),.026*Math.sin(p+Math.PI/2)]},
   Head:t=>{const p=t*Math.PI*2;return [-.008*Math.cos(p*2),.020*Math.sin(p),-.012*Math.sin(p+Math.PI/2)]},
   LeftThigh:t=>{const p=t*Math.PI*2;return [-.43*Math.sin(p),0,.018*Math.cos(p)]},RightThigh:t=>{const p=t*Math.PI*2;return [.43*Math.sin(p),0,-.018*Math.cos(p)]},
   LeftShin:t=>{const p=t*Math.PI*2;return [.56*Math.max(0,Math.sin(p-.35)),0,0]},RightShin:t=>{const p=t*Math.PI*2;return [.56*Math.max(0,-Math.sin(p-.35)),0,0]},
   LeftFoot:t=>{const p=t*Math.PI*2;return [-.16*Math.sin(p)+.08*Math.max(0,-Math.cos(p)),0,0]},RightFoot:t=>{const p=t*Math.PI*2;return [.16*Math.sin(p)+.08*Math.max(0,Math.cos(p)),0,0]},
   LeftUpperArm:t=>{const p=t*Math.PI*2;return [.34*Math.sin(p),0,.05]},RightUpperArm:t=>{const p=t*Math.PI*2;return [-.34*Math.sin(p),0,-.05]},
   LeftForeArm:t=>{const p=t*Math.PI*2;return [-.18-.11*Math.max(0,-Math.sin(p)),0,.01]},RightForeArm:t=>{const p=t*Math.PI*2;return [-.18-.11*Math.max(0,Math.sin(p)),0,-.01]},
   LeftHand:t=>{const p=t*Math.PI*2;return [.02*Math.sin(p),0,-.025*Math.sin(p)]},RightHand:t=>{const p=t*Math.PI*2;return [-.02*Math.sin(p),0,.025*Math.sin(p)]}
  },{Hips:t=>{const p=t*Math.PI*2;return [.011*Math.sin(p),.006+.012*Math.abs(Math.sin(p)),.002*Math.cos(p)]}});

  const startTimes=[0,.12,.25,.42];
  clip('NaturalStart',.42,startTimes,{
   Hips:t=>[-.05*smooth01(t/.42),.04*smooth01(t/.42),.02*smooth01(t/.42)],
   Spine:t=>[.035*smooth01(t/.42),-.025*smooth01(t/.42),-.01*smooth01(t/.42)],
   Chest:t=>[.02*smooth01(t/.42),-.04*smooth01(t/.42),.015*smooth01(t/.42)],
   LeftThigh:t=>[-.22*smooth01(t/.42),0,0],RightThigh:t=>[.12*smooth01(t/.42),0,0],
   LeftUpperArm:t=>[.17*smooth01(t/.42),0,.03],RightUpperArm:t=>[-.17*smooth01(t/.42),0,-.03]
  },{Hips:t=>[.004*smooth01(t/.42),.006*smooth01(t/.42),0]});

  const stopTimes=[0,.1,.22,.36];
  clip('NaturalStop',.36,stopTimes,{
   Hips:t=>[-.035*(1-smooth01(t/.36)),.025*(1-smooth01(t/.36)),.018*(1-smooth01(t/.36))],
   Spine:t=>[.025*(1-smooth01(t/.36)),-.02*(1-smooth01(t/.36)),0],
   Chest:t=>[.015*(1-smooth01(t/.36)),-.03*(1-smooth01(t/.36)),0],
   LeftThigh:t=>[-.16*(1-smooth01(t/.36)),0,0],RightThigh:t=>[.10*(1-smooth01(t/.36)),0,0]
  },{Hips:t=>[0,.006*(1-smooth01(t/.36)),0]});

  for(const [name,sign] of [['NaturalTurnLeft',1],['NaturalTurnRight',-1]]){
   const times=[0,.12,.3,.5,.68];
   clip(name,.68,times,{
    Hips:t=>[0,sign*.22*pulse(t,0,.68),sign*.045*pulse(t,0,.68)],Spine:t=>[0,sign*.10*pulse(t,0,.68),-sign*.025*pulse(t,0,.68)],Chest:t=>[0,sign*.16*pulse(t,0,.68),-sign*.035*pulse(t,0,.68)],Head:t=>[0,sign*.22*pulse(t,0,.68),-sign*.02*pulse(t,0,.68)],
    LeftThigh:t=>[-sign*.13*pulse(t,.05,.58),0,0],RightThigh:t=>[sign*.13*pulse(t,.05,.58),0,0]
   });
  }

  const interactTimes=[0,.18,.45,.8,1.05,1.28];
  clip('NaturalInteract',1.28,interactTimes,{
   Chest:t=>[-.035*pulse(t,0,1.28),-.10*pulse(t,0,1.28),0],Head:t=>[.015*pulse(t,0,1.28),-.12*pulse(t,0,1.28),0],
   RightUpperArm:t=>[-.92*pulse(t,.02,1.2),-.06*pulse(t,.02,1.2),-.18*pulse(t,.02,1.2)],RightForeArm:t=>[-.62*pulse(t,.08,1.12),0,-.08*pulse(t,.08,1.12)],RightHand:t=>[.12*pulse(t,.15,1.02),0,.08*pulse(t,.15,1.02)],
   LeftUpperArm:t=>[-.08*pulse(t,0,1.28),0,.03*pulse(t,0,1.28)]
  });

  const reachTimes=[0,.18,.4,.7,.98];
  clip('NaturalReach',.98,reachTimes,{
   Chest:t=>[-.05*pulse(t,0,.98),-.08*pulse(t,0,.98),0],Head:t=>[.025*pulse(t,0,.98),-.07*pulse(t,0,.98),0],
   RightUpperArm:t=>[-1.02*pulse(t,.01,.96),-.08*pulse(t,.01,.96),-.16*pulse(t,.01,.96)],RightForeArm:t=>[-.78*pulse(t,.08,.92),0,-.10*pulse(t,.08,.92)],RightHand:t=>[.10*pulse(t,.12,.9),0,.06*pulse(t,.12,.9)]
  });

  const wearTimes=[0,.22,.5,.78,1.08,1.32];
  clip('NaturalWear',1.32,wearTimes,{
   Chest:t=>[-.045*pulse(t,0,1.32),-.05*pulse(t,0,1.32),0],Head:t=>[-.02*pulse(t,.2,1.25),-.04*pulse(t,.15,1.25),0],
   RightUpperArm:t=>[-1.18*pulse(t,.01,1.3),-.12*pulse(t,.01,1.3),-.22*pulse(t,.01,1.3)],RightForeArm:t=>[-1.02*pulse(t,.08,1.28),0,-.12*pulse(t,.08,1.28)],RightHand:t=>[.18*pulse(t,.18,1.18),0,.10*pulse(t,.18,1.18)],
   LeftUpperArm:t=>[-.18*pulse(t,.15,1.12),.03*pulse(t,.15,1.12),.05*pulse(t,.15,1.12)]
  });
  return clips;
 }

 _play(name,fade=.18,loop=true){const next=this.actions[name];if(!next)return;const old=this.activeAction;if(old&&old!==next)old.fadeOut(fade);next.enabled=true;next.reset();next.setEffectiveWeight(1);next.setEffectiveTimeScale(1);next.clampWhenFinished=!loop;next.setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);next.fadeIn(fade).play();this.activeAction=next;this.activeClip=name;this.motionState=name;this.motionTime=0;}
 selectCharacter(variant){
  const c=this.characters[variant];if(!c)return;
  for(const [key,v] of Object.entries(this.characters))v.hero.visible=key===variant;
  Object.assign(this,c);this.variant=variant;this.body.visible=false;this.activeClip=null;this.activeAction=null;this.motionState='idle';this.motionTime=0;this.motionSpeed=0;this.gesture=null;this.lastPlayerPos=this.player.position.clone();this.lastPlayerYaw=this.player.rotation.y;this.visualLag.set(0,0,0);this.visualYawLag=0;this.hero.position.set(0,0,0);this.hero.rotation.set(0,0,0);this.mixer.stopAllAction();this._play('idle',0,true);
 }
 trigger(name='interact'){
  if(!this.hero||!this.actions[name])return 0;
  this.gesture=name;this._play(name,.12,false);return this.actions[name].getClip().duration||1;
 }
 boneWorld(name){const b=this.heroBones?.[name];if(!b)return null;return b.getWorldPosition(new T.Vector3());}
 update(dt,moving,state,motion={}){if(!this.hero)return;
  this.characterTime+=dt;this.motionTime+=dt;
  const m=motion&&typeof motion==='object'?motion:{};
  const pos=this.player.position.clone(),prev=this.lastPlayerPos||pos.clone(),delta=pos.clone().sub(prev);
  const measured=dt>1e-5?Math.hypot(delta.x,delta.z)/dt:0;
  const yaw=this.player.rotation.y,dyaw=Math.atan2(Math.sin(yaw-this.lastPlayerYaw),Math.cos(yaw-this.lastPlayerYaw));
  const speed=Number.isFinite(m.speed)?Math.max(0,m.speed):(moving?Math.max(measured,1.15):measured);
  const max=Math.max(.1,m.maxSpeed||1.65),norm=T.MathUtils.clamp(speed/max,0,1.2);
  const turn=Number.isFinite(m.turn)?T.MathUtils.clamp(m.turn,-1,1):T.MathUtils.clamp(dt>1e-5?dyaw/(dt*4):0,-1,1);
  this.lastPlayerPos.copy(pos);this.lastPlayerYaw=yaw;
  this.visualLag.addScaledVector(delta,-.38);this.visualLag.x=T.MathUtils.damp(this.visualLag.x,0,11,dt);this.visualLag.z=T.MathUtils.damp(this.visualLag.z,0,11,dt);
  this.visualYawLag-=dyaw*.45;this.visualYawLag=T.MathUtils.damp(this.visualYawLag,0,10,dt);
  this.hero.position.x=this.visualLag.x;this.hero.position.z=this.visualLag.z;this.hero.rotation.y=this.visualYawLag;
  this.motionSpeed=T.MathUtils.damp(this.motionSpeed,norm,moving?7:10,dt);
  const current=this.motionState;
  if(this.gesture){const a=this.actions[this.gesture],duration=a?.getClip().duration||1;if(this.motionTime>=duration-.04){this.gesture=null;this._play(this.motionSpeed>.12?'walk':'idle',.18,true)}}
  else if(this.motionSpeed>.12){
   if(current==='idle'||current==='stop'){this._play('start',.18,false)}
   else if(current==='start'&&this.motionTime>=(this.actions.start?.getClip().duration||.4)-.03)this._play('walk',.16,true);
  }else{
   if(current==='walk'||current==='start'){this._play('stop',.16,false)}
   else if(current==='stop'&&this.motionTime>=(this.actions.stop?.getClip().duration||.35)-.03)this._play('idle',.2,true);
  }
  if(this.actions.walk&&this.motionState==='walk')this.actions.walk.setEffectiveTimeScale(T.MathUtils.clamp(speed/1.55,.62,1.24));
  this.mixer.update(dt);
  const lean=turn*.045*this.motionSpeed;
  const chest=this.heroBones?.Chest,spine=this.heroBones?.Spine,head=this.heroBones?.Head,hips=this.heroBones?.Hips;
  if(hips)hips.rotateZ(-lean*.45);if(spine)spine.rotateZ(lean*.5);if(chest)chest.rotateZ(lean);if(head){head.rotateZ(-lean*.55);head.rotateY(turn*.025*this.motionSpeed)}
  this.hero.updateMatrixWorld(true);
  this.headset.visible=this.variant!=='future';
  const attachBone=(name,offset)=>{const b=this.heroBones?.[name];if(!b)return false;const pos=b.getWorldPosition(new T.Vector3());this.player.worldToLocal(pos);pos.add(new T.Vector3(...offset));this.player.attach(this.headset);this.headset.position.copy(pos);this.headset.rotation.set(0,0,0);return true;};
  if(state==='wearing'&&(m.wearProgress||0)>.22)attachBone('RightHand',this.config.character.handOffset||[0,0,0]);
  else if(state==='worn')attachBone('Head',this.config.character.headOffset||[0,-.02,-.025]);
 }
}
