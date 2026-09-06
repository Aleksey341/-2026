(() => {
  const H = window.HR3;
  if (!H?.scene) return;
  document.body.classList.add("hr3-clean-display");

  const chapter = document.querySelector(".chapter");
  if (chapter) chapter.setAttribute("aria-hidden", "true");
  document.getElementById("storyCard")?.classList.add("block-board-v32");
  document.getElementById("finale")?.classList.add("block-board-v32");

  function removeLegacyDom() {
    document.querySelectorAll(
      ".world-label,.world-labels,.result-card-2025,.v19-mode,.v20-kpi,.spatial-kpi,.spatial-table,.floating-title"
    ).forEach(el => el.remove());
  }

  function disableKnownSpatialText() {
    ["hr3-final-2026", "hr3-final-2027"].forEach(name => {
      const mesh = H.scene.getMeshByName(name);
      if (mesh) mesh.setEnabled(false);
    });
  }

  function retireVehicleBadge() {
    const badge = document.getElementById("hr3PremiumBadge");
    if (!badge) return;
    badge.style.opacity = "0";
    badge.style.transform = "translateY(-6px)";
    window.setTimeout(() => badge.remove(), 420);
  }

  removeLegacyDom();
  disableKnownSpatialText();
  [200, 800, 1800].forEach(delay => window.setTimeout(() => {
    removeLegacyDom();
    disableKnownSpatialText();
  }, delay));

  H.on?.("vehicle:premium-ready", () => window.setTimeout(retireVehicleBadge, 1500));
  window.setTimeout(retireVehicleBadge, 6500);

  H.cleanDisplay = {
    version: "3.2.0",
    removeLegacyDom,
    disableKnownSpatialText
  };
})();
