(() => {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer:false, stencil:true, powerPreference:'high-performance' });
  const isMobile = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (isMobile) engine.setHardwareScalingLevel(Math.max(1.25, Math.min(1.9, window.devicePixelRatio || 1.4)));

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.008,.014,.021,1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = .006;
  scene.fogColor = new BABYLON.Color3(.03,.05,.07);

  const camera = new BABYLON.UniversalCamera('hr4-camera', new BABYLON.Vector3(0,3.2,-6.5), scene);
  camera.minZ = .05; camera.maxZ = 180; camera.fov = .82; camera.inertia = 0;
  scene.activeCamera = camera;

  const hemi = new BABYLON.HemisphericLight('hr4-hemi', new BABYLON.Vector3(.1,1,-.15), scene);
  hemi.intensity = .72;
  hemi.diffuse = new BABYLON.Color3(.82,.92,1);
  hemi.groundColor = new BABYLON.Color3(.03,.04,.06);

  const key = new BABYLON.DirectionalLight('hr4-key', new BABYLON.Vector3(-.35,-1,.45), scene);
  key.position = new BABYLON.Vector3(18,28,-16); key.intensity = 1.25;

  const glow = new BABYLON.GlowLayer('hr4-glow', scene, { blurKernelSize: isMobile ? 20 : 34 });
  glow.intensity = isMobile ? .45 : .62;

  let pipeline = null;
  try {
    pipeline = new BABYLON.DefaultRenderingPipeline('hr4-pipeline', true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = !isMobile;
    if (pipeline.bloomEnabled) {
      pipeline.bloomThreshold = .82; pipeline.bloomWeight = .12; pipeline.bloomKernel = 42; pipeline.bloomScale = .55;
    }
  } catch(_) {}

  const listeners = new Map();
  const updates = [];
  const state = { mode:'idle', running:false, currentSection:null, xrActive:false, autoPaused:false };
  const on = (name, fn) => { if(!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name).add(fn); return()=>listeners.get(name)?.delete(fn); };
  const emit = (name,payload) => listeners.get(name)?.forEach(fn=>{ try{fn(payload);}catch(e){console.error(e);} });
  const registerUpdate = fn => { updates.push(fn); return()=>{ const i=updates.indexOf(fn); if(i>=0)updates.splice(i,1); }; };

  function start(mode){
    state.mode = mode; state.running = true; state.autoPaused = false;
    document.body.dataset.hr4Mode = mode;
    document.getElementById('startScreen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    const presenter = document.getElementById('presenter');
    const mobilePad = document.getElementById('mobilePad');
    if (mode === 'auto') presenter?.classList.remove('hidden'); else presenter?.classList.add('hidden');
    if (mode === 'free' && isMobile) mobilePad?.classList.remove('hidden'); else mobilePad?.classList.add('hidden');
    const label = document.getElementById('modeLabel'); if(label) label.textContent = mode === 'auto' ? 'ПРЕЗЕНТАЦИЯ' : 'ИССЛЕДОВАНИЕ';
    emit('mode', mode);
  }

  window.HR4 = { version:'4.1.1', data:window.HR4_DATA, canvas,engine,scene,camera,glow,pipeline,isMobile,state,on,emit,registerUpdate,start };

  document.getElementById('autoMode')?.addEventListener('click',()=>start('auto'));
  document.getElementById('freeMode')?.addEventListener('click',()=>start('free'));
  document.getElementById('vrMode')?.addEventListener('click',()=>{ start('free'); document.body.dataset.hr4Mode='vr'; setTimeout(()=>emit('request:vr'),150); });

  engine.runRenderLoop(()=>{
    const dt = Math.min(engine.getDeltaTime()/1000,.05);
    for(const fn of [...updates]){ try{fn(dt);}catch(e){console.error('HR4 update',e);} }
    scene.render();
  });
  addEventListener('resize',()=>engine.resize());
  setTimeout(()=>{ const el=document.getElementById('bootState'); if(el) el.textContent='SCENE READY · ANDROID GUIDE ONLINE · v4.1.1'; emit('ready'); },300);
})();
