/**
 * R16 visual kit — HyperFrames R2 graphite look adapted for R15 game loop.
 * Local materials only; does not mutate shared cubeTrim / brass / cream.
 * Toggle: window.ROOM_CONFIG.r16Visuals === true → enabled.
 * Default OFF so START-HERE-R15.html keeps original look.
 */
import * as T from 'room-module/vendor/three.module.js';

export function r16Enabled() {
  const cfg = typeof window !== 'undefined' ? window.ROOM_CONFIG : null;
  if (!cfg) return false;
  // Kill-switch for new decorative effects without removing the build flag.
  if (cfg.visualEffectsEnabled === false) return false;
  // Accept top-level or reactor-scoped flag (HTML embeds it under reactor).
  return cfg.r16Visuals === true || cfg.reactor?.r16Visuals === true;
}

/** Mid graphite body (R2-inspired), optional theme emissive tint. */
export function createGraphiteMaterial(themeColor = '#5ab0ff', opts = {}) {
  const {
    color = 0x4e5868,
    metalness = 0.88,
    roughness = 0.26,
    clearcoat = 0.5,
    clearcoatRoughness = 0.34,
    emissiveIntensity = 0.14,
  } = opts;
  const emissive = new T.Color(themeColor).multiplyScalar(0.35);
  return new T.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat,
    clearcoatRoughness,
    emissive,
    emissiveIntensity,
    envMapIntensity: 1.05,
  });
}

/** Slightly brighter band for lids / crown rings. */
export function createGraphiteBandMaterial(themeColor = '#5ab0ff') {
  return createGraphiteMaterial(themeColor, {
    color: 0x5a6574,
    metalness: 0.9,
    roughness: 0.22,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
    emissiveIntensity: 0.2,
  });
}

/**
 * Seamless cylindrical marquee — integer UV tiles, wide gaps, slow scroll.
 * Full phrase stays readable; no mid-word stretch from non-integer repeat.
 */
export function createScrollingLabel(text, r, h, y, color) {
  const phrase = String(text || '').trim();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // Hi-DPI canvas → sharper letters on the cylinder
  const scale = 2;
  const fontPx = 132;
  const font = `700 ${fontPx}px Arial, "Segoe UI", sans-serif`;
  ctx.font = font;
  const textW = Math.ceil(Math.max(ctx.measureText(phrase).width, 80));
  // Wide gap so the next copy never crowds the previous word
  const gap = Math.max(180, Math.round(textW * 0.65));
  const unitW = textW + gap;
  const unitH = 288;
  canvas.width = unitW * scale;
  canvas.height = unitH * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, unitW, unitH);
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const x = Math.round(gap * 0.28);
  const cy = unitH / 2;

  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.fillStyle = color;
  ctx.fillText(phrase, x, cy);

  ctx.shadowBlur = 0;
  const core = new T.Color(color).lerp(new T.Color('#f4f8fc'), 0.42);
  ctx.fillStyle = `#${core.getHexString()}`;
  ctx.fillText(phrase, x, cy);

  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = T.RepeatWrapping;
  map.wrapT = T.ClampToEdgeWrapping;
  map.minFilter = T.LinearFilter;
  map.magFilter = T.LinearFilter;
  map.generateMipmaps = false;
  map.anisotropy = 4;
  // Fewer copies → larger, clearer words around the band
  const circ = 2 * Math.PI * Math.max(r, 0.4);
  const copies = Math.max(2, Math.min(3, Math.round(circ / 2.8)));
  map.repeat.set(copies, 1);
  map.needsUpdate = true;

  const mat = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: T.FrontSide,
  });
  const label = new T.Mesh(new T.CylinderGeometry(r, r, h, 160, 1, true), mat);
  label.position.y = y;
  label.name = 'scrolling-title';
  label.userData.r16 = 'marquee';
  // Visual speed ~ independent of copy count
  // Slow enough to read full words, still visibly moving
  label.userData.scrollSpeed = 0.036 / copies;
  return label;
}

export function scrollTitle(label, dt) {
  if (!label?.material?.map) return;
  const speed = label.userData.scrollSpeed ?? 0.036;
  const step = Math.max(0, Math.min(dt, 0.05)) * speed;
  label.material.map.offset.x = (label.material.map.offset.x + step) % 1;
}

/** Tag mesh for later identification / dispose. */
export function tag(mesh, role) {
  if (mesh) mesh.userData.r16 = role;
  return mesh;
}

/**
 * Soft theme rim light attached to showcase (local, low intensity, no shadows).
 */
export function attachShowcaseRimLight(group, themeColor) {
  const light = new T.PointLight(themeColor, 0.35, 4.5, 2);
  light.position.set(0, 2.05, 0);
  light.castShadow = false;
  light.name = 'r16-rim';
  light.userData.r16 = 'rim-light';
  group.add(light);
  return light;
}

/**
 * After reactor-room may apply base textures — re-assert graphite on tagged trims.
 */
export function restyleShowcaseTrims(pod, themeColor) {
  if (!r16Enabled() || !pod?.g) return;
  const body = createGraphiteMaterial(themeColor);
  const band = createGraphiteBandMaterial(themeColor);
  pod.g.traverse((o) => {
    if (!o.isMesh || !o.userData?.r16) return;
    if (o.userData.r16 === 'showcase-trim') {
      disposeMaterial(o.material);
      o.material = body;
    } else if (o.userData.r16 === 'showcase-band') {
      disposeMaterial(o.material);
      o.material = band;
    }
  });
  // Keep theme PointLight; gently raise ring emissive floor for graphite readability
  if (pod.ring?.material) {
    pod.ring.material.emissiveIntensity = Math.max(pod.ring.material.emissiveIntensity || 0, 0.55);
  }
}

function disposeMaterial(mat) {
  if (!mat) return;
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) {
    if (m.map && m.userData?.r16DisposeMap) m.map.dispose();
    // Only dispose materials we created (tagged)
    if (m.userData?.r16Owned) m.dispose();
  }
}

export function own(mat) {
  mat.userData.r16Owned = true;
  return mat;
}

/**
 * Lightweight PMREM so MeshPhysicalMaterial graphite shows metallic reflections.
 * No RoomEnvironment addon required (not in vendor). Safe no-op if already applied.
 */
export function applyR16Environment(scene, renderer) {
  if (!r16Enabled() || !scene || !renderer || scene.userData.r16Env) return null;
  const pmrem = new T.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  // Geometry is required — lights alone yield an empty PMREM.
  const env = new T.Scene();
  env.add(new T.AmbientLight(0xffffff, 0.4));
  env.add(new T.HemisphereLight(0xf2f6ff, 0x20262f, 0.85));
  const key = new T.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 8, 4);
  env.add(key);
  const fill = new T.DirectionalLight(0xb4c6e0, 0.65);
  fill.position.set(-6, 3, -2);
  env.add(fill);
  const box = new T.Mesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 }),
  );
  for (const [c, x, y, z, s] of [
    [0xf5f7fb, 0, 12, 0, 28],
    [0x2a313c, 0, -6, 0, 24],
    [0xd8dee8, 10, 2, -4, 6],
    [0x8fa3c0, -9, 3, 5, 5],
    [0xe8c99a, 4, 5, 9, 4],
    [0x6b7f98, -3, 1, -10, 7],
  ]) {
    const m = box.clone();
    m.material = box.material.clone();
    m.material.color.setHex(c);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    env.add(m);
  }
  const tex = pmrem.fromScene(env, 0.04).texture;
  scene.environment = tex;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 1.05;
  scene.userData.r16Env = true;
  pmrem.dispose();
  return tex;
}
