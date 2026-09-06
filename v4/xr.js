(() => {
  const H=window.HR4;if(!H)return;
  const {scene,state}=H;let xr=null,ready=false;
  async function setup(){
    try{
      const ok=await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-vr');
      if(!ok)return;
      xr=await scene.createDefaultXRExperienceAsync({disableTeleportation:true,disablePointerSelection:false});
      ready=true;document.getElementById('vrButton')?.classList.remove('hidden');
      xr.baseExperience.onStateChangedObservable.add(s=>{
        state.xrActive=s===BABYLON.WebXRState.IN_XR;
        document.body.classList.toggle('xr-active',state.xrActive);
      });
    }catch(e){console.warn('HR4 XR unavailable',e);}
  }
  async function enter(){
    if(!ready)await setup();
    if(!xr)return;
    try{await xr.baseExperience.enterXRAsync('immersive-vr','local-floor');}catch(e){console.warn('HR4 XR enter failed',e);}
  }
  document.getElementById('vrButton')?.addEventListener('click',enter);
  H.on('request:vr',enter);
  H.xr={setup,enter,get ready(){return ready;}};
  setup();
})();