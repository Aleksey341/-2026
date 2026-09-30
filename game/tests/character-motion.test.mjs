import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {fitModel} from '../src/assets.js';
import {CharacterMotion, MotionDrive} from '../src/character-motion.js';

// Load actual geometry, skin, bind poses and hierarchy without a GPU or texture DOM.
globalThis.ProgressEvent ??= class { constructor(type, fields) {Object.assign(this,{type},fields);} };
async function fixture(variant) {
 const buffer=await readFile(new URL(`../assets/models/heroine-${variant}-walk.glb`,import.meta.url));
 const size=buffer.readUInt32LE(12), json=JSON.parse(buffer.subarray(20,20+size));
 const binStart=20+size, binSize=buffer.readUInt32LE(binStart);
 json.buffers[0].uri='data:application/octet-stream;base64,'+buffer.subarray(binStart+8,binStart+8+binSize).toString('base64');
 delete json.images;delete json.textures;delete json.materials;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
 const player=new T.Group(),hero=fitModel(gltf.scene,[1,1.7,1],[0,180,0],true);player.add(hero);
 const bones={},rest={};hero.traverse(o=>{if(o.isBone){bones[o.name]=o;rest[o.name]={q:o.quaternion.clone(),p:o.position.clone()};}});
 const motion=new CharacterMotion({player,hero,bones,rest}),drive=new MotionDrive();
 return {player,hero,bones,rest,motion,drive};
}
function tick(f,dt,input={x:0,z:0},blocked=()=>false) {
 const m=f.drive.update(dt,f.player,input,blocked);f.motion.update(dt,m);return m;
}
function finite(f) {for(const b of Object.values(f.bones)){assert.ok([...b.position.toArray(),...b.quaternion.toArray()].every(Number.isFinite));assert.ok(Math.abs(b.quaternion.length()-1)<1e-5);}}
for(const variant of ['purple','white']) {
 test(`${variant}: support feet, gait, stop, turns and collision`,async()=>{
  const f=await fixture(variant);assert.ok(f.motion.ready);
  
  let maxError=0,maxSlip=0,steps=0;
  for(let i=0;i<360;i++) {
   const before=f.motion.legs.map(l=>({plant:l.plant.clone(),swing:l.swing}));
   tick(f,1/60,{x:0,z:-1});finite(f);
   for(const l of f.motion.legs){maxError=Math.max(maxError,l.error);if(!before[l.index].swing&&!l.swing)maxSlip=Math.max(maxSlip,before[l.index].plant.distanceTo(l.plant));if(before[l.index].swing&&!l.swing)steps++;}
  }
  console.log(variant,{maxError,maxSlip,steps,z:f.player.position.z});
  assert.ok(steps>10);assert.ok(maxSlip<1e-8,'support target must not slide');assert.ok(maxError<.025,`IK reach error ${maxError}`);
  for(let i=0;i<150;i++)tick(f,1/60);
  assert.ok(f.drive.velocity.length()<1e-5);assert.equal(f.motion.activeLeg,null,'finish swing and settle both feet');
  for(const l of f.motion.legs)assert.ok(l.plant.distanceTo(f.motion.nominal(l))<.05);
  for(let i=0;i<150;i++){tick(f,1/60,{x:0,z:1});for(const l of f.motion.legs)assert.ok(l.error<.025,'turn reach');}finite(f);
  assert.ok(Math.abs(Math.abs(f.player.rotation.y)-Math.PI)<.1,'complete reversal');
  for(let i=0;i<150;i++){tick(f,1/60,{x:1,z:0},()=>true);for(const l of f.motion.legs)assert.ok(l.error<.025,'collision reach');}
  assert.equal(f.motion.activeLeg,null,'blocked translation settles feet after turning');finite(f);
 });
 test(`${variant}: shoes above floor at 30 FPS and during reversal`,async()=>{
  const f=await fixture(variant);let minimum=Infinity;
  for(let i=0;i<180;i++){
   tick(f,1/30,{x:i<90?0:1,z:i<90?-1:0});
   for(const l of f.motion.legs)assert.ok(l.error<.025,'30fps IK reach');
   if(i%6)continue;
   f.hero.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const v=new T.Vector3();for(let j=0;j<o.geometry.attributes.position.count;j++){o.getVertexPosition(j,v);v.applyMatrix4(o.matrixWorld);minimum=Math.min(minimum,v.y);}}});
  }
  console.log(variant,'lowest skinned vertex',minimum);
  assert.ok(minimum>-.015,`visible mesh penetrates floor: ${minimum}`);
 });
 test(`${variant}: upright posture through idle, walking and stopping`,async()=>{
  const f=await fixture(variant), initialHeight=f.bones.Hips.getWorldPosition(new T.Vector3()).y;
  let maxDrop=0,maxSupportFlex=0;
  for(let i=0;i<600;i++){
   tick(f,1/60,i<100||i>480?{x:0,z:0}:{x:0,z:-1});
   const drop=initialHeight-f.bones.Hips.getWorldPosition(new T.Vector3()).y;
   maxDrop=Math.max(maxDrop,drop);
   if(i===90||i===590)assert.ok(drop<.012,'idle must not crouch');
   for(const l of f.motion.legs){
    const hip=l.thigh.getWorldPosition(new T.Vector3()),knee=l.shin.getWorldPosition(new T.Vector3()),foot=l.foot.getWorldPosition(new T.Vector3());
    const flex=180-hip.sub(knee).angleTo(foot.sub(knee))*180/Math.PI;
    if(!l.swing)maxSupportFlex=Math.max(maxSupportFlex,flex);
   }
  }
  assert.ok(maxDrop<.055,`pelvis drop ${maxDrop}`);
  assert.ok(maxSupportFlex<45,`support knee flex ${maxSupportFlex}`);
 });
 test(`${variant}: pause, teleport, attention and bounded idle`,async()=>{
  const f=await fixture(variant);
  for(let i=0;i<40;i++)tick(f,1/60,{x:1,z:0});
  const pose=Object.values(f.bones).map(b=>b.quaternion.toArray());
  for(let i=0;i<20;i++)tick(f,0,{x:1,z:0});
  assert.deepEqual(Object.values(f.bones).map(b=>b.quaternion.toArray()),pose);
  f.player.position.set(50,0,0);f.player.rotation.y=0;f.drive.reset();f.motion.reset();
  for(const l of f.motion.legs)assert.ok(Math.abs(l.plant.x-50)<.3);
  for(let i=0;i<600;i++)f.motion.update(1/60,{velocity:new T.Vector3(),lookTarget:new T.Vector3(51,1.8,-2)});
  finite(f);assert.ok(f.motion.lookYaw<-.2);assert.ok(f.motion.lookPitch>0);
  for(const l of f.motion.legs)assert.ok(l.error<.025);
 });
}
test('drive: anticipation, acceleration, diagonal speed and independent frame rate',()=>{
 const results=[];
 for(const fps of [30,60,120]){
  const player=new T.Group(),drive=new MotionDrive();let previous=0;
  for(let i=0;i<fps*4;i++){
   const m=drive.update(1/fps,player,{x:1,z:-1},()=>false);
   assert.ok(m.speed<=1.05+1e-8);assert.ok(Math.abs(m.speed-previous)<=4.2/fps+1e-7);previous=m.speed;
   if(i===0)assert.equal(player.position.length(),0,'weight transfer precedes translation');
  }
  results.push(player.position.length());
 }
 assert.ok(Math.max(...results)-Math.min(...results)<.08);
});
