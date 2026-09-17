import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const skin=new T.MeshStandardMaterial({color:0xe0b29a,roughness:.62});
const blouse=new T.MeshStandardMaterial({color:0x7550a8,roughness:.78});
const dark=new T.MeshStandardMaterial({color:0x30323a,roughness:.86});
const hair=new T.MeshStandardMaterial({color:0x35251f,roughness:.55});
const white=new T.MeshStandardMaterial({color:0xe8e7e3,roughness:.66});
function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function limb(parent,x,y,length,radius,material){const pivot=new T.Group();pivot.position.set(x,y,0);parent.add(pivot);const part=mesh(new T.CapsuleGeometry(radius,Math.max(.02,length-radius*2),8,12),material,pivot,0,-length/2,0);return{pivot,part};}
export async function createHero(){
 const model=new T.Group();model.name='SkyOffice-Heroine';model.userData.forwardAxis='-Z';
 const hips=new T.Group();hips.position.y=.92;model.add(hips);
 const torso=mesh(new T.CapsuleGeometry(.17,.44,10,18),blouse,hips,0,.39,0);torso.scale.set(1.08,1,.72);
 mesh(new T.CylinderGeometry(.14,.17,.26,18),dark,hips,0,.11,0);mesh(new T.CylinderGeometry(.045,.05,.13,14),skin,hips,0,.76,0);
 const head=mesh(new T.SphereGeometry(.105,24,18),skin,hips,0,.91,.005);head.scale.set(.82,1.08,.9);
 const hairCap=mesh(new T.SphereGeometry(.11,22,14,0,Math.PI*2,0,Math.PI*.58),hair,hips,0,.96,-.012);hairCap.scale.set(.86,.78,.92);mesh(new T.SphereGeometry(.055,16,12),hair,hips,0,.93,-.105);
 const leftArm=limb(hips,-.20,.66,.48,.04,blouse),rightArm=limb(hips,.20,.66,.48,.04,blouse);const leftFore=limb(leftArm.pivot,0,-.44,.42,.035,skin),rightFore=limb(rightArm.pivot,0,-.44,.42,.035,skin);
 const leftLeg=limb(hips,-.085,.16,.55,.055,dark),rightLeg=limb(hips,.085,.16,.55,.055,dark);const leftShin=limb(leftLeg.pivot,0,-.51,.54,.05,dark),rightShin=limb(rightLeg.pivot,0,-.51,.54,.05,dark);
 mesh(new T.BoxGeometry(.11,.07,.24),white,leftShin.pivot,0,-.53,-.05);mesh(new T.BoxGeometry(.11,.07,.24),white,rightShin.pivot,0,-.53,-.05);mesh(new T.BoxGeometry(.035,.018,.006),new T.MeshStandardMaterial({color:0xff6b2c,emissive:0x552000}),hips,-.10,.55,-.145);
 const eyeLevel=new T.Group();eyeLevel.position.set(0,.91,-.09);hips.add(eyeLevel);const hand=new T.Group();hand.position.set(0,-.41,0);rightFore.pivot.add(hand);let t=0,lastError=0;
 function update(dt,blend){t+=dt;const w=Math.min(1,Math.max(0,blend||0));hips.position.y=.92+Math.abs(Math.sin(t*7))*.012*w;const swing=Math.sin(t*7)*.45*w;leftLeg.pivot.rotation.x=swing;rightLeg.pivot.rotation.x=-swing;leftShin.pivot.rotation.x=Math.max(0,-swing)*.55;rightShin.pivot.rotation.x=Math.max(0,swing)*.55;leftArm.pivot.rotation.x=-swing*.55;rightArm.pivot.rotation.x=swing*.55;torso.rotation.z=Math.sin(t*7)*.018*w;head.rotation.y=Math.sin(t*.65)*.025*(1-w);}
 function touch(worldTarget,weight=1){model.updateWorldMatrix(true,true);lastError=hand.getWorldPosition(new T.Vector3()).distanceTo(worldTarget);rightArm.pivot.rotation.x=T.MathUtils.lerp(rightArm.pivot.rotation.x,-1,weight);rightArm.pivot.rotation.z=T.MathUtils.lerp(rightArm.pivot.rotation.z,-.28,weight);rightFore.pivot.rotation.x=T.MathUtils.lerp(rightFore.pivot.rotation.x,-.5,weight);}
 return{model,head:eyeLevel,hand,update,touch,contactError:()=>lastError,skeleton:null};
}
