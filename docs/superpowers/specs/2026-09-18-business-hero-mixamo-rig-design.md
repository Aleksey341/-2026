# Business Hero: Mixamo Rig + Corporate Walk/Idle

**Date:** 2026-09-18  
**Repo:** `Aleksey341/-2026`  
**Scope:** `v11/` — HR Sky Office character  
**Status:** Draft for review

## Problem

Персонаж Business Hero в `v11` загружается из статического GLB без скелета и клипов. В сцене модель только транслируется вместе с `player` — визуально «скользит». Нужны:

1. Внешний вид, совпадающий с референсом из `business_woman_character_package`.
2. Плавные естественные движения: спокойный корпоративный idle и уверенная деловая походка.

## Goals

- Персонаж визуально совпадает с превью/референсом (тёмно-синий костюм, светлая блузка, тёмные волосы с пучком, без сумки).
- В покое играет idle (лёгкое дыхание / покач).
- При движении (WASD / мобильный джойстик) — walk с плавным crossfade.
- Высота ~1.69 м, ориентация как в текущем `hero-web.js` (Y-up, лицом −Z).
- Работает на desktop и mobile в текущем игровом цикле `game-v11.js`.

## Non-Goals

- Лицевая мимика, жесты рук у голограмм, сидение, бег, прыжки.
- Смена костюма / вариации персонажа.
- Переписывание всей сцены офиса или системы ввода.
- Процедурная «фейковая» походка без скелета (отклонено в пользу Mixamo).

## Approved Approach

**Один ригнутый GLB с клипами Idle + Walk + AnimationMixer crossfade.**

Пайплайн:

1. Исходник: `business_woman_character.fbx` из пакета референса.
2. Mixamo: авториг → клипы корпоративного стиля (Idle + Walking, in-place).
3. Сборка: один GLB с обоими анимационными клипами.
4. Доставка в `v11/assets/` (с учётом лимитов GitHub Pages; при необходимости сохранить схему chunked base64+gzip).
5. Обновление `hero-web.js`: загрузка ригнутой модели, `AnimationMixer`, API `update(dt, moving)`.
6. `game-v11.js`: передавать скорость/флаг движения без ломки существующего контроллера.

## Animation Spec

| State | Source (Mixamo, ориентиры) | Behavior |
|-------|----------------------------|----------|
| Idle | Calm idle / standing idle | Loop; лёгкий sway/дыхание |
| Walk | Walking (business-like, in-place) | Loop; уверенный шаг |

- Crossfade idle ↔ walk: **0.25–0.40 s**.
- Скорость клипа walk слегка масштабировать под скорость игрока (~1.85 units/s), без root motion (движение по-прежнему у `player` group).
- Клипы **in-place** (без смещения корня), чтобы не конфликтовать с коллизиями `blocked()`.

## Visual Spec

- Сохранить стиль референса; не менять материалы «на глаз» без причины.
- После Mixamo проверить пропорции (широкие плечи, тонкие конечности) — при необходимости подправить landmarks в Mixamo до экспорта.
- Масштаб до высоты **1.69 м**; конвертация осей как сейчас (Z-up source → Y-up Three.js).

## Technical Design

### Files

| File | Role |
|------|------|
| `v11/hero-web.js` | Загрузка GLB, mixer, idle/walk, `createHero()` API |
| `v11/game-v11.js` | Вызов `heroRig.update(dt, moveAmount)`; без смены геймплея |
| `v11/assets/*` | Новый ригнутый ассет (замена текущего static pack) |
| `v11/index.html` | При необходимости bump `?v=` cache-buster |

### `createHero()` contract (target)

```js
{
  model,          // THREE.Group
  head,           // optional attachment
  hand,           // optional attachment
  update(dt, moving), // 0 = idle, >0 = walk weight / speed factor
  touch(worldTarget),
  contactError(),
  skeleton,       // Skeleton | null
  sourceAnimations
}
```

`update(dt, moving)`:

- `moving === 0` → fade to Idle.
- `moving > 0` → fade to Walk; optional `action.setEffectiveTimeScale(...)`.

### Asset packaging

Текущий пайплайн режет gzip+base64 на чанки из‑за лимитов GitHub. После получения нового GLB:

1. Измерить размер.
2. Если один файл приемлем для Pages — упростить загрузку до одного GLB/`GLTFLoader.load`.
3. Иначе — пересобрать chunk pack и обновить список `PARTS` + checksum длины.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Mixamo плохо риггает стилизованные пропорции | Ручная правка landmarks; переэкспорт |
| Клипы с root motion ломают коллизии | Только in-place downloads |
| GLB слишком большой | Gzip + chunking; atlas не нужен (vertex colors) |
| Резкий переход idle/walk | Crossfade 0.25–0.4s; hysteresis по `moving` |
| Ломается boot-кнопка «Войти» | Сохранить async `createHero()` + bootState |

## Acceptance Criteria

- [ ] Персонаж визуально близок к `business_woman_character_preview.png`.
- [ ] На месте — спокойный loop idle.
- [ ] При движении — walk; при остановке — плавный возврат в idle (без рывка).
- [ ] Нет скольжения «статуи»; нет уезда модели из-за root motion.
- [ ] Desktop (WASD) и mobile (джойстик) ведут себя одинаково по анимации.
- [ ] Страница `v11/?v=…` загружается без ошибок boot; кнопка «Войти в офис» активируется после загрузки героя.

## Out of Scope Follow-ups

- Анимация взаимодействия с голограммами.
- Отдельный run / turn-in-place.
- LOD / упрощение меша.

## Open Points (resolve during implementation)

- Точные имена клипов Mixamo после выбора в UI.
- Нужен ли Blender только для merge клипов в один GLB, или достаточно другого конвертера.
- Финальный cache-buster (`?v=`) для деплоя.
