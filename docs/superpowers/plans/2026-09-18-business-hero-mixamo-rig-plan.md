# Business Hero Mixamo Rig + Walk/Idle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static v11 Business Hero with a Mixamo-rigged GLB that plays corporate idle and walk with smooth crossfade.

**Architecture:** Upload the reference FBX to Mixamo, auto-rig, download in-place Idle + Walking clips, ship one (or dual same-skeleton) GLB under `v11/assets/`, then drive clips via Three.js `AnimationMixer` in `hero-web.js`. `game-v11.js` already calls `heroRig.update(dt, moving ? 1 : 0)`.

**Tech Stack:** Three.js r180, GLTFLoader, AnimationMixer, Mixamo, optional Blender for clip merge, GitHub Pages static hosting.

## Global Constraints

- Target height: **1.69 m**; face **-Z** after fit/heading/upright groups.
- Animations: **corporate** calm idle + confident walk; **in-place** only (no root motion).
- Crossfade idle ↔ walk: **0.25–0.40 s**.
- Keep `createHero()` async boot contract used by `game-v11.js` (`bootState`, begin button).
- Do not change office gameplay, themes, or mobile controls except animation wiring.
- Prefer not editing `git config`; use one-off `GIT_AUTHOR_*` env if commit identity missing.
- Source reference: `C:\Users\cobra\Downloads\business_woman_character_package\`.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `v11/hero-web.js` | Load rigged character, mixer, idle/walk crossfade, `createHero()` API |
| `v11/game-v11.js` | Already passes `(dt, moving?1:0)` — verify only; bump cache if needed |
| `v11/index.html` | Cache-buster `?v=` for scripts/assets |
| `v11/assets/business_woman_character*.glb` (or chunked pack) | Rigged mesh + clips |
| `tools/pack-hero-asset.ps1` (optional) | Rebuild gzip+base64 chunks if GLB too large for Pages |
| `docs/superpowers/specs/2026-09-18-business-hero-mixamo-rig-design.md` | Approved design (done) |

---

### Task 1: Mixamo auto-rig + download Idle / Walking FBX

**Files:**
- Read: `C:\Users\cobra\Downloads\business_woman_character_package\business_woman_character.fbx`
- Create (local, not in repo yet): `C:\Users\cobra\Downloads\mixamo_exports\bw_idle.fbx`, `bw_walk.fbx` (and optionally `bw_tpose.fbx`)

**Interfaces:**
- Consumes: ASCII FBX character package (static, no skeleton)
- Produces: Mixamo-rigged FBX files with in-place Idle and Walking skins

- [ ] **Step 1: Open Mixamo and confirm login**

Navigate browser to `https://www.mixamo.com/`. If not logged in, stop and ask the user to complete Adobe/Mixamo login (required once).

Expected: Mixamo character library UI visible while authenticated.

- [ ] **Step 2: Upload character**

Upload `C:\Users\cobra\Downloads\business_woman_character_package\business_woman_character.fbx`.

On Auto-Rigger:
- Place markers on chin, wrists, elbows, knees, groin as prompted.
- Because of wide shoulders / thin limbs, double-check wrist and elbow markers sit on joints, not on jacket pads.
- Run Auto-Rigger; verify T-pose preview looks sane (no exploded mesh).

- [ ] **Step 3: Download Idle (in-place)**

Search animations for a calm standing idle (prefer names like `Idle` / `Happy Idle` avoided if too bouncy — pick the most corporate/neutral).

Download settings:
- Format: **FBX**
- Skin: **With Skin**
- Frames per second: **30**
- Keyframe Reduction: **none** (or default)
- Ensure animation is **in place** (Mixamo “In Place” checkbox ON if present)

Save as: `C:\Users\cobra\Downloads\mixamo_exports\bw_idle.fbx`

- [ ] **Step 4: Download Walking (in-place)**

Search `Walking`. Prefer a straight, moderate-pace walk (not “Walking Tired”, not “Run”).

Same download settings as Idle; **In Place ON**.

Save as: `C:\Users\cobra\Downloads\mixamo_exports\bw_walk.fbx`

- [ ] **Step 5: Sanity-check exports**

Both files must exist and be larger than the original static FBX mesh-only expectation with skeleton (typically >1 MB each with skin).

```powershell
Get-ChildItem C:\Users\cobra\Downloads\mixamo_exports\bw_*.fbx | Format-Table Name, Length
```

Expected: `bw_idle.fbx` and `bw_walk.fbx` present with non-zero size.

- [ ] **Step 6: Commit checkpoint (optional local note only)**

Do not commit binary Downloads. No repo commit in this task.

---

### Task 2: Convert FBX → GLB and unify clips

**Files:**
- Create: `v11/assets/business_woman_rigged.glb` (preferred single file with both clips)
- Fallback create: `v11/assets/business_woman_idle.glb`, `v11/assets/business_woman_walk.glb`

**Interfaces:**
- Consumes: Mixamo FBX exports from Task 1
- Produces: GLB(s) loadable by Three.js `GLTFLoader` with `gltf.animations` length ≥ 1 each; bone names identical across clips

- [ ] **Step 1: Prefer Blender merge if Blender is installed**

```powershell
where.exe blender
```

If Blender exists, run a merge script (create `tools/merge_mixamo_clips.py`):

```python
# tools/merge_mixamo_clips.py
import bpy
import sys
from pathlib import Path

idle_path, walk_path, out_path = map(Path, sys.argv[-3:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(idle_path))
# Rename idle action
for action in bpy.data.actions:
    action.name = "Idle"

bpy.ops.import_scene.fbx(filepath=str(walk_path))
# After second import, rename newest non-Idle action to Walk
for action in bpy.data.actions:
    if action.name != "Idle" and "Walk" not in action.name:
        if "mixamo" in action.name.lower() or action.name != "Idle":
            if action.name != "Idle":
                action.name = "Walk"

# Keep one armature + mesh from first import; ensure Walk action exists on same armature
bpy.ops.export_scene.gltf(filepath=str(out_path), export_format='GLB', export_animations=True)
```

Run:

```powershell
blender -b -P tools/merge_mixamo_clips.py -- `
  "C:\Users\cobra\Downloads\mixamo_exports\bw_idle.fbx" `
  "C:\Users\cobra\Downloads\mixamo_exports\bw_walk.fbx" `
  "v11/assets/business_woman_rigged.glb"
```

Expected: `v11/assets/business_woman_rigged.glb` exists.

- [ ] **Step 2: Fallback without Blender — dual GLB via online/CLI convert**

If Blender is missing, convert each FBX to GLB separately (e.g. Blender portable later, or `FBX2glTF` if available):

- `v11/assets/business_woman_idle.glb`
- `v11/assets/business_woman_walk.glb`

Hero loader (Task 3) must support both modes:
- **Single:** one GLB, find clips by name `/idle/i` and `/walk/i`.
- **Dual:** load idle GLB as visual scene; take walk clip from walk GLB (`gltf.animations[0]`) and `mixer.clipAction(walkClip, idleScene)` — Mixamo bone names match.

- [ ] **Step 3: Verify animations in Node or browser console helper**

Quick browser check after temporary load page, or:

```powershell
# If @gltf-transform/cli available:
npx --yes @gltf-transform/cli inspect v11/assets/business_woman_rigged.glb
```

Expected: animations listed (Idle + Walk) OR two files each with ≥1 animation.

- [ ] **Step 4: Commit assets (if size policy allows)**

```powershell
git add v11/assets/business_woman_rigged.glb
# or dual glbs
git commit -m "assets: add Mixamo-rigged Business Hero GLB with idle/walk"
```

If GitHub rejects large files, skip commit of raw GLB and use Task 4 packing instead; commit packed chunks only.

---

### Task 3: Rewrite `hero-web.js` for AnimationMixer

**Files:**
- Modify: `v11/hero-web.js` (full replace of static path)
- Test: manual browser on local static server

**Interfaces:**
- Consumes: rigged GLB path(s); Three.js r180
- Produces:

```js
export async function createHero(): Promise<{
  model: THREE.Group,
  head: THREE.Group,
  hand: THREE.Group,
  update(dt: number, moving: number): void, // 0 idle, >0 walk
  touch(worldTarget: THREE.Vector3): void,
  contactError(): number,
  skeleton: THREE.Skeleton | null,
  sourceAnimations: THREE.AnimationClip[]
}>
```

- [ ] **Step 1: Replace loader to prefer single rigged GLB**

Implement load strategy at top of `v11/hero-web.js`:

```js
import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const CHARACTER_VERSION = '1121';
const RIGGED_URL = `./assets/business_woman_rigged.glb?v=${CHARACTER_VERSION}`;
const IDLE_URL = `./assets/business_woman_idle.glb?v=${CHARACTER_VERSION}`;
const WALK_URL = `./assets/business_woman_walk.glb?v=${CHARACTER_VERSION}`;

const loader = new GLTFLoader();
const loadGltf = url => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

function findClip(clips, re, fallbackIndex = 0) {
  return clips.find(c => re.test(c.name)) || clips[fallbackIndex] || null;
}
```

- [ ] **Step 2: Implement `createHero` orientation + materials (keep existing fit)**

Keep the same `fit` / `heading` / `upright` hierarchy and scale-to-1.69 logic from current file. After Mixamo, axis conversion may differ — **test visually**. If Mixamo FBX already Y-up facing +Z/-Z, start with:

```js
// First attempt after Mixamo (Y-up). Adjust if facing wrong:
upright.rotation.set(0, 0, 0);
heading.rotation.y = Math.PI; // flip if needed
```

If the character faces the wrong way or lies flat, restore the previous Z-up conversion:

```js
upright.rotation.x = -Math.PI / 2;
heading.rotation.y = Math.PI;
```

Document the final chosen rotations in a one-line comment in code.

- [ ] **Step 3: Wire AnimationMixer + crossfade**

```js
const mixer = new T.AnimationMixer(gltf.scene);
const idleClip = findClip(allClips, /idle/i, 0);
const walkClip = findClip(allClips, /walk/i, 1);
if (!idleClip || !walkClip) throw new Error('Не найдены клипы Idle/Walk');

const idleAction = mixer.clipAction(idleClip);
const walkAction = mixer.clipAction(walkClip);
idleAction.play();
walkAction.play();
walkAction.setEffectiveWeight(0);

const FADE = 0.3;
let mode = 'idle';

function update(dt, moving = 0) {
  const want = moving > 0.05 ? 'walk' : 'idle';
  if (want !== mode) {
    mode = want;
    if (mode === 'walk') {
      idleAction.fadeOut(FADE);
      walkAction.reset().setEffectiveWeight(1).fadeIn(FADE);
      walkAction.setEffectiveTimeScale(1);
    } else {
      walkAction.fadeOut(FADE);
      idleAction.reset().setEffectiveWeight(1).fadeIn(FADE);
    }
  }
  if (mode === 'walk') {
    walkAction.setEffectiveTimeScale(0.85 + Math.min(1, moving) * 0.35);
  }
  mixer.update(dt);
}
```

For dual-GLB mode: `allClips = [...idleGltf.animations, ...walkGltf.animations]` and `mixer = new AnimationMixer(idleGltf.scene)`.

Set `model.userData.staticAsset = false`.

- [ ] **Step 4: Keep head/hand helpers and return contract**

Preserve `head`, `hand`, `touch`, `contactError`, `sourceAnimations` so callers do not break.

- [ ] **Step 5: Local smoke test**

```powershell
npx --yes serve v11 -p 5173
```

Open `http://localhost:5173/?v=1121`, wait for `SKY OFFICE READY`, enter office, move with WASD.

Expected:
- Idle loops while standing
- Walk fades in when moving
- Soft fade back to idle on stop
- No root-motion drift

- [ ] **Step 6: Commit**

```powershell
git add v11/hero-web.js
git commit -m "feat(v11): drive Business Hero with Mixamo idle/walk mixer"
```

---

### Task 4: Asset packaging for GitHub Pages (if needed)

**Files:**
- Create/Update: `v11/assets/business_woman_character.glb.gz.b64.*` OR keep direct `.glb` if size OK
- Modify: `v11/hero-web.js` PARTS / URL constants
- Create: `tools/pack-hero-asset.ps1`

**Interfaces:**
- Consumes: final `business_woman_rigged.glb`
- Produces: either direct GLB fetch OR chunked gzip+base64 pack with updated length checksum

- [ ] **Step 1: Measure GLB size**

```powershell
(Get-Item v11/assets/business_woman_rigged.glb).Length
```

- If **< ~5–8 MB** and Pages accepts: keep direct `GLTFLoader.load(RIGGED_URL)` (preferred).
- If too large or push fails: pack.

- [ ] **Step 2: Packing script (only if needed)**

```powershell
# tools/pack-hero-asset.ps1
param([string]$GlbPath = "v11/assets/business_woman_rigged.glb")
$bytes = [IO.File]::ReadAllBytes((Resolve-Path $GlbPath))
$ms = New-Object IO.MemoryStream
$gz = New-Object IO.Compression.GzipStream($ms, [IO.Compression.CompressionLevel]::Optimal)
$gz.Write($bytes, 0, $bytes.Length); $gz.Close()
$b64 = [Convert]::ToBase64String($ms.ToArray())
Write-Host "b64 length=$($b64.Length)"
# Split into chunks matching previous naming scheme; write under v11/assets/
```

Update `hero-web.js` checksum `encoded.length !== NEWlen`.

- [ ] **Step 3: Remove obsolete static chunks if replaced**

Delete old `business_woman_character.glb.gz.b64.*` only after new pack verified loading.

- [ ] **Step 4: Commit**

```powershell
git add v11/assets tools/pack-hero-asset.ps1 v11/hero-web.js
git commit -m "build(v11): package rigged Business Hero asset for Pages"
```

---

### Task 5: Cache-bust + verify `game-v11.js` wiring

**Files:**
- Modify: `v11/index.html` (`?v=1121` or higher on script tags)
- Modify: `v11/game-v11.js` only if `update` signature mismatch (currently already `heroRig?.update(dt,moving?1:0)`)

**Interfaces:**
- Consumes: `createHero()` from Task 3
- Produces: boot + frame loop animating hero

- [ ] **Step 1: Confirm call site**

In `v11/game-v11.js` ensure:

```js
heroRig?.update(dt, moving ? 1 : 0);
```

If `moving` is boolean, coerce is already fine (`true → 1`). No change required unless signature differs.

- [ ] **Step 2: Bump cache query on scripts in `v11/index.html`**

```html
<script type="module" src="game-v11.js?v=1121"></script>
```

Also bump CSS/ co-scripts if they share the query convention (`?v=1120` → `1121`).

- [ ] **Step 3: Browser acceptance checklist**

Open deployed or local `v11/?v=1121`:

1. Boot text becomes `SKY OFFICE READY · BUSINESS HERO ONLINE`
2. Character matches reference silhouette/colors
3. Idle while still
4. Walk while moving; crossfade ~0.3s
5. Mobile joystick also triggers walk (same `moving` flag)
6. No console errors from mixer/clip missing

- [ ] **Step 4: Commit**

```powershell
git add v11/index.html v11/game-v11.js
git commit -m "chore(v11): cache-bust Business Hero animation release"
```

---

### Task 6: Push to origin (only when user asks)

**Files:** none new

- [ ] **Step 1: Ask user before push**

Do not push unless the user explicitly says to publish.

- [ ] **Step 2: When approved**

```powershell
git push origin main
```

Expected: GitHub Pages serves `https://aleksey341.github.io/-2026/v11/?v=1121`

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|------------------|------|
| Visual match to reference package | Task 1–2 (same mesh through Mixamo) |
| Corporate idle + walk | Task 1 clip choice + Task 3 mixer |
| Crossfade 0.25–0.40s | Task 3 `FADE = 0.3` |
| In-place / no root motion | Task 1 download settings |
| Height 1.69 + facing | Task 3 fit/heading |
| `createHero` boot contract | Task 3 + Task 5 |
| Pages packaging | Task 4 |
| Desktop + mobile | Task 5 (shared `moving` flag) |

No intentional placeholders left. Dual-GLB path is an explicit fallback, not a TBD.
