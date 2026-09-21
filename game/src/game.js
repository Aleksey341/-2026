import {makeReactorRoom} from './reactor-room.js';
import {makeTelevision} from './television.js';
import {energyReactor} from './retro.js';
import {makeFuture} from './future.js';
import * as T from '../vendor/three.module.js';
import {AssetSystem, readConfig, assetURL} from './assets.js';
const CONFIG=await readConfig();
const $=id=>document.getElementById(id), scene=new T.Scene();scene.background=new T.Color('#c6d7e8');
const renderer=new T.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const camera=new T.PerspectiveCamera(53,innerWidth/innerHeight,.06,180),world=new T.Group();scene.add(world);
let capture=null;const records={};const addWorld=world.add.bind(world);world.add=(...objects)=>{addWorld(...objects);if(capture)(records[capture]??=[]).push(...objects);return world};
const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const M={wall:mat('#e3e0db'),ceiling:mat('#f5f1e9'),floor:mat('#b7b9bf',.4),trim:mat('#dad8d5'),wood:mat('#c9a27e'),dark:mat('#242938',.4),chair:mat('#63758f',.91),purple:mat('#1c2a45',.72,.18),pants:mat('#172033',.78,.12),blouse:mat('#f2f0ea',.86),skin:mat('#d8a286',.78),hair:mat('#382822',.68),shoe:mat('#16181f',.55,.25),metal:mat('#9d9fa6',.3,.7),gold:mat('#c7a779',.28,.65),leaf:mat('#386543'),black:mat('#101622'),white:mat('#ede9e2')};
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
for(const [key,path] of Object.entries(CONFIG.surfaces||{})){const tex=await new T.TextureLoader().loadAsync(assetURL(path));tex.colorSpace=T.SRGBColorSpace;const p=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshBasicMaterial({map:tex}));p.rotation.x=key==='floor'?-Math.PI/2:Math.PI/2;p.position.y=key==='floor'?.001:H-.001;world.add(p);}


box(W+.3,.14,D+.3,M.ceiling,0,H+.07,0);
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
// Formal navy suit heroine (procedural): blazer, blouse, trousers — not the casual hoodie GLB.
capture=null;
const player=new T.Group();player.position.set(.9,0,1.63);scene.add(player);const body=new T.Group();player.add(body);
// Blouse torso under open jacket front
profile([[.12,0],[.155,.06],[.17,.2],[.165,.34],[.13,.42]],M.blouse,0,.9,0,body,1,.7);
// Tailored jacket body + peaked shoulders
profile([[.155,0],[.21,.05],[.245,.18],[.25,.34],[.21,.46],[.14,.5]],M.purple,0,.88,0,body,1,.72);
box(.42,.08,.18,M.purple,0,1.34,0,body); // shoulder line
for(const s of[-1,1]){box(.12,.22,.02,M.purple,s*.09,1.22,-.11,body);box(.1,.02,.12,M.purple,s*.16,1.36,-.02,body)} // lapels + shoulder pads
box(.025,.035,.013,M.metal,0,1.12,-.125,body); // jacket button
box(.11,.14,.018,M.blouse,0,1.28,-.12,body); // collar / blouse V
// Hips / skirt-of-jacket hem
ell(.2,.08,.14,M.purple,0,.9,0,body);
const legs=[],arms=[];for(const side of[-1,1]){const leg=new T.Group();leg.position.set(side*.09,.88,0);body.add(leg);profile([[.078,0],[.082,.1],[.076,.3],[.07,.52],[.066,.72]],M.pants,0,-.72,0,leg,1,.92);rounded(.14,.055,.26,.04,M.shoe,0,-.79,-.04,leg);legs.push(leg);
const arm=new T.Group();arm.position.set(side*.23,1.3,0);arm.rotation.z=side*.1;body.add(arm);profile([[.055,0],[.075,.05],[.08,.16],[.075,.28],[.058,.38]],M.purple,0,-.37,0,arm,1,.95);cyl(.05,.048,.05,M.blouse,0,-.4,0,arm);ell(.04,.07,.028,M.skin,0,-.48,0,arm);arms.push(arm)}
const head=new T.Group();head.position.y=1.54;body.add(head);cyl(.06,.072,.12,M.skin,0,-.13,0,head);ell(.119,.162,.11,M.skin,0,.018,-.005,head);ell(.09,.085,.083,M.skin,0,-.065,-.031,head);for(let s of[-1,1]){ell(.022,.034,.02,M.skin,s*.119,.005,0,head);ell(.008,.008,.005,M.metal,s*.12,-.018,-.017,head)}
// Hair: high bun + front lock (keeps heroine identity)
const haircap=mesh(new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.53),M.hair,0,.047,.013,head);haircap.scale.set(.125,.139,.118);ell(.115,.126,.075,M.hair,0,.005,.071,head);ell(.069,.068,.059,M.hair,0,-.079,.119,head);ell(.055,.055,.055,M.hair,0,.16,.02,head);
const lockCurve=new T.CatmullRomCurve3([new T.Vector3(.071,.151,-.033),new T.Vector3(-.041,.132,-.091),new T.Vector3(-.099,.06,-.1),new T.Vector3(-.104,-.048,-.091),new T.Vector3(-.091,-.202,-.06)]);mesh(new T.TubeGeometry(lockCurve,28,.017,8,false),M.hair,0,0,0,head);
// Almond eyes with whites, brown irises, lashes, brows, nose and lips.
for(let s of[-1,1]){ell(.033,.016,.009,mat('#f0e7df'),s*.047,.028,-.106,head);ell(.0115,.012,.004,mat('#65422d'),s*.047,.027,-.115,head);ell(.006,.008,.002,M.black,s*.047,.027,-.119,head);ell(.003,.003,.001,M.white,s*.044,.031,-.121,head);const brow=ell(.034,.006,.007,M.hair,s*.047,.063,-.104,head);brow.rotation.z=s*.11;const lid=ell(.034,.003,.004,M.hair,s*.047,.042,-.11,head)}ell(.014,.03,.022,M.skin,0,-.005,-.108,head);ell(.027,.004,.007,mat('#a66762'),0,-.055,-.104,head);ell(.023,.005,.006,mat('#c18579'),0,-.061,-.102,head);
function makeHeadset(){const g=new T.Group();rounded(.32,.095,.12,.042,M.white,0,-.05,0,g);rounded(.285,.064,.025,.03,M.black,0,-.034,-.064,g);for(let s of[-1,1])ell(.022,.022,.004,M.metal,s*.094,0,-.084,g);const strap=mesh(new T.TorusGeometry(.112,.011,8,32,Math.PI*1.4),M.dark,0,.013,.025,g);strap.rotation.x=Math.PI/2;return g}const headset=new T.Group();headset.add(makeHeadset());headset.position.set(.69,.984,-.63);world.add(headset);capture='glasses-stand';rounded(.47,.022,.3,.06,M.dark,.69,.897,-.63);textPlane([{text:'VR / НАЧАЛО',size:82,color:'#746b86',y:.5}],.35,.055,.69,.883,-.36).rotation.x=-Math.PI/2;
capture=null;const marker=new T.Group();marker.position.set(.69,1.3,-.63);world.add(marker);const ring=mesh(new T.TorusGeometry(.105,.006,8,40),emissive('#9763ff'),0,0,0,marker);textPlane([{text:'VR',size:96,color:'#ffffff',y:.5}],.13,.09,0,0,.005,{},marker);
const assets=new AssetSystem({T,world,records,obstacles,config:CONFIG,wallSurfaces,player,body,headset});
await assets.initialize();
const future=await makeFuture(scene,CONFIG,doorZ,doorWidth);future.group.visible=false;future.panel.visible=true;
const hall=await makeReactorRoom(scene,CONFIG.reactor),tv=await makeTelevision(world,CONFIG);let roomIndex=0,uiOpen=false,selectedPod=null;
const peek=energyReactor(['#6b7274','#6b7274','#6b7274','#6b7274']);peek.g.position.set(W/2+2,0,doorZ);peek.g.rotation.y=-Math.PI/2;peek.g.scale.setScalar(.85);peek.g.traverse(o=>{if(o.isMesh){o.castShadow=false;const m=o.material.clone();m.color?.set('#7a8589');if(m.emissive)m.emissive.set('#000000');o.material=m;}});world.add(peek.g);const previewBackdrop=new T.Mesh(new T.PlaneGeometry(5,H),new T.MeshBasicMaterial({color:'#24363a'}));previewBackdrop.position.set(W/2+3.9,H/2,doorZ);previewBackdrop.rotation.y=-Math.PI/2;world.add(previewBackdrop);
const tableGroup=assets.groups.get('table');const spawn=CONFIG.character.spawn;player.position.fromArray(spawn);
function glassesRest(){world.attach(headset);const p=new T.Vector3(...CONFIG.glasses.tableOffset);tableGroup.localToWorld(p);headset.position.copy(world.worldToLocal(p));headset.rotation.set(0,0,0);}
function setGlasses(anchor){if(assets.hero){player.attach(headset);headset.rotation.set(0,0,0)}else{(anchor==='head'?head:arms[1]).attach(headset);headset.position.set(...(anchor==='head'?[0,.016,-.14]:[0,-.48,-.055]));headset.rotation.set(0,0,0)}}
glassesRest();const glassesHome=headset.position.clone();
let state='table',yaw=0,pitch=.32,dist=3.45,phase=0,anim=0,wearProgress=0,paused=false,drag=false,lastX=0,lastY=0;const keys=new Set();const action=$('action'),mission=$('mission'),badge=$('badge');
function near(){return Math.hypot(player.position.x-glassesHome.x,player.position.z-glassesHome.z)<CONFIG.glasses.range}
function doorNear(){return roomIndex===0&&state==='worn'&&door.position.z>doorZ+doorWidth*.85&&Math.hypot(player.position.x-(W/2-.4),player.position.z-doorZ)<1.9;}
function enterRoom(next){
 keys.clear();closeProjects();roomIndex=next;world.visible=next===0;hall.group.visible=next===1;future.group.visible=next===2;future.panel.visible=true;assets.selectCharacter(next===2?'future':'base');sun.position.set(next===2?future.center.x+7:7,7,1);sun.target.position.set(next===2?future.center.x:-2,0,-2);headset.visible=next!==2;$('future-controls').hidden=next!==2;
 yaw=0;pitch=.32;dist=3.45;camera.fov=next===1?62:53;camera.updateProjectionMatrix();
 if(next===1){player.position.set(0,0,CONFIG.reactor.centerZ+6.2);player.rotation.y=0;scene.background.set('#26383b');sun.intensity=.45;fill.intensity=.35;}
 if(next===2){player.position.set(future.center.x+3.2,0,future.center.z+1.9);player.rotation.y=Math.PI/2;yaw=.55;pitch=.22;dist=2.65;scene.background.set('#c6d7e8');sun.intensity=2.2;fill.intensity=.8;}
 camera.position.copy(player.position).add(next===2?new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*dist,1.2+Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist):new T.Vector3(0,2.3,3.2));if(next===1){camera.position.x=T.MathUtils.clamp(camera.position.x,hall.bounds.minX+.15,hall.bounds.maxX-.15);camera.position.z=T.MathUtils.clamp(camera.position.z,hall.bounds.minZ+.15,hall.bounds.maxZ-.15);}camera.lookAt(player.position.clone().add(new T.Vector3(0,1.2,0)));updateChapter();
}
function updateChapter(){
 $('room-title').textContent=['Начало путешествия','Запуск HR будущего','Комната будущего'][roomIndex];
 $('room-label').textContent=['ПЕРЕГОВОРНАЯ','ЗАЛ АКТИВАЦИИ','ОФИС БУДУЩЕГО'][roomIndex];$('room-number').textContent=['01','02','03'][roomIndex];
 if(roomIndex===0){mission.textContent=state==='worn'?'Дверь открыта. Подойдите и нажмите «Войти».':'Подойдите к столу и наденьте VR-очки.';badge.textContent=state==='worn'?'VR включён':'Найдите VR-очки';}
 if(roomIndex===1){mission.textContent=hall.done.size===4?'Все витрины активированы. Лифт готов — подойдите и нажмите «Подняться».':'Активировано витрин: '+hall.done.size+' / 4. Выберите витрину и изучите её проекты.';badge.textContent='Витрины: '+hall.done.size+' / 4';}
 if(roomIndex===2){mission.textContent='Будущее без границ. Колёсико отдаляет камеру за стекло; кнопки меняют ракурс.';badge.textContent='Стеклянный павильон · 12 × 9 м';}
}
function act(){
 if(paused||uiOpen)return;
 if(roomIndex===1){if(hall.exitNear(player.position)){enterRoom(2);return;}const i=hall.nearest(player.position);if(i!==null)openProjects(i);return;}
 if(roomIndex!==0)return;
 if(doorNear()){enterRoom(1);return;}
 if(state!=='table')return;
 if(!near()){mission.textContent='Подойдите к очкам на ближнем краю стола.';return;}
 player.rotation.y=Math.atan2(player.position.x-glassesHome.x,player.position.z-glassesHome.z);state='worn';anim=0;setGlasses('head');reveal.visible=true;badge.textContent='VR включён';mission.textContent='Дверь открывается. Подойдите и нажмите «Войти».';
}
const escapeText=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openProjects(i){selectedPod=i;uiOpen=true;keys.clear();hall.pods[i].opened=true;$('project-modal').hidden=false;showProjectList();}
function showProjectList(){const i=selectedPod,t=hall.themes[i];$('project-title').textContent=t.name;$('project-copy').textContent=t.tag;
 $('project-content').innerHTML=t.cards.map((c,j)=>'<button class="project-choice" data-project="'+j+'">'+(hall.projects[i].has(j)?'✓ ':'')+escapeText(c[1])+'</button>').join('');
 $('project-content').querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>showProject(Number(b.dataset.project)));$('project-back').hidden=true;
}
function showProject(j){const i=selectedPod,t=hall.themes[i],c=t.cards[j];$('project-title').textContent=c[1];$('project-copy').textContent=t.name;
 $('project-content').innerHTML='<div class="project-metric" style="color:'+t.color+'">'+escapeText(c[0])+'</div><p>'+escapeText(c[2])+'</p><button id="project-complete">'+(hall.projects[i].has(j)?'Вернуться к проектам':'Продолжить')+'</button>';
 $('project-complete').onclick=()=>{hall.completeProject(i,j);updateChapter();if(hall.done.has(i))closeProjects();else showProjectList();};$('project-back').hidden=false;$('project-back').onclick=showProjectList;
}
function closeProjects(){uiOpen=false;$('project-modal').hidden=true;if(selectedPod!==null)hall.pods[selectedPod].opened=false;selectedPod=null;keys.clear();}
 $('project-close').onclick=closeProjects;
action.onclick=act;
function reset(){sun.position.set(7,7,1);sun.target.position.set(-2,0,-2);assets.selectCharacter('base');headset.visible=true;$('future-controls').hidden=true;camera.fov=53;camera.updateProjectionMatrix();closeProjects();hall.reset();tv.reset();roomIndex=0;world.visible=true;hall.group.visible=false;future.group.visible=false;sun.intensity=3;fill.intensity=.65;scene.background.set('#c6d7e8');state='table';glassesRest();player.position.fromArray(spawn);player.rotation.y=0;yaw=0;pitch=.32;dist=3.45;camera.position.set(.9,2.25,2.8);reveal.visible=false;door.position.z=doorZ;badge.textContent='Найдите VR-очки';mission.textContent='Подойдите к столу и наденьте VR-очки.';$('flash').style.opacity=0;updateChapter();}
$('reset').onclick=()=>{reset();paused=false;$('settings').hidden=true};$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{})};$('menu').onclick=()=>{paused=!paused;$('settings').hidden=!paused;keys.clear()};$('resume').onclick=()=>{paused=false;$('settings').hidden=true};
addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)act();if(e.code==='Escape'){if(uiOpen){closeProjects();return;}paused=!paused;$('settings').hidden=!paused;keys.clear()}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=false});document.addEventListener('visibilitychange',()=>keys.clear());
let dragDistance=0;const canvas=$('game');canvas.onpointerdown=e=>{drag=true;lastX=e.clientX;lastY=e.clientY;dragDistance=0;canvas.setPointerCapture(e.pointerId)};canvas.onpointermove=e=>{if(!drag||paused||uiOpen)return;dragDistance+=Math.abs(e.clientX-lastX)+Math.abs(e.clientY-lastY);yaw-=(e.clientX-lastX)*.006;pitch=T.MathUtils.clamp(pitch+(e.clientY-lastY)*.004,-.05,roomIndex===2?1.48:.75);lastX=e.clientX;lastY=e.clientY};canvas.onpointerup=e=>{drag=false};canvas.onpointercancel=()=>drag=false;canvas.oncontextmenu=e=>e.preventDefault();canvas.addEventListener('wheel',e=>{dist=roomIndex===2?T.MathUtils.clamp(dist*Math.exp(e.deltaY*.0015),2,28):T.MathUtils.clamp(dist+e.deltaY*.003,1.5,4.5);e.preventDefault()},{passive:false});
const raycaster=new T.Raycaster();canvas.addEventListener('click',e=>{
 if(paused||uiOpen||dragDistance>5)return;
 scene.updateMatrixWorld(true);raycaster.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
 if(roomIndex===0){const hits=raycaster.intersectObject(world,true).filter(h=>{for(let p=h.object;p&&p!==world;p=p.parent)if(!p.visible)return false;return true;});const hit=hits[0];if(hit&&(hit.object===tv.hit||hit.object===tv.button)){tv.toggle();return;}if(state==='table'&&raycaster.intersectObject(headset,true).length)act();}
 if(roomIndex===1){const i=hall.nearest(player.position);if(i!==null&&raycaster.intersectObject(hall.pods[i].g,true).length)openProjects(i);}
});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key)}
function blocked(x,z){if(roomIndex===1)return hall.blocked(x,z);if(roomIndex===2)return future.blocked(x,z)||x<future.center.x-W/2+.23||x>future.center.x+W/2-.23||z<future.center.z-D/2+.23||z>future.center.z+D/2-.23;if(x< -W/2+.23||x>W/2-.23||z< -D/2+.23||z>D/2-.23)return true;return obstacles.some(o=>Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d);}
let last=performance.now(),walk=0;const target=new T.Vector3(),desired=new T.Vector3();function frame(now){requestAnimationFrame(frame);const dt=(paused||uiOpen)?0:T.MathUtils.clamp((now-last)/1000,0,.04);last=now;let moving=false;let dx=0,dz=0;if(!paused&&!uiOpen&&state!=='wearing'){const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));const right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));dx=right*Math.cos(yaw)-forward*Math.sin(yaw);dz=-right*Math.sin(yaw)-forward*Math.cos(yaw);const len=Math.hypot(dx,dz);if(len){dx/=len;dz/=len;const nx=player.position.x+dx*dt*1.65,nz=player.position.z+dz*dt*1.65;if(!blocked(nx,player.position.z)){player.position.x=nx;moving=true}if(!blocked(player.position.x,nz)){player.position.z=nz;moving=true}const angle=Math.atan2(-dx,-dz);player.rotation.y+=Math.atan2(Math.sin(angle-player.rotation.y),Math.cos(angle-player.rotation.y))*Math.min(1,dt*12)}}
walk=T.MathUtils.damp(walk,moving?1:0,9,dt);phase+=dt*8;body.position.y=Math.abs(Math.sin(phase))*.016*walk+Math.sin(now*.0016)*.003;legs[0].rotation.x=Math.sin(phase)*.36*walk;legs[1].rotation.x=-Math.sin(phase)*.36*walk;arms[0].rotation.x=-Math.sin(phase)*.29*walk;arms[1].rotation.x=Math.sin(phase)*.29*walk;

if(state==='worn'){door.position.z=T.MathUtils.damp(door.position.z,doorZ+doorWidth+.03,2,dt)}else{door.position.z=T.MathUtils.damp(door.position.z,doorZ,3,dt)}marker.visible=state==='table';marker.position.set(glassesHome.x,glassesHome.y+.3+Math.sin(now*.002)*.025,glassesHome.z);marker.quaternion.copy(camera.quaternion);let actionText='';if(roomIndex===0){tv.update(dt);if(state==='table'&&near())actionText='Надеть VR-очки';else if(doorNear())actionText='Войти';}else if(roomIndex===1){if(hall.exitNear(player.position))actionText='Подняться';else{const i=hall.nearest(player.position);if(i!==null)actionText='Рассмотреть: '+hall.themes[i].name;}}action.hidden=paused||uiOpen||!actionText;action.innerHTML='<kbd>E</kbd> '+actionText;$('step1').classList.toggle('done',state!=='table');$('step2').classList.toggle('done',state==='worn');
// Orbit follows the heroine; camera stays within the finished room.
if(roomIndex===1)hall.update(dt,now/1000);
target.copy(player.position).add(new T.Vector3(0,1.2,0));
if(roomIndex===2)target.lerp(future.center.clone().add(new T.Vector3(0,H/2,0)),T.MathUtils.smoothstep(dist,6,15));
desired.set(target.x+Math.sin(yaw)*Math.cos(pitch)*dist,target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*Math.cos(pitch)*dist);
if(roomIndex===2){future.group.updateMatrixWorld(true);const direction=desired.clone().sub(target),length=direction.length(),probe=new T.Raycaster(target,direction.normalize(),0,length);const hit=probe.intersectObject(future.liftBody)[0];if(hit)desired.copy(target).addScaledVector(direction,Math.max(.3,hit.distance-.18));desired.y=T.MathUtils.clamp(desired.y,.4,future.top-2);const offset=desired.clone().sub(future.center);const r=Math.hypot(offset.x,offset.z);if(r>future.radius-3){desired.x=future.center.x+offset.x*(future.radius-3)/r;desired.z=future.center.z+offset.z*(future.radius-3)/r;}}
else {const v=desired.clone().sub(target);let f=1;for(let axis of['x','z']){const bound=roomIndex===1?(axis==='x'?CONFIG.reactor.width/2-.15:CONFIG.reactor.depth/2-.15):(axis==='x'?W/2-.15:D/2-.15),center=roomIndex===1?(axis==='z'?CONFIG.reactor.centerZ:0):0;if(desired[axis]>center+bound)f=Math.min(f,(center+bound-target[axis])/v[axis]);if(desired[axis]<center-bound)f=Math.min(f,(center-bound-target[axis])/v[axis])}if(desired.y>H-.2)f=Math.min(f,(H-.2-target.y)/v.y);desired.copy(target).addScaledVector(v,Math.max(.1,f));}
camera.position.lerp(desired,1-Math.exp(-dt*10));camera.lookAt(target);assets.update(dt,moving,state,anim);if(roomIndex===2)future.update(camera);renderer.render(scene,camera);}
function setView(view){if(roomIndex!==2)return;if(view==='inside'){yaw=.55;pitch=.22;dist=2.65;}else{yaw=view==='top'?.4:-.7;pitch=view==='top'?1.25:.48;dist=view==='top'?22:20;}}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
$('preview-future').onclick=()=>{paused=false;$('settings').hidden=true;enterRoom(2);setView('inside');};
camera.position.set(.9,2.25,2.8);requestAnimationFrame(frame);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
$('loading').hidden=true;globalThis.__roomDebug={setView,scene,camera,renderer,enterRoom,door,doorZ,wallSurfaces,assets,records,obstacles,player,headset,near,act,reset,frame,keys,future,hall,tv,doorNear,openProjects,showProject,closeProjects,getRoom:()=>roomIndex,blocked,getState:()=>state};

if(location.hash==="#future"){enterRoom(2);setView("inside");}
