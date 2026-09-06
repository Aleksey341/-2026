(() => {
  const H = window.HR3;
  if (!H?.vehicle) return;
  const { scene, state, vehicle, glow } = H;
  const button = document.getElementById("vrButton");
  if (!button) return;

  const cockpit = new BABYLON.TransformNode("hr3-xr-cockpit", scene);
  cockpit.parent = vehicle.root;
  cockpit.position.set(0, 1.25, 0.05);

  const dash = BABYLON.MeshBuilder.CreatePlane("hr3-xr-dash", { width: .86, height: .25, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
  dash.parent = vehicle.root;
  dash.position.set(0, .92, .78);
  dash.rotation.y = Math.PI;
  dash.isPickable = false;
  dash.setEnabled(false);

  const tex = new BABYLON.DynamicTexture("hr3-xr-dash-tex", { width: 1024, height: 300 }, scene, true);
  tex.hasAlpha = true;
  const mat = new BABYLON.StandardMaterial("hr3-xr-dash-mat", scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.useAlphaFromDiffuseTexture = true;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  dash.material = mat;
  glow.addIncludedOnlyMesh(dash);

  function drawDash() {
    const ctx = tex.getContext();
    ctx.clearRect(0,0,1024,300);
    ctx.fillStyle="rgba(3,11,19,.90)";ctx.fillRect(8,8,1008,284);
    ctx.strokeStyle="#58ddff";ctx.lineWidth=4;ctx.strokeRect(8,8,1008,284);
    ctx.fillStyle="#58ddff";ctx.font="700 26px Arial";ctx.fillText("ЦК БОРУП · ИТОГИ 2026 · VR",34,50);
    ctx.fillStyle="#fff";ctx.font="900 112px Arial";ctx.fillText(String(Math.round(vehicle.speedKmh)),34,178);
    ctx.fillStyle="rgba(232,246,250,.68)";ctx.font="700 27px Arial";ctx.fillText("КМ/Ч",255,176);
    ctx.textAlign="right";ctx.fillStyle="#c2a0ff";ctx.font="900 66px Arial";ctx.fillText(String(Math.round(state.routeDistance)).padStart(3,"0"),960,168);
    ctx.fillStyle="rgba(232,246,250,.60)";ctx.font="700 23px Arial";ctx.fillText("/ 320 М",960,211);
    ctx.textAlign="left";ctx.fillStyle="rgba(232,246,250,.48)";ctx.font="600 21px Arial";ctx.fillText("ЛЕВЫЙ СТИК — ГАЗ И РУЛЬ · ТРИГГЕР — ТОРМОЗ",34,258);
    tex.update();
  }
  drawDash();

  let xr = null;
  let supported = false;
  let entering = false;
  let dashTimer = 0;

  function readControllers() {
    if (!state.xrActive || !xr?.input?.controllers) return;
    let stick = null;
    let fallback = null;
    let brake = false;
    for (const controller of xr.input.controllers) {
      const mc = controller.motionController;
      if (!mc) continue;
      const handedness = controller.inputSource?.handedness || "none";
      for (const [id, comp] of Object.entries(mc.components || {})) {
        const axes = comp?.axes;
        if (axes?.length >= 2) {
          const candidate = { x:Number(axes[0])||0, y:Number(axes[1])||0 };
          if (handedness === "left") stick = candidate; else if (!fallback) fallback = candidate;
        }
        const type = `${id} ${comp?.type||""}`.toLowerCase();
        if (type.includes("trigger") && (comp?.pressed || (comp?.value||0) > .55)) brake = true;
      }
    }
    const s = stick || fallback || {x:0,y:0};
    const dead=.22;
    vehicle.setXRInput({
      throttle: Math.abs(s.y)>dead ? -s.y : 0,
      steer: Math.abs(s.x)>dead ? s.x : 0,
      brake
    });
  }

  async function init() {
    try {
      supported = !!navigator.xr && await navigator.xr.isSessionSupported("immersive-vr");
      if (!supported) return;
      xr = await scene.createDefaultXRExperienceAsync({
        disableDefaultUI:true,
        disableTeleportation:true,
        disablePointerSelection:true,
        disableNearInteraction:true,
        disableHandTracking:true,
        floorMeshes:[]
      });
      button.classList.remove("hidden");
      button.textContent="ВОЙТИ В VR";
      xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
        state.xrActive=true;
        state.mode="free";
        vehicle.clearAutoInput();
        dash.setEnabled(true);
        xr.baseExperience.camera.parent=cockpit;
        xr.baseExperience.camera.position.set(0,0,0);
        button.textContent="VR АКТИВЕН";
      });
      xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        state.xrActive=false;
        vehicle.clearXRInput();
        dash.setEnabled(false);
        scene.activeCamera=H.camera;
        button.textContent="ВОЙТИ В VR";
      });
    } catch (err) {
      console.warn("WebXR unavailable",err);
    }
  }

  button.addEventListener("click", async () => {
    if (!supported || !xr || entering) return;
    entering=true;
    try {
      await xr.baseExperience.enterXRAsync("immersive-vr","local",xr.renderTarget);
    } catch (err) {
      console.warn("Unable to enter WebXR",err);
      button.textContent="VR НЕ ЗАПУЩЕН";
    } finally { entering=false; }
  });

  H.registerUpdate(dt => {
    if (!state.xrActive) return;
    readControllers();
    dashTimer+=dt;
    if (dashTimer>.16){dashTimer=0;drawDash();}
  });

  init();
  H.xr={ get supported(){return supported;}, get experience(){return xr;} };
})();
