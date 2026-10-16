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
 * Seamless cylindrical marquee (R2 lessons: integer tile, soft glow, no hard stripes).
 * Keeps existing API: Mesh with CanvasTexture + UV scroll via scrollTitle.
 */
export function createScrollingLabel(text, r, h, y, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = '700 118px Arial,sans-serif';
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textW = Math.ceil(Math.max(metrics.width, 64));
  const gap = Math.max(96, Math.round(textW * 0.42));
  const unitW = textW + gap;
  canvas.width = unitW;
  canvas.height = 256;
  ctx.clearRect(0, 0, unitW, 256);
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Soft theme glow underpass
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(text, gap * 0.35, 128);

  // Crisp core (slightly lighter for readability on dark graphite)
  ctx.shadowBlur = 0;
  const core = new T.Color(color).lerp(new T.Color('#eef4fa'), 0.35);
  ctx.fillStyle = `#${core.getHexString()}`;
  ctx.fillText(text, gap * 0.35, 128);

  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = T.RepeatWrapping;
  map.wrapT = T.ClampToEdgeWrapping;
  map.minFilter = T.LinearFilter;
  map.magFilter = T.LinearFilter;
  map.generateMipmaps = false;
  // ~2.4–3.2 readable copies around the cylinder circumference
  const circ = 2 * Math.PI * r;
  const copies = Math.max(2, Math.min(4, Math.round(circ / 2.15)));
  map.repeat.set(copies, 1);
  map.needsUpdate = true;

  const mat = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: T.FrontSide,
  });
  const label = new T.Mesh(new T.CylinderGeometry(r, r, h, 128, 1, true), mat);
  label.position.y = y;
  label.name = 'scrolling-title';
  label.userData.r16 = 'marquee';
  return label;
}

export function scrollTitle(label, dt) {
  if (!label?.material?.map) return;
  const speed = label.userData.scrollSpeed ?? 0.048;
  label.material.map.offset.x = (label.material.map.offset.x + Math.max(0, dt) * speed) % 1;
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
