# Инвентаризация объектов R15 (до изменений)

SHA: fe88fa13f678e913d80a6d3e2b2df030ef5d65af
Ветка: feature/hyperframes-r16
Three.js: r180 (локальный room-module/vendor/three.module.js)

## Механизм загрузки

START-HERE-R15.html использует importmap → ./room-module/src/*.js
Изменения в room-module влияют на запускаемую игру.
source/ — зеркало; smoke сравнивает game/elevator/progress с room-module.

## Витрины showcase(i, theme) — НЕ КУБЫ

Все 4 витрины — цилиндрические стеклянные капсулы:

| i | name (theme) | color | position xz | геометрия корпуса |
|---|---|---|---|---|
| 0 | Быстрый найм | #ff792d | [-6, Z-1.4] | CylinderGeometry (база/стекло/крышка) |
| 1 | Удержание | #a775ff | [-3.5, Z-5] | то же |
| 2 | Человекоцентричность | #43d9a3 | [3.5, Z-5] | то же |
| 3 | Эффективность | #35b9ff | [6, Z-1.4] | то же + внутренний story.cube 0.22³ |

Текст витрин: scrollingLabel(theme.name) на цилиндре r=1.306, h=0.27, y=2.39
Реактор: scrollingLabel('Ростелеком') на цилиндре

Материал корпуса сейчас: cubeTrim = MeshStandardMaterial #30343b metalness .55 roughness .42
Стекло: MeshPhysicalMaterial opacity .15

## Единственный куб

objects.cube в createStory index===3 (Эффективность):
- BoxGeometry(.22,.22,.22)
- материал shell (emissive theme color, transparent)
- EdgesGeometry + LineBasicMaterial
- анимация efficiency(): rotation + reveal

Это декоративный объект мини-сцены внутри витрины №3, НЕ сама витрина.

## HyperFrames R2 → совместимость (кратко)

| Компонент R2 | Совместимость с r180 |
|---|---|
| MeshPhysicalMaterial graphite | OK напрямую |
| RoomEnvironment / PMREM | OK (есть в examples? нужно проверить vendor) |
| RoundedBoxGeometry | НЕТ в vendor; не заменять цилиндры |
| 4 face marquee planes | Не применимо к цилиндрам |
| scrollingLabel UV offset | УЖЕ есть; улучшать, не заменять логику имён |
| Доп. DirectionalLights | Осторожно (perf) |
| HyperFrames runtime / hf-seek | НЕ переносить |

## Статус по ТЗ §4

Целевые «кубы» однозначно НЕ определены как 4 витрины.
Требуется подтверждение пользователя до визуальных правок.
