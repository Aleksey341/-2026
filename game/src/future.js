import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {assetURL,fitModel} from './assets.js';
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
 box(W+.16,.28,D+.16,0,-.14,0,'#ffffff');
 const trim='#57432b',panels=[];
 function glass(w,h,x,y,z,rx,ry){const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshPhysicalMaterial({color:'#d5ecff',metalness:.05,roughness:.15,transparent:true,opacity:.085,side:T.DoubleSide,depthWrite:false}));o.position.set(x,y,z);o.rotation.set(rx,ry,0);o.renderOrder=5;group.add(o);panels.push(o);return o;}
 glass(W,H,0,H/2,-D/2,0,0);glass(W,H,0,H/2,D/2,0,0);
 glass(D,H,-W/2,H/2,0,0,Math.PI/2);glass(D,H,W/2,H/2,0,0,Math.PI/2);glass(W,D,0,H,0,-Math.PI/2,0);
 for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])box(.055,H,.055,x,H/2,z,trim,.6);
 for(const y of [.045,H]){for(const z of [-D/2,D/2])box(W,.045,.045,0,y,z,trim,.6);for(const x of [-W/2,W/2])box(.045,.045,D,x,y,0,trim,.6);}
 // Fine mullions make transparent surfaces legible from inside and outside.
 for(const x of [-W/4,0,W/4])for(const z of [-D/2,D/2])box(.014,H,.014,x,H/2,z,'#a8b4c0',.5);
 for(const x of [-W/2,W/2])box(.014,H,.014,x,H/2,0,'#a8b4c0',.5);
 for(const z of [-D/2-.035,D/2+.035]){box(W+.25,.32,.18,0,-.06,z,trim,.7);box(W+.25,.16,.13,0,H,z,trim,.7);}
 for(const x of [-W/2-.035,W/2+.035]){box(.18,.32,D+.25,x,-.06,0,trim,.7);box(.13,.16,D+.25,x,H,0,trim,.7);}
 const lift={minX:W/2-1.3,maxX:W/2+.3,minZ:-1.6,maxZ:1.6};
 const liftBody=box(1.35,H,3.2,W/2-.525,H/2,0,'#323344',.4);
 const front=W/2-1.21;
 for(const z of [-.59,.59])box(.045,2.8,1.16,front,1.42,z,'#797783',.65);
 box(.055,2.86,.025,front-.015,1.43,0,'#292637');
 const glow=new T.MeshBasicMaterial({color:'#d4b1ff'});
 for(const z of [-1.23,1.23]){const b=box(.04,2.96,.028,front-.03,1.48,z,'#ffffff');b.material=glow;}
 box(.06,.36,.16,front-.04,1.1,1.4,'#aaa6b5',.6);
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#ddd3f2';ctx.font='48px Arial';ctx.textAlign='center';ctx.fillText('ОФИС БУДУЩЕГО',512,105);ctx.font='32px Arial';ctx.fillText('↑  Л И Ф Т',512,180);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
 const sign=new T.Mesh(new T.PlaneGeometry(2.5,.625),new T.MeshBasicMaterial({map:tx,transparent:true}));sign.rotation.y=-Math.PI/2;sign.position.set(front-.04,3.5,0);group.add(sign);
 const tableConfig=config.future.table;let tableBounds=null;
 if(tableConfig){const r=await new GLTFLoader().loadAsync(assetURL(tableConfig.model));const table=fitModel(r.scene,tableConfig.fit);table.position.fromArray(tableConfig.position);group.add(table);group.updateMatrixWorld(true);tableBounds=new T.Box3().setFromObject(table).expandByScalar(.25);}
 function blocked(x,z){const lx=x-group.position.x,lz=z-group.position.z;return (lx>lift.minX-.23&&Math.abs(lz)<1.83)||(tableBounds&&x>tableBounds.min.x&&x<tableBounds.max.x&&z>tableBounds.min.z&&z<tableBounds.max.z);}
 const panel=new T.Group();group.add(panel);
 function update(camera){const local=group.worldToLocal(camera.position.clone());panels.forEach(p=>{p.material.opacity=local.distanceTo(p.position)<2?.025:.085;});}
 return {group,panel,blocked,tableBounds,center:group.position.clone(),width:W,depth:D,radius:R,bottom,top,panels,update,liftBody};
}
