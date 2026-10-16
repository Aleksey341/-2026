# INTEGRATION-REPORT-R16

**Ветка:** `feature/hyperframes-r16`  
**Базовый SHA (R15):** `fe88fa13f678e913d80a6d3e2b2df030ef5d65af`  
**Тестовая сборка:** `START-HERE-R16-TEST.html`  
**GitHub main / публикация:** не изменялись (ожидается подтверждение)

## Состав варианта D

| Объект | Изменение |
|---|---|
| 4 витрины (Быстрый найм, Удержание, Человекоцентричность, Эффективность) | Локальный графит R2 на корпуса/основания/крышки/стойки; тематический emissive; rim-light |
| Реактор «Ростелеком» | Графит только на декоративном корпусе/короне; колбы, fills, трубы, логика — без изменений |
| `scrollingLabel` ×5 | Новый seamless marquee (integer tile, soft glow, LinearFilter, без mipmaps) |
| `objects.cube` (Эффективность) | **Не тронут** |
| Глобальный `cubeTrim` | **Не мутирован** |

## Файлы

- `room-module/src/graphite-r16.js` — материалы, marquee, PMREM env, `r16Enabled()`
- `room-module/src/retro.js` — `showcase` / `energyReactor` / `scrollingLabel` (gate по флагу)
- `room-module/src/reactor-room.js` — skip gold `textures.base` при R16; `restyleShowcaseTrims`
- `room-module/src/game.js` — `applyR16Environment` (только при флаге)
- зеркала в `source/`
- `START-HERE-R16-TEST.html` — `r16Visuals:true` (+ в `reactor`), cache `?v=r16-test-4`

## Сохранение R15

- `START-HERE-R15.html` не менялся.
- `r16Enabled()` = `true` только при `ROOM_CONFIG.r16Visuals` или `ROOM_CONFIG.reactor.r16Visuals`.
- Без флага путь материалов/marquee остаётся исходным R15.
- Импорт `./graphite-r16.js` относительный — R15 importmap не ломается.

## Проверки (runtime)

| Проверка | Результат |
|---|---|
| Материалы витрин | `MeshPhysicalMaterial` metal≈0.88, color `#4e5868`, tag `showcase-trim/band` |
| Реактор | tags `reactor-trim`, `reactor-band`, `reactor-halo`; колбы без r16-tag |
| Cube story | `cubeR16: false` |
| Темы / цвета | без изменений |
| Скролл 5 надписей | `hall.update` двигает UV offset (Δ≈0.072 / 30×0.05s) |
| Игровой процесс | `openProjects(0)` → `viewing-project`; `completeProject(0,0)` → `fillLevel=0.5` |
| Геометрия / координаты | не менялись |

## Скриншоты

**До (R15):** `review/before/`  
**После (R16-TEST):** `review/after/`

| Ракурс | before | after |
|---|---|---|
| Обзор зала | `00-reactor-hall-overview.png` | `00-reactor-hall-overview.png` |
| Быстрый найм | `01-showcase-0-bystryy-naym.png` | `01-showcase-0-bystryy-naym.png` |
| Удержание | `02-showcase-1-uderzhanie.png` | `02-showcase-1-uderzhanie.png` |
| Человекоцентричность | `03-showcase-2-chelovekocentr.png` | `03-showcase-2-chelovekocentr.png` |
| Эффективность | `04-showcase-3-effektivnost.png` | `04-showcase-3-effektivnost.png` |
| Реактор (крупнее) | — | `05-reactor-rostelecom.png` |

## Запуск теста

```text
python -m http.server 8765 --bind 127.0.0.1
→ http://127.0.0.1:8765/START-HERE-R16-TEST.html
```

R15 (без графита): `START-HERE-R15.html`

## Ожидание

Публикация / push в `main` — **только после подтверждения**.
