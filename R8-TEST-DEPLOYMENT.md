# R8 isolated test deployment, 2026-10-15

Live owner-private test URL: https://borup-2026-r8-checkpoint.choiceibis65.chatgpt.site

Runtime source: PR #8 commit fc71b772b8027d66949757a55d3446c595ef9623. Sites source commit d001a3ee1920caa8b6fde27d62721edec2ff8b05. This is a separate Site, not the R7 production address. R7 and main were not changed. R7 SHA-256 remains bba39094c254658839cd79df3375efab1386fe04138902db851ea4b878806359.

The standalone HTML was rebuilt from a clean checkout of PR #8, then the explicit R8-only fix removed unused heroine assets and hid the old procedural fallback before load. The published version splits exactly those HTML modules/assets into ordinary static files, so no 92 MB single HTML must be fetched to start. No rig/weight changes or Meshy operations were performed. Both base/future paths point to assets/characters/r8/borup-r8-lite-rigged.glb. Its SHA-256 is d0f450829e7d72638441e89b585c4692d01ab1791df7f1e1e3bacf4b725e32da. The page shows the loaded filename and variant. build-verification.json records the mapping.

Tests: actual GLB/AnimationMixer test passed 525 frames and all six locomotion states. test_r8_variants.mjs uses the real GLB and AssetSystem adapter, verifies base -> future -> base visibility, Walk/Idle changes after real displacement and stationary updates, and that the former body stays hidden. This tests character variants, not walking through doors in a rendered browser.

Visual: the exact rigged GLB was rendered from front, side, back and close face using software EGL. The male geometry is confirmed. Face lacks detail, fingers are grouped and materials are neutral. This is an offline view of bind pose, not a screenshot of the running game. Earlier observed motion defects remain: shirt deformation near elbow, sliding feet, instant start/stop world displacement and unvalidated turn timing. Interact/Reach/WearVR are absent. Full in-browser controls, room traversal, VR, Chrome/Edge compatibility and performance remain unaccepted because the supported managed browser-control plugin is unavailable. No replacement browser was installed.

Standalone release: START-HERE-R8-CHECKPOINT.html, 92,870,023 bytes. Open in Chrome/Edge with WebGL. Previous local checkpoint preserved; new file is in a separate release folder. Source reconstruction: python3 game/tools/build_r8.py NEW-R8.html.

This publication is a reviewable technical prototype. It is not a completed R8 release or a visually verified full playthrough.
