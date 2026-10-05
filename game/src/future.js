import * as T from '../vendor/three.module.js';
import {assetURL} from './assets.js';
import {plate} from './retro.js';

function makePlansSlide(themes){
 const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 const bullets=[];
 themes.forEach(t=>{(t.plans||[]).slice(0,2).forEach(p=>bullets.push({color:t.color,title:t.name,text:p}));});
 if(!bullets.length)bullets.push(
  {color:'#a775ff',title:'Удержание',text:'Личный кабинет наставника и автоматизация вознаграждения.'},
  {color:'#43d9a3',title:'Человекоцентричность',text:'Совет ветеранов и портал для СВОих.'},
  {color:'#35b9ff',title:'Эффективность',text:'ИИ-агенты и клиентские пути HR-сервисов.'},
  {color:'#ff792d',title:'Быстрый найм',text:'Цифровой приём и ИИ-проверка госслужбы.'}
 );
 function paint(){
  ctx.fillStyle='#070b16';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<60;i++){ctx.fillStyle=`rgba(120,180,255,${.03+(i%4)*.015})`;ctx.beginPath();ctx.arc((i*97)%c.width,(i*53)%c.height,1.5,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#9fd8ff';ctx.font='700 54px Arial';ctx.textAlign='center';ctx.fillText('ПЛАНЫ 2027',c.width/2,78);
  ctx.font='400 24px Arial';ctx.fillStyle='#7aa0bc';ctx.fillText('Фокусы развития HR',c.width/2,118);
  const show=bullets.slice(0,4);
  show.forEach((b,i)=>{
   const y=170+i*120;
   ctx.fillStyle='rgba(18,28,48,.92)';ctx.fillRect(90,y-44,1100,100);
   ctx.fillStyle=b.color;ctx.fillRect(90,y-44,8,100);
   ctx.font='700 28px Arial';ctx.textAlign='left';ctx.fillStyle='#e8f4ff';ctx.fillText(b.title,120,y-8);
   ctx.font='400 24px Arial';ctx.fillStyle='#b7c7d8';ctx.fillText(b.text,120,y+32,1040);
  });
  map.needsUpdate=true;
 }
 paint();
 return map;
}

// Dark Stark-lab pavilion: pedestal console instead of a blocking table.
export async function makeFuture(scene,config){
 const {width:W,depth:D,height:H}=config.room, group=new T.Group();group.position.set(50,0,0);scene.add(group);
 const env=config.future.environment,R=env.radius,bottom=env.bottom,skyTop=env.top;
 const textures={};for(const [key,path] of Object.entries(env.textures)){const t=await new T.TextureLoader().loadAsync(assetURL(path));t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures[key]=t;}
 const uniforms={};for(const [key,t] of Object.entries(textures)){uniforms[key]={value:t};}
 const material=new T.ShaderMaterial({uniforms,side:T.BackSide,depthWrite:false,toneMapped:false,
 vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D px;uniform sampler2D nx;uniform sampler2D py;uniform sampler2D ny;uniform sampler2D pz;uniform sampler2D nz;varying vec3 ray;
 vec4 face(sampler2D tex,vec2 plane,float depth){if(depth<=0.)return vec4(0.);vec2 q=plane/depth;float edge=max(abs(q.x),abs(q.y));float w=(1.-smoothstep(1.03,1.1917536,edge))*pow(depth,4.);if(w<=0.)return vec4(0.);return vec4(texture2D(tex,.5+.5*q/1.1917536).rgb*w,w);}
 void main(){vec3 d=normalize(ray);vec4 c=face(px,vec2(d.z,d.y),d.x)+face(nx,vec2(-d.z,d.y),-d.x)+face(pz,vec2(-d.x,d.y),d.z)+face(nz,vec2(d.x,d.y),-d.z)+face(py,vec2(-d.x,-d.z),d.y)+face(ny,vec2(-d.x,d.z),-d.y);gl_FragColor=vec4(c.rgb/max(c.a,.00001),1.);
 #include <colorspace_fragment>
 }`});
 const sphere=new T.Mesh(new T.SphereGeometry(R,192,96),material);group.add(sphere);
 function box(w,h,d,x,y,z,color,metalness=0){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.55,metalness}));o.position.set(x,y,z);o.receiveShadow=true;group.add(o);return o;}
 // Dark tech plinth instead of bright white floor ring.
 box(W+.16,.28,D+.16,0,-.14,0,'#121820',.45);
 const trim='#1c2430',accent='#3de7ff',panels=[];
 function glass(w,h,x,y,z,rx,ry){const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshPhysicalMaterial({color:'#6aa8c8',metalness:.15,roughness:.12,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false}));o.position.set(x,y,z);o.rotation.set(rx,ry,0);o.renderOrder=5;group.add(o);panels.push(o);return o;}
 glass(W,H,0,H/2,-D/2,0,0);glass(W,H,0,H/2,D/2,0,0);
 glass(D,H,-W/2,H/2,0,0,Math.PI/2);glass(D,H,W/2,H/2,0,0,Math.PI/2);glass(W,D,0,H,0,-Math.PI/2,0);
 for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])box(.055,H,.055,x,H/2,z,trim,.7);
 for(const y of [.045,H]){for(const z of [-D/2,D/2])box(W,.045,.045,0,y,z,trim,.7);for(const x of [-W/2,W/2])box(.045,.045,D,x,y,0,trim,.7);}
 for(const x of [-W/4,0,W/4])for(const z of [-D/2,D/2])box(.014,H,.014,x,H/2,z,'#2a3848',.55);
 for(const x of [-W/2,W/2])box(.014,H,.014,x,H/2,0,'#2a3848',.55);
 for(const z of [-D/2-.035,D/2+.035]){box(W+.25,.32,.18,0,-.06,z,trim,.8);box(W+.25,.16,.13,0,H,z,trim,.8);}
 for(const x of [-W/2-.035,W/2+.035]){box(.18,.32,D+.25,x,-.06,0,trim,.8);box(.13,.16,D+.25,x,H,0,trim,.8);}
 // Ceiling tech ribs + cyan strip lights (lab mood).
 for(let i=-2;i<=2;i++){box(W*.9,.04,.08,0,H-.08,i*1.5,'#0e141c',.6);const strip=box(W*.82,.01,.03,0,H-.11,i*1.5,accent,.2);strip.material=new T.MeshBasicMaterial({color:accent});}
 const lift={minX:W/2-1.3,maxX:W/2+.3,minZ:-1.6,maxZ:1.6};
 const liftBody=box(1.35,H,3.2,W/2-.525,H/2,0,'#141820',.55);
 const front=W/2-1.21;
 for(const z of [-.59,.59])box(.045,2.8,1.16,front,1.42,z,'#2a3140',.7);
 box(.055,2.86,.025,front-.015,1.43,0,'#0d1018');
 const glow=new T.MeshBasicMaterial({color:'#3de7ff'});
 for(const z of [-1.23,1.23]){const b=box(.04,2.96,.028,front-.03,1.48,z,'#ffffff');b.material=glow;}
 box(.06,.36,.16,front-.04,1.1,1.4,'#3a4255',.6);
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#0b1520';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#7dffd2';ctx.font='48px Arial';ctx.textAlign='center';ctx.fillText('ОФИС БУДУЩЕГО',512,105);ctx.font='32px Arial';ctx.fillText('↑  Л И Ф Т',512,180);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
 const sign=new T.Mesh(new T.PlaneGeometry(2.5,.625),new T.MeshBasicMaterial({map:tx,transparent:true}));sign.rotation.y=-Math.PI/2;sign.position.set(front-.04,3.5,0);group.add(sign);

 // Compact circular command pedestal + neon button (table removed as a barrier).
 const console=new T.Group();group.add(console);
 const base=new T.Mesh(new T.CylinderGeometry(1.05,1.15,.18,48),new T.MeshStandardMaterial({color:'#121820',metalness:.55,roughness:.35}));base.position.y=.09;console.add(base);
 const ring=new T.Mesh(new T.TorusGeometry(1.05,.035,12,64),new T.MeshBasicMaterial({color:accent}));ring.rotation.x=Math.PI/2;ring.position.y=.19;console.add(ring);
 const pillar=new T.Mesh(new T.CylinderGeometry(.42,.5,.55,32),new T.MeshStandardMaterial({color:'#1a2430',metalness:.45,roughness:.4}));pillar.position.y=.45;console.add(pillar);
 const deck=new T.Mesh(new T.CylinderGeometry(.55,.55,.08,40),new T.MeshStandardMaterial({color:'#0e1620',metalness:.5,roughness:.3}));deck.position.y=.76;console.add(deck);
 const button=new T.Mesh(new T.CylinderGeometry(.22,.24,.07,32),new T.MeshStandardMaterial({color:'#1a3a44',emissive:accent,emissiveIntensity:.55,metalness:.3,roughness:.35}));button.position.y=.84;button.name='plans-button';console.add(button);
 const btnLabel=plate('ПЛАНЫ 2027',.9,.16,'#d9fbff','#0c1a22',70);btnLabel.position.set(0,.92,.42);btnLabel.rotation.x=-.35;console.add(btnLabel);
 const halo=new T.PointLight(accent,4,5,2);halo.position.set(0,1.3,0);console.add(halo);
 const consoleBounds=new T.Box3(new T.Vector3(-1.15,0,-1.15),new T.Vector3(1.15,1.2,1.15));

 const plansMap=makePlansSlide(config.reactor?.themes||[]);
 const slide=new T.Mesh(new T.PlaneGeometry(5.6,3.15),new T.MeshBasicMaterial({map:plansMap,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
 slide.position.set(0,H/2+.05,-D/2+.08);slide.visible=false;group.add(slide);
 const dimmers=panels.map(p=>{const d=new T.Mesh(p.geometry,new T.MeshBasicMaterial({color:'#03060c',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));d.position.copy(p.position);d.rotation.copy(p.rotation);d.visible=false;group.add(d);return d;});

 let plansOpen=false,plansT=0;
 function setPlans(open){plansOpen=!!open;slide.visible=true;dimmers.forEach(d=>d.visible=true);button.material.emissiveIntensity=plansOpen?1.2:.55;}
 function togglePlans(){setPlans(!plansOpen);return plansOpen;}
 function nearConsole(player){const lx=player.x-group.position.x,lz=player.z-group.position.z;return Math.hypot(lx,lz)<1.85;}
 function blocked(x,z){const lx=x-group.position.x,lz=z-group.position.z;return (lx>lift.minX-.23&&Math.abs(lz)<1.83)||(Math.hypot(lx,lz)<1.05);}
 const panel=new T.Group();group.add(panel);
 function update(camera,dt=0){
  const local=group.worldToLocal(camera.position.clone());
  panels.forEach(p=>{p.material.opacity=local.distanceTo(p.position)<2?.04:.12;});
  plansT=T.MathUtils.damp(plansT,plansOpen?1:0,5,dt||.016);
  slide.material.opacity=plansT;slide.visible=plansT>.02;
  dimmers.forEach(d=>{d.material.opacity=plansT*.88;d.visible=plansT>.02;});
  ring.rotation.z+=(dt||.016)*.4;
  button.position.y=.84+(plansOpen?-.012:Math.sin(performance.now()*.003)*.01);
 }
 function reset(){setPlans(false);plansT=0;slide.material.opacity=0;slide.visible=false;dimmers.forEach(d=>{d.material.opacity=0;d.visible=false;});}
 return {group,panel,blocked,tableBounds:consoleBounds,center:group.position.clone(),width:W,depth:D,radius:R,bottom,top:skyTop,panels,update,liftBody,button,console,nearConsole,togglePlans,setPlans,plansOpen:()=>plansOpen,reset};
}
