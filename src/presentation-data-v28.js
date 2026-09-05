(() => {
  const data = window.HR2026;
  if (!data) return;

  // Финальная презентационная оболочка 2026.
  // Значения 2025 не выдаём за результаты 2026: до загрузки факта показываем явные плейсхолдеры.
  const results2026 = [
    {
      id: "recruitment-2025",
      title: "ПРИЁМ",
      subtitle: "Цифровой вход сотрудника",
      metrics: [
        ["XX%", "цифровых приёмов"],
        ["XX дней", "средний срок"],
        ["XXXX", "оформлений"]
      ]
    },
    {
      id: "hr-convergent-2025",
      title: "КАДРОВЫЙ КОНВЕРГЕНТ",
      subtitle: "Качество кадрового сервиса",
      metrics: [
        ["XX ч", "SLA"],
        ["X,XX", "индекс качества"],
        ["XX%", "в SLA"]
      ]
    },
    {
      id: "ai-team-2025",
      title: "ИИ-КОМАНДА",
      subtitle: "Компетенции и решения",
      metrics: [
        ["XX", "сотрудников"],
        ["XX", "ИИ-решений"],
        ["XX", "автоматизированных процессов"]
      ]
    },
    {
      id: "awards-2025",
      title: "КОРПОРАТИВНЫЕ НАГРАДЫ",
      subtitle: "Признание и сервис",
      metrics: [
        ["XXX", "наград"],
        ["XX%", "SLA"],
        ["X,X", "индекс признания"]
      ]
    },
    {
      id: "harmful-conditions-2025",
      title: "ВРЕДНЫЕ УСЛОВИЯ ТРУДА",
      subtitle: "Отпуска и охват",
      metrics: [
        ["XXXX", "сотрудников"],
        ["XXX", "с отпуском ВУТ"],
        ["XX%", "использовали отпуск"],
        ["XX%", "планирование"]
      ]
    }
  ];

  data.title = "Итоги 2026";
  data.demoYear = null;
  data.demoLabel = "Итоги 2026";
  data.results2026 = results2026;

  // Совместимость с текущими сценами v10/v16: они пока читают старое имя поля.
  // Внутри лежат только безопасные плейсхолдеры 2026, не цифры предыдущего года.
  data.demoResults2025 = results2026;

  data.zones = data.zones || {};
  data.zones.recruitment = {
    name: "ПРИЁМ",
    subtitle: "ЦИФРОВОЙ ВХОД СОТРУДНИКА",
    intro: "Итоги 2026 по цифровому маршруту сотрудника.",
    metrics: results2026[0].metrics
  };
  data.zones.ai = {
    name: "КАДРОВЫЙ КОНВЕРГЕНТ",
    subtitle: "СЕРВИС КАК ЕДИНАЯ СЕТЬ",
    intro: "Итоги 2026 по качеству и скорости кадрового сервиса.",
    metrics: results2026[1].metrics
  };
  data.zones.mentoring = {
    name: "ИИ-КОМАНДА",
    subtitle: "ИНТЕЛЛЕКТУАЛЬНОЕ ЯДРО",
    intro: "Итоги 2026 по ИИ-команде, решениям и автоматизации.",
    metrics: results2026[2].metrics
  };
  data.zones.future = {
    name: "2027",
    subtitle: "ГОД ОГНЕННОГО КОЗЛА · СЛЕДУЮЩАЯ ГЛАВА"
  };

  const replacements = [
    ["ROUTE COMPLETE · DEMO 2025", "МАРШРУТ 2026 ЗАВЕРШЁН"],
    ["МАРШРУТ ЗАВЕРШЁН · ДЕМО 2025", "МАРШРУТ 2026 ЗАВЕРШЁН"],
    ["RESULT GATE · DEMO 2025", "ТОЧКА РЕЗУЛЬТАТОВ · ИТОГИ 2026"],
    ["2025 DATA GATES", "ТОЧКИ РЕЗУЛЬТАТОВ 2026"],
    ["ДЕМО-ДАННЫЕ 2025", "ДАННЫЕ 2026"],
    ["DEMO DATA 2025", "ДАННЫЕ 2026"],
    ["DEMO 2025", "ИТОГИ 2026"],
    ["ДЕМО 2025", "ИТОГИ 2026"],
    ["РЕЗУЛЬТАТЫ 2025", "ИТОГИ 2026"],
    ["результаты 2025", "итоги 2026"],
    ["Тестовое наполнение — результаты 2025", "Итоги 2026"],
    ["ГОД ОГНЕННОЙ КОЗЫ", "ГОД ОГНЕННОГО КОЗЛА"],
    ["ОГНЕННАЯ КОЗА", "ОГНЕННЫЙ КОЗЁЛ"],
    ["HR-КОНВЕРГЕНТ", "КАДРОВЫЙ КОНВЕРГЕНТ"]
  ];

  function cleanText(value) {
    if (typeof value !== "string" || !value) return value;
    let out = value;
    for (const [from, to] of replacements) out = out.split(from).join(to);
    return out;
  }

  // Надписи Babylon DynamicTexture создаются через canvas — чистим их до отрисовки.
  try {
    const proto = window.CanvasRenderingContext2D?.prototype;
    if (proto && !proto.__presentationV28FillText) {
      const previousFillText = proto.fillText;
      proto.fillText = function(text, ...args) {
        return previousFillText.call(this, cleanText(String(text)), ...args);
      };
      proto.__presentationV28FillText = true;
    }
  } catch (_) {}

  function cleanNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = cleanText(node.nodeValue || "");
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) cleanNode(current);
  }

  function installDomCleanup() {
    cleanNode(document.body);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") cleanNode(mutation.target);
        mutation.addedNodes.forEach(cleanNode);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });

    // Старые модули иногда переписывают HUD по таймеру/кадрам.
    window.setInterval(() => cleanNode(document.body), 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installDomCleanup, { once: true });
  else installDomCleanup();

  window.__HR_PRESENTATION_DATA_V28__ = {
    version: "2.8",
    results2026,
    placeholders: true,
    cleanText
  };
})();
