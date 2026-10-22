import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {CharacterAnimationR8, R8_CLIPS, R8_LOCOMOTION} from './character-animation-r8.js';

const $ = id => document.getElementById(id);
const status = text => { $('status').textContent = text; };
let renderer;
try { renderer = new T.WebGLRenderer({antialias:true}); }
catch (error) { status('WebGL недоступен: '+error.message); throw error; }
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.appendChild(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#171e2a');
scene.add(new T.HemisphereLight(0xffffff,0x44526a,2));
const light = new T.DirectionalLight(0xffffff,2); light.position.set(3,5,4);scene.add(light);
const floor = new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0x334155,roughness:1}));
floor.rotation.x=-Math.PI/2; scene.add(floor);
scene.add(new T.GridHelper(20,40,0x7892b5,0x4b607b));
const player=new T.Group();scene.add(player);
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.01,100);
let root=null,gltf=null,mixer=null,controller=null,active=null,yaw=0,pitch=.1,distance=3.2,face=false,loading=false,turnPlan=null;
const keys=new Set(),target=new T.Vector3(),clock=new T.Clock();
function cameraUpdate(){target.copy(player.position).add(new T.Vector3(0,face?1.58:.9,0));
 camera.position.copy(target).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));camera.lookAt(target);}
function resetPreview(){controller?.dispose();controller=null;mixer?.stopAllAction();active=null;
 if(gltf)mixer=new T.AnimationMixer(gltf.scene);
 keys.clear();turnPlan=null;player.position.set(0,0,0);player.rotation.set(0,0,0);
 if(gltf)for(const node of gltf.scene.children)node.updateMatrixWorld(true);
 for(const button of document.querySelectorAll('[data-gesture]'))button.disabled=true;}
function disposeModel(){resetPreview();if(!root)return;
 root.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[])){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});
 player.remove(root);root=null;gltf=null;}
$('model').onchange=async event=>{
 const file=event.target.files[0];if(!file||loading)return;loading=true;status('Чтение GLB…');
 try{
  const loaded=await new GLTFLoader().parseAsync(await file.arrayBuffer(),'');
  disposeModel();gltf=loaded;root=new T.Group();root.add(gltf.scene);player.add(root);
  const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
  if(!(size.y>0))throw new Error('Некорректные размеры модели');
  gltf.scene.scale.multiplyScalar(1.7/size.y);root.updateMatrixWorld(true);box.setFromObject(root);
  const center=box.getCenter(new T.Vector3());gltf.scene.position.sub(new T.Vector3(center.x,box.min.y,center.z));
  let skins=0,bones=0,triangles=0;root.traverse(o=>{if(o.isBone)bones++;if(o.isSkinnedMesh)skins++;if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  mixer=new T.AnimationMixer(gltf.scene);
  const select=$('clips');select.replaceChildren();
  for(const [i,clip] of gltf.animations.entries()){const option=document.createElement('option');option.value=i;option.textContent=clip.name+' ('+clip.duration.toFixed(2)+' с)';select.append(option);}
  select.disabled=!gltf.animations.length;$('play').disabled=!gltf.animations.length;$('rest').disabled=false;
  const missing=Object.values(R8_CLIPS).filter(name=>!gltf.animations.some(c=>c.name===name&&c.tracks.length));
  $('enable').disabled=!skins||R8_LOCOMOTION.some(key=>missing.includes(R8_CLIPS[key]));
  const measured=gltf.parser.json.asset.extras?.r8?.clips?.Walk?.referenceSpeed;if(Number.isFinite(measured))$('walk-speed').value=measured.toFixed(4);
  $('info').textContent=JSON.stringify({file:file.name,bytes:file.size,originalDimensions:size.toArray(),displayHeight:1.7,triangles,skinnedMeshes:skins,bones,clips:gltf.animations.map(c=>c.name),missingR8Clips:missing},null,2);
  status(!skins?'Скелет отсутствует. Доступен осмотр геометрии; ходьба не включена.':missing.length?'Скелет найден. Для полного теста R8 не хватает клипов.':'Скелет и клипы найдены. Требуется визуальная проверка.');
  face=false;yaw=0;pitch=.1;distance=3.2;
 }catch(error){disposeModel();$('enable').disabled=true;status('Ошибка загрузки: '+error.message);}
 finally{loading=false;}
};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{
 face=button.dataset.view==='face';yaw=button.dataset.view==='back'?Math.PI:button.dataset.view==='left'?Math.PI/2:0;pitch=face?0:.1;distance=face?.65:3.2;
};
$('play').onclick=()=>{resetPreview();const clip=gltf.animations[Number($('clips').value)];active=mixer.clipAction(clip);active.play();status('Встроенный клип: '+clip.name+'. Качество движения оценивается визуально.');};
$('rest').onclick=()=>{resetPreview();if(gltf){root.traverse(o=>{if(o.isSkinnedMesh)o.pose();});}status('Поза покоя.');};
$('enable').onclick=()=>{
 try {resetPreview();controller=new CharacterAnimationR8(gltf.scene,gltf.animations,{walkSpeed:Number($('walk-speed').value),requiredStates:R8_LOCOMOTION});mixer=null;
  for(const button of document.querySelectorAll('[data-gesture]'))button.disabled=!controller.actions[button.dataset.gesture];
  status('Тест управления активен. Проверьте контакт стоп и длину шага.');
 }catch(error){status(error.message);}
};
for(const button of document.querySelectorAll('[data-gesture]'))button.onclick=()=>controller?.trigger(button.dataset.gesture);
addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;
 const k=e.key.toLowerCase();keys.add(k);if(k.startsWith('arrow'))e.preventDefault();
 if(controller&&!e.repeat){if((k==='q'||k==='r')&&controller.state==='idle'){
  const side=k==='q'?'left':'right';controller.update(0,{speed:0,turn:side});
  turnPlan={start:player.rotation.y,angle:T.MathUtils.degToRad(gltf.parser.json.asset.extras?.r8?.clips?.[k==='q'?'TurnLeft':'TurnRight']?.turnAngleDegrees||(k==='q'?90:-90)),time:0,duration:controller.active.getClip().duration};
 }if(k==='e')controller.trigger('interact');}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
let dragging=false,lastX=0,lastY=0;
renderer.domElement.onpointerdown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointerup=()=>dragging=false;
renderer.domElement.onpointermove=e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.008;pitch=T.MathUtils.clamp(pitch+(e.clientY-lastY)*.008,-.35,1.2);lastX=e.clientX;lastY=e.clientY;};
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.002,.3,8);},{passive:false});
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);
 if(controller){const previous=player.position.clone(),direction=new T.Vector3((keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),0,(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0));
  if(!controller.gesture&&direction.lengthSq()){turnPlan=null;direction.normalize();player.position.addScaledVector(direction,1.4*dt);player.position.x=T.MathUtils.clamp(player.position.x,-4,4);player.position.z=T.MathUtils.clamp(player.position.z,-4,4);const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(direction.x,direction.z));player.quaternion.rotateTowards(rotation,3*dt);}
  if(turnPlan){turnPlan.time+=dt;const progress=Math.min(1,turnPlan.time/turnPlan.duration);player.rotation.y=turnPlan.start+turnPlan.angle*progress;if(progress===1)turnPlan=null;}
  controller.update(dt,{speed:dt>1e-6?player.position.distanceTo(previous)/dt:0});
 }else mixer?.update(dt);
 cameraUpdate();renderer.render(scene,camera);
}frame();
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
