import * as T from '../vendor/three.module.js';

const metal=new T.MeshPhysicalMaterial({color:'#aab1b0',metalness:.8,roughness:.32});
const brass=new T.MeshPhysicalMaterial({color:'#a58b54',metalness:.78,roughness:.33});
const cream=new T.MeshPhysicalMaterial({color:'#ddd9c6',roughness:.57,metalness:.12});
const graphite=new T.MeshStandardMaterial({color:'#24363a',roughness:.54,metalness:.28});
const glass=new T.MeshPhysicalMaterial({color:'#d7e6df',transparent:true,opacity:.15,roughness:.08,metalness:.1,depthWrite:false});
const rubber=new T.MeshStandardMaterial({color:'#141b21',roughness:.86});
const activeMaterial=c=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.2,roughness:.38});
function mesh(p,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m;}
function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);}
function cylinder(p,r,h,m,x=0,y=0,z=0){return mesh(p,new T.CylinderGeometry(r,r,h,40),m,x,y,z);}
function ball(p,r,m,x=0,y=0,z=0){return mesh(p,new T.SphereGeometry(r,24,16),m,x,y,z);}
function rounded(p,w,h,d,r,m,x=0,y=0,z=0){
  const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,steps:1,curveSegments:10});g.translate(0,0,-d/2);return mesh(p,g,m,x,y,z);
}

// Text is a surface in the world, never a billboard that turns with the camera.
export function plate(text,w=.9,h=.16,color='#f1dfb0',background='#24383b',size=50){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.max(128,Math.round(1024*h/w));const a=c.getContext('2d');
  a.fillStyle=background;a.fillRect(0,0,c.width,c.height);a.strokeStyle='#a48b58';a.lineWidth=5;a.strokeRect(3,3,c.width-6,c.height-6);a.fillStyle=color;a.textAlign='center';a.textBaseline='middle';a.font=`500 ${size}px Arial`;a.fillText(text,512,c.height/2,980);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false,side:T.FrontSide}));
}
export function vrHeadset(){
  const g=new T.Group();g.name='VR-headset';
  rounded(g,.22,.11,.06,.037,cream,0,0,-.023);
  rounded(g,.21,.096,.02,.033,rubber,0,0,.013);
  rounded(g,.196,.079,.015,.03,new T.MeshPhysicalMaterial({color:'#17252e',metalness:.65,roughness:.13,clearcoat:1}),0,0,-.064);
  for(const x of[-.072,0,.072]){const lens=cylinder(g,.013,.006,metal,x,0,-.075);lens.rotation.x=Math.PI/2;const eye=cylinder(g,.009,.007,new T.MeshPhysicalMaterial({color:'#091523',metalness:.45,roughness:.05,clearcoat:1}),x,0,-.08);eye.rotation.x=Math.PI/2;}
  for(const x of[-.045,.045]){const lens=cylinder(g,.03,.012,rubber,x,0,.035);lens.rotation.x=Math.PI/2;}
  const strap=mesh(g,new T.TorusGeometry(.113,.013,10,64,Math.PI*1.65),rubber,0,.01,.07);strap.rotation.x=Math.PI/2;strap.rotation.z=-Math.PI*.325;strap.scale.set(1,1.12,1);
  box(g,.035,.013,.18,rubber,0,.087,.057);
  const dial=cylinder(g,.027,.018,cream,0,.018,.18);dial.rotation.x=Math.PI/2;
  for(const x of[-.09,.09])ball(g,.009,activeMaterial('#d7e7df'),x,.025,-.078);
  return g;
}

function robot(parent,x,z,rotation=0){
  const g=new T.Group();g.position.set(x,.56,z);g.rotation.y=rotation;parent.add(g);
  const torso=rounded(g,.3,.34,.2,.055,cream,0,.51,0);
  cylinder(g,.045,.06,brass,0,.72,0);rounded(g,.25,.19,.21,.057,cream,0,.84,0);
  rounded(g,.21,.064,.018,.021,graphite,0,.851,.11);
  for(const xx of[-.058,.058])ball(g,.012,metal,xx,.854,.128);
  for(const xx of[-.085,.085]){cylinder(g,.045,.22,metal,xx,.24,0);ball(g,.05,brass,xx,.12,0);box(g,.1,.15,.09,cream,xx,.07,0);rounded(g,.13,.06,.2,.02,graphite,xx,-.02,.035);}
  const arms=[];
  for(const side of[-1,1]){const a=new T.Group();a.position.set(side*.205,.66,0);g.add(a);ball(a,.053,brass);box(a,.071,.18,.072,cream,0,-.12,0);ball(a,.038,metal,0,-.23,0);box(a,.065,.15,.064,cream,0,-.31,0);ball(a,.043,graphite,0,-.41,0);arms.push(a);}
  const p=plate('HR',.1,.055,'#f2d79c','#32434a',60);p.position.set(0,.54,.11);g.add(p);
  return {g,arms,torso};
}

export function showcase(i,theme){
  const g=new T.Group();g.name='showcase-'+i;
  cylinder(g,1.4,.18,graphite,0,.09,0);cylinder(g,1.3,.35,cream,0,.34,0);
  cylinder(g,1.24,.055,brass,0,.54,0);cylinder(g,1.22,1.6,glass,0,1.36,0);
  cylinder(g,1.28,.08,brass,0,2.19,0);cylinder(g,1.3,.14,cream,0,2.29,0);
  for(const x of[-1.13,1.13])cylinder(g,.029,1.62,brass,x,1.36,0);
  const title=plate(theme.name,2.2,.29,'#e5d5b3','#24383b',65);title.position.set(0,2.58,.32);g.add(title);
  const statusMat=activeMaterial('#182c2e'),ring=mesh(g,new T.TorusGeometry(1.24,.022,10,80),statusMat,0,.56,0);ring.rotation.x=Math.PI/2;
  const robots=[robot(g,-.44,0,Math.PI/2),robot(g,.44,0,-Math.PI/2)];
  const moving=[];
  if(i===0){const cube=rounded(g,.17,.17,.17,.025,brass,0,1.05,0);moving.push(cube);robots[0].arms[1].rotation.x=-1.08;robots[1].arms[0].rotation.x=-1.08;}
  if(i===1){robots[0].arms[1].rotation.x=-1.25;robots[1].arms[0].rotation.x=-1.25;}
  if(i===2){robots[1].g.rotation.z=.38;robots[1].g.position.y=.42;robots[0].arms[1].rotation.x=-1.15;robots[1].arms[0].rotation.x=-2;}
  if(i===3){for(let j=0;j<3;j++){const cog=mesh(g,new T.TorusGeometry(.14+j*.032,.025,8,24),brass,0,.8+j*.16,0);cog.rotation.x=Math.PI/2;moving.push(cog);}robots[0].arms[1].rotation.x=-.9;robots[1].arms[0].rotation.x=-.9;}
  const panel=new T.Group();panel.position.set(0,.05,1.45);panel.rotation.x=-.2;g.add(panel);
  rounded(panel,2.65,1.25,.16,.1,graphite,0,.44,0);const face=rounded(panel,2.57,1.17,.012,.07,cream,0,.44,.088);
  const buttons=[],lamps=[];
  theme.cards.forEach((card,j)=>{
    const y=.89-j*.19;
    const rim=cylinder(panel,.081,.025,brass,-1.05,y,.119);rim.rotation.x=Math.PI/2;
    const button=cylinder(panel,.061,.039,graphite.clone(),-1.05,y,.14);button.rotation.x=Math.PI/2;button.userData.project=j;buttons.push(button);
    const label=plate(card[1],1.75,.145,'#283538','#d0cab6',52);label.position.set(-.025,y,.112);panel.add(label);label.userData.project=j;buttons.push(label);
    const lamp=ball(panel,.034,new T.MeshStandardMaterial({color:'#494e40',roughness:.35}),1.08,y,.127);lamps.push(lamp);
  });
  const meter=plate('0 / '+theme.cards.length,2.12,.1,'#d9d7b5','#344743',58);meter.position.set(0,-.065,.11);panel.add(meter);
  const illumination=new T.PointLight(theme.color,0,6,2);illumination.position.set(0,1.8,0);g.add(illumination);
  return {i,g,panel,buttons,lamps,meter,robots,moving,ring,illumination,opened:false,activated:false,openedAt:0};
}

export function markProject(p,j,color,total){
  p.lamps[j].material=activeMaterial(color);p.buttons[j*2].position.z=.121;p.buttons[j*2].material=graphite;
  const count=p.lamps.filter(l=>l.material.emissive?.getHex()>0).length;
  const replacement=plate(`${count} / ${total}`,2.12,.1,'#d9d7b5','#344743',58);p.meter.material.map.dispose();p.meter.material.dispose();p.meter.material=replacement.material;replacement.geometry.dispose();
}

export function animateShowcase(p,dt,time,color){
  p.panel.position.y=T.MathUtils.damp(p.panel.position.y,p.opened?.89:.05,5,dt);
  p.panel.visible=p.opened||p.panel.position.y>.07;
  if(!p.activated)return;
  p.ring.material.color.set(color);p.ring.material.emissive.set(color);p.illumination.intensity=T.MathUtils.damp(p.illumination.intensity,9,2,dt);
  const phase=time-p.openedAt;
  p.robots[0].g.rotation.z=Math.sin(phase*1.2)*.022;
  if(p.i===0){p.moving[0].position.x=Math.sin(phase*.8)*.23;p.moving[0].rotation.y+=dt*.4;}
  if(p.i===1){p.robots[0].arms[1].rotation.x=-1.25+Math.sin(phase*2.2)*.07;p.robots[1].arms[0].rotation.x=-1.25+Math.sin(phase*2.2)*.07;}
  if(p.i===2){p.robots[1].g.rotation.z=T.MathUtils.damp(p.robots[1].g.rotation.z,0,1.3,dt);p.robots[1].g.position.y=T.MathUtils.damp(p.robots[1].g.position.y,.56,1.3,dt);}
  if(p.i===3)p.moving.forEach((m,j)=>{m.rotation.z+=(j%2?-1:1)*dt*.5;});
}

export function energyReactor(colors){
  const g=new T.Group(),fills=[];
  cylinder(g,1.65,.25,graphite,0,.125,0);cylinder(g,1.51,.3,cream,0,.4,0);cylinder(g,1.46,.07,brass,0,.59,0);
  cylinder(g,1.23,2.65,glass,0,1.96,0);cylinder(g,1.47,.08,brass,0,3.34,0);cylinder(g,1.52,.18,cream,0,3.47,0);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*.62,z=Math.sin(a)*.62;
    cylinder(g,.205,2.3,glass,x,1.89,z);cylinder(g,.23,.075,brass,x,.7,z);cylinder(g,.23,.075,brass,x,3.05,z);
    const fill=cylinder(g,.165,2.25,activeMaterial(colors[i]),x,.76,z);fill.scale.y=.001;fills.push(fill);
  }
  const core=mesh(g,new T.TorusGeometry(.27,.05,16,48),brass,0,1.9,0);
  const plaque=plate('Ростелеком',2.1,.32,'#ffffff','#24363a',115);plaque.position.set(0,.4,1.55);g.add(plaque);
  return {g,fills,core};
}

export function energyPipe(start,end,color){
  const curve=new T.CatmullRomCurve3([start,new T.Vector3(start.x*.55,.14,start.z),new T.Vector3(end.x,.14,end.z+1),end]);
  const g=new T.Group();mesh(g,new T.TubeGeometry(curve,60,.11,12),glass);
  const line=mesh(g,new T.TubeGeometry(curve,60,.042,8),activeMaterial(color));line.visible=false;
  const sparks=[];for(let i=0;i<5;i++){const s=ball(g,.065,activeMaterial(color));s.visible=false;sparks.push(s);}
  return {g,curve,line,sparks,active:false};
}

export function shutter(){
  const g=new T.Group(),door=new T.Group();g.add(door);
  for(let j=0;j<19;j++){box(door,3.5,.165,.13,metal,0,.13+j*.18,0);box(door,3.45,.025,.025,graphite,0,.055+j*.18,.08);}
  for(const x of[-1.86,1.86])box(g,.18,3.9,.3,brass,x,1.95,0);
  box(g,3.98,.28,.35,graphite,0,3.78,0);
  const glowMat=new T.MeshBasicMaterial({color:'#f3e2b1'}),behind=box(g,3.45,3.5,.03,glowMat,0,1.75,-.15);behind.visible=false;
  const label=plate('ЦЕНТР УПРАВЛЕНИЯ HR БУДУЩЕГО',4.5,.3);label.position.set(0,4.13,.1);g.add(label);
  return {g,door,behind,open:false};
}

export function officeAccents(parent,future,asset){
  const g=new T.Group();parent.add(g);
  // Printed poster and museum-style award shelving recur in both rooms.
  const poster=new T.TextureLoader().load(asset(future?'poster-robot.webp':'poster-human.webp'));poster.colorSpace=T.SRGBColorSpace;
  const art=mesh(g,new T.PlaneGeometry(1.1,1.65),new T.MeshStandardMaterial({map:poster,roughness:.8}),-5.35,2.45,future?-26.9:-13.7);
  box(g,1.19,1.74,.055,brass,-5.35,2.45,art.position.z-.04);
  const shelf=new T.Group();shelf.position.set(5.2,0,future?-21:-10.5);parent.add(shelf);shelf.userData.collider={w:2.4,d:.6};
  for(const x of[-1.1,1.1])box(shelf,.055,2.5,.5,brass,x,1.25,0);
  for(let row=0;row<4;row++){const y=.2+row*.66;box(shelf,2.4,.06,.6,cream,0,y,0);for(let j=0;j<3;j++){const x=-.7+j*.7;if(future){const cube=mesh(shelf,new T.BoxGeometry(.23,.32,.23),new T.MeshPhysicalMaterial({color:'#8ddac8',transparent:true,opacity:.44,emissive:'#32594f',metalness:.1,roughness:.12}),x,y+.24,0);cube.rotation.y=.3;}else{box(shelf,.31,.39,.035,brass,x,y+.225,0);const diploma=plate('ДИПЛОМ',.26,.33,'#36433e','#ebe0c7',75);diploma.position.set(x,y+.225,.021);shelf.add(diploma);}}}
  const lamp=new T.Group();lamp.position.set(-2.05,future?.86:.79,future?-11:-4);parent.add(lamp);cylinder(lamp,.12,.027,brass);cylinder(lamp,.012,.29,brass,0,.16,0);const shade=mesh(lamp,new T.SphereGeometry(.17,24,16,0,Math.PI*2,0,Math.PI/2),graphite,0,.32,0);const light=new T.PointLight('#ffdb9a',3,2.4,2);light.position.set(0,.27,0);lamp.add(light);
  if(future){
    for(let i=0;i<6;i++)for(let j=0;j<6;j++)box(g,.35,.35,.16,glass,-8+i*.37,.3+j*.37,-24);
    const clock=plate('20 : 27',1.1,.42,'#ffe4a7','#253633',125);clock.position.set(5,2.9,-26.9);g.add(clock);
    const cabinet=new T.Group();cabinet.position.set(-7,0,-15);cabinet.userData.collider={w:1.4,d:.7};parent.add(cabinet);box(cabinet,1.4,1.25,.7,cream,0,.64,0);for(let i=0;i<4;i++){box(cabinet,1.3,.25,.035,graphite,0,.19+i*.28,.37);box(cabinet,.2,.025,.07,brass,0,.2+i*.28,.41);}const doc=plate('ПРОЕКТЫ / 2027',1,.7,'#abf8e1','#214348',60);doc.position.set(0,1.9,0);doc.material.transparent=true;doc.material.opacity=.7;cabinet.add(doc);
  }
}

export function commandDesk(asset){
  const g=new T.Group();g.userData.collider={w:4.2,d:1.6};
  rounded(g,4.2,.12,1.5,.06,cream,0,.8,0);for(const x of[-1.65,1.65])cylinder(g,.1,.75,brass,x,.39,0);
  const panels=[];
  for(let i=0;i<3;i++){const p=plate(['HR / ДАШБОРДЫ','КАРТА РОССИИ','ПЛАНЫ РАЗВИТИЯ'][i],1.18,.64,'#b1ffdf','#254b48',68);p.position.set((i-1)*1.35,1.57,-.3);p.rotation.y=(i-1)*-.16;p.material.transparent=true;p.material.opacity=.8;g.add(p);panels.push(p);}
  const map=new T.TextureLoader().load(asset('russia-outline.svg'));map.colorSpace=T.SRGBColorSpace;
  mesh(g,new T.PlaneGeometry(1.09,.53),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}),0,1.55,-.285);
  panels[1].position.y=1.97;panels[1].scale.y=.25;
  // Abstract bar instruments, not invented statistics.
  for(let i=0;i<7;i++)box(g,.07,.08+i%3*.045,.02,activeMaterial('#78bea3'),-1.7+i*.105,1.44,-.277);
  const disk=cylinder(g,.3,.03,brass,0,.89,.1);const button=plate('РАССМОТРЕТЬ',1.1,.18,'#fff1ce','#2c4d48',80);button.position.set(0,.9,.69);button.rotation.x=-.3;g.add(button);
  return {g,button,panels};
}
