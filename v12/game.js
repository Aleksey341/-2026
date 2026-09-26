import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $ = s => document.querySelector(s);
const canvas = $('#game');
const renderer = new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new T.Scene();
scene.background = new T.Color('#75b9dc');
scene.fog = new T.Fog('#75b9dc',22,70);
const camera = new T.PerspectiveCamera(66,innerWidth/innerHeight,.03,120);
scene.add(camera);

const hemi = new T.HemisphereLight('#dff6ff','#273c28',2.1); scene.add(hemi);
const sun = new T.DirectionalLight('#ffd1a4',3.6); sun.position.set(-8,14,10); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);

const world = new T.Group(); scene.add(world);
const clock = new T.Clock();
const ray = new T.Raycaster();
const center = new T.Vector2(0,0);
const keys = new Set();
let mode='outdoor', yaw=0, pitch=-.02, paused=true, interacting=null, currentFloor=-1, handPulse=0, data=null;
const visited = new Set();
let interactables=[];

const ui={
  intro:$('#intro'), start:$('#start'), boot:$('#boot'), prompt:$('#prompt'), action:$('#action'), reticle:$('#reticle'),
  progressText:$('#progressText'), progressBar:$('#progressBar'), card:$('#card'), cardFloor:$('#cardFloor'), cardTitle:$('#cardTitle'), cardMetric:$('#cardMetric'), cardText:$('#cardText'),
  travel:$('#travel'), travelFloor:$('#travelFloor'), travelTitle:$('#travelTitle'), finale:$('#finale'), mobile:$('#mobile'), mobileAction:$('#mobileAction')
};

const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if(isTouch) ui.mobile.hidden=false;

const mat=(color,rough=.7,metal=.05)=>new T.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const box=(sx,sy,sz,color,pos=[0,0,0],rough=.7,metal=.05)=>{const m=new T.Mesh(new T.BoxGeometry(sx,sy,sz),mat(color,rough,metal));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;world.add(m);return m};
const cyl=(r,h,color,pos=[0,0,0])=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,h,24),mat(color,.55,.15));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;world.add(m);return m};

function labelTexture(text,{w=1024,h=360,bg='#0a1b22',fg='#fff',accent='#9d72ff',small='',align='center'}={}){
  const c=document.createElement('canvas'); c.width=w;c.height=h; const x=c.getContext('2d');
  x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle=accent;x.lineWidth=8;x.strokeRect(8,8,w-16,h-16);
  x.fillStyle=accent;x.font='700 34px Arial';x.textAlign=align;x.textBaseline='middle';
  const ax=align==='left'?54:w/2; if(small)x.fillText(small,ax,66);
  x.fillStyle=fg;x.font='800 60px Arial';
  const words=text.split(' ');let lines=[],line='';
  for(const word of words){const test=(line+' '+word).trim();if(x.measureText(test).width>w-110&&line){lines.push(line);line=word}else line=test} if(line)lines.push(line);
  const y0=h/2-(lines.length-1)*38+20; lines.slice(0,3).forEach((ln,i)=>x.fillText(ln,ax,y0+i*76));
  const tx=new T.CanvasTexture(c); tx.colorSpace=T.SRGBColorSpace; return tx;
}
function panel(text,pos,rot=[0,0,0],opts={}){
  const geo=new T.PlaneGeometry(opts.width||2.2,opts.height||.78);const tx=labelTexture(text,opts);
  const m=new T.Mesh(geo,new T.MeshBasicMaterial({map:tx,transparent:true,side:T.DoubleSide}));m.position.set(...pos);m.rotation.set(...rot);world.add(m);return m;
}
function addInteract(mesh,label,action,enabled=()=>true){interactables.push({mesh,label,action,enabled});mesh.userData.interactive=true;return mesh}
function clearWorld(){while(world.children.length){const o=world.children.pop();o.traverse?.(n=>{n.geometry?.dispose?.();if(n.material){const a=Array.isArray(n.material)?n.material:[n.material];a.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}})}interactables=[];interacting=null;ui.prompt.hidden=true;ui.action.hidden=true;ui.mobileAction.hidden=true}
function floorPlane(size=80,color='#66a943'){const m=new T.Mesh(new T.PlaneGeometry(size,size),mat(color,.95,0));m.rotation.x=-Math.PI/2;m.receiveShadow=true;world.add(m);return m}

function buildHands(){
  const root=new T.Group();camera.add(root);root.position.set(0,0,0);
  const skin=mat('#d49a7d',.62,0), sleeve=mat('#31343d',.8,.05), cuff=mat('#f4f4f2',.75,0);
  function arm(side){const g=new T.Group();const s=side;
    const fore=new T.Mesh(new T.CapsuleGeometry(.055,.28,5,10),sleeve);fore.rotation.x=Math.PI/2;fore.position.set(.12*s,-.13,0);
    const wrist=new T.Mesh(new T.CylinderGeometry(.058,.058,.055,18),cuff);wrist.rotation.z=Math.PI/2;wrist.position.set(.12*s,-.13,-.17);
    const palm=new T.Mesh(new T.SphereGeometry(.072,18,12),skin);palm.scale.set(.72,1,.42);palm.position.set(.12*s,-.13,-.23);
    for(let i=0;i<4;i++){const f=new T.Mesh(new T.CapsuleGeometry(.012,.075,3,8),skin);f.rotation.x=Math.PI/2;f.position.set((.09+.021*i)*s,-.1,-.295);g.add(f)}
    g.add(fore,wrist,palm);g.position.set(.25*s,-.22,-.52);g.rotation.z=.16*s;root.add(g);return g
  }
  return {root,left:arm(-1),right:arm(1)};
}
const hands=buildHands();

function buildOutdoor(){
  clearWorld(); mode='outdoor'; currentFloor=-1;scene.background.set('#79bde0');scene.fog.color.set('#79bde0');scene.fog.near=24;scene.fog.far=75;hemi.intensity=2.1;sun.intensity=3.6;
  floorPlane(100,'#559238');
  // surreal isolated office block
  box(6.4,5.4,5.4,'#c8c2ad',[0,2.7,0],.93,.02);
  box(5.5,4.5,.16,'#305c70',[0,2.45,2.73],.65,.18);
  box(2.15,3.4,.12,'#153945',[0,1.75,2.84],.45,.35);
  panel('HR TOWER',[0,4.45,2.84],[0,0,0],{width:3.8,height:.64,bg:'#173944',accent:'#ff7445',small:'ИТОГИ 2026'});
  for(let i=0;i<6;i++) box(2.4,.18,.72,'#d8d4c7',[0,.10+i*.16,6.15-i*.68],.9,.02);
  const call=box(.28,.42,.08,'#1d2730',[1.75,1.25,2.9],.35,.65);panel('●',[1.75,1.25,2.945],[0,0,0],{width:.19,height:.28,bg:'#1d2730',accent:'#ff8457'});
  addInteract(call,'Вызвать лифт',()=>enterElevator());
  // floating slabs / distant city cues
  for(let i=0;i<10;i++){const h=1+Math.random()*5;box(.7,h,.8,'#172331',[-11+i*2.5,h/2,-18-Math.random()*8],.8,.1)}
  camera.position.set(0,1.68,13.2);yaw=0;pitch=-.02;
}

function buildElevator(){
  clearWorld();mode='elevator';scene.background.set('#17313a');scene.fog.near=18;scene.fog.far=35;hemi.intensity=.9;sun.intensity=.7;
  floorPlane(7,'#3a2e2a');
  box(3,2.8,.12,'#245063',[0,1.4,-1.5],.42,.5);box(3,2.8,.12,'#245063',[0,1.4,1.5],.42,.5);box(.12,2.8,3,'#28576a',[-1.5,1.4,0],.42,.5);box(.12,2.8,3,'#28576a',[1.5,1.4,0],.42,.5);box(3,.12,3,'#d6e4e5',[0,2.8,0],.55,.12);
  panel('ЛИФТ',[0,2.26,-1.43],[0,0,0],{width:1.4,height:.35,bg:'#15343f',accent:'#ff7850',small:'HR 2026'});
  const names=(data?.reactor?.themes||fallbackThemes).map(x=>x.name);
  names.forEach((name,i)=>{
    const y=2.12-i*.43;const b=box(.16,.16,.06,themeColor(i),[1.42,y,.52],.3,.7);b.rotation.z=Math.PI/2;
    panel(String(i+1),[1.405,y,.52],[0,-Math.PI/2,0],{width:.20,height:.20,bg:'#182a32',accent:themeColor(i),small:''});
    addInteract(b,`Этаж ${i+1} · ${name}`,()=>travelToFloor(i));
  });
  const fin=box(.18,.18,.06,visited.size>=4?'#ffffff':'#45545a',[1.42,.38,.52],.3,.7);fin.rotation.z=Math.PI/2;
  panel('27',[1.405,.38,.52],[0,-Math.PI/2,0],{width:.24,height:.20,bg:'#182a32',accent:visited.size>=4?'#ff8457':'#45545a'});
  addInteract(fin,visited.size>=4?'Финальный этаж · 2027':'2027 · откроется после 4 этажей',()=>visited.size>=4?travelToFinal():flashLocked(),()=>true);
  const out=box(.18,.18,.06,'#81959d',[-1.42,.45,.62],.3,.65);out.rotation.z=Math.PI/2;addInteract(out,'Выйти наружу',()=>buildOutdoor());
  camera.position.set(0,1.68,.65);yaw=0;pitch=-.03;
}
function themeColor(i){return (data?.reactor?.themes?.[i]?.color)||['#ff792d','#a775ff','#43d9a3','#4da8ff'][i%4]}

function buildFloor(i){
  clearWorld();mode='floor';currentFloor=i;const themes=data?.reactor?.themes||fallbackThemes;const t=themes[i]||fallbackThemes[i];const color=t.color||themeColor(i);
  scene.background.set('#101b22');scene.fog.color.set('#101b22');scene.fog.near=18;scene.fog.far=42;hemi.intensity=1.25;sun.intensity=1.5;
  floorPlane(30,'#d4c8b0');
  box(13,3.6,.18,'#21343e',[0,1.8,-7.1],.72,.12);box(.18,3.6,14,'#29414a',[-6.6,1.8,0],.72,.1);box(.18,3.6,14,'#29414a',[6.6,1.8,0],.72,.1);
  // panoramic windows
  for(let x=-4.8;x<=4.8;x+=2.4) box(1.9,2.5,.06,'#4b88a4',[x,1.65,-6.96],.16,.2);
  panel(t.name.toUpperCase(),[0,2.8,-6.83],[0,0,0],{width:6.2,height:.78,bg:'#10242c',accent:color,small:`ЭТАЖ 0${i+1} · ${t.tag||''}`});
  const cards=t.cards?.length?t.cards:[['2026','Итоги направления','Ключевые результаты года.']];
  cards.forEach((c,j)=>{
    const x=(j-(cards.length-1)/2)*3.1;const p=panel(`${c[0]} · ${c[1]}`,[x,1.55,-4.8],[0,0,0],{width:2.65,height:1.16,bg:'#13252e',accent:color,small:'РЕЗУЛЬТАТ'});
    addInteract(p,`${c[0]} · ${c[1]}`,()=>showCard(i,c));
    const pedestal=box(2.75,.15,.72,'#33454b',[x,.12,-4.65],.55,.28);pedestal.material.emissive=new T.Color(color);pedestal.material.emissiveIntensity=.08;
  });
  if(t.plans?.length){const p=panel('ПЛАНЫ',[4.95,1.45,-1.2],[0,-Math.PI/2,0],{width:2.4,height:1,bg:'#13252e',accent:color,small:'ДАЛЬШЕ'});addInteract(p,'Планы направления',()=>showPlans(i,t));}
  const back=panel('ЛИФТ',[-4.95,1.35,4.5],[0,Math.PI/2,0],{width:1.9,height:.76,bg:'#142832',accent:'#ffffff',small:'НАЗАД'});addInteract(back,'Вернуться в лифт',()=>buildElevator());
  // ambient columns
  for(let k=0;k<5;k++){const x=-5+k*2.5;const c=cyl(.055,2.2,color,[x,1.1,1]);c.material.emissive=new T.Color(color);c.material.emissiveIntensity=.55}
  visited.add(i);updateProgress();
  camera.position.set(0,1.68,5.4);yaw=0;pitch=-.02;
}
function buildFinal(){
  clearWorld();mode='final';scene.background.set('#07131d');scene.fog.color.set('#07131d');scene.fog.near=20;scene.fog.far=70;hemi.intensity=.7;sun.intensity=.7;
  floorPlane(40,'#0c1720');
  for(let i=0;i<40;i++){const h=.5+Math.random()*7;const x=-18+Math.random()*36,z=-20-Math.random()*25;const m=box(.65,h,.65,'#182935',[x,h/2,z],.65,.25);m.material.emissive=new T.Color(Math.random()>.5?'#754cff':'#ff7143');m.material.emissiveIntensity=.12}
  panel('2027',[0,2.15,-6],[0,0,0],{width:6.5,height:2.5,bg:'#09151d',accent:'#a47cff',small:'БУДУЩЕЕ НАЧИНАЕТСЯ СЕГОДНЯ'});
  const themes=data?.reactor?.themes||fallbackThemes;const plans=themes.flatMap(t=>(t.plans||[]).map(p=>`${t.name}: ${p}`));
  const p=panel('ПЛАНЫ 2027',[0,1.25,-3.4],[0,0,0],{width:3.3,height:1,bg:'#13252e',accent:'#ff7b4d',small:`${plans.length} НАПРАВЛЕНИЙ ДВИЖЕНИЯ`});addInteract(p,'Открыть планы 2027',()=>showFinalPlans(plans));
  camera.position.set(0,1.68,5.6);yaw=0;pitch=-.03;
}

const fallbackThemes=[
 {name:'Быстрый найм',color:'#ff792d',tag:'Просто. Быстро. Цифрово.',cards:[['95%','Цифровые заявления','Заявления о приёме оформляются в цифровом виде.'],['ИИ','Проверка госслужбы','В цифровой приём включена ИИ-проверка госслужбы.']]},
 {name:'Удержание',color:'#a775ff',tag:'Рядом на всех этапах.',cards:[['60%','Новички с наставником','Новичков с наставником — 60%.'],['79%','Удержание наставляемых','Удержание наставляемых — 79%.']]},
 {name:'Человекоцентричность',color:'#43d9a3',tag:'Люди в центре всегда.',cards:[['59','Реадаптация участников СВО','Вернулись или приняты со старта запуска программы.'],['29','Поддержка в территориях','Квотируемых территорий.']]},
 {name:'Эффективность',color:'#4da8ff',tag:'Технологии работают на людей.',cards:[['ИИ','Автоматизация HR','Цифровые сервисы и автоматизация процессов.']]}
];

function updateProgress(){ui.progressText.textContent=`${visited.size} / 4`;ui.progressBar.style.setProperty('--p',`${visited.size/4*100}%`)}
function showCard(i,c){paused=true;const t=(data?.reactor?.themes||fallbackThemes)[i];ui.cardFloor.textContent=`ЭТАЖ 0${i+1} · ${t.name}`;ui.cardTitle.textContent=c[1];ui.cardMetric.textContent=c[0];ui.cardText.textContent=c[2]||'';ui.card.showModal()}
function showPlans(i,t){paused=true;ui.cardFloor.textContent=`ЭТАЖ 0${i+1} · ${t.name}`;ui.cardTitle.textContent='Планы';ui.cardMetric.textContent='→';ui.cardText.textContent=(t.plans||[]).join(' • ')||'Планы направления будут добавлены.';ui.card.showModal()}
function showFinalPlans(plans){paused=true;ui.cardFloor.textContent='2027';ui.cardTitle.textContent='Следующий этаж';ui.cardMetric.textContent='→';ui.cardText.textContent=plans.join(' • ')||'Планы 2027 формируются.';ui.card.showModal()}
function closeCard(){ui.card.close();paused=false}
$('#cardClose').onclick=closeCard;$('#cardOk').onclick=closeCard;

function enterElevator(){pressHand(()=>buildElevator())}
function travelToFloor(i){pressHand(()=>{const t=(data?.reactor?.themes||fallbackThemes)[i];ui.travelFloor.textContent=`ЭТАЖ 0${i+1}`;ui.travelTitle.textContent=t.name.toUpperCase();ui.travel.hidden=false;paused=true;setTimeout(()=>{buildFloor(i);ui.travel.hidden=true;paused=false},900)})}
function travelToFinal(){pressHand(()=>{ui.travelFloor.textContent='ЭТАЖ 2027';ui.travelTitle.textContent='БУДУЩЕЕ';ui.travel.hidden=false;paused=true;setTimeout(()=>{buildFinal();ui.travel.hidden=true;paused=false;setTimeout(()=>ui.finale.hidden=false,900)},900)})}
function flashLocked(){ui.prompt.textContent='Сначала посетите все 4 этажа';ui.prompt.hidden=false;setTimeout(()=>{if(!interacting)ui.prompt.hidden=true},1400)}
function pressHand(fn){handPulse=1;setTimeout(fn,180)}

function interactionCheck(){
  ray.setFromCamera(center,camera);const candidates=interactables.map(x=>x.mesh);const hit=ray.intersectObjects(candidates,false)[0];
  let next=null;if(hit&&hit.distance<2.4){next=interactables.find(x=>x.mesh===hit.object);}
  interacting=next||null;ui.reticle.classList.toggle('active',!!interacting);
  if(interacting){ui.prompt.textContent=interacting.label;ui.prompt.hidden=false;ui.action.hidden=isTouch;ui.action.textContent=interacting.label.toUpperCase();ui.mobileAction.hidden=!isTouch;ui.mobileAction.textContent='НАЖАТЬ'}else{ui.prompt.hidden=true;ui.action.hidden=true;ui.mobileAction.hidden=true}
}
function doInteract(){if(paused||!interacting)return;pressHand(()=>interacting?.action?.())}
ui.action.onclick=doInteract;ui.mobileAction.onclick=doInteract;

function animateHands(t,speed){const bob=Math.sin(t*10)*.012*speed;hands.root.position.y=bob;hands.left.rotation.x=.04*Math.sin(t*7)*speed;hands.right.rotation.x=-.04*Math.sin(t*7)*speed;if(handPulse>0){handPulse=Math.max(0,handPulse-.055);const k=Math.sin((1-handPulse)*Math.PI);hands.right.position.z=-.28*k;hands.right.rotation.x=-.55*k}else hands.right.position.z=0}
function move(dt){if(paused)return 0;let f=0,s=0;if(keys.has('KeyW')||keys.has('ArrowUp'))f+=1;if(keys.has('KeyS')||keys.has('ArrowDown'))f-=1;if(keys.has('KeyD'))s+=1;if(keys.has('KeyA'))s-=1;f+=mobileMove.y;s+=mobileMove.x;const l=Math.hypot(f,s);if(l>1){f/=l;s/=l}const speed=mode==='outdoor'?4.0:3.0;const sy=Math.sin(yaw),cy=Math.cos(yaw);camera.position.x+=(s*cy-f*sy)*speed*dt;camera.position.z+=(s*sy+f*cy)*speed*dt;clampPosition();return Math.min(1,l)}
function clampPosition(){if(mode==='outdoor'){camera.position.x=T.MathUtils.clamp(camera.position.x,-14,14);camera.position.z=T.MathUtils.clamp(camera.position.z,-18,18)}else if(mode==='elevator'){camera.position.x=T.MathUtils.clamp(camera.position.x,-1.08,1.08);camera.position.z=T.MathUtils.clamp(camera.position.z,-1.08,1.08)}else{camera.position.x=T.MathUtils.clamp(camera.position.x,-6.1,6.1);camera.position.z=T.MathUtils.clamp(camera.position.z,-6.5,6.1)}camera.position.y=1.68}
function updateView(){camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch}

addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE')doInteract()});addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('click',()=>{if(!isTouch&&!paused&&document.pointerLockElement!==canvas)canvas.requestPointerLock();else if(!isTouch&&document.pointerLockElement===canvas)doInteract()});
addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!paused){yaw-=e.movementX*.0023;pitch-=e.movementY*.002;pitch=T.MathUtils.clamp(pitch,-1.25,1.1)}});

const mobileMove={x:0,y:0};const stick=$('#stick'),knob=stick.querySelector('i'),look=$('#look');let stickId=null,lookId=null,lx=0,ly=0;
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e)});stick.addEventListener('pointerup',e=>{if(e.pointerId===stickId){stickId=null;mobileMove.x=mobileMove.y=0;knob.style.transform='translate(-50%,-50%)'}});
function updateStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.32,d=Math.hypot(dx,dy)||1;if(d>max){dx*=max/d;dy*=max/d}mobileMove.x=dx/max;mobileMove.y=-dy/max;knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`}
look.addEventListener('pointerdown',e=>{lookId=e.pointerId;lx=e.clientX;ly=e.clientY;look.setPointerCapture(e.pointerId)});look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||paused)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw-=dx*.006;pitch-=dy*.005;pitch=T.MathUtils.clamp(pitch,-1.25,1.1)});look.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null});

function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;const speed=move(dt);updateView();interactionCheck();animateHands(t,speed);renderer.render(scene,camera)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8))});

async function init(){try{const r=await fetch('../game/config/room.json?v=12',{cache:'no-store'});data=await r.json();ui.boot.textContent=`ЗАГРУЖЕНО НАПРАВЛЕНИЙ: ${data?.reactor?.themes?.length||4}`}catch(e){console.warn('room.json unavailable, fallback data used',e);data={reactor:{themes:fallbackThemes}};ui.boot.textContent='РЕЖИМ РЕЗЕРВНЫХ ДАННЫХ'}buildOutdoor();updateProgress();ui.start.disabled=false;ui.start.textContent='Войти в 2026';ui.start.onclick=()=>{ui.intro.hidden=true;paused=false;if(!isTouch)canvas.requestPointerLock?.()};loop()}
$('#restart').onclick=()=>location.reload();
init();