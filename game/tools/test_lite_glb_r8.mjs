import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {CharacterAnimationR8,R8_LOCOMOTION} from '../src/character-animation-r8.js';
const path=process.argv[2];const bytes=fs.readFileSync(path);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const controller=new CharacterAnimationR8(gltf.scene,gltf.animations,{walkSpeed:1.098108922,requiredStates:R8_LOCOMOTION});
let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert(mesh);assert.equal(mesh.skeleton.bones.length,21);
const states=new Set();let frames=0;const v=new T.Vector3();
function run(seconds,speed,turn=null){for(let t=0;t<seconds;t+=1/60){controller.update(1/60,{speed,turn:t===0?turn:null});gltf.scene.updateMatrixWorld(true);mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i+=17){mesh.getVertexPosition(i,v);assert(Number.isFinite(v.lengthSq()));}states.add(controller.state);frames++;}}
run(.3,0);run(2.6,1.098108922);run(1.4,0);run(2,0,'left');run(2.4,0,'right');
for(const state of R8_LOCOMOTION)assert(states.has(state),state);
assert.equal(controller.trigger('wear'),false);controller.dispose();
console.log(JSON.stringify({passed:true,actualGLB:path,frames,states:[...states],missingGesturesNotFabricated:true}));
