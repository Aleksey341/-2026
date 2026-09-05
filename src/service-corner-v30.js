(() => {
  function installServiceCorner() {
    if (document.querySelector(".v30-service-dock")) return;

    const carHud = document.querySelector(".car-hud-v13");
    const camera = document.querySelector(".v18-camera-chip");
    const spatial = document.querySelector(".v19-mode");
    const director = document.querySelector(".v20-director-chip");
    const vr = document.querySelector(".v21-vr-chip");
    const vrHelp = document.querySelector(".v21-vr-help");
    const presenter = document.querySelector(".v28-presenter");

    // Базовые элементы создаются разными скриптами. Ждём, пока они появятся,
    // чтобы собрать их в один сервисный угол без дублирования по экрану.
    if (!carHud || !camera || !spatial || !director || !vr || !presenter) {
      window.setTimeout(installServiceCorner, 120);
      return;
    }

    const dock = document.createElement("aside");
    dock.className = "v30-service-dock";
    dock.setAttribute("aria-label", "Сервисные элементы презентации");

    const head = document.createElement("div");
    head.className = "v30-service-head";
    head.innerHTML = '<span>СЕРВИС</span><b>v3.0.1</b>';

    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "v30-service-collapse";
    collapse.setAttribute("aria-label", "Свернуть сервисный угол");
    collapse.textContent = "−";
    head.appendChild(collapse);
    dock.appendChild(head);

    // Порядок: статус автомобиля → автопрезентация → камера → режиссёр →
    // пространственные данные → VR. Всё живёт в одном углу.
    [carHud, presenter, camera, director, spatial, vr].forEach(el => dock.appendChild(el));
    if (vrHelp) dock.appendChild(vrHelp);

    document.body.appendChild(dock);
    document.body.classList.add("service-corner-v30");

    // Старый контейнер v23 после переноса становится пустым — удаляем его.
    document.querySelectorAll(".v23-right-stack").forEach(stack => {
      if (!stack.children.length) stack.remove();
    });

    collapse.addEventListener("click", () => {
      const collapsed = dock.classList.toggle("collapsed");
      collapse.textContent = collapsed ? "+" : "−";
      collapse.setAttribute("aria-label", collapsed ? "Развернуть сервисный угол" : "Свернуть сервисный угол");
      try { localStorage.setItem("hr-service-corner-collapsed", collapsed ? "1" : "0"); } catch (_) {}
    });

    try {
      if (localStorage.getItem("hr-service-corner-collapsed") === "1") {
        dock.classList.add("collapsed");
        collapse.textContent = "+";
      }
    } catch (_) {}

    window.__HR_SERVICE_CORNER_V30__ = {
      version: "3.0.1",
      dock,
      collapse() { if (!dock.classList.contains("collapsed")) collapse.click(); },
      expand() { if (dock.classList.contains("collapsed")) collapse.click(); }
    };
  }

  // auto-presentation создаёт свой блок синхронно, но даём браузеру один тик,
  // чтобы все поздние UI-модули успели добавить свои элементы.
  window.setTimeout(installServiceCorner, 60);
})();
