import {CharacterMotion} from './character-motion.js';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {BASE_POSITIONS} from './defaults.js';
export function assetURL(path){return globalThis.ROOM_EMBEDDED?.[path]||path;}
export async function readConfig(){const c=globalThis.ROOM_CONFIG||await fetch('config/room.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Не найден config/room.json');return r.json()});validateConfig(c);return c;}
function vec(x,n,label){if(!Array.isArray(x)||x.length!==n||!x.every(Number.isFinite))throw Error(`Неверное поле ${label}`)}
export function validateConfig(c){if(c.version!==1)throw Error('Неверная версия room.json');vec(c.character.spawn,3,'character.spawn');vec(c.character.rotation,3,'character.rotation');if(!(c.character.height>0))throw Error('Рост должен быть положительным');for(const [id,o] of Object.entries(c.objects)){vec(o.position,3,id+'.position');vec(o.rotation,3,id+'.rotation');vec(o.fit,3,id+'.fit');if(o.fit.some(x=>x<=0)||!(o.scale>0))throw Error('Размер должен быть положительным: '+id);if(o.parent&&!c.objects[o.parent])throw Error('Неизвестный родитель: '+o.parent);let seen=new Set([id]),p=o.parent;while(p){if(seen.has(p))throw Error('Цикл родителей '+id);seen.add(p);p=c.objects[p].parent}}for(const w of ['left','right','front','back']){vec(c.walls[w].repeat,2,w+'.repeat');if(c.walls[w].repeat.some(x=>x<=0))throw Error('Повтор текстуры должен быть положительным')}vec(c.glasses.tableOffset,3,'glasses.tableOffset');}
export function fitModel(root,size,rotation=[0,0,0],heightOnly=false){const wrapper=new T.Group();root.rotation.x+=T.MathUtils.degToRad(rotation[0]);root.rotation.y+=T.MathUtils.degToRad(rotation[1]);root.rotation.z+=T.MathUtils.degToRad(rotation[2]);wrapper.add(root);wrapper.updateMatrixWorld(true);let box=new T.Box3().setFromObject(wrapper),dims=box.getSize(new T.Vector3());if(!Number.isFinite(dims.length())||dims.y<1e-6)throw Error('Модель имеет пустые или некорректные размеры');const ratio=heightOnly?size[1]/dims.y:Math.min(...size.map((x,i)=>x/Math.max(dims.getComponent(i),1e-6)));root.scale.multiplyScalar(ratio);wrapper.updateMatrixWorld(true);box.setFromObject(wrapper);const center=box.getCenter(new T.Vector3());root.position.sub(new T.Vector3(center.x,box.min.y,center.z));wrapper.updateMatrixWorld(true);return wrapper;}

const MOTION_NAMES={
 interact:'NaturalInteract',
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
    const generated=this.makeGestureClips(heroBones,boneRest);
    const clips=[...(r.animations||[]),...generated];
    const configured={...(c.animations||{}),...MOTION_NAMES};
    for(const [key,name] of Object.entries(configured)){const clip=clips.find(x=>x.name===name);if(clip){const a=mixer.clipAction(clip);a.enabled=true;actions[key]=a;}}
    const motion=new CharacterMotion({player:this.player,hero,bones:heroBones,rest:boneRest});
    const headRest=heroBones.Head?this.player.getWorldQuaternion(new T.Quaternion()).invert().multiply(heroBones.Head.getWorldQuaternion(new T.Quaternion())):new T.Quaternion();
    this.characters[variant]={hero,mixer,actions,heroBones,boneRest,clips,motion,headRest};
   }catch(e){this.warn('Персонаж '+variant,e);}
  }
  this.selectCharacter('base');
 }
 prepare(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false}})}
 rebuildCollisions(){for(let i=this.obstacles.length-1;i>=0;i--)if(this.groups.has(this.obstacles[i].slot))this.obstacles.splice(i,1);for(const [id,c] of Object.entries(this.config.objects)){if(!c.collision||c.enabled===false)continue;const group=this.groups.get(id);let b=new T.Box3();group.traverse(o=>{if(o.isMesh&&this.visible(o,group)){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))}});if(b.isEmpty())continue;const d=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());this.obstacles.push({slot:id,x:center.x,z:center.z,w:d.x/2+.23,d:d.z/2+.23});}}
 visible(o,root){for(let p=o;p&&p!==root;p=p.parent)if(!p.visible)return false;return true}

 makeGestureClips(bones,rest){
  const clips=[];
  const has=n=>bones[n]&&rest[n];
  const qtrack=(name,times,fn)=>{if(!has(name))return null;const values=[];for(const t of times)values.push(...addEuler(rest[name].q,...fn(t)));return new T.QuaternionKeyframeTrack(`${name}.quaternion`,times,values)};
  const ptrack=(name,times,fn)=>{if(!has(name))return null;const values=[];for(const t of times){const o=fn(t),p=rest[name].p;values.push(p.x+(o[0]||0),p.y+(o[1]||0),p.z+(o[2]||0))}return new T.VectorKeyframeTrack(`${name}.position`,times,values)};
  const clip=(name,duration,times,defs,posDefs={})=>{const tracks=[];for(const [bone,fn] of Object.entries(defs)){const tr=qtrack(bone,times,fn);if(tr)tracks.push(tr)}for(const [bone,fn] of Object.entries(posDefs)){const tr=ptrack(bone,times,fn);if(tr)tracks.push(tr)}const c=new T.AnimationClip(name,duration,tracks);clips.push(c);return c};

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
  Object.assign(this,c);this.variant=variant;this.body.visible=false;this.activeClip=null;this.activeAction=null;this.motionState='idle';this.motionTime=0;this.motionSpeed=0;this.gesture=null;this.lastPlayerPos=this.player.position.clone();this.lastPlayerYaw=this.player.rotation.y;this.visualLag.set(0,0,0);this.visualYawLag=0;this.hero.position.set(0,0,0);this.hero.rotation.set(0,0,0);this.mixer.stopAllAction();this.motion.reset();
 }
 trigger(name='interact'){
  if(!this.hero||!this.actions[name])return 0;
  this.gesture=name;this._play(name,.12,false);return this.actions[name].getClip().duration||1;
 }
 boneWorld(name){const b=this.heroBones?.[name];if(!b)return null;return b.getWorldPosition(new T.Vector3());}
 resetMotion(){this.motion?.reset();}
 update(dt,moving,state,motion={}){
  if(!this.hero)return;
  const m=motion&&typeof motion==='object'?motion:{};
  this.motion.update(dt,m);
  // One-shot gestures affect only the upper body; planted legs retain their IK pose.
  if(this.gesture&&dt>0){
   this.motionTime+=dt;
   const pose={};for(const name of ['Chest','Head','RightUpperArm','RightForeArm','RightHand','LeftUpperArm'])if(this.heroBones[name])pose[name]=this.heroBones[name].quaternion.clone();
   this.mixer.update(dt);
   const duration=this.actions[this.gesture]?.getClip().duration||1;
   const weight=Math.min(1,this.motionTime/.15,(duration-this.motionTime)/.18);
   for(const [name,q] of Object.entries(pose))this.heroBones[name].quaternion.copy(q.slerp(this.heroBones[name].quaternion,Math.max(0,weight)));
   if(this.motionTime>=duration){this.gesture=null;this.mixer.stopAllAction();}
  }
  this.hero.updateWorldMatrix(true,true);
  this.headset.visible=this.variant!=='future';
  const attachBone=(name,offset)=>{
   const b=this.heroBones?.[name];if(!b)return;
   const pos=this.player.worldToLocal(b.getWorldPosition(new T.Vector3()));
   const q=this.player.getWorldQuaternion(new T.Quaternion()).invert().multiply(b.getWorldQuaternion(new T.Quaternion()));
   if(name==='Head')q.multiply(this.headRest.clone().invert());
   pos.add(new T.Vector3(...offset).applyQuaternion(q));
   if(this.headset.parent!==this.player)this.player.attach(this.headset);
   this.headset.position.copy(pos);this.headset.quaternion.copy(q);
  };
  if(state==='wearing'&&(m.wearProgress||0)>.22)attachBone('RightHand',this.config.character.handOffset||[0,0,0]);
  else if(state==='worn')attachBone('Head',this.config.character.headOffset||[0,-.02,-.025]);
 }
}
