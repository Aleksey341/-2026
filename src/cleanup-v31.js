(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!scene) return;

  function removeVisualNoise() {
    // Главный белый многогранник в секторе 03 «ИИ-КОМАНДА».
    const aiCore = scene.getMeshByName("v17-ai-core");
    if (aiCore) aiCore.setEnabled(false);

    // Пространственные показатели v19 больше не используются в презентации.
    // Удаляем и DOM-индикатор, и все 3D-объекты этого модуля на случай старого кэша.
    document.querySelectorAll(".v19-mode").forEach(el => el.remove());

    scene.meshes
      .filter(mesh => mesh?.name?.startsWith("v19-"))
      .forEach(mesh => mesh.setEnabled(false));

    scene.transformNodes
      .filter(node => node?.name?.startsWith("v19-"))
      .forEach(node => node.setEnabled(false));
  }

  removeVisualNoise();

  // Некоторые модули создают элементы с небольшой задержкой. Повторяем очистку
  // несколько раз без постоянного фонового таймера.
  [250, 800, 1800].forEach(delay => window.setTimeout(removeVisualNoise, delay));

  window.__HR_CLEANUP_V31__ = {
    version: "3.1",
    run: removeVisualNoise
  };
})();
