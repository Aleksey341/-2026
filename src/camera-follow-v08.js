(() => {
  const CONFIG = {
    distance: 4.2,
    height: 2.75,
    lookHeight: 0.95,
    lookAhead: 0.8,
    wallPadding: 0.28,
    minDistance: 0.9
  };

  function attachCameraFollow() {
    const scene = BABYLON.EngineStore.LastCreatedScene;
    if (!scene) {
      setTimeout(attachCameraFollow, 100);
      return;
    }

    const player = scene.getMeshByName("playerCollider");
    const camera = scene.getCameraByName("thirdPersonCamera");
    const avatar = scene.transformNodes.find((node) => node.name === "cartoonAvatar");

    if (!player || !camera || !avatar) {
      setTimeout(attachCameraFollow, 100);
      return;
    }

    // Камера полностью автоматическая: пользователь управляет персонажем,
    // а камера каждый кадр остаётся за его спиной и поворачивается вместе с ним.
    camera.inputs.clear();

    const follow = () => {
      const yaw = avatar.rotation.y || 0;
      const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

      const lookTarget = player.position
        .add(new BABYLON.Vector3(0, CONFIG.lookHeight, 0))
        .add(forward.scale(CONFIG.lookAhead));

      let desired = player.position
        .subtract(forward.scale(CONFIG.distance))
        .add(new BABYLON.Vector3(0, CONFIG.height, 0));

      // Не позволяем камере проходить сквозь стены и дверные конструкции.
      // Если между персонажем и камерой есть препятствие, камера автоматически
      // придвигается ближе, сохраняя персонажа в кадре.
      const toCamera = desired.subtract(lookTarget);
      const rayLength = toCamera.length();
      if (rayLength > 0.001) {
        const ray = new BABYLON.Ray(lookTarget, toCamera.normalize(), rayLength);
        const hit = scene.pickWithRay(ray, (mesh) => {
          if (!mesh || mesh === player || !mesh.isVisible) return false;
          return mesh.checkCollisions === true;
        });

        if (hit?.hit && hit.distance < rayLength) {
          const safeDistance = Math.max(CONFIG.minDistance, hit.distance - CONFIG.wallPadding);
          desired = lookTarget.add(ray.direction.scale(safeDistance));
        }
      }

      // Жёсткое слежение: позиция пересчитывается каждый кадр без накопления отставания.
      camera.position.copyFrom(desired);
      camera.setTarget(lookTarget);
    };

    // Ставим камеру сразу на правильное место и затем обновляем её перед каждым кадром.
    follow();
    scene.onBeforeRenderObservable.add(follow);

    window.__HR_CAMERA_FOLLOW_V08__ = {
      enabled: true,
      config: CONFIG,
      player,
      camera,
      avatar
    };
  }

  attachCameraFollow();
})();
