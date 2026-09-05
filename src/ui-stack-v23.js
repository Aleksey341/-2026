(() => {
  function installHudStack() {
    const spatial = document.querySelector(".v19-mode");
    const director = document.querySelector(".v20-director-chip");

    if (!spatial || !director) {
      window.setTimeout(installHudStack, 120);
      return;
    }

    if (document.querySelector(".v23-right-stack")) return;

    const stack = document.createElement("div");
    stack.className = "v23-right-stack";
    stack.setAttribute("aria-label", "Spatial data and director controls");

    document.body.appendChild(stack);
    stack.appendChild(spatial);
    stack.appendChild(director);
    document.body.classList.add("ui-stack-v23");
  }

  installHudStack();
})();
