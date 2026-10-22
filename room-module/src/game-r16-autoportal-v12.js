import {createGameProgress} from 'room-module/src/progress.js';
import {createElevatorController} from 'room-module/src/elevator.js';
import {createShowcaseUI} from 'room-module/src/showcase-ui.js';
import {themeImage} from 'room-module/src/slide-theme.js';
import {makeReactorRoom} from 'room-module/src/reactor-room.js';
import {makeTelevision} from 'room-module/src/television.js';
import {energyReactor} from 'room-module/src/retro.js';
import {makeFuture} from 'room-module/src/future-r16-v12-fixed-ring.js?v=v12-ringfix-2';
import {applyR16Environment} from './graphite-r16.js';
import * as T from 'room-module/vendor/three.module.js';
import {AssetSystem, readConfig, assetURL} from 'room-module/src/assets.js';
const CONFIG=await readConfig();
// R15: remove VR gate and its visual assets.
CONFIG.glasses.model=null;if(CONFIG.objects['glasses-stand'])CONFIG.objects['glasses-stand'].enabled=false;
// Toggle: true = Meshy businessman walk GLB; false = previous procedural avatar (quick rollback).
const USE_MESHY_BUSINESSMAN=true;
if(USE_MESHY_BUSINESSMAN){
 CONFIG.character.useProcedural=false;
 // V3 clean Meshy walking rig. V1/V2 kept for rollback (walk.glb / walk-v2.glb).
 CONFIG.character.model='assets/models/hero-businessman-walk-v3.glb';
 CONFIG.character.futureModel='assets/models/hero-businessman-walk-v3.glb';
 CONFIG.character.height=1.80;
 // Meshy faces +Z; player forward at yaw=0 is -Z → yaw 180° on the model.
 CONFIG.character.rotation=[0,180,0];
 CONFIG.character.animations={walk:'Armature|walking_man|baselayer'};
 CONFIG.character.walkTimeScale=.94;
 CONFIG.character.moveSpeed=1.2;
 CONFIG.character.headOffset=[0,-.05,-.02];
 // V3: pure animation — no post-mixer shoulder/hand overrides.
 // V1/V2 rollback: restore walk-v2.glb + shoulder .75 / hand 14°.
 const MESHY_SHOULDER_CORRECTION=0; // 0=raw anim, 1=full bind orientation
 const MESHY_HAND_ROTATION_CORRECTION=0; // degrees, whole-hand local tilt
 CONFIG.character.meshyShoulderCorrection=MESHY_SHOULDER_CORRECTION;
 CONFIG.character.meshyHandRotationCorrection=MESHY_HAND_ROTATION_CORRECTION;
}else{
 // Previous in-game avatar: stylised procedural businessman (keeps heroine GLBs unused).
 CONFIG.character.useProcedural=true;CONFIG.character.height=1.78;CONFIG.character.headOffset=[0,-.08,-.02];
 CONFIG.character.moveSpeed=1.65;
}
const $=id=>document.getElementById(id), scene=new T.Scene();scene.background=new T.Color('#c6d7e8');
const renderer=new T.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const camera=new T.PerspectiveCamera(53,innerWidth/innerHeight,.06,180),world=new T.Group();scene.add(world);
let capture=null;const records={};const addWorld=world.add.bind(world);world.add=(...objects)=>{addWorld(...objects);if(capture)(records[capture]??=[]).push(...objects);return world};
const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const M={wall:mat('#e3e0db'),ceiling:mat('#f5f1e9'),floor:mat('#b7b9bf',.4),trim:mat('#dad8d5'),wood:mat('#c9a27e'),dark:mat('#242938',.4),chair:mat('#63758f',.91),purple:mat('#7445ce',.88),pants:mat('#1a2744',.9),skin:mat('#c99578',.78),hair:mat('#1c1614',.62),shoe:mat('#141416',.55),metal:mat('#9d9fa6',.3,.7),gold:mat('#c7a779',.28,.65),leaf:mat('#386543'),black:mat('#101622'),white:mat('#f4f4f6',.82),shirt:mat('#f7f7f9',.86),tie:mat('#1e3a6e',.7),belt:mat('#1a1a1c',.55)};
const emissive=(c,p=.7)=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:p});
function mesh(geo,m,x=0,y=0,z=0,p=world){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
function box(w,h,d,m,x,y,z,p=world){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,p)}
function ell(rx,ry,rz,m,x,y,z,p=world){const o=mesh(new T.SphereGeometry(1,32,22),m,x,y,z,p);o.scale.set(rx,ry,rz);return o}
function cyl(rt,rb,h,m,x,y,z,p=world){return mesh(new T.CylinderGeometry(rt,rb,h,32),m,x,y,z,p)}
function rod(a,b,r,m,p=world){a=new T.Vector3(...a);b=new T.Vector3(...b);const d=b.clone().sub(a),o=cyl(r,r,d.length(),m,...a.clone().add(b).multiplyScalar(.5).toArray(),p);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o}
function rounded(w,h,d,r,m,x,y,z,p=world){const s=new T.Shape(),a=-w/2,b=-d/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+d-r);s.quadraticCurveTo(a+w,b+d,a+w-r,b+d);s.lineTo(a+r,b+d);s.quadraticCurveTo(a,b+d,a,b+d-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:3,curveSegments:10});geo.rotateX(-Math.PI/2);return mesh(geo,m,x,y,z,p)}
function profile(points,m,x,y,z,p=world,sx=1,sz=1){const g=new T.LatheGeometry(points.map(q=>new T.Vector2(...q)),40),o=mesh(g,m,x,y,z,p);o.scale.set(sx,1,sz);return o}
function textPlane(lines,w,h,x,y,z,opts={},p=world){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');if(opts.bg){ctx.fillStyle=opts.bg;ctx.fillRect(0,0,c.width,c.height)}ctx.textAlign=opts.align||'center';ctx.textBaseline='middle';lines.forEach(l=>{ctx.fillStyle=l.color||opts.color||'#252737';ctx.font=`${l.weight||500} ${l.size||64}px Arial`;ctx.fillText(l.text,l.x??c.width/2,l.y*c.height)});const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;const o=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:!opts.bg,side:T.DoubleSide}),x,y,z,p);o.castShadow=false;return o}
// Quiet daylight and broad ceiling illumination.
scene.add(new T.HemisphereLight('#eaf2ff','#aaa19a',2.0));const sun=new T.DirectionalLight('#fff0dd',3.0);sun.position.set(7,7,1);sun.target.position.set(-2,0,-2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:25});sun.shadow.normalBias=.018;sun.shadow.bias=-.0001;sun.shadow.radius=3;scene.add(sun,sun.target);const fill=new T.DirectionalLight('#dddfff',.65);fill.position.set(-3,3,5);scene.add(fill);
// Four independently textured walls; clear inside dimensions 8 x 6 x 3.25 m.
const {width:W,depth:D,height:H}=CONFIG.room;
box(W+.3,.15,D+.3,M.floor,0,-.085,0);
for(const [key,path] of Object.entries(CONFIG.surfaces||{})){const tex=await new T.TextureLoader().loadAsync(assetURL(path));tex.colorSpace=T.SRGBColorSpace;if(key==='floor'){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.fromArray(CONFIG.surfaceRepeat||[4,4]);tex.anisotropy=8;}const p=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshBasicMaterial({map:tex}));p.rotation.x=key==='floor'?-Math.PI/2:Math.PI/2;p.position.y=key==='floor'?.001:H-.001;world.add(p);}


box(W+.3,.14,D+.3,M.ceiling,0,H+.07,0);
// V12: layered lounge finishes. Decorative meshes only: navigation and obstacles unchanged.
const loungeRug=new T.Mesh(new T.PlaneGeometry(3.35,2.35),new T.MeshStandardMaterial({color:'#c4b8ad',roughness:1,metalness:0}));
loungeRug.rotation.x=-Math.PI/2;loungeRug.position.set(4.38,.013,-2.25);loungeRug.receiveShadow=true;world.add(loungeRug);
const rugInset=new T.Mesh(new T.PlaneGeometry(3.17,2.17),new T.MeshStandardMaterial({color:'#d8ccc1',roughness:1,metalness:0}));
rugInset.rotation.x=-Math.PI/2;rugInset.position.set(4.38,.015,-2.25);rugInset.receiveShadow=true;world.add(rugInset);
const loungeLight=new T.PointLight('#ffe7cf',10,6.5,2);
loungeLight.position.set(4.25,H-.45,-2.4);world.add(loungeLight);
const wallSurfaces={back:[],front:[],left:[],right:[]};
function wallPart(id,width,x,z,angle,u0=0,u1=1,v0=0,v1=1){
 const g=new T.PlaneGeometry(width*(u1-u0),H*(v1-v0));
 const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0));
 const o=mesh(g,new T.MeshBasicMaterial({color:0xffffff}),x,H*(v0+v1)/2,z);o.rotation.y=angle;o.castShadow=false;wallSurfaces[id].push(o);return o;
}
wallPart('back',W,0,-D/2,0);wallPart('front',W,0,D/2,Math.PI);wallPart('left',D,-W/2,0,Math.PI/2);
// Cut the door exactly at its image coordinates, preserving the full-wall UV scale.
const du0=.687,du1=.895,dv=.863,doorZ=D*((du0+du1)/2-.5),doorWidth=D*(du1-du0);
wallPart('right',D,W/2,D*(du0/2-.5),-Math.PI/2,0,du0);
wallPart('right',D,W/2,D*((du1+1)/2-.5),-Math.PI/2,du1,1);
wallPart('right',D,W/2,doorZ,-Math.PI/2,du0,du1,dv,1);
const door=wallPart('right',D,W/2+.005,doorZ,-Math.PI/2,du0,du1,0,dv);
const reveal=new T.Group();reveal.visible=false;world.add(reveal);
for(const z of [doorZ-doorWidth/2,doorZ+doorWidth/2])box(.035,H*dv,.024,emissive('#b69aff',.7),W/2-.02,H*dv/2,z,reveal);
box(.035,.024,doorWidth,emissive('#b69aff',.7),W/2-.02,H*dv,doorZ,reveal);
box(1.2,.1,doorWidth,M.floor,W/2+.6,-.05,doorZ);

for(const z of [doorZ-doorWidth/2,doorZ+doorWidth/2])box(1.2,H*dv,.1,M.wall,W/2+.6,H*dv/2,z);
for(const z of [-2,0,2]){box(5.6,.06,.12,M.dark,0,H-.08,z);box(5.5,.015,.08,emissive('#fff3dc',.8),0,H-.115,z)}
const obstacles=[];function obstacle(x,z,w,d){obstacles.push({x,z,w:w/2+.23,d:d/2+.23,slot:capture})}
capture="cabinet";
// Back-wall identity, screen and low oak storage.
rounded(3.6,.67,.46,.06,M.wood,.2,.06,-3.12);box(3.63,.04,.5,M.white,.2,.765,-3.12);obstacle(.2,-3.12,3.65,.6);for(let x=-1.25;x<1.8;x+=.92){box(.008,.56,.018,mat('#997f68'),x,.4,-2.88);box(.17,.018,.025,M.metal,x+.3,.58,-2.86)}
capture=null;
capture="screen";
rounded(1.45,.05,.93,.07,M.black,2.35,2.15,-3.46).rotation.x=Math.PI/2; textPlane([{text:'HR / 2026',size:38,color:'#b6a7ee',y:.15},{text:'Будущее',size:103,color:'#ffffff',y:.43},{text:'начинается с нас',size:50,color:'#ddd9e8',y:.66},{text:'ПЕРЕГОВОРНАЯ 01',size:26,color:'#a4abba',y:.87}],1.36,.8,2.35,2.15,-3.395,{bg:'#202537'});
capture="table";
// Table: comfortable circulation around a real meeting surface.
rounded(3.75,.085,1.3,.23,M.wood,-.65,.79,-1.05);for(let x of[-1.9,.6]){rounded(.14,.7,.75,.035,M.dark,x,.07,-1.05);rounded(.65,.025,.9,.05,M.dark,x,.026,-1.05)}obstacle(-.65,-1.05,3.85,1.4);
for(let i=0;i<70;i++){const line=box(3.35,.0006,.002,mat('#bb9876',.9),-.65,.876,-1.56+i*.014);line.castShadow=false}
capture=null;
let chairIndex=0;function chair(x,z,rot){capture=`chair-${++chairIndex}`;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);rounded(.56,.105,.53,.16,M.chair,0,.44,0,g);const b=rounded(.57,.075,.51,.16,M.chair,0,.65,.22,g);b.rotation.x=-Math.PI/2+.12;for(let s of[-1,1])for(let f of[-1,1])rod([s*.21,.45,f*.18],[s*.27,.035,f*.25],.016,M.dark,g);obstacle(x,z,.56,.56);return g}for(let x of[-1.9,-.65,.6])chair(x,-2.13,Math.PI);for(let x of[-1.9,-.65])chair(x,.03,0);
capture="laptop";
// A laptop, stationery, cups, retro brass lamp, and headset pedestal.
rounded(.4,.016,.28,.025,M.metal,-1.45,.891,-1.12);const laptop=box(.4,.25,.014,M.dark,-1.45,1.025,-1.255);laptop.rotation.x=-.16;textPlane([{text:'Ростелеком',size:83,color:'#ddd9ef',y:.5}],.35,.2,-1.45,1.025,-1.24,{bg:'#42485e'}).rotation.x=-.16;
capture="stationery";
for(const [x,z] of[[-2.06,-.79],[-.53,-1.29]]){box(.25,.008,.32,M.white,x,.89,z);box(.012,.012,.23,M.dark,x+.16,.899,z);cyl(.048,.042,.095,M.white,x-.23,.936,z);cyl(.04,.04,.002,mat('#76503b'),x-.23,.984,z);const h=mesh(new T.TorusGeometry(.033,.007,8,18),M.white,x-.283,.938,z);h.rotation.y=Math.PI/2}
capture="lamp";
const lamp=new T.Group();lamp.position.set(-1.15,.8,-3.05);world.add(lamp);cyl(.14,.16,.035,M.gold,0,.02,0,lamp);rod([0,.04,0],[0,.44,0],.017,M.gold,lamp);const shade=mesh(new T.SphereGeometry(.22,32,16,0,Math.PI*2,0,Math.PI/2),M.gold,0,.43,0,lamp);cyl(.2,.2,.006,emissive('#fff0c8'),0,.425,0,lamp);
capture="sofa";
// Lounge corner.
rounded(1.64,.27,.7,.13,M.purple,2.99,.17,-1.88);rounded(1.68,.1,.45,.13,M.purple,2.99,.58,-2.18).rotation.x=-Math.PI/2;for(let x of[2.2,3.78])rounded(.13,.4,.7,.055,M.purple,x,.33,-1.88);obstacle(3,-1.95,1.72,.85);capture="coffee-table";
cyl(.41,.41,.04,M.white,2.95,.46,-.65);cyl(.035,.065,.41,M.metal,2.95,.23,-.65);cyl(.27,.27,.025,M.metal,2.95,.025,-.65);obstacle(2.95,-.65,.8,.8);
capture="shelf";
// Awards shelf and framed typography on the left wall.
const shelf=new T.Group();shelf.position.set(-3.7,0,-1.1);shelf.rotation.y=Math.PI/2;world.add(shelf);for(let x of[-.63,.63])box(.035,2.15,.37,M.dark,x,1.1,0,shelf);for(let y of[.12,.76,1.42,2.08])box(1.3,.035,.4,M.wood,0,y,0,shelf);obstacle(-3.7,-1.1,.5,1.35);
for(let i=0;i<3;i++){const x=-.38+i*.38;box(.18,.045,.14,M.dark,x,.8,0,shelf);cyl(.025,.035,.2,M.gold,x,.92,0,shelf);const cup=profile([[.055,0],[.065,.05],[.095,.14],[.1,.16]],M.gold,x,1.0,0,shelf);cyl(.098,.098,.005,M.gold,x,1.161,0,shelf)}for(let i=0;i<2;i++){box(.39,.45,.022,M.gold,-.27+i*.55,1.66,.06,shelf);textPlane([{text:'ДИПЛОМ',size:97,y:.28},{text:'РОСТЕЛЕКОМ',size:46,y:.52},{text:'2026',size:70,y:.76}],.34,.39,-.27+i*.55,1.66,.074,{bg:'#faf5e6'},shelf)}for(let i=0;i<7;i++)box(.07,.32+(i%3)*.025,.22,[M.purple,M.white,M.chair][i%3],-.32+i*.08,.29,0,shelf);
capture=null;
// Indoor plants with individually curved broad leaves.
let plantIndex=0;function plant(x,z){capture=`plant-${++plantIndex}`;cyl(.23,.17,.49,M.white,x,.245,z);cyl(.2,.2,.015,mat('#3c332c'),x,.49,z);for(let i=0;i<12;i++){const a=i*2.4,h=.9+(i%4)*.18,dx=Math.cos(a)*.26,dz=Math.sin(a)*.26;rod([x,.49,z],[x+dx,h,z+dz],.009,M.leaf);const l=ell(.095,.24,.023,M.leaf,x+dx*1.12,h+.1,z+dz*1.12);l.rotation.set(.28,a,-Math.cos(a)*.6)}obstacle(x,z,.5,.5)}plant(-3.57,-2.82);plant(3.55,-2.95);plant(3.57,2.73);
capture=null;
// Stylised adult businessman: white shirt, navy tie, navy trousers, short hair.
capture=null;
const player=new T.Group();player.position.set(.9,0,1.63);scene.add(player);
function buildBusinessman(variant='base'){
 const shirtMat=variant==='future'?mat('#f2f4f8',.88):M.shirt;
 const pantsMat=variant==='future'?mat('#d8dde6',.88):M.pants;
 const body=new T.Group();const legs=[],arms=[];
 // Dress-shirt torso (narrower shoulders than the old knitwear silhouette)
 profile([[.14,0],[.175,.07],[.2,.22],[.205,.38],[.175,.46],[.12,.5]],shirtMat,0,.92,0,body,1,.68);
 profile([[.095,0],[.1,.035],[.09,.12],[.085,.13]],shirtMat,0,1.38,0,body,1,.82);
 profile([[.15,0],[.155,.04],[.15,.08]],shirtMat,0,.91,0,body,1,.74);
 // Collar ring + tie
 cyl(.07,.085,.04,shirtMat,0,1.48,0,body);box(.04,.03,.018,M.tie,0,1.43,-.11,body);box(.03,.2,.011,M.tie,0,1.28,-.112,body);box(.008,.2,.012,mat('#c9d6ea',.75),0,1.28,-.118,body);
 box(.26,.035,.11,M.belt,0,.92,0,body);box(.032,.024,.018,M.metal,0,.92,-.07,body);
 ell(.185,.13,.125,pantsMat,0,.91,0,body);
 for(const side of[-1,1]){
  const leg=new T.Group();leg.position.set(side*.095,.88,0);body.add(leg);
  profile([[.082,0],[.088,.12],[.08,.34],[.085,.6],[.088,.78]],pantsMat,0,-.78,0,leg,1,.95);
  rounded(.155,.065,.27,.045,M.shoe,0,-.855,-.045,leg);
  for(let j=0;j<3;j++)box(.075,.004,.01,mat('#2a2a2e'),0,-.775,-.065-j*.02,leg);
  legs.push(leg);
  const arm=new T.Group();arm.position.set(side*.195,1.33,0);arm.rotation.z=side*.08;body.add(arm);
  profile([[.048,0],[.068,.055],[.072,.17],[.068,.28],[.055,.38]],shirtMat,0,-.37,0,arm,1,.95);
  cyl(.05,.048,.055,shirtMat,0,-.385,0,arm);ell(.04,.07,.028,M.skin,0,-.47,-.002,arm);ell(.02,.038,.022,M.skin,-side*.03,-.45,-.018,arm);
  if(side===-1){cyl(.045,.045,.016,M.metal,0,-.41,0,arm);cyl(.043,.043,.012,M.black,0,-.41,0,arm)}
  arms.push(arm);
 }
 const head=new T.Group();head.position.y=1.58;body.add(head);
 cyl(.06,.07,.12,M.skin,0,-.13,0,head);ell(.118,.158,.108,M.skin,0,.018,-.004,head);ell(.09,.085,.082,M.skin,0,-.065,-.028,head);
 for(let s of[-1,1])ell(.021,.033,.019,M.skin,s*.118,.004,0,head);
 // Short cropped hair covering the crown
 const hairTop=ell(.122,.1,.118,M.hair,0,.055,.008,head);hairTop.scale.y=1;
 ell(.12,.07,.1,M.hair,0,.02,.055,head);ell(.105,.055,.09,M.hair,0,-.015,.075,head);
 for(let s of[-1,1]){ell(.1,.08,.05,M.hair,s*.08,.02,.02,head)}
 for(let s of[-1,1]){ell(.032,.016,.009,mat('#efe6de'),s*.046,.028,-.108,head);ell(.011,.012,.004,mat('#4a3426'),s*.046,.027,-.116,head);ell(.006,.0075,.002,M.black,s*.046,.027,-.12,head);const brow=ell(.034,.006,.006,M.hair,s*.046,.064,-.106,head);brow.rotation.z=s*.08}
 ell(.014,.03,.022,M.skin,0,-.002,-.11,head);ell(.026,.0045,.006,mat('#8f5d58'),0,-.055,-.106,head);
 return {body,legs,arms,head};
}
const heroBase=buildBusinessman('base'),heroFuture=buildBusinessman('future');
player.add(heroBase.body,heroFuture.body);heroFuture.body.visible=false;
// Keep procedural meshes available for rollback, but hide them while Meshy GLB is active.
if(!CONFIG.character.useProcedural){heroBase.body.visible=false;heroFuture.body.visible=false;}
let body=heroBase.body,legs=heroBase.legs,arms=heroBase.arms,head=heroBase.head;
let assets=null;
function applyHeroVariant(variant){
 if(!CONFIG.character.useProcedural){heroBase.body.visible=false;heroFuture.body.visible=false;return;}
 const next=variant==='future'?heroFuture:heroBase;
 heroBase.body.visible=variant!=='future';heroFuture.body.visible=variant==='future';
 body=next.body;legs=next.legs;arms=next.arms;head=next.head;
 if(assets){assets.body=body;assets.head=head;assets.heroBones={head};assets.hero=body;}
}
const headset=new T.Group();headset.visible=false;const marker=new T.Group();marker.visible=false;
assets=new AssetSystem({T,world,records,obstacles,config:CONFIG,wallSurfaces,player,body,headset,head,onVariant:applyHeroVariant});
await assets.initialize();

const robotPoster=await new T.TextureLoader().loadAsync(assetURL(CONFIG.posterRobot)),humanPoster=await new T.TextureLoader().loadAsync(assetURL(CONFIG.posterHuman));robotPoster.colorSpace=humanPoster.colorSpace=T.SRGBColorSpace;
const posterHits=[];
const originalWall=await new T.TextureLoader().loadAsync(assetURL(CONFIG.walls.front.texture));originalWall.colorSpace=T.SRGBColorSpace;
for(const [u0,u1,v0,v1] of [[482/2048,825/2048,132/832,709/832],[1218/2048,1572/2048,133/832,710/832]]){const original=originalWall.clone();original.repeat.set(u1-u0,v1-v0);original.offset.set(u0,1-v1);original.needsUpdate=true;const p=new T.Mesh(new T.PlaneGeometry(W*(u1-u0),H*(v1-v0)),new T.MeshBasicMaterial({map:original}));p.position.set(W*(.5-(u0+u1)/2),H*(1-(v0+v1)/2),D/2-.035);p.rotation.y=Math.PI;p.name='interactive-poster';p.userData.original=original;world.add(p);posterHits.push(p);}

const future=await makeFuture(scene,CONFIG,doorZ,doorWidth);future.group.visible=false;future.panel.visible=true;
const hall=await makeReactorRoom(scene,CONFIG.reactor),tv=await makeTelevision(world,CONFIG);applyR16Environment(scene,renderer);let roomIndex=0,uiOpen=false,selectedPod=null;
// Auto portal marker in meeting room, slightly inside the open doorway.
const portalPad=new T.Mesh(new T.CircleGeometry(.73,64),new T.MeshBasicMaterial({color:'#a7f4f2',transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}));
portalPad.rotation.x=-Math.PI/2;portalPad.position.set(W/2-1.02,.025,doorZ);world.add(portalPad);
const portalRing=new T.Mesh(new T.RingGeometry(.62,.74,64),new T.MeshBasicMaterial({color:'#a1eae6',transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide}));
portalRing.rotation.x=-Math.PI/2;portalRing.position.set(W/2-1.02,.029,doorZ);world.add(portalRing);
let autoPortal=null;const portalFade=document.createElement('div');portalFade.style.cssText='position:fixed;inset:0;z-index:950;background:#26383b;opacity:0;pointer-events:none';document.body.append(portalFade);
const peek=energyReactor(['#6b7274','#6b7274','#6b7274','#6b7274']);peek.g.position.set(W/2+2,0,doorZ);peek.g.rotation.y=-Math.PI/2;peek.g.scale.setScalar(.85);peek.g.traverse(o=>{if(o.isMesh){o.castShadow=false;const m=o.material.clone();m.color?.set('#7a8589');if(m.emissive)m.emissive.set('#000000');o.material=m;}});world.add(peek.g);const previewBackdrop=new T.Mesh(new T.PlaneGeometry(5,H),new T.MeshBasicMaterial({color:'#24363a'}));previewBackdrop.position.set(W/2+3.9,H/2,doorZ);previewBackdrop.rotation.y=-Math.PI/2;world.add(previewBackdrop);
const spawn=CONFIG.character.spawn;player.position.fromArray(spawn);
let state='worn',yaw=0,pitch=.32,dist=3.45,phase=0,anim=0,wearProgress=0,paused=true,drag=false,lastX=0,lastY=0;const keys=new Set();const action=$('action'),mission=$('mission'),badge=$('badge');mission.textContent='Найдите светящийся круг у двери и встаньте на него.';badge.textContent='Переход закрыт';
function near(){return false;}
function doorNear(){return roomIndex===0&&state==='worn'&&door.position.z>doorZ+doorWidth*.85&&Math.hypot(player.position.x-(W/2-.4),player.position.z-doorZ)<1.9;}
function enterRoom(next){
 keys.clear();closeProjects(true);$('reactor-notice').hidden=true;roomIndex=next;world.visible=next===0;hall.group.visible=next===1;future.group.visible=next===2;future.panel.visible=true;assets.selectCharacter(next===2?'future':'base');sun.position.set(next===2?future.center.x+7:7,7,1);sun.target.position.set(next===2?future.center.x:-2,0,-2);headset.visible=false;$('future-controls').hidden=next!==2;
 yaw=0;pitch=.32;dist=3.45;camera.fov=next===1?62:53;camera.updateProjectionMatrix();
 if(next===1){player.position.set(0,0,CONFIG.reactor.centerZ+6.2);player.rotation.y=0;scene.background.set('#26383b');sun.intensity=.45;fill.intensity=.35;}
 if(next===2){player.position.set(future.center.x+3.2,0,future.center.z+1.9);player.rotation.y=Math.PI/2;yaw=.55;pitch=.22;dist=2.65;scene.background.set('#c6d7e8');sun.intensity=2.2;fill.intensity=.8;}
 camera.position.copy(player.position).add(next===2?new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*dist,1.2+Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist):new T.Vector3(0,2.3,3.2));if(next===1){camera.position.x=T.MathUtils.clamp(camera.position.x,hall.bounds.minX+.15,hall.bounds.maxX-.15);camera.position.z=T.MathUtils.clamp(camera.position.z,hall.bounds.minZ+.15,hall.bounds.maxZ-.15);}camera.lookAt(player.position.clone().add(new T.Vector3(0,1.2,0)));updateChapter();
}
function updateChapter(){
 $('room-title').textContent=['Начало путешествия','Запуск HR будущего','Комната будущего'][roomIndex];
 $('room-label').textContent=['ПЕРЕГОВОРНАЯ','ЗАЛ АКТИВАЦИИ','ОФИС БУДУЩЕГО'][roomIndex];$('room-number').textContent=['01','02','03'][roomIndex];
 if(roomIndex===0){mission.textContent='Встаньте на прозрачный круг у выхода в реакторную.';badge.textContent='Переход закрыт';}
 if(roomIndex===1){mission.textContent=hall.reactorFilled?'Реактор заполнен. Следуйте к светящемуся кругу перед лифтом.':'Активировано витрин: '+hall.done.size+' / 4. Выберите витрину и изучите её проекты.';badge.textContent='Витрины: '+hall.done.size+' / 4';}
 if(roomIndex===2){mission.textContent=elevator.active?'Поездка в Офис будущего. Дождитесь открытия дверей и нажмите E для выхода.':future.started?'Подойдите к слайду и нажмите «Рассмотреть».':'Встаньте на круг «Будущее здесь» в центре зала и нажмите E, чтобы запустить презентацию.';badge.textContent='Стеклянный павильон · 12 × 9 м';}
}
function act(){
 if(paused||uiOpen)return;if(elevator.awaitingExit){keys.clear();elevator.exit();return;}if(elevator.active)return;
 if(roomIndex===1){if(elevator.state==='ELEVATOR_READY'&&elevator.near(player.position)){keys.clear();elevator.start();updateChapter();return;}const i=hall.nearest(player.position);if(i!==null)openProjects(i);return;}
 if(roomIndex===2){if(future.padNear(player.position)){future.activate();updateChapter();return;}if(future.inspectNear(player.position))showFinal();return;}
 if(roomIndex!==0)return;
 // The portal activates by stepping onto the circle, without pressing E.


}
const escapeText=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const elevator=createElevatorController({hall,future,player,camera,enterDestination:()=>{enterRoom(2);assets.selectCharacter('base');headset.visible=false;},onTransform:()=>{assets.selectCharacter('future');headset.visible=false;},onExit:()=>{yaw=Math.PI/2;pitch=.32;dist=2.1;keys.clear();updateChapter();}});
const progress=createGameProgress({hall,elevator,future});
const showcaseUI=createShowcaseUI({hall,player,camera,T,assetURL,themeImage,updateChapter,setOpen:v=>{uiOpen=v;keys.clear();}});
function openProjects(i){selectedPod=i;showcaseUI.open(i);}
function showProject(j){showcaseUI.show(j);}
function closeProjects(immediate=false){if(!immediate&&$('project-modal').classList.contains('final-view')&&progress.events.finalOpened&&document.querySelector('#project-content img')?.naturalWidth>0)progress.events.finalDone=true;showcaseUI.close(immediate);selectedPod=null;keys.clear();}
action.onclick=act;
function reset(){velocityX=0;velocityZ=0;autoPortal=null;portalFade.style.opacity='0';portalPad.material.opacity=.18;portalRing.material.opacity=.55;door.visible=true;if(door.userData.portalOriginal){door.material=door.userData.portalOriginal;delete door.userData.portalOriginal;}progress.reset();elevator.reset();future.reset();$('reactor-notice').hidden=true;sun.position.set(7,7,1);sun.target.position.set(-2,0,-2);assets.selectCharacter('base');headset.visible=false;$('future-controls').hidden=true;camera.fov=53;camera.updateProjectionMatrix();closeProjects(true);hall.reset();tv.reset();roomIndex=0;world.visible=true;hall.group.visible=false;future.group.visible=false;sun.intensity=3;fill.intensity=.65;scene.background.set('#c6d7e8');state='worn';player.position.fromArray(spawn);player.rotation.y=0;yaw=0;pitch=.32;dist=3.45;camera.position.set(.9,2.25,2.8);reveal.visible=true;door.position.z=doorZ;badge.textContent='Проход открыт';mission.textContent='Встаньте на прозрачный круг у выхода в реакторную.';$('flash').style.opacity=0;progress.reset();updateChapter();}
$('reset').onclick=()=>{reset();paused=false;$('settings').hidden=true};$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{})};$('menu').onclick=()=>{paused=!paused;$('settings').hidden=!paused;keys.clear()};$('resume').onclick=()=>{paused=false;$('settings').hidden=true};
addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)act();if(e.code==='Escape'){if(uiOpen){closeProjects();return;}paused=!paused;$('settings').hidden=!paused;keys.clear()}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=false});document.addEventListener('visibilitychange',()=>keys.clear());
let dragDistance=0;const canvas=$('game');canvas.onpointerdown=e=>{drag=true;lastX=e.clientX;lastY=e.clientY;dragDistance=0;canvas.setPointerCapture(e.pointerId)};canvas.onpointermove=e=>{if(!drag||paused||uiOpen||elevator.active)return;dragDistance+=Math.abs(e.clientX-lastX)+Math.abs(e.clientY-lastY);yaw-=(e.clientX-lastX)*.006;pitch=T.MathUtils.clamp(pitch+(e.clientY-lastY)*.004,-.05,roomIndex===2?1.48:.75);lastX=e.clientX;lastY=e.clientY};canvas.onpointerup=e=>{drag=false};canvas.onpointercancel=()=>drag=false;canvas.oncontextmenu=e=>e.preventDefault();canvas.addEventListener('wheel',e=>{if(uiOpen||elevator.active){e.preventDefault();return;}dist=roomIndex===2?T.MathUtils.clamp(dist*Math.exp(e.deltaY*.0015),2,28):T.MathUtils.clamp(dist+e.deltaY*.003,1.5,4.5);e.preventDefault()},{passive:false});
const raycaster=new T.Raycaster();canvas.addEventListener('click',e=>{
 if(paused||uiOpen||elevator.active||dragDistance>5)return;
 scene.updateMatrixWorld(true);raycaster.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
 if(roomIndex===2){if(raycaster.intersectObject(future.floorPad,true).length){future.activate();updateChapter();return;}}
 if(roomIndex===0){const ph=raycaster.intersectObjects(posterHits);if(ph.length){const p=ph[0].object;p.userData.future=!p.userData.future;p.material.map=p.userData.future?robotPoster:p.userData.original;return;}const hits=raycaster.intersectObject(world,true).filter(h=>{for(let p=h.object;p&&p!==world;p=p.parent)if(!p.visible)return false;return true;});const hit=hits[0];if(hit&&(hit.object===tv.hit||hit.object===tv.button)){tv.toggle();return;}}
 if(roomIndex===1){const i=hall.nearest(player.position);if(i!==null&&raycaster.intersectObject(hall.pods[i].g,true).length)openProjects(i);}
});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key)}
function blocked(x,z){if(roomIndex===1)return hall.blocked(x,z);if(roomIndex===2)return future.blocked(x,z)||x<future.center.x-W/2+.23||x>future.center.x+W/2-.23||z<future.center.z-D/2+.23||z>future.center.z+D/2-.23;if(x< -W/2+.23||x>W/2-.23||z< -D/2+.23||z>D/2-.23)return true;return obstacles.some(o=>Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d);}
let last=performance.now(),walk=0;const target=new T.Vector3(),desired=new T.Vector3();const moveSpeed=CONFIG.character.moveSpeed??1.65;const faceTarget=new T.Quaternion(),faceEuler=new T.Euler(0,0,0,'YXZ');
// V8: smooth acceleration and deceleration, with speed capped at the V7 value.
let velocityX=0,velocityZ=0;const acceleration=8.5,deceleration=12.0;
function frame(now){requestAnimationFrame(frame);const dt=paused?0:T.MathUtils.clamp((now-last)/1000,0,.04);last=now;let moving=false,dx=0,dz=0;
const canMove=!paused&&!uiOpen&&!elevator.active&&!autoPortal&&state!=='wearing';
if(canMove){
 const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
 const right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 dx=right*Math.cos(yaw)-forward*Math.sin(yaw);dz=-right*Math.sin(yaw)-forward*Math.cos(yaw);
 const inputLength=Math.hypot(dx,dz);if(inputLength){dx/=inputLength;dz/=inputLength;}
 const rate=inputLength?acceleration:deceleration;
 const blend=1-Math.exp(-rate*dt);
 velocityX+=(dx*moveSpeed-velocityX)*blend;velocityZ+=(dz*moveSpeed-velocityZ)*blend;
 const nx=player.position.x+velocityX*dt,nz=player.position.z+velocityZ*dt;
 if(!blocked(nx,player.position.z)){player.position.x=nx;}else{velocityX=0;}
 if(!blocked(player.position.x,nz)){player.position.z=nz;}else{velocityZ=0;}
 moving=Math.hypot(velocityX,velocityZ)>.045;
 if(moving){
  const angle=Math.atan2(-velocityX,-velocityZ);faceEuler.set(0,angle,0);
  faceTarget.setFromEuler(faceEuler);player.quaternion.slerp(faceTarget,1-Math.exp(-dt*6.5));
 }
}else{velocityX=0;velocityZ=0;}
// Automatic portal sequence: approach circle, dissolve doorway and guide hero inside.
if(roomIndex===0&&!paused&&!uiOpen&&!autoPortal&&Math.hypot(player.position.x-portalPad.position.x,player.position.z-portalPad.position.z)<.62){
  autoPortal={t:0,stage:0,start:player.position.clone()};velocityX=0;velocityZ=0;keys.clear();
}
if(autoPortal&&!paused){
  autoPortal.t+=dt;
  const a=autoPortal;
  if(a.stage===0){
    const t=Math.min(1,a.t/1.15);const smooth=t*t*(3-2*t);
    player.position.lerpVectors(a.start,new T.Vector3(W/2-.2,0,doorZ),smooth);
    player.rotation.y=T.MathUtils.damp(player.rotation.y,-Math.PI/2,5,dt);
    portalPad.material.opacity=.18*(1-smooth);
    portalRing.material.opacity=.55*(1-smooth);
    // Dissolve the actual door plane, not the decorative doorway frame.
    if(!door.userData.portalOriginal){door.userData.portalOriginal=door.material;door.material=door.material.clone();door.material.transparent=true;door.material.depthWrite=false;}
    door.material.opacity=Math.max(0,1-smooth);
    door.visible=smooth<.995;
    portalFade.style.opacity=String(Math.max(0,(t-.68)/.32));
    if(t>=1){a.stage=1;a.t=0;progress.events.passage=true;progress.events.hall=true;enterRoom(1);
      player.position.set(0,0,CONFIG.reactor.centerZ+7.0);
      // The Meshy model already has its 180-degree import correction.
      // Face the central reactor (negative Z) using the same heading as W walking.
      player.quaternion.identity();yaw=0;pitch=.48;dist=3.6;
      velocityX=0;velocityZ=0;
      a.start=player.position.clone();portalFade.style.opacity='1';}
  }else{
    const t=Math.min(1,a.t/1.3),smooth=t*t*(3-2*t);
    player.position.z=a.start.z-1.05*smooth;
    // Keep heading fixed for the entrance: no turn toward the hall wall.
    player.quaternion.identity();
    yaw=T.MathUtils.damp(yaw,0,6,dt);
    portalFade.style.opacity=String(Math.max(0,1-t*3));
    if(t>=1){autoPortal=null;portalFade.style.opacity='0';keys.clear();}
  }
}
if(CONFIG.character.useProcedural){walk=T.MathUtils.damp(walk,moving?1:0,9,dt);phase+=dt*8;body.position.y=Math.abs(Math.sin(phase))*.016*walk+Math.sin(now*.0016)*.003;legs[0].rotation.x=Math.sin(phase)*.36*walk;legs[1].rotation.x=-Math.sin(phase)*.36*walk;arms[0].rotation.x=-Math.sin(phase)*.29*walk;arms[1].rotation.x=Math.sin(phase)*.29*walk;}

// Portal remains closed until the player enters the activation circle.
 door.position.z=doorZ;let actionText='';if(roomIndex===0){tv.update(dt);}else if(roomIndex===1){if(elevator.state==='ELEVATOR_READY'&&elevator.near(player.position))actionText='';else{const i=hall.nearest(player.position);if(i!==null)actionText='Рассмотреть: '+hall.themes[i].name;}}else if(roomIndex===2){if(future.padNear(player.position))actionText='Будущее здесь';else if(future.inspectNear(player.position))actionText='Рассмотреть';}if(elevator.awaitingExit)actionText='Выйти в Офис будущего';action.hidden=paused||uiOpen||(elevator.active&&!elevator.awaitingExit)||!actionText;action.innerHTML='<kbd>E</kbd> '+actionText;$('step1').parentElement.hidden=true;
// Orbit follows the heroine; camera stays within the finished room.
if(roomIndex===1){const before=String(hall.reactorFilled)+hall.done.size;hall.update(dt,now/1000,player.position);if(String(hall.reactorFilled)+hall.done.size!==before)updateChapter();}
const elevatorBefore=elevator.state;elevator.update(dt);if(elevator.state!==elevatorBefore)updateChapter();
// V4: cinematic chase camera. Preserve heading while strafing/reversing.
if(!paused&&!uiOpen&&!elevator.active&&roomIndex!==2&&!drag){
 const following=Boolean(moving||autoPortal);
 if(following){
   // Actual character heading, rather than the travel vector.
   const heading=autoPortal?(autoPortal.stage===0?-Math.PI/2:0):player.rotation.y;
   const diff=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw));
   yaw+=diff*(1-Math.exp(-dt*2.2));
   pitch=T.MathUtils.damp(pitch,.48,2.0,dt);
   dist=T.MathUtils.damp(dist,3.6,1.8,dt);
 }
}
target.copy(player.position).add(new T.Vector3(0,1.2,0));
if(roomIndex===2)target.lerp(future.center.clone().add(new T.Vector3(0,H/2,0)),T.MathUtils.smoothstep(dist,6,15));
desired.set(target.x+Math.sin(yaw)*Math.cos(pitch)*dist,target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*Math.cos(pitch)*dist);
if(roomIndex===2){future.group.updateMatrixWorld(true);const direction=desired.clone().sub(target),length=direction.length(),probe=new T.Raycaster(target,direction.normalize(),0,length);const hit=probe.intersectObject(future.liftBody,true)[0];if(hit)desired.copy(target).addScaledVector(direction,Math.max(.3,hit.distance-.18));desired.y=T.MathUtils.clamp(desired.y,.4,future.top-2);const offset=desired.clone().sub(future.center);const r=Math.hypot(offset.x,offset.z);if(r>future.radius-3){desired.x=future.center.x+offset.x*(future.radius-3)/r;desired.z=future.center.z+offset.z*(future.radius-3)/r;}}
else {const v=desired.clone().sub(target);let f=1;for(let axis of['x','z']){const bound=roomIndex===1?(axis==='x'?CONFIG.reactor.width/2-.15:CONFIG.reactor.depth/2-.15):(axis==='x'?W/2-.15:D/2-.15),center=roomIndex===1?(axis==='z'?CONFIG.reactor.centerZ:0):0;if(desired[axis]>center+bound)f=Math.min(f,(center+bound-target[axis])/v[axis]);if(desired[axis]<center-bound)f=Math.min(f,(center-bound-target[axis])/v[axis])}if(desired.y>H-.2)f=Math.min(f,(H-.2-target.y)/v.y);desired.copy(target).addScaledVector(v,Math.max(.1,f));}
// V4: keep third-person camera on the playable side of walls and large furniture.
if(roomIndex===0&&!drag){
 const v=desired.clone().sub(target),len=v.length();
 if(len>.01){
  const cast=new T.Raycaster(target,v.clone().normalize(),0,len);
  const blockers=[];
  for(const wall of Object.values(wallSurfaces))for(const surface of wall)if(surface.visible)blockers.push(surface);
  const hits=cast.intersectObjects(blockers,false);
  if(hits.length&&hits[0].distance<len)desired.copy(target).addScaledVector(v.normalize(),Math.max(.65,hits[0].distance-.24));
 }
}
if(!elevator.active&&!showcaseUI.update(dt)){camera.position.lerp(desired,1-Math.exp(-dt*6));camera.lookAt(target);}assets.update(dt,moving||elevator.moving||Boolean(autoPortal),state,anim);if(roomIndex===2)future.update(camera,dt);progress.update();renderer.render(scene,camera);}
function setView(view){if(roomIndex!==2)return;if(view==='inside'){yaw=.55;pitch=.22;dist=2.65;}else{yaw=view==='top'?.4:-.7;pitch=view==='top'?1.25:.48;dist=view==='top'?22:20;}}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
$('preview-future').onclick=()=>{paused=false;$('settings').hidden=true;enterRoom(2);setView('inside');};
camera.position.set(.9,2.25,2.8);requestAnimationFrame(frame);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
reveal.visible=true;door.visible=true;door.position.z=doorZ;const reactorNotice=document.createElement('div');reactorNotice.id='reactor-notice';reactorNotice.hidden=true;document.body.append(reactorNotice);$('loading').hidden=true;const welcome=$('welcome');let introRunning=false;
$('welcome-start').onclick=()=>{
 if(introRunning)return;
 introRunning=true;
 $('welcome-start').disabled=true;
 welcome.classList.add('intro-leaving');
 // Fade the welcome overlay without rotating or moving the video character.
 window.setTimeout(()=>{
   document.body.classList.remove('welcome-open');
   welcome.hidden=true;
   paused=false;progress.events.intro=true;
 },650);
};welcome.hidden=false;document.body.classList.add('welcome-open');const welcomeHero=welcome.querySelector('video.start-girl');if(welcomeHero){welcomeHero.muted=true;welcomeHero.play().catch(()=>{});}globalThis.__roomDebug={setView,scene,camera,renderer,enterRoom,door,doorZ,wallSurfaces,assets,records,obstacles,player,headset,near,act,reset,frame,keys,future,hall,tv,doorNear,openProjects,showProject,closeProjects,getRoom:()=>roomIndex,blocked,getState:()=>state,startGame:()=>{document.body.classList.remove('welcome-open');welcome.hidden=true;paused=false;progress.events.intro=true;},isPaused:()=>paused};

if(location.hash==="#future"){enterRoom(2);setView("inside");}

function showFinal(){progress.events.finalOpened=true;uiOpen=true;keys.clear();selectedPod=null;$('project-modal').hidden=false;$('project-modal').classList.remove('list-view');$('project-modal').classList.add('slide-view','final-view');$('project-title').textContent='ИИ-команда';$('project-content').innerHTML='<img class="project-slide" src="'+assetURL(CONFIG.future.finalSlide)+'" alt="ИИ-команда">';$('project-nav').innerHTML='';$('project-back').hidden=false;$('project-back').textContent='↶';$('project-back').setAttribute('aria-label','Вернуться в комнату');$('project-back').onclick=()=>closeProjects();}
globalThis.gameTest={progress,elevator,scene,camera,player,hall,future,tv,assets,enterRoom,openProjects,showProject,closeProjects,showFinal,posterHits};

$('preview-hall').onclick=()=>{paused=false;$('settings').hidden=true;enterRoom(1);};
