import * as T from 'room-module/vendor/three.module.js';

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
export function curvedLabel(text,r,h,y,color,arc=2.5){
 const c=document.createElement('canvas');c.width=2048;c.height=256;const x=c.getContext('2d');x.textAlign='center';x.textBaseline='middle';x.font='600 125px Arial';x.fillStyle=color;x.shadowColor=color;x.shadowBlur=10;x.fillText(text,1024,128,1950);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 const m=new T.Mesh(new T.CylinderGeometry(r,r,h,100,1,true,-arc/2,arc),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));m.position.y=y;return m;
}
// A seamless text ribbon around the full perimeter; only UV offset changes per frame.
export function scrollingLabel(text,r,h,y,color){
 const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='600 125px Arial';
 c.width=Math.ceil(Math.max(512,ctx.measureText(text).width+220));c.height=256;
 ctx.font='600 125px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,c.width/2,128);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;
 map.repeat.x=2*Math.PI/2.5;
 const label=new T.Mesh(new T.CylinderGeometry(r,r,h,128,1,true),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
 label.position.y=y;label.name='scrolling-title';return label;
}
function scrollTitle(label,dt){label.material.map.offset.x=(label.material.map.offset.x+Math.max(0,dt)*.055)%1;}
const cubeTrim=new T.MeshStandardMaterial({color:'#30343b',roughness:.42,metalness:.55});

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
  const body=new T.Group();body.position.y=.36;g.add(body);
  const torso=rounded(body,.3,.34,.2,.055,cream,0,.15,0);
  cylinder(body,.045,.06,brass,0,.36,0);
  const head=new T.Group();head.position.y=.42;body.add(head);
  rounded(head,.25,.19,.21,.057,cream,0,.06,0);
  rounded(head,.21,.064,.018,.021,graphite,0,.071,.11);
  for(const xx of[-.058,.058])ball(head,.012,metal,xx,.074,.128);
  for(const xx of[-.085,.085]){cylinder(g,.045,.22,metal,xx,.24,0);ball(g,.05,brass,xx,.12,0);box(g,.1,.15,.09,cream,xx,.07,0);rounded(g,.13,.06,.2,.02,graphite,xx,-.02,.035);}
  const arms=[];
  for(const side of[-1,1]){const a=new T.Group();a.position.set(side*.205,.30,0);body.add(a);ball(a,.053,brass);box(a,.071,.18,.072,cream,0,-.12,0);ball(a,.038,metal,0,-.23,0);box(a,.065,.15,.064,cream,0,-.31,0);ball(a,.043,graphite,0,-.41,0);arms.push(a);}
  const p=plate('HR',.1,.055,'#f2d79c','#32434a',60);p.position.set(0,.18,.11);body.add(p);
  return {g,arms,torso,body,head,baseYaw:rotation};
}

export function showcase(i,theme){
  const g=new T.Group();g.name='showcase-'+i;
  cylinder(g,1.4,.18,cubeTrim,0,.09,0);cylinder(g,1.3,.35,cubeTrim,0,.34,0);
  cylinder(g,1.24,.055,cubeTrim,0,.54,0);cylinder(g,1.22,1.6,glass,0,1.36,0);
  cylinder(g,1.28,.08,cubeTrim,0,2.19,0);cylinder(g,1.3,.34,cubeTrim,0,2.39,0);
  for(const x of[-1.13,1.13])cylinder(g,.029,1.62,cubeTrim,x,1.36,0);
  const title=scrollingLabel(theme.name,1.306,.27,2.39,theme.color);g.add(title);
  const statusMat=activeMaterial('#182c2e'),ring=mesh(g,new T.TorusGeometry(1.24,.022,10,80),statusMat,0,.56,0);ring.rotation.x=Math.PI/2;
  const robots=[robot(g,-.65,0,Math.PI/2-.25),robot(g,.65,0,-Math.PI/2+.25)];
  const moving=[];
  const story=createStory(g,i,theme.color);
  const panel=new T.Group();panel.visible=false;panel.position.set(0,.05,1.45);panel.rotation.x=-.2;g.add(panel);
  rounded(panel,2.65,1.25,.16,.1,graphite,0,.44,0);const face=rounded(panel,2.57,1.17,.012,.07,cream,0,.44,.088);
  const buttons=[],lamps=[];
  theme.cards.forEach((card,j)=>{
    const y=.89-j*.19;
    const rim=cylinder(panel,.081,.025,brass,-1.05,y,.119);rim.rotation.x=Math.PI/2;
    const buttonMat=graphite.clone();buttonMat.emissive.set(theme.color);buttonMat.emissiveIntensity=.95;const button=cylinder(panel,.061,.039,buttonMat,-1.05,y,.14);button.rotation.x=Math.PI/2;button.userData.project=j;buttons.push(button);
    const label=plate(card[1],1.75,.145,'#283538','#d0cab6',52);label.position.set(-.025,y,.112);panel.add(label);label.userData.project=j;buttons.push(label);
    const lamp=ball(panel,.034,new T.MeshStandardMaterial({color:'#494e40',roughness:.35}),1.08,y,.127);lamps.push(lamp);
  });
  const meter=plate('0 / '+theme.cards.length,2.12,.1,'#d9d7b5','#344743',58);meter.position.set(0,-.065,.11);panel.add(meter);
  const liquidMat=new T.MeshStandardMaterial({color:theme.color,emissive:theme.color,emissiveIntensity:1.35,transparent:true,opacity:.52,roughness:.25,metalness:.1,depthWrite:false});
 const liquid=cylinder(g,1.18,1.53,liquidMat,0,.59,0);liquid.scale.y=.001;liquid.name='energy-liquid';
 const illumination=new T.PointLight(theme.color,0,6,2);illumination.position.set(0,1.8,0);g.add(illumination);
  return {title,story,clock:i*1.37,near:false,wasNear:false,nearTime:99,completion:0,completing:false,energyReady:false,progressPulse:0,state:"IDLE",liquid,fillLevel:0,i,g,panel,buttons,lamps,meter,robots,moving,ring,illumination,opened:false,activated:false,openedAt:0};
}

export function markProject(p,j,color,total){
  p.lamps[j].material=activeMaterial('#777b80');p.lamps[j].material.emissive.set('#383b40');p.lamps[j].material.emissiveIntensity=.35;p.buttons[j*2].position.z=.121;p.buttons[j*2].material=new T.MeshStandardMaterial({color:'#8b8d91',emissive:'#45474b',emissiveIntensity:.38,roughness:.42,metalness:.15});
  const count=p.lamps.filter(l=>l.material.emissive?.getHex()>0).length;
  const replacement=plate(`${count} / ${total}`,2.12,.1,'#d9d7b5','#344743',58);p.meter.material.map.dispose();p.meter.material.dispose();p.meter.material=replacement.material;replacement.geometry.dispose();
}

// R11: deterministic local timelines. Geometry is created once, never in update.
const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
const envelope=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
function createStory(parent,index,color){
 const root=new T.Group();parent.add(root);
 const materials=[];
 function material(opacity=1){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.8,transparent:true,opacity,depthWrite:false,roughness:.38,metalness:.15});m.userData.baseOpacity=opacity;materials.push(m);return m;}
 const glow=material(.88),shell=material(.26);
 const white=material(.95);white.color.set('#ecfff8');white.emissive.set(color);
 function group(x=0,y=0,z=.03){const o=new T.Group();o.position.set(x,y,z);root.add(o);return o;}
 function bar(p,w,h,d,x,y,z=0,m=glow){return box(p,w,h,d,m,x,y,z);}
 function document(w,h){const o=group();bar(o,w,h,.025,0,0,0,shell);for(const x of[-w/2,w/2])bar(o,.012,h,.015,x,0,.02);for(const y of[-h/2,h/2])bar(o,w,.012,.015,0,y,.02);ball(o,.035,white,-w*.24,h*.25,.026);bar(o,.085,.045,.02,-w*.24,h*.08,.026,white);for(let j=0;j<3;j++)bar(o,w*.45,.009,.014,w*.15,h*.22-j*.055,.026,white);return o;}
 function check(){const o=group(0,1.62);const a=bar(o,.11,.022,.025,-.045,-.015);a.rotation.z=-.7;const b=bar(o,.19,.022,.025,.065,.025);b.rotation.z=.82;return o;}
 const wave=mesh(root,new T.TorusGeometry(.4,.012,6,48),material(.6),0,.59,0);wave.rotation.x=Math.PI/2;
 const particles=[];const particleGeo=new T.SphereGeometry(.018,8,6);for(let n=0;n<8;n++){const o=mesh(root,particleGeo,glow);particles.push(o);}
 const objects={};
 if(index===0){objects.resume=document(.34,.43);objects.resume.position.set(-.08,1.23,.20);objects.badge=document(.17,.21);objects.badge.position.set(0,1.13,.20);objects.check=check();objects.marker=mesh(root,new T.TorusGeometry(.105,.012,8,32),glow,0,1.28,.24);}
 if(index===1){objects.steps=[];for(let j=0;j<3;j++){const o=group(-.24+j*.22,.90+j*.16,.12);bar(o,.20,.055,.25,0,0,0,shell);bar(o,.20,.012,.25,0,.03,0);objects.steps.push(o);}
  const shape=new T.Shape();for(let j=0;j<10;j++){const a=Math.PI/2+j*Math.PI/5,r=j%2?.085:.18,x=Math.cos(a)*r,y=Math.sin(a)*r;j?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();objects.star=mesh(root,new T.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false}),glow,0,1.65,.12);
  objects.arrow=group(.37,1.38,.10);bar(objects.arrow,.015,.26,.02,0,0);for(const side of[-1,1]){const a=bar(objects.arrow,.10,.018,.02,side*.033,.10);a.rotation.z=side*-.75;}
 }
 if(index===2){const shape=new T.Shape();shape.moveTo(0,-.19);shape.bezierCurveTo(-.30,.02,-.21,.27,0,.12);shape.bezierCurveTo(.21,.27,.30,.02,0,-.19);const geo=new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:16});geo.translate(0,0,-.035);objects.heart=mesh(root,geo,glow,0,1.18,.18);objects.link=bar(root,.70,.012,.012,0,1.12,.12);objects.seed=ball(root,.035,white,0,1.18,.18);}
 if(index===3){objects.rings=[];for(let j=0;j<3;j++){const o=mesh(root,new T.TorusGeometry(.23,.012,8,40),glow,0,.91+j*.22,.08);o.rotation.x=Math.PI/2;objects.rings.push(o);}objects.cube=mesh(root,new T.BoxGeometry(.22,.22,.22),shell,0,1.20,.08);const edges=new T.LineSegments(new T.EdgesGeometry(objects.cube.geometry),new T.LineBasicMaterial({color,transparent:true,opacity:.9}));objects.cube.add(edges);objects.check=check();}
 return {root,materials,objects,wave,particles,dim:1};
}
function reveal(o,value){if(!o)return;o.visible=value>.005;o.scale.setScalar(Math.max(.001,value));}
function pose(robot,arm,head=0,lean=0,turn=0,dt=.016){const f=1-Math.exp(-dt*9);robot.arms[0].rotation.x=T.MathUtils.lerp(robot.arms[0].rotation.x,-arm,f);robot.arms[1].rotation.x=T.MathUtils.lerp(robot.arms[1].rotation.x,-arm*.88,f);robot.arms[0].rotation.z=T.MathUtils.lerp(robot.arms[0].rotation.z,-.10*arm,f);robot.arms[1].rotation.z=T.MathUtils.lerp(robot.arms[1].rotation.z,.10*arm,f);robot.head.rotation.x=T.MathUtils.lerp(robot.head.rotation.x,head,f);robot.head.rotation.y=T.MathUtils.lerp(robot.head.rotation.y,turn,f);robot.body.rotation.x=T.MathUtils.lerp(robot.body.rotation.x,lean,f);robot.g.rotation.y=T.MathUtils.lerp(robot.g.rotation.y,robot.baseYaw+turn*.15,f);}
function hiring(p,t,dt){const o=p.story.objects;
 const read=envelope(t,0,.8,3.8,5.8),pass=envelope(t,4,5.6,8.2,9.8),success=envelope(t,6,6.8,8.3,9.8);
 reveal(o.resume,read);o.resume.rotation.y=Math.sin(t*1.6)*.10;o.resume.position.x=-.12+.03*Math.sin(t*2);
 reveal(o.marker,envelope(t,2,2.5,3.6,4.3));
 reveal(o.badge,pass);o.badge.position.x=-.22+.44*smooth(4.5,6.5,t);
 reveal(o.check,success);o.check.position.x=o.badge.position.x;
 const a=envelope(t,0,.9,7.7,9.8),b=envelope(t,4.8,6.2,8.5,9.9);
 pose(p.robots[0],a*(1.10+.10*Math.sin(t*3)*envelope(t,1,2,3,4)),-.12*a,0,0,dt);pose(p.robots[1],b*1.2,-.12*success,0,0,dt);return success;
}
function retention(p,t,dt){const o=p.story.objects;for(let j=0;j<3;j++)reveal(o.steps[j],envelope(t,j*.9,.8+j*.9,8.2+(2-j)*.35,9+(2-j)*.4));
 const star=envelope(t,6,6.7,8,9.5);reveal(o.star,star*(1+.08*Math.sin((t-6)*5)));o.star.rotation.y=.2*Math.sin(t*1.4);reveal(o.arrow,envelope(t,4,4.7,7.9,9));
 const a=envelope(t,0,.8,8,9.8),b=envelope(t,2,3,8,9.8);pose(p.robots[0],a*(.95+.4*star),-.12*a,0,0,dt);pose(p.robots[1],b*(.65+.7*star),Math.sin(t*4)*.06*envelope(t,2,2.5,4,4.5),0,0,dt);return star;
}
function care(p,t,dt){const o=p.story.objects,sad=envelope(t,0,1,3.5,6),help=envelope(t,2,3.8,9,10.9),heart=envelope(t,4.5,5.7,9,10.9);
 reveal(o.seed,envelope(t,4,4.5,5,5.7));reveal(o.link,envelope(t,3.6,4.5,8.5,10));reveal(o.heart,heart*(1+.045*Math.sin(t*4)));o.heart.rotation.y=.12*Math.sin(t);
 pose(p.robots[0],.9*envelope(t,4,6,9,10.9),.23*sad-.08*heart,.09*sad,0,dt);pose(p.robots[1],1.05*help,.06*Math.sin(t*3)*envelope(t,6,7,8,9),0,0,dt);return envelope(t,6,6.8,9,10.9);
}
function efficiency(p,t,dt){const o=p.story.objects,result=envelope(t,6,6.8,8,9.8),process=envelope(t,0,.9,7.7,9.9);for(let j=0;j<3;j++){reveal(o.rings[j],envelope(t,j*.4,.7+j*.4,8.5,9.9));o.rings[j].rotation.set(Math.PI/2+.15*Math.sin(t*1.2+j)*process,.17*Math.sin(t*.9+j)*process,t*(j%2?-1:1)*.45);o.rings[j].position.x=.06*Math.sin(j*2)*envelope(t,4,5,7.7,9);}
 reveal(o.cube,result);o.cube.rotation.set(.20*result,t*.4,.12*result);reveal(o.check,result);pose(p.robots[0],1.1*envelope(t,0,.9,8.3,9.9),-.08*process,0,0,dt);pose(p.robots[1],1.2*envelope(t,4,5.2,8.3,9.9),-.12*result,0,0,dt);return result;
}
const scenarios=[hiring,retention,care,efficiency];
export function animateShowcase(p,dt,time,color){
 dt=Math.max(0,Math.min(dt,.1));scrollTitle(p.title,dt);const story=p.story;
 if(p.near&&!p.wasNear)p.nearTime=0;p.wasNear=p.near;p.nearTime+=dt;
 p.state=p.completing?'COMPLETED':p.opened?'VIEWING':p.activated?'COMPLETED':p.progressPulse>.1?'PROGRESS':p.near?'PLAYER_NEAR':'IDLE';
 story.dim=T.MathUtils.damp(story.dim,p.opened?.28:1,6,dt);
 if(!p.completing)p.clock+=dt*(p.opened?.16:1);
 const t=p.clock%(p.i===2?11:10);let effect=scenarios[p.i](p,t,p.opened||p.completing?0:dt);
 if(p.nearTime<1.7&&!p.opened&&!p.completing){const greet=envelope(p.nearTime,0,.45,1.0,1.7);p.robots.forEach((r,j)=>{r.head.rotation.y=T.MathUtils.lerp(r.head.rotation.y,(j===0?-1:1)*.8,greet);});}
 if(p.opened&&!p.completing)p.robots.forEach(r=>pose(r,.15,0,0,0,dt));
 if(p.completing){p.completion+=dt;const raise=envelope(p.completion,0,.65,1.9,2.6);p.robots.forEach(r=>pose(r,1.4*raise,-.12*raise,0,0,dt));effect=raise;
  const o=story.objects;const finale=envelope(p.completion,.3,1,2,2.6);reveal(o.check||o.star||o.heart,finale);if(o.cube)reveal(o.cube,finale);
  if(p.completion>=2.6){p.completing=false;p.activated=true;p.energyReady=true;p.clock=0;}
 }
 p.progressPulse=Math.max(0,p.progressPulse-dt*1.4);
 const brightness=(p.near?.35:0)+(p.activated?.35:0)+effect*.35+p.progressPulse*.25;
 story.materials.forEach(m=>{m.opacity=m.userData.baseOpacity*story.dim;m.emissiveIntensity=(.6+brightness)*story.dim;});
 p.ring.material.color.set(color);p.ring.material.emissive.set(color);p.ring.material.emissiveIntensity=T.MathUtils.damp(p.ring.material.emissiveIntensity,(.65+brightness)*story.dim,6,dt);
 p.illumination.intensity=T.MathUtils.damp(p.illumination.intensity,(.18+brightness*.4)*story.dim,6,dt);
 // R10's opaque liquid obscured the miniature theatre. Keep progress in the UI and base ring.
 p.liquid.visible=false;p.panel.visible=false;
 const wavePhase=p.completing?Math.min(1,p.completion/2.6):((t-(p.i===2?6:6))%2+2)%2/2;
 story.wave.visible=effect>.01;story.wave.scale.setScalar(.8+wavePhase*1.9);story.wave.material.opacity=.45*effect*(1-wavePhase)*story.dim;
 story.particles.forEach((o,j)=>{const running=p.i===3?envelope(t,2,2.5,5.8,6.5):p.i===1?envelope(t,4,4.4,5.7,6):effect;
 o.visible=running>.02;const phase=(t*(p.i===3&&t>4?1.3:.65)+j/8)%1;
 if(p.i===3){o.position.set(.08*Math.sin(j*2),.82+phase*.65,.08+.05*Math.cos(j*2));}
 else if(p.i===1&&t<6){o.position.set(-.24+phase*.44,.96+phase*.32,.15);}
 else{o.position.set(Math.sin(j*2.4+t*.45)*.29,1.25+Math.cos(j*2.4+t*.45)*.27,.12+Math.sin(j)*.10);}
 o.scale.setScalar(running);
 });
}

export function energyReactor(colors){
  const g=new T.Group(),fills=[];
  cylinder(g,1.65,.25,cubeTrim,0,.125,0);cylinder(g,1.51,.3,cubeTrim,0,.4,0);cylinder(g,1.46,.07,cubeTrim,0,.59,0);
  cylinder(g,1.23,2.65,glass,0,1.96,0);cylinder(g,1.47,.08,cubeTrim,0,3.34,0);cylinder(g,1.52,.34,cubeTrim,0,3.55,0);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*.62,z=Math.sin(a)*.62;
    cylinder(g,.205,2.3,glass,x,1.89,z);cylinder(g,.23,.075,cubeTrim,x,.7,z);cylinder(g,.23,.075,cubeTrim,x,3.05,z);
    const fill=cylinder(g,.165,2.25,activeMaterial(colors[i]),x,.76,z);fill.material.emissiveIntensity=2;fill.scale.y=.001;fills.push(fill);
  }
  const core=mesh(g,new T.TorusGeometry(.27,.05,16,48),brass,0,1.9,0);
  const title=scrollingLabel('Ростелеком',1.526,.27,3.55,'#ffffff');g.add(title);
  return {g,fills,core,title,update(dt){scrollTitle(title,dt);},reset(){title.material.map.offset.x=0;}};
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
