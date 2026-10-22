import {darkSlide} from 'room-module/src/slide-theme.js';
import * as T from 'room-module/vendor/three.module.js';
import {assetURL} from 'room-module/src/assets.js';
// The player remains in the pavilion. The camera can orbit through its glass.
export async function makeFuture(scene,config){
 const {width:W,depth:D,height:H}=config.room, group=new T.Group();group.position.set(50,0,0);scene.add(group);
 const env=config.future.environment,R=env.radius,bottom=env.bottom,top=env.top;
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
 box(W+.16,.28,D+.16,0,-.14,0,'#817669');
 const floorPanels=new T.Group();group.add(floorPanels);floorPanels.name='warm-panel-floor';
 const floorBaseColors=[];
 for(let ix=0;ix<6;ix++)for(let iz=0;iz<5;iz++){const o=new T.Mesh(new T.BoxGeometry(W/6-.018,.016,D/5-.018),new T.MeshStandardMaterial({color:['#a19483','#a89a88','#998d7d'][(ix+iz)%3],roughness:.68,metalness:.18}));o.position.set(-W/2+(ix+.5)*W/6,.002,-D/2+(iz+.5)*D/5);floorPanels.add(o);floorBaseColors.push(o.material.color.clone());}
 const floorRails=[];
 for(let ix=1;ix<6;ix++){const q=box(.012,.005,D,-W/2+ix*W/6,.013,0,ix%2?'#756343':'#8c7752',.65);q.material.roughness=.6;floorRails.push(q);}
 for(let iz=1;iz<5;iz++){const q=box(W,.005,.012,0,.013,-D/2+iz*D/5,iz%2?'#756343':'#8c7752',.65);q.material.roughness=.6;floorRails.push(q);}
 const floorRailBase=floorRails.map(o=>o.material.color.clone());
 const floorDarkColor=new T.Color('#14131a');
 const trim='#57432b',panels=[];
 const glassClear=new T.Color('#d5ecff'),glassTint=new T.Color('#0f1a28');
 function glass(w,h,x,y,z,rx,ry){const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshPhysicalMaterial({color:glassClear.clone(),metalness:.05,roughness:.15,transparent:true,opacity:.085,side:T.DoubleSide,depthWrite:false}));o.position.set(x,y,z);o.rotation.set(rx,ry,0);o.renderOrder=5;group.add(o);panels.push(o);return o;}
 glass(W,H,0,H/2,-D/2,0,0);glass(W,H,0,H/2,D/2,0,0);
 glass(D,H,-W/2,H/2,0,0,Math.PI/2);glass((D-3.1)/2,H,W/2,H/2,-(D+3.1)/4,0,Math.PI/2);glass((D-3.1)/2,H,W/2,H/2,(D+3.1)/4,0,Math.PI/2);glass(W,D,0,H,0,-Math.PI/2,0);
 for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])box(.055,H,.055,x,H/2,z,trim,.6);
 for(const y of [.045,H]){for(const z of [-D/2,D/2])box(W,.045,.045,0,y,z,trim,.6);for(const x of [-W/2,W/2])box(.045,.045,D,x,y,0,trim,.6);}
 // Fine mullions make transparent surfaces legible from inside and outside.
 for(const x of [-W/4,0,W/4])for(const z of [-D/2,D/2])box(.014,H,.014,x,H/2,z,'#a8b4c0',.5);
 box(.014,H,.014,-W/2,H/2,0,'#a8b4c0',.5);
 for(const z of [-D/2-.035,D/2+.035]){box(W+.25,.32,.18,0,-.06,z,trim,.7);box(W+.25,.16,.13,0,H,z,trim,.7);}
 for(const x of [-W/2-.035,W/2+.035]){box(.18,.32,D+.25,x,-.06,0,trim,.7);box(.13,.16,D+.25,x,H,0,trim,.7);}
 const liftGlass=glass(3.1,H,W/2,H/2,0,0,Math.PI/2);liftGlass.name='lift-glass-wall';liftGlass.visible=false;
 const front=W/2-1.21;
 const liftAnchor=new T.Group();liftAnchor.position.set(front,0,0);liftAnchor.rotation.y=-Math.PI/2;group.add(liftAnchor);
 const liftBody=liftAnchor; // The old solid block is replaced with the real open cabin.
 const hover=new T.Group();group.add(hover);let hoverTime=0;
 let liftRetracted=false;
 function sealLift(){liftRetracted=true;liftGlass.visible=true;}
 function blocked(x,z){const lx=x-group.position.x,lz=z-group.position.z;return !liftRetracted&&lx>front-.23&&Math.abs(lz)<1.55;}
 function inspectNear(position){if(!ready)return false;group.updateMatrixWorld(true);const p=inspectButton.getWorldPosition(new T.Vector3());return Math.hypot(position.x-p.x,position.z-p.z)<3.1;}
 const panel=new T.Group();group.add(panel);panel.position.set(-W/2+.06,H/2,0);panel.rotation.y=Math.PI/2;
 const shade=new T.Mesh(new T.PlaneGeometry(D,H),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));shade.renderOrder=6;panel.add(shade);
 const finalTexture=await new T.TextureLoader().loadAsync(assetURL(config.future.finalSlide));finalTexture.colorSpace=T.SRGBColorSpace;
 const display=new T.Mesh(new T.PlaneGeometry(Math.min(D-.06,(H-.06)*16/9),Math.min(H-.06,(D-.06)*9/16)),new T.MeshBasicMaterial({map:finalTexture,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false}));display.position.set(0,0,.025);display.renderOrder=7;panel.add(display);
 function label(text,w,h){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#7700ff';ctx.fillRect(0,0,768,192);ctx.fillStyle='white';ctx.font='bold 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,side:T.DoubleSide,transparent:true}));m.renderOrder=9;return m;}
 // Future room portal: one luminous circular rim with a stationary inscription.
 const floorPad=new T.Group();floorPad.name='future-floor-pad';floorPad.position.set(0,.02,0);group.add(floorPad);
 const padFaceMat=new T.MeshStandardMaterial({color:'#243049',emissive:'#243a6a',emissiveIntensity:.30,roughness:.6,metalness:.2});
 const padFace=new T.Mesh(new T.CylinderGeometry(1.32,1.32,.025,96),padFaceMat);padFace.position.y=.006;floorPad.add(padFace);
 const padNeonMat=new T.MeshStandardMaterial({color:'#9eb6ff',emissive:'#6f8cff',emissiveIntensity:2.4,roughness:.22,metalness:.55});
 const padNeon=new T.Mesh(new T.TorusGeometry(1.34,.045,14,96),padNeonMat);padNeon.rotation.x=Math.PI/2;padNeon.position.y=.04;floorPad.add(padNeon);
 function makeRimTextTexture(phrase){
  const size=1024,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
  ctx.clearRect(0,0,size,size);const cx=size/2,cy=size/2,radius=size*(1.34/1.55)/2;
  const str=phrase;ctx.font='700 40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  const chars=[...str],space=7;let total=0;const widths=chars.map(ch=>{const w=ctx.measureText(ch).width+space;total+=w;return w;});
  let angle=-Math.PI/2-total/(2*radius);
  for(let i=0;i<chars.length;i++){const w=widths[i],a=angle+w/(2*radius);ctx.save();ctx.translate(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius);ctx.rotate(a+Math.PI/2);ctx.lineWidth=8;ctx.strokeStyle='rgba(20,16,48,.85)';ctx.strokeText(chars[i],0,0);ctx.fillStyle='#f4f7ff';ctx.fillText(chars[i],0,0);ctx.restore();angle+=w/radius;}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
 }
 const padTextMat=new T.MeshBasicMaterial({map:makeRimTextTexture('Будущее здесь'),transparent:true,opacity:1,depthTest:false,depthWrite:false,side:T.DoubleSide});
 const padText=new T.Mesh(new T.RingGeometry(1.20,1.55,128),padTextMat);padText.rotation.x=-Math.PI/2;padText.position.y=.095;padText.renderOrder=8;floorPad.add(padText);
 const inspectButton=label('Рассмотреть',1.8,.45);inspectButton.position.set(0,-H/2+.26,.08);inspectButton.visible=false;panel.add(inspectButton);
 let activation=-1,ready=false;
 function activate(){if(activation<0)activation=0;}
 function padNear(position){if(activation>=0)return false;const lx=position.x-group.position.x,lz=position.z-group.position.z;return Math.hypot(lx,lz)<1.55;}
 const drones=[];
 const white=new T.MeshStandardMaterial({color:'#ffffff',metalness:.15,roughness:.28});const visor=new T.MeshStandardMaterial({color:'#506574',roughness:.3});
 for(let i=0;i<5;i++){const d=new T.Group();group.add(d);const body=new T.Mesh(new T.SphereGeometry(.32,24,16),white);body.scale.set(1.3,.65,.9);d.add(body);const face=new T.Mesh(new T.SphereGeometry(.19,20,12),visor);face.scale.set(1.25,.55,.35);face.position.set(0,.01,.25);d.add(face);for(const x of [-.09,.09]){const eye=new T.Mesh(new T.SphereGeometry(.025,12,8),new T.MeshBasicMaterial({color:'#8ee9e2'}));eye.position.set(x,.025,.315);d.add(eye);}for(const x of [-.48,.48]){const ring=new T.Mesh(new T.TorusGeometry(.2,.04,8,24),white);ring.rotation.x=Math.PI/2;ring.position.x=x;d.add(ring);const prop=new T.Mesh(new T.BoxGeometry(.32,.012,.045),visor);prop.position.x=x;d.add(prop);d.userData.props??=[];d.userData.props.push(prop);}drones.push(d);}
 function update(camera,dt=0){hoverTime+=dt;
 if(activation>=0){activation+=dt;shade.material.opacity=.9*T.MathUtils.smoothstep(activation,0,1.2);const f=T.MathUtils.smoothstep(activation,1.2,2.2);display.material.opacity=f;display.position.y=-(1-f)*.10;ready=activation>=2.2;inspectButton.visible=false;}
 const present=activation<0?0:T.MathUtils.smoothstep(activation,0,1.4);
 floorPanels.children.forEach((o,i)=>o.material.color.copy(floorBaseColors[i]).lerp(floorDarkColor,present));
 floorRails.forEach((o,i)=>o.material.color.copy(floorRailBase[i]).lerp(floorDarkColor,present*.9));
 if(activation<0){const pulse=.55+.45*Math.sin(hoverTime*3.1);padNeonMat.emissiveIntensity=1.9+pulse*.7;padFaceMat.emissiveIntensity=.35+pulse*.15;padTextMat.opacity=1;}
 else{padNeonMat.emissiveIntensity=.35;padFaceMat.emissiveIntensity=.12;padTextMat.opacity=.12;}
 drones.forEach((d,i)=>{const t=hoverTime*.09+i*Math.PI*2/5;const x=Math.cos(t)*(W/2+3.5),z=Math.sin(t)*(D/2+4);d.position.set(x,2.4+Math.sin(hoverTime*.5+i)*.6+i*.25,z);d.rotation.y=Math.atan2(-Math.sin(t),Math.cos(t));d.rotation.z=Math.sin(hoverTime+i)*.035;d.userData.props.forEach(p=>p.rotation.y+=dt*20);});
 const local=group.worldToLocal(camera.position.clone());
 panels.forEach(p=>{const near=local.distanceTo(p.position)<2;const clearOp=near?.025:.085;const tintOp=near?.38:.58;p.material.opacity=T.MathUtils.lerp(clearOp,tintOp,present);p.material.color.copy(glassClear).lerp(glassTint,present);});}
 function reset(){activation=-1;ready=false;shade.material.opacity=0;display.material.opacity=0;inspectButton.visible=false;hoverTime=0;liftRetracted=false;liftGlass.visible=false;liftAnchor.position.y=0;liftAnchor.visible=true;floorPanels.children.forEach((o,i)=>o.material.color.copy(floorBaseColors[i]));floorRails.forEach((o,i)=>o.material.color.copy(floorRailBase[i]));panels.forEach(p=>{p.material.color.copy(glassClear);p.material.opacity=.085;});padNeonMat.emissiveIntensity=2.4;padFaceMat.emissiveIntensity=.45;padTextMat.opacity=1;}
 return {reset,sealLift,liftGlass,liftAnchor,group,panel,floorPad,padNear,inspectButton,activate,inspectNear,get ready(){return ready;},get started(){return activation>=0;},shade,display,drones,hover,blocked,center:group.position.clone(),width:W,depth:D,height:H,radius:R,bottom,top,panels,update,liftBody};
}
