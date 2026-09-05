(() => {
  const exact = new Map([
    ["START", "СТАРТ"],
    ["READY", "ГОТОВО"],
    ["FOUND", "НАЙДЕНО"],
    ["ONLINE", "АКТИВЕН"],
    ["CHASE", "СЛЕДОМ"],
    ["CAMERA", "КАМЕРА"],
    ["DIRECTOR", "РЕЖИССЁР"],
    ["SPATIAL DATA", "ДАННЫЕ В ПРОСТРАНСТВЕ"],
    ["QUEST", "ШЛЕМ"],
    ["WEBXR", "ВИРТУАЛЬНАЯ РЕАЛЬНОСТЬ"],
    ["VR", "ВИРТУАЛЬНАЯ РЕАЛЬНОСТЬ"],
    ["KPI", "ПОКАЗАТЕЛИ"],
    ["M", "М"],
    ["KM/H", "КМ/Ч"],
    ["KPH", "КМ/Ч"],
    ["NEXT EXPERIENCE", "СЛЕДУЮЩИЙ БЛОК"],
    ["NEXT CHAPTER", "СЛЕДУЮЩАЯ ГЛАВА"],
    ["FINAL", "ФИНАЛ"],
    ["ON", "ВКЛ"],
    ["OFF", "ВЫКЛ"]
  ]);

  const phrases = [
    ["WEBXR DATA EXPERIENCE", "ИММЕРСИВНАЯ ПРЕЗЕНТАЦИЯ ДАННЫХ"],
    ["IMMERSIVE DRIVE", "ИММЕРСИВНЫЙ МАРШРУТ"],
    ["GRAND EXPERIENCE ROUTE", "ГЛАВНЫЙ МАРШРУТ"],
    ["GRAND ROUTE", "ГЛАВНЫЙ МАРШРУТ"],
    ["GRAND TOUR", "ГЛАВНЫЙ МАРШРУТ"],
    ["AMBIENT SOUND", "АТМОСФЕРНЫЙ ЗВУК"],
    ["MELODIC SOUND", "МЕЛОДИЧНЫЙ ЗВУК"],
    ["CLEAN HUD", "ЧИСТЫЙ ИНТЕРФЕЙС"],
    ["DIRECTOR + 3D KPI", "РЕЖИССЁР + ОБЪЁМНЫЕ ПОКАЗАТЕЛИ"],
    ["3D KPI", "ОБЪЁМНЫЕ ПОКАЗАТЕЛИ"],
    ["DEMO DATA 2025", "ДЕМО-ДАННЫЕ 2025"],
    ["DEMO 2025 · SPATIAL KPI", "ДЕМО 2025 · ПРОСТРАНСТВЕННЫЕ ПОКАЗАТЕЛИ"],
    ["RESULT GATE", "ТОЧКА РЕЗУЛЬТАТОВ"],
    ["DATA GATES", "ТОЧЕК ДАННЫХ"],
    ["DATA GATE", "ТОЧКА ДАННЫХ"],
    ["SPATIAL KPI", "ПРОСТРАНСТВЕННЫЕ ПОКАЗАТЕЛИ"],
    ["SPATIAL DATA", "ДАННЫЕ В ПРОСТРАНСТВЕ"],
    ["3D STORY MODE", "ОБЪЁМНЫЙ СЦЕНАРИЙ"],
    ["3D STAGE", "ОБЪЁМНАЯ СЦЕНА"],
    ["AUTO DIRECTOR", "АВТОРЕЖИССЁР"],
    ["NEON CITY", "НЕОНОВЫЙ ГОРОД"],
    ["SERVICE TUNNEL", "СЕРВИСНЫЙ ТОННЕЛЬ"],
    ["AI DISTRICT", "КВАРТАЛ ИИ"],
    ["PEOPLE BRIDGE", "МОСТ КОМАНДЫ"],
    ["FUTURE GATE", "ПОРТАЛ БУДУЩЕГО"],
    ["NEXT EXPERIENCE", "СЛЕДУЮЩИЙ БЛОК"],
    ["NEXT CHAPTER", "СЛЕДУЮЩАЯ ГЛАВА"],
    ["2027 CONCEPT", "КОНЦЕПТ 2027"],
    ["ROSSO GT", "КОНЦЕПТ-АВТО"],
    ["VR COCKPIT", "КАБИНА ВИРТУАЛЬНОЙ РЕАЛЬНОСТИ"],
    ["VR DRIVE", "МАРШРУТ В ВИРТУАЛЬНОЙ РЕАЛЬНОСТИ"],
    ["WEBXR COCKPIT", "РЕЖИМ ВИРТУАЛЬНОЙ РЕАЛЬНОСТИ"],
    ["WEBXR", "ВИРТУАЛЬНАЯ РЕАЛЬНОСТЬ"],
    ["VR", "ВИРТУАЛЬНАЯ РЕАЛЬНОСТЬ"],
    ["COCKPIT", "КАБИНА"],
    ["AI AGENT", "ИИ-АГЕНТ"],
    ["HR AI CORE", "ЯДРО ИИ"],
    ["AI CORE", "ЯДРО ИИ"],
    ["HR-КОНВЕРГЕНТ", "КАДРОВЫЙ КОНВЕРГЕНТ"],
    ["320 M READY", "320 М ГОТОВО"],
    ["/ 320 M", "/ 320 М"],
    ["/320 M", "/320 М"],
    [" M READY", " М ГОТОВО"],
    [" READY", " ГОТОВО"],
    [" FOUND", " НАЙДЕНО"],
    [" ONLINE", " АКТИВЕН"],
    ["START ·", "СТАРТ ·"],
    ["CAMERA ", "КАМЕРА "],
    ["DIRECTOR ", "РЕЖИССЁР "]
  ].sort((a, b) => b[0].length - a[0].length);

  function translateText(value) {
    if (typeof value !== "string" || !value) return value;
    const trimmed = value.trim();
    if (exact.has(trimmed)) {
      const replacement = exact.get(trimmed);
      return value.replace(trimmed, replacement);
    }
    let out = value;
    for (const [from, to] of phrases) out = out.split(from).join(to);
    return out;
  }

  try {
    const proto = window.CanvasRenderingContext2D?.prototype;
    if (proto && !proto.__ruV25FillText) {
      const nativeFillText = proto.fillText;
      proto.fillText = function(text, ...args) {
        return nativeFillText.call(this, translateText(String(text)), ...args);
      };
      proto.__ruV25FillText = true;
    }
  } catch (_) {}

  function localizeTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent) return;

    if (parent.matches(".v20-director-chip strong")) {
      const raw = String(node.nodeValue || "").trim();
      if (raw === "ON" || raw === "ВКЛ") parent.dataset.ruState = "ВКЛ";
      else if (raw === "OFF" || raw === "ВЫКЛ") parent.dataset.ruState = "ВЫКЛ";
      return;
    }

    const translated = translateText(node.nodeValue || "");
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }

  function localizeTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      localizeTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) localizeTextNode(current);
  }

  function installDirectorVisualStateCss() {
    const style = document.createElement("style");
    style.id = "ru-v25-director-state-style";
    style.textContent = `
      .v20-director-chip strong[data-ru-state] { font-size: 0 !important; }
      .v20-director-chip strong[data-ru-state]::after {
        content: attr(data-ru-state);
        font-size: 12px;
        color: #6de5ff;
      }
      .v20-director-chip.off strong[data-ru-state]::after { color: rgba(235,241,244,.52); }
      @media (hover: none), (pointer: coarse) {
        .v20-director-chip strong[data-ru-state]::after { font-size: 10px; }
      }
    `;
    document.head.appendChild(style);
  }

  function startDomLocalization() {
    installDirectorVisualStateCss();
    localizeTree(document.body);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeTextNode(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach(localizeTree);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });

    const selectors = [
      ".car-hud-v13", ".v16-route-hud", ".v16-data-card", ".v18-camera-chip",
      ".v18-next-card", ".v19-mode", ".v20-shot-label", ".v20-director-chip",
      ".v21-vr-chip", ".v21-vr-help", "#boot", "#hud"
    ];
    setInterval(() => {
      for (const selector of selectors) document.querySelectorAll(selector).forEach(localizeTree);
    }, 350);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startDomLocalization, { once: true });
  else startDomLocalization();

  window.__HR_RU_LOCALIZATION_V25__ = { version: "2.5", translateText };
})();
