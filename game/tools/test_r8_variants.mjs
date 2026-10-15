import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {CharacterAnimationR8,R8_LOCOMOTION} from '../src/character-animation-r8.js';
const base=new URL('../',import.meta.url);
let source=fs.readFileSync(new URL('../r8/src/assets.js',import.meta.url),'utf8');
source=source.replaceAll(/room-module\/([^']+)/g,(_,p)=>new URL(p,base).href);
const {AssetSystem}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
globalThis.document={getElementById:()=>null};
const body={visible:true},player=new T.Group(),headset=new T.Group();player.add(headset);
const assets=new AssetSystem({body,player,headset,config:{character:{headOffset:[0,0,0]}}});assert.equal(body.visible,false);
const bytes=fs.readFileSync(new URL('../assets/characters/r8/borup-r8-lite-rigged.glb',import.meta.url));assets.characters={};
for(const variant of ['base','future']){
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const hero=new T.Group();hero.add(g.scene);player.add(hero);
 const controller=new CharacterAnimationR8(g.scene,g.animations,{walkSpeed:1.098108922,requiredStates:R8_LOCOMOTION});
 assets.characters[variant]={hero,controller,mixer:controller.mixer,heroBones:{}};
}
const transitions=[];
for(const variant of ['base','future','base']){
 assets.selectCharacter(variant);assert.equal(body.visible,false);
 for(const [name,c] of Object.entries(assets.characters))assert.equal(c.hero.visible,name===variant);
 for(let i=0;i<140;i++){player.position.z+=1.098108922/60;assets.update(1/60,true,'table');}
 assert.equal(assets.controller.state,'walk');
 for(let i=0;i<100;i++)assets.update(1/60,false,'table');assert.equal(assets.controller.state,'idle');
 transitions.push({variant,walk:true,stop:true,oldBodyVisible:body.visible});
}
console.log(JSON.stringify({passed:true,transitions,note:'Real GLB/adapter test; does not replace browser room-traversal or visual acceptance.'}));
