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
  const title=plate(theme.name,2.2,.29,'#e5d5b3','#24383b',65);title.position.set(0,2.58,.32);title.visible=false;g.add(title);
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
  // Idle robotics always move; activation amplifies the loop.
  const boost=p.activated?1:.55,phase=time*(p.activated?1:.7);
  p.robots.forEach((r,ri)=>{
    r.g.rotation.z=Math.sin(phase*1.35+ri)*.028*boost;
    r.g.position.y=.56+Math.sin(phase*2.1+ri)*.012*boost;
    r.arms[0].rotation.x=-.35+Math.sin(phase*2.4+ri)*.18*boost;
    r.arms[1].rotation.x=-.35+Math.sin(phase*2.4+ri+1.2)*.18*boost;
    r.arms[0].rotation.z=ri?- .08:.08;
    r.arms[1].rotation.z=ri?.08:-.08;
  });
  if(p.i===0&&p.moving[0]){p.moving[0].position.x=Math.sin(phase*.9)*.28*boost;p.moving[0].position.y=1.05+Math.sin(phase*1.6)*.06;p.moving[0].rotation.y+=dt*.55*boost;}
  if(p.i===1){p.robots[0].arms[1].rotation.x=-1.15+Math.sin(phase*2.6)*.22*boost;p.robots[1].arms[0].rotation.x=-1.15+Math.sin(phase*2.6+.4)*.22*boost;}
  if(p.i===2){
    if(p.activated){p.robots[1].g.rotation.z=T.MathUtils.damp(p.robots[1].g.rotation.z,0,1.3,dt);p.robots[1].g.position.y=T.MathUtils.damp(p.robots[1].g.position.y,.56,1.3,dt);}
    else{p.robots[1].g.rotation.z=.32+Math.sin(phase)*.06;p.robots[1].g.position.y=.44+Math.abs(Math.sin(phase*1.4))*.08;}
  }
  if(p.i===3)p.moving.forEach((m,j)=>{m.rotation.z+=(j%2?-1:1)*dt*(.35+.45*boost);m.rotation.x=Math.sin(phase+j)*.12*boost;});
  if(!p.activated)return;
  p.ring.material.color.set(color);p.ring.material.emissive.set(color);p.illumination.intensity=T.MathUtils.damp(p.illumination.intensity,9,2,dt);
}

export function makeTicker(text='РОСТЕЛЕКОМ  ·  ИТОГИ 2026  ·  HR БУДУЩЕГО  ·  ',w=2.4,h=.28){
  const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const mat=new T.MeshBasicMaterial({map,toneMapped:false,transparent:true});
  const meshObj=new T.Mesh(new T.PlaneGeometry(w,h),mat);
  let offset=0;
  function paint(){
    ctx.fillStyle='#0b1520';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#1a3344';ctx.fillRect(0,0,c.width,8);ctx.fillRect(0,c.height-8,c.width,8);
    ctx.fillStyle='#7dffd2';ctx.shadowColor='#2affc0';ctx.shadowBlur=12;
    ctx.font='700 64px Arial';ctx.textBaseline='middle';
    const full=text+text;const tw=ctx.measureText(text).width||800;
    const x=(-offset%tw);ctx.fillText(full,x,c.height/2);ctx.fillText(full,x+tw,c.height/2);
    ctx.shadowBlur=0;map.needsUpdate=true;
  }
  paint();
  return {mesh:meshObj,update(dt){offset+=dt*140;paint();}};
}

// Ring ticker wrapped around the upper rim of the reactor dome (museum plate style).
export function makeDomeTicker(labels,radius=1.36,height=.32){
  const names=(labels&&labels.length?labels:['Быстрый найм','Удержание','Человекоцентричность','Эффективность']);
  const unit=names.map(n=>`  ${n}  ·`).join('')+'  ';
  const c=document.createElement('canvas');c.width=2048;c.height=160;const ctx=c.getContext('2d');
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;map.wrapT=T.ClampToEdgeWrapping;map.anisotropy=4;map.flipY=false;
  function paintStrip(){
    ctx.fillStyle='#24383b';ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle='#a48b58';ctx.lineWidth=6;ctx.strokeRect(4,4,c.width-8,c.height-8);
    ctx.fillStyle='#a48b58';ctx.fillRect(0,0,c.width,5);ctx.fillRect(0,c.height-5,c.width,5);
    ctx.fillStyle='#f1dfb0';ctx.font='600 72px Arial';ctx.textBaseline='middle';ctx.textAlign='left';
    const tw=ctx.measureText(unit).width||900;
    for(let x=0;x<c.width+tw;x+=tw)ctx.fillText(unit,x,c.height/2);
    map.needsUpdate=true;
    return tw;
  }
  paintStrip();
  const geo=new T.CylinderGeometry(radius,radius,height,64,1,true);
  // Flip U so text reads left-to-right from outside the dome.
  const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));uv.needsUpdate=true;
  const mat=new T.MeshBasicMaterial({map,toneMapped:false,side:T.FrontSide,transparent:false});
  const meshObj=new T.Mesh(geo,mat);
  return {mesh:meshObj,update(dt){map.offset.x=(map.offset.x-dt*.08)%1;if(map.offset.x<0)map.offset.x+=1;}};
}

export function makeMysticPortalScreen(w=4.2,h=2.6,seed=0){
  const c=document.createElement('canvas');c.width=768;c.height=512;const ctx=c.getContext('2d');
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const screen=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}));
  const sparks=Array.from({length:36},(_,i)=>({a:seed+i*.37,r:.12+(i%7)*.05,s:.4+(i%5)*.18}));
  function paint(t){
    const cx=c.width/2,cy=c.height/2;
    ctx.fillStyle='#05040c';ctx.fillRect(0,0,c.width,c.height);
    const g=ctx.createRadialGradient(cx,cy,20,cx,cy,280);
    g.addColorStop(0,'#3a1408');g.addColorStop(.45,'#12081f');g.addColorStop(1,'#030208');
    ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
    for(let ring=1;ring<=6;ring++){
      const R=38+ring*28+Math.sin(t*1.2+ring+seed)*6;
      ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,${110+ring*18},40,${.55-ring*.06})`;ctx.lineWidth=2+ring*.35;ctx.stroke();
      ctx.beginPath();
      for(let k=0;k<12;k++){const a=t*(.4+ring*.05)+k*Math.PI/6+seed;const x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.closePath();ctx.strokeStyle=`rgba(255,170,70,${.18})`;ctx.lineWidth=1;ctx.stroke();
    }
    ctx.strokeStyle='#ffb45a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,210+Math.sin(t*2)*4,0,Math.PI*2);ctx.stroke();
    sparks.forEach(s=>{const a=s.a+t*s.s,rr=90+s.r*180;ctx.fillStyle='rgba(255,210,120,.85)';ctx.beginPath();ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,2.2,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='rgba(255,150,60,.15)';ctx.beginPath();ctx.arc(cx,cy,48+Math.sin(t*3)*6,0,Math.PI*2);ctx.fill();
    map.needsUpdate=true;
  }
  paint(0);
  return {mesh:screen,update(t){paint(t);}};
}

export function makeNeonRussiaWall(themes,w=10.5,h=3.6){
  const c=document.createElement('canvas');c.width=1600;c.height=900;const ctx=c.getContext('2d');
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  // Simplified neon outline of Russia (stylized, readable silhouette).
  const outline=[[120,520],[180,430],[260,360],[360,300],[470,270],[600,250],[720,240],[840,255],[960,280],[1080,300],[1180,340],[1260,400],[1320,470],[1360,540],[1320,600],[1220,640],[1100,660],[980,650],[860,630],[740,620],[640,640],[540,680],[440,700],[340,690],[250,650],[180,600],[140,560]];
  function paint(t){
    ctx.fillStyle='#061018';ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<40;i++){ctx.fillStyle=`rgba(80,200,255,${.04+(i%5)*.01})`;ctx.fillRect((i*137)%c.width,(i*89)%c.height,2,2);}
    ctx.strokeStyle=`rgba(70,220,255,${.55+.2*Math.sin(t)})`;ctx.lineWidth=6;ctx.shadowColor='#3de7ff';ctx.shadowBlur=18;
    ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='rgba(20,80,110,.35)';ctx.fill();
    ctx.fillStyle='#9ef7ff';ctx.font='700 54px Arial';ctx.textAlign='center';ctx.fillText('ИТОГИ 2026',c.width/2,90);
    ctx.font='500 28px Arial';ctx.fillStyle='#7ad7e8';ctx.fillText('Год единства · направления HR',c.width/2,135);
    const spots=[[420,480],[700,420],[980,460],[1180,500]];
    themes.forEach((th,i)=>{
      const [x,y]=spots[i]||[500+i*200,500];
      ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fillStyle=th.color;ctx.shadowColor=th.color;ctx.shadowBlur=16;ctx.fill();ctx.shadowBlur=0;
      ctx.font='600 26px Arial';ctx.fillStyle='#e8fbff';ctx.textAlign='left';ctx.fillText(th.name,x+22,y+8);
      if(th.tag){ctx.font='400 18px Arial';ctx.fillStyle='#9ec9d6';ctx.fillText(th.tag,x+22,y+32);}
    });
    map.needsUpdate=true;
  }
  paint(0);
  const wall=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}));
  return {mesh:wall,update(t){paint(t);}};
}

export function energyReactor(colors,names=[]){
  const g=new T.Group(),fills=[];
  cylinder(g,1.65,.25,graphite,0,.125,0);cylinder(g,1.51,.3,cream,0,.4,0);cylinder(g,1.46,.07,brass,0,.59,0);
  cylinder(g,1.23,2.65,glass,0,1.96,0);cylinder(g,1.47,.08,brass,0,3.34,0);cylinder(g,1.52,.18,cream,0,3.47,0);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*.62,z=Math.sin(a)*.62;
    cylinder(g,.205,2.3,glass,x,1.89,z);cylinder(g,.23,.075,brass,x,.7,z);cylinder(g,.23,.075,brass,x,3.05,z);
    const fill=cylinder(g,.165,2.25,activeMaterial(colors[i]),x,.76,z);fill.scale.y=.001;fills.push(fill);
  }
  const core=mesh(g,new T.TorusGeometry(.27,.05,16,48),brass,0,1.9,0);
  const ticker=makeTicker('РОСТЕЛЕКОМ  ·  HR  ·  ИТОГИ 2026  ·  БУДУЩЕЕ НАЧИНАЕТСЯ С НАС  ·  ');
  ticker.mesh.position.set(0,.42,1.58);g.add(ticker.mesh);
  // Theme plates live here as a continuous ribbon under the dome crown.
  let domeTicker=null;
  if(names.length){domeTicker=makeDomeTicker(names,1.38,.3);domeTicker.mesh.position.set(0,3.18,0);g.add(domeTicker.mesh);}
  return {g,fills,core,ticker,domeTicker};
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
