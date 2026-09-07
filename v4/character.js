(() => {
  const H=window.HR4; if(!H) return;
  const {camera,state}=H;
  const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);

  // v4.1.3 — navigation is intentionally separated from the visual android.
  // The old primitive robot mesh has been removed completely. The approved
  // BORUP android is rendered by android-guide-v411.js and follows this proxy.
  const root=new BABYLON.TransformNode('hr4-player-nav',H.scene);
  root.position.set(0,0,-3.2);
  root.rotation.y=0;
  root.setEnabled(false);

  const keys=new Set();
  addEventListener('keydown',e=>keys.add(e.code));
  addEventListener('keyup',e=>keys.delete(e.code));

  let joyX=0,joyY=0;
  const pad=document.getElementById('mobilePad'),knob=document.getElementById('mobileKnob');
  if(pad&&knob){
    let pid=null;
    const update=e=>{
      const r=pad.getBoundingClientRect();
      let x=(e.clientX-(r.left+r.width/2))/(r.width*.34);
      let y=(e.clientY-(r.top+r.height/2))/(r.height*.34);
      const len=Math.hypot(x,y);
      if(len>1){x/=len;y/=len;}
      joyX=x;joyY=-y;
      knob.style.transform=`translate(${x*27}px,${y*27}px)`;
    };
    pad.addEventListener('pointerdown',e=>{pid=e.pointerId;pad.setPointerCapture(pid);update(e);});
    pad.addEventListener('pointermove',e=>{if(e.pointerId===pid)update(e);});
    const end=e=>{
      if(e.pointerId!==pid)return;
      pid=null;joyX=joyY=0;
      knob.style.transform='translate(0,0)';
    };
    pad.addEventListener('pointerup',end);
    pad.addEventListener('pointercancel',end);
  }

  let autoTarget=null,autoSpeed=2.35,cameraSide=1;
  function goTo(target,speed=2.35){autoTarget=target.clone();autoSpeed=speed;}
  function cancelAuto(){autoTarget=null;}
  function isAt(target,r=.55){return BABYLON.Vector3.DistanceSquared(root.position,target)<r*r;}
  function setPose(pos,yaw=0){root.position.copyFrom(pos);root.position.y=0;root.rotation.y=yaw;}

  addEventListener('keydown',e=>{if(e.code==='KeyV')cameraSide*=-1;});
  H.on('mode',()=>root.setEnabled(true));

  H.registerUpdate(dt=>{
    if(!state.running)return;
    let mx=0,mz=0,speed=2.7;

    if(autoTarget){
      const delta=autoTarget.subtract(root.position);delta.y=0;
      const dist=delta.length();
      if(dist<.12){autoTarget=null;}
      else{delta.normalize();mx=delta.x;mz=delta.z;speed=autoSpeed;}
    }else if(state.mode==='free'){
      mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joyX;
      mz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joyY;
      const len=Math.hypot(mx,mz);
      if(len>1){mx/=len;mz/=len;}
    }

    const moving=Math.hypot(mx,mz)>.04;
    if(moving){
      const desired=Math.atan2(mx,mz);
      let diff=desired-root.rotation.y;
      while(diff>Math.PI)diff-=Math.PI*2;
      while(diff<-Math.PI)diff+=Math.PI*2;
      root.rotation.y+=diff*(1-Math.exp(-8*dt));
      root.position.x+=mx*speed*dt;
      root.position.z+=mz*speed*dt;
      root.position.x=BABYLON.Scalar.Clamp(root.position.x,-16,16);
      root.position.z=BABYLON.Scalar.Clamp(root.position.z,-4.5,79);
    }

    if(!state.xrActive){
      const yaw=root.rotation.y,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
      const desiredCam=V(
        root.position.x-fx*4.6+rx*1.05*cameraSide,
        root.position.y+2.7,
        root.position.z-fz*4.6+rz*1.05*cameraSide
      );
      camera.position=BABYLON.Vector3.Lerp(camera.position,desiredCam,1-Math.exp(-7*dt));
      camera.setTarget(V(root.position.x+fx*1.9,root.position.y+1.45,root.position.z+fz*1.9));
    }
  });

  H.character={root,goTo,cancelAuto,isAt,setPose,get autoTarget(){return autoTarget;}};
})();
