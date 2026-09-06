(() => {
  const H=window.HR4; if(!H) return;
  const {scene,camera,glow,state,isMobile}=H;
  const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
  function mat(name,hex,em=0,metal=.3,rough=.34){const m=new BABYLON.PBRMaterial(name,scene);m.albedoColor=BABYLON.Color3.FromHexString(hex);m.emissiveColor=m.albedoColor.scale(em);m.metallic=metal;m.roughness=rough;return m;}
  const suit=mat('hr4-guide-suit','#18222a',.01,.55,.24), trim=mat('hr4-guide-trim','#dcebf1',.05,.12,.26), skin=mat('hr4-guide-face','#d9d8d2',.01,.04,.58), led=mat('hr4-guide-led','#8be8ff',.92,.02,.14);
  const root=new BABYLON.TransformNode('hr4-guide',scene);root.position.set(0,0,-3.2);root.rotation.y=0;
  const torso=BABYLON.MeshBuilder.CreateCylinder('hr4-guide-torso',{height:1.08,diameterTop:.48,diameterBottom:.62,tessellation:14},scene);torso.parent=root;torso.position.y=1.18;torso.material=suit;
  const chest=BABYLON.MeshBuilder.CreateBox('hr4-guide-chest',{width:.34,height:.58,depth:.035},scene);chest.parent=root;chest.position.set(0,1.23,-.31);chest.material=trim;
  const neck=BABYLON.MeshBuilder.CreateCylinder('hr4-guide-neck',{height:.18,diameter:.19,tessellation:12},scene);neck.parent=root;neck.position.y=1.82;neck.material=skin;
  const head=BABYLON.MeshBuilder.CreateSphere('hr4-guide-head',{diameter:.48,segments:18},scene);head.parent=root;head.position.y=2.08;head.scaling.y=1.08;head.material=skin;
  const hair=BABYLON.MeshBuilder.CreateSphere('hr4-guide-hair',{diameter:.50,segments:18,slice:.52},scene);hair.parent=root;hair.position.set(0,2.19,.015);hair.scaling.y=.72;hair.material=suit;
  const temple=BABYLON.MeshBuilder.CreateSphere('hr4-guide-temple-led',{diameter:.055,segments:12},scene);temple.parent=root;temple.position.set(.225,2.10,-.10);temple.material=led;glow.addIncludedOnlyMesh(temple);

  const limbs={};
  function limb(name,x,y,material){const pivot=new BABYLON.TransformNode(name+'-pivot',scene);pivot.parent=root;pivot.position.set(x,y,0);const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{height:.72,diameter:.16,tessellation:10},scene);mesh.parent=pivot;mesh.position.y=-.34;mesh.material=material;limbs[name]=pivot;return pivot;}
  limb('armL',-.38,1.60,suit);limb('armR',.38,1.60,suit);limb('legL',-.19,.73,suit);limb('legR',.19,.73,suit);
  const footL=BABYLON.MeshBuilder.CreateBox('hr4-guide-foot-l',{width:.20,height:.12,depth:.38},scene);footL.parent=root;footL.position.set(-.19,.08,-.07);footL.material=suit;
  const footR=footL.clone('hr4-guide-foot-r');footR.parent=root;footR.position.x=.19;

  const keys=new Set(); addEventListener('keydown',e=>keys.add(e.code)); addEventListener('keyup',e=>keys.delete(e.code));
  let joyX=0,joyY=0;
  const pad=document.getElementById('mobilePad'),knob=document.getElementById('mobileKnob');
  if(pad&&knob){let pid=null;const update=e=>{const r=pad.getBoundingClientRect();let x=(e.clientX-(r.left+r.width/2))/(r.width*.34),y=(e.clientY-(r.top+r.height/2))/(r.height*.34);const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}joyX=x;joyY=-y;knob.style.transform=`translate(${x*27}px,${y*27}px)`;};pad.addEventListener('pointerdown',e=>{pid=e.pointerId;pad.setPointerCapture(pid);update(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===pid)update(e);});const end=e=>{if(e.pointerId!==pid)return;pid=null;joyX=joyY=0;knob.style.transform='translate(0,0)';};pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);}

  let autoTarget=null, autoSpeed=2.35, walking=0, cameraSide=1;
  function goTo(target,speed=2.35){autoTarget=target.clone();autoSpeed=speed;}
  function cancelAuto(){autoTarget=null;}
  function isAt(target,r=.55){return BABYLON.Vector3.DistanceSquared(root.position,target)<r*r;}
  function setPose(pos,yaw=0){root.position.copyFrom(pos);root.position.y=0;root.rotation.y=yaw;}
  addEventListener('keydown',e=>{if(e.code==='KeyV')cameraSide*=-1;});

  H.registerUpdate(dt=>{
    if(!state.running)return;
    let mx=0,mz=0,speed=2.7;
    if(autoTarget){
      const delta=autoTarget.subtract(root.position);delta.y=0;const dist=delta.length();
      if(dist<.12){autoTarget=null;} else {delta.normalize();mx=delta.x;mz=delta.z;speed=autoSpeed;}
    } else if(state.mode==='free'){
      mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joyX;
      mz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joyY;
      const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}
    }
    const moving=Math.hypot(mx,mz)>.04;
    if(moving){
      const desired=Math.atan2(mx,mz);let diff=desired-root.rotation.y;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;root.rotation.y+=diff*(1-Math.exp(-8*dt));
      root.position.x+=mx*speed*dt;root.position.z+=mz*speed*dt;root.position.x=BABYLON.Scalar.Clamp(root.position.x,-16,16);root.position.z=BABYLON.Scalar.Clamp(root.position.z,-4.5,79);
      walking+=dt*8.5;
    }
    const swing=moving?Math.sin(walking)*.46:0;
    limbs.armL.rotation.x=BABYLON.Scalar.Lerp(limbs.armL.rotation.x,swing,.18);limbs.armR.rotation.x=BABYLON.Scalar.Lerp(limbs.armR.rotation.x,-swing,.18);limbs.legL.rotation.x=BABYLON.Scalar.Lerp(limbs.legL.rotation.x,-swing*.72,.18);limbs.legR.rotation.x=BABYLON.Scalar.Lerp(limbs.legR.rotation.x,swing*.72,.18);
    torso.position.y=1.18+(moving?Math.abs(Math.sin(walking*2))*.016:0);

    const yaw=root.rotation.y,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const desiredCam=V(root.position.x-fx*4.6+rx*1.05*cameraSide,root.position.y+2.7,root.position.z-fz*4.6+rz*1.05*cameraSide);
    camera.position=BABYLON.Vector3.Lerp(camera.position,desiredCam,1-Math.exp(-7*dt));
    camera.setTarget(V(root.position.x+fx*1.9,root.position.y+1.45,root.position.z+fz*1.9));
  });

  H.character={root,goTo,cancelAuto,isAt,setPose,get autoTarget(){return autoTarget;}};
})();