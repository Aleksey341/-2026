import * as T from 'room-module/vendor/three.module.js';
import {GLTFLoader} from 'room-module/vendor/loaders/GLTFLoader.js';
import {BASE_POSITIONS} from 'room-module/src/defaults.js';
export function assetURL(path){return globalThis.ROOM_EMBEDDED?.[path]||path;}
export async function readConfig(){const c=globalThis.ROOM_CONFIG||await fetch('config/room.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Не найден config/room.json');return r.json()});validateConfig(c);return c;}
function vec(x,n,label){if(!Array.isArray(x)||x.length!==n||!x.every(Number.isFinite))throw Error(`Неверное поле ${label}`)}
export function validateConfig(c){if(c.version!==1)throw Error('Неверная версия room.json');vec(c.character.spawn,3,'character.spawn');vec(c.character.rotation,3,'character.rotation');if(!(c.character.height>0))throw Error('Рост должен быть положительным');for(const [id,o] of Object.entries(c.objects)){vec(o.position,3,id+'.position');vec(o.rotation,3,id+'.rotation');vec(o.fit,3,id+'.fit');if(o.fit.some(x=>x<=0)||!(o.scale>0))throw Error('Размер должен быть положительным: '+id);if(o.parent&&!c.objects[o.parent])throw Error('Неизвестный родитель: '+o.parent);let seen=new Set([id]),p=o.parent;while(p){if(seen.has(p))throw Error('Цикл родителей '+id);seen.add(p);p=c.objects[p].parent}}for(const w of ['left','right','front','back']){vec(c.walls[w].repeat,2,w+'.repeat');if(c.walls[w].repeat.some(x=>x<=0))throw Error('Повтор текстуры должен быть положительным')}vec(c.glasses.tableOffset,3,'glasses.tableOffset');}
export function fitModel(root,size,rotation=[0,0,0],heightOnly=false){const wrapper=new T.Group();root.rotation.x+=T.MathUtils.degToRad(rotation[0]);root.rotation.y+=T.MathUtils.degToRad(rotation[1]);root.rotation.z+=T.MathUtils.degToRad(rotation[2]);wrapper.add(root);wrapper.updateMatrixWorld(true);let box=new T.Box3().setFromObject(wrapper),dims=box.getSize(new T.Vector3());if(!Number.isFinite(dims.length())||dims.y<1e-6)throw Error('Модель имеет пустые или некорректные размеры');const ratio=heightOnly?size[1]/dims.y:Math.min(...size.map((x,i)=>x/Math.max(dims.getComponent(i),1e-6)));root.scale.multiplyScalar(ratio);wrapper.updateMatrixWorld(true);box.setFromObject(wrapper);const center=box.getCenter(new T.Vector3());root.position.sub(new T.Vector3(center.x,box.min.y,center.z));wrapper.updateMatrixWorld(true);return wrapper;}
export class AssetSystem{
 constructor(x){Object.assign(this,x);this.groups=new Map();this.fallback=new Map();this.errors=[];this.hero=null;this.activeClip=null;this.mixer=null;this.actions={};this.loader=new GLTFLoader();this.cache=new Map();}
 warn(name,e){this.errors.push(`${name}: ${e.message||e}`);console.warn(name,e);const node=document.getElementById('asset-status');if(node){node.hidden=false;node.textContent='Не загружено ассетов: '+this.errors.length;node.title=this.errors.join('\n')}const details=document.getElementById('asset-errors');if(details)details.textContent=this.errors.join('\n');}
 async load(path){if(!path)return null;if(!this.cache.has(path))this.cache.set(path,this.loader.loadAsync(assetURL(path)));const r=await this.cache.get(path);if(path===this.config.character.model)return r;return {...r,scene:r.scene.clone(true)};}
 async initialize(){
  // Build stable pivot groups before asynchronous loads, including child objects.
  for(const [id,objects] of Object.entries(this.records)){const g=new T.Group();g.name=id;g.position.fromArray(BASE_POSITIONS[id]||[0,0,0]);this.world.add(g);this.world.updateMatrixWorld(true);for(const o of objects)g.attach(o);this.groups.set(id,g);this.fallback.set(id,[...g.children]);}
  for(const id of Object.keys(this.config.objects)){if(!this.groups.has(id)){const g=new T.Group();g.name=id;this.world.add(g);this.groups.set(id,g);this.fallback.set(id,[])}}
  for(const [id,c] of Object.entries(this.config.objects)){let g=this.groups.get(id);if(!g){g=new T.Group();g.name=id;this.world.add(g);this.groups.set(id,g);this.fallback.set(id,[])}const parent=c.parent?this.groups.get(c.parent):this.world;parent.add(g);g.position.fromArray(c.position);g.rotation.set(...c.rotation.map(T.MathUtils.degToRad));g.scale.setScalar(c.scale);}
  if(globalThis.ROOM_EXPORT_MODE)return;
  // Load sequentially for predictable memory use; errors retain the visible fallback.
  for(const [id,c] of Object.entries(this.config.objects)){if(c.enabled===false){this.groups.get(id).visible=false;continue;}if(!c.model)continue;try{const result=await this.load(c.model);const visual=fitModel(result.scene,c.fit);const g=this.groups.get(id);for(const o of this.fallback.get(id))o.visible=false;g.add(visual);this.prepare(visual);}catch(e){this.warn(id,e)}}
  this.world.updateMatrixWorld(true);this.rebuildCollisions();
  await Promise.all(Object.entries(this.wallSurfaces).map(async([id,surfaces])=>{const c=this.config.walls[id];try{const tex=c.texture?await new T.TextureLoader().loadAsync(assetURL(c.texture)):null;if(tex){tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.fromArray(c.repeat);tex.center.set(.5,.5);tex.rotation=T.MathUtils.degToRad(c.rotation||0);tex.anisotropy=4}for(const o of surfaces){o.material.map=tex;o.material.color.set(c.color||'#ffffff');o.material.needsUpdate=true}}catch(e){this.warn('Стена '+id,e)}}));
  try{if(this.config.glasses.model){const r=await this.load(this.config.glasses.model);const v=fitModel(r.scene,this.config.glasses.size,this.config.glasses.rotation);for(const o of this.headset.children)o.visible=false;this.headset.add(v);this.prepare(v)}}catch(e){this.warn('VR-очки',e)}
  this.characters={};
  if(this.config.character.useProcedural){
   this.hero=this.body;this.heroBones={head:this.head};this.mixer={stopAllAction(){},update(){}};this.actions={};
   this.body.visible=true;this.selectCharacter('base');
  }else{
   const c=this.config.character;
   const uniquePaths=[...new Set([c.model,c.futureModel].filter(Boolean))];
   const loaded=new Map();
   for(const path of uniquePaths){
    try{
     const r=await this.loader.loadAsync(assetURL(path));
     const root=r.scene;
     const hero=fitModel(root,[1,c.height,1],c.rotation,true);
     this.player.add(hero);hero.visible=false;this.prepare(hero);
     const mixer=new T.AnimationMixer(root),actions={},heroBones={};
     for(const [key,name] of Object.entries(c.animations||{})){
      const clip=r.animations.find(x=>x.name===name)||r.animations.find(x=>x.name?.includes?.(name))||(key==='walk'?r.animations[0]:null);
      if(!clip){this.warn('Клип '+key,new Error('не найден: '+name));continue;}
      const action=mixer.clipAction(clip);
      action.setLoop(T.LoopRepeat,Infinity);
      action.clampWhenFinished=false;
      action.timeScale=c.walkTimeScale??.8;
      actions[key]=action;
     }
     hero.traverse(o=>{if(o.isBone){heroBones[o.name]=o;if(o.name==='Head'||o.name==='head')heroBones.head=o;}});
     if(!heroBones.head){const any=Object.values(heroBones)[0];if(any)heroBones.head=any;}
     loaded.set(path,{hero,mixer,actions,heroBones,clips:r.animations.map(a=>a.name)});
     console.info('[character]',path,'clips:',r.animations.map(a=>a.name),'heightScale→',c.height);
    }catch(e){this.warn('Персонаж '+path,e);}
   }
   const base=loaded.get(c.model)||[...loaded.values()][0];
   const future=loaded.get(c.futureModel)||base;
   if(base)this.characters.base=base;
   if(future)this.characters.future=future;
   this.selectCharacter('base');
  }
 }
 prepare(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.map)m.map.colorSpace=T.SRGBColorSpace;m.needsUpdate=true;}}}});}
 rebuildCollisions(){for(let i=this.obstacles.length-1;i>=0;i--)if(this.groups.has(this.obstacles[i].slot))this.obstacles.splice(i,1);for(const [id,c] of Object.entries(this.config.objects)){if(!c.collision||c.enabled===false)continue;const group=this.groups.get(id);let b=new T.Box3();group.traverse(o=>{if(o.isMesh&&this.visible(o,group)){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))}});if(b.isEmpty())continue;const d=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());this.obstacles.push({slot:id,x:center.x,z:center.z,w:d.x/2+.23,d:d.z/2+.23});}}
 visible(o,root){for(let p=o;p&&p!==root;p=p.parent)if(!p.visible)return false;return true}
 selectCharacter(variant){
  this.variant=variant;
  if(this.config.character.useProcedural){
   this.body.visible=true;this.hero=this.body;this.heroBones={head:this.head};this.activeClip=null;
   if(typeof this.onVariant==='function')this.onVariant(variant);
   return;
  }
  const c=this.characters[variant]||this.characters.base;if(!c)return;
  const seen=new Set();
  for(const v of Object.values(this.characters)){
   if(seen.has(v))continue;seen.add(v);
   v.hero.visible=v===c;
   if(v!==c)v.mixer.stopAllAction();
  }
  Object.assign(this,{hero:c.hero,mixer:c.mixer,actions:c.actions,heroBones:c.heroBones});
  this.body.visible=false;this.activeClip=null;
  if(typeof this.onVariant==='function')this.onVariant(variant);
 }
 update(dt,moving,state){if(!this.hero)return;
  if(!this.config.character.useProcedural){
   const walk=this.actions?.walk;
   if(walk){
    const speed=this.config.character.walkTimeScale??.8;
    walk.timeScale=speed;
    if(moving){
     if(this.activeClip!=='walk'){walk.reset();walk.fadeIn(.18);walk.play();this.activeClip='walk';}
    }else if(this.activeClip==='walk'){
     walk.fadeOut(.22);this.activeClip='rest';
    }
    this.mixer.update(dt);
   }else{
    // Legacy fallback for older Mixamo-style skeletons without usable clips.
    this.walkBlend=T.MathUtils.damp(this.walkBlend||0,moving?1:0,7,dt);this.walkPhase=(this.walkPhase||0)+dt*2*Math.PI/1.05;const w=this.walkBlend,phase=this.walkPhase;
    const rot=(name,x=0,y=0,z=0)=>{const b=this.heroBones[name];if(b)b.rotation.set(x*w,y*w,z*w);};
    for(const [side,off,sign] of [['Left',0,1],['Right',Math.PI,-1]]){const p=phase+off;const swing=Math.sin(p);rot(side+'Thigh',-.30*swing,0,sign*.012);rot(side+'Shin',.48*Math.pow(Math.max(0,-swing),1.5));rot(side+'Foot',.13*swing-.12*Math.max(0,-Math.cos(p)));rot(side+'UpperArm',.19*swing,0,-sign*.10);rot(side+'ForeArm',-.10-.07*Math.max(0,swing));rot(side+'Hand',0,0,0);}
    rot('Hips',0,.025*Math.sin(phase),.018*Math.cos(phase));rot('Spine',.015,-.025*Math.sin(phase),-.013*Math.cos(phase));rot('Chest',0,-.018*Math.sin(phase),0);rot('Head',0,.01*Math.sin(phase),0);
    this.hero.position.y=.009*(1-Math.cos(2*phase))*w;this.activeClip=moving?'walk':'rest';
   }
   this.hero.updateMatrixWorld(true);
  }

  this.headset.visible=false;
  if(state==='worn'&&this.config.character.useProcedural&&this.heroBones?.head){const pos=this.heroBones.head.getWorldPosition(new T.Vector3());this.player.worldToLocal(pos);pos.add(new T.Vector3(...this.config.character.headOffset));this.player.attach(this.headset);this.headset.position.copy(pos);this.headset.rotation.set(0,0,0);}
 }
}
