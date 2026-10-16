# R16 v2 — отчёт об интеграции

**Дата:** 2026-10-16  
**Рабочая копия:** `C:\AI\game-r16-integration`  
**Ветка:** `feature/hyperframes-r16`  
**Baseline R15 SHA:** `fe88fa13f678e913d80a6d3e2b2df030ef5d65af`  
**Тестовая сборка:** `C:\AI\game-r16-integration\build\START-HERE-R16-TEST.html`  
**Маркер:** `window.__R16_BUILD__ === "r16-v2"`  
**Публикация:** не выполнялась (ожидает подтверждения)

## 1. Mapping референсов → объекты

| Референс | Модуль | Куда в сцене |
|---|---|---|
| `references/01-reactor.png` | `room-module/src/r16-reactor-core.js` → `attachReactorSphere` | Центр `energyReactor`, y≈1.9, r≈0.62; 4 колбы/fills сохранены |
| `references/02-lift.png` | `room-module/src/r16-elevator-cabin.js` → `attachR16ElevatorCabin` | Декор вокруг кабины `createElevatorVisual` (origin + destination) |
| `references/03-future-entrance-2027.png` | `room-module/src/r16-portal-2027.js` → `attachPortal2027` | Стена лифта в `makeFuture`, год **2027** (не 2026) |

Витрины (графит + marquee): `graphite-r16.js` + правки `showcase` / `scrollingLabel` в `retro.js` (из R16 v1, сохранены).

## 2. Изменённые файлы

- `room-module/src/graphite-r16.js` — материалы, marquee, PMREM, `visualEffectsEnabled`
- `room-module/src/r16-reactor-core.js` *(новый)*
- `room-module/src/r16-elevator-cabin.js` *(новый)*
- `room-module/src/r16-portal-2027.js` *(новый)*
- `room-module/src/retro.js` — витрины + сферический реактор
- `room-module/src/elevator.js` — графит/стекло кабины, pad/near без изменений
- `room-module/src/future.js` — портал 2027
- `room-module/src/reactor-room.js` — skip gold base при R16
- `room-module/src/game.js` — `applyR16Environment`, `setOrbit` для отладки
- зеркала в `source/`
- `build/START-HERE-R16-TEST.html`, `START-HERE-R16-TEST.html`
- `TZ_R16_v2_Cursor.md`, `references/*`
- `review/after/v2-*.png`

`START-HERE-R15.html` / `index.html` — не менялись как точка входа R15.

## 3. Флаги

```js
ROOM_CONFIG.r16Visuals === true
ROOM_CONFIG.visualEffectsEnabled !== false  // kill-switch декора
```

Без флага R15-путь материалов/геометрии сохраняется.

## 4. Приёмочные сценарии (runtime CDP)

| # | Сценарий | Результат |
|---|---|---|
| 1 | Запуск R16-TEST, `__R16_BUILD__` | `r16-v2` |
| 2 | 4 витрины, имена/цвета, marquee | OK (темы без изменений) |
| 3 | Карточки / completeProject | `viewing=true`, fill→1 |
| 4 | 4 колбы + сфера | `flasks=4`, `sphere=true`, pulse API |
| 5 | Cube story | `cubeR16=false` |
| 6 | Скролл «Ростелеком» | UV offset растёт |
| 7 | Кабина лифта R16 | `cabin=true`, pad/near сохранены |
| 8 | Портал 2027 + glass | `portal=true`, `sealLift` → glass visible |
| 9 | blocked после seal | не блокирует проход |
| 10 | Пауза | `dt=0` останавливает scroll/эффекты (как R15) |

Полный прогон лифта «посадка → вспышка → выход → спуск» рекомендуется вручную в открытой вкладке (автоматизация камеры future-orbit ограничена).

## 5. Скриншоты

**Before (R15):** `review/before/`  
**After (R16 v2 visual-match):** `review/after/v2-*.png` (cache `?v=r16-v2-6`)

| Файл | Содержание |
|---|---|
| `v2-00-reactor-hall-overview.png` | Зал, витрины, механическая сфера |
| `v2-01-reactor-sphere.png` | Сфера: пластины + cyan cage + energy pillar, тёмный housing |
| `v2-02-elevator-entrance.png` | Pill-капсула с cyan-кольцами вокруг дверей |
| `v2-03-future-portal-glass.png` | Пилоны + вертикальный неон **2027** после `sealLift` |

### Критерий «соответствует» (визуальный матч)

| Объект | Критерий | Статус |
|---|---|---|
| Реактор | Механическая сфера с cyan-энергией, не «зелёный шарик» | OK |
| Лифт | Снаружи читается цилиндрическая стеклянная капсула | OK |
| Портал | Вертикальный **2027** между двумя пилонами | OK |

## 6. Производительность

Ориентир: без второго renderer / без bloom на весь кадр. Добавлено: 1 PMREM env, ~1 sphere + rings, cabin shell, portal planes, точечные PointLight низкой интенсивности. Целевой FPS ≥30 при условии, что R15 на том же ПК его держал. Точный замер FPS — вручную в DevTools Performance на приёмке.

## 7. Запуск

```bat
cd C:\AI\game-r16-integration
python -m http.server 8765 --bind 127.0.0.1
```

Открыть: http://127.0.0.1:8765/build/START-HERE-R16-TEST.html?v=r16-v2-6  

Консоль: `[R16-v2] build/START-HERE-R16-TEST.html`  
Отладка: `__roomDebug.setOrbit`, `__roomDebug.setPaused`

R15: http://127.0.0.1:8765/START-HERE-R15.html

## 8. Ограничения / известное

- Цилиндрическая кабина — обрамление вокруг существующих створок (механика дверей R15).
- Портал 2027 — декоративный, без коллизий; цифры вынесены чуть в зал, чтобы читались при `sealLift`.
- Референс `03` визуально содержит «2026»; по ТЗ реализован **2027**.
- GitHub `main` / Pages не обновлялись в рамках v2.

## 9. Статус

Готово к визуальной приёмке одной сборкой R16 v2. **Публикация — только после вашего разрешения.**
