/**
 * R16 future entrance portal — visual match to references/03-future-entrance-2027.png.
 * Year forced to 2027 per TZ. Non-blocking; compatible with sealLift glass.
 */
import * as T from 'room-module/vendor/three.module.js';
import { r16Enabled } from './graphite-r16.js';

const CYAN = '#00f2e8';
const CYAN_CORE = '#e8fffc';

function neonDigitTexture(digit) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 640);
  // Outer bloom
  ctx.font = '800 420px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 80;
  ctx.fillStyle = CYAN;
  ctx.fillText(String(digit), 256, 320);
  ctx.shadowBlur = 40;
  ctx.fillText(String(digit), 256, 320);
  // Tube body
  ctx.shadowBlur = 0;
  ctx.lineWidth = 28;
  ctx.strokeStyle = CYAN;
  ctx.strokeText(String(digit), 256, 320);
  // Hot white core
  ctx.fillStyle = CYAN_CORE;
  ctx.font = '800 400px Arial,sans-serif';
  ctx.fillText(String(digit), 256, 320);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}

function facetedPillar(h, stone, neon) {
  const g = new T.Group();
  // Main octagonal-ish pillar via two rotated boxes
  const a = new T.Mesh(new T.BoxGeometry(0.55, h, 0.55), stone);
  g.add(a);
  const b = new T.Mesh(new T.BoxGeometry(0.55, h, 0.55), stone);
  b.rotation.y = Math.PI / 4;
  b.scale.set(0.92, 1, 0.92);
  g.add(b);
  // Inner face edge light
  const edge = new T.Mesh(new T.BoxGeometry(0.05, h * 0.92, 0.05), neon.clone());
  edge.position.set(-0.28, 0, 0);
  g.add(edge);
  // Top / bottom cyan channels
  for (const yy of [-h * 0.42, h * 0.42]) {
    const ch = new T.Mesh(new T.BoxGeometry(0.58, 0.06, 0.58), neon.clone());
    ch.position.y = yy;
    g.add(ch);
    const glow = new T.Mesh(
      new T.BoxGeometry(0.62, 0.12, 0.62),
      new T.MeshBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    glow.position.y = yy;
    g.add(glow);
  }
  return g;
}

export function attachPortal2027(futureGroup, { width: W, height: H, front }) {
  if (!r16Enabled()) return null;
  const root = new T.Group();
  root.name = 'r16-portal-2027';
  // Frame the lift wall opening from inside the pavilion (pull into room for readability)
  root.position.set(W / 2 - 0.55, 0, 0);
  futureGroup.add(root);

  const stone = new T.MeshStandardMaterial({
    color: '#b4bcc6',
    roughness: 0.78,
    metalness: 0.22,
  });
  const stoneDark = new T.MeshStandardMaterial({
    color: '#8e97a2',
    roughness: 0.7,
    metalness: 0.3,
  });
  const neon = new T.MeshStandardMaterial({
    color: CYAN,
    emissive: CYAN,
    emissiveIntensity: 2.8,
    roughness: 0.3,
  });
  const dark = new T.MeshStandardMaterial({
    color: '#0c1016',
    roughness: 0.85,
    metalness: 0.4,
  });

  const pillarH = Math.min(H * 0.98, 4.8);
  const gap = 1.65; // half-spacing — leave walkway clear in center

  for (const sign of [-1, 1]) {
    const pillar = facetedPillar(pillarH, sign < 0 ? stone : stoneDark, neon);
    pillar.scale.set(1.15, 1, 1.15);
    pillar.position.set(0, pillarH / 2 + 0.02, sign * gap);
    // Rotate so lit edge faces center niche
    pillar.rotation.y = sign > 0 ? Math.PI : 0;
    root.add(pillar);
  }

  // Dark niche plate behind digits (blocks bright skybox bleed)
  const niche = new T.Mesh(new T.BoxGeometry(0.22, pillarH * 0.95, gap * 1.85), dark);
  niche.position.set(0.18, pillarH / 2 + 0.02, 0);
  root.add(niche);

  // Volumetric haze (additive planes)
  const haze = new T.Mesh(
    new T.PlaneGeometry(1.8, pillarH * 0.88),
    new T.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
    }),
  );
  haze.position.set(-0.15, pillarH / 2, 0);
  haze.rotation.y = -Math.PI / 2;
  haze.renderOrder = 8;
  root.add(haze);

  const haze2 = haze.clone();
  haze2.material = haze.material.clone();
  haze2.material.opacity = 0.07;
  haze2.position.x = -0.05;
  haze2.scale.set(1.15, 1.05, 1);
  root.add(haze2);

  // Vertical neon 2 / 0 / 2 / 7 — large, readable
  const digits = ['2', '0', '2', '7'];
  const digitMeshes = [];
  const span = pillarH * 0.78;
  const startY = pillarH * 0.12;
  digits.forEach((d, i) => {
    const map = neonDigitTexture(d);
    const mat = new T.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
    });
    const m = new T.Mesh(new T.PlaneGeometry(1.55, 1.55), mat);
    m.position.set(-0.42, startY + (span / 3) * (3 - i), 0);
    m.rotation.y = -Math.PI / 2;
    m.renderOrder = 12;
    root.add(m);
    digitMeshes.push(m);

    // Soft glow card behind each digit
    const card = new T.Mesh(
      new T.PlaneGeometry(1.85, 1.75),
      new T.MeshBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
      }),
    );
    card.position.copy(m.position);
    card.position.x += 0.05;
    card.rotation.y = -Math.PI / 2;
    card.renderOrder = 11;
    root.add(card);
  });

  // Thin mounting rod
  const rod = new T.Mesh(
    new T.CylinderGeometry(0.02, 0.02, span * 1.05, 8),
    new T.MeshStandardMaterial({ color: '#1a1f28', metalness: 0.8, roughness: 0.35 }),
  );
  rod.position.set(-0.2, pillarH / 2, 0);
  root.add(rod);

  const glow = new T.PointLight(CYAN, 1.1, 7, 2);
  glow.position.set(-0.6, pillarH * 0.55, 0);
  glow.castShadow = false;
  root.add(glow);

  // Floor reflection cue
  const floorGlow = new T.Mesh(
    new T.CircleGeometry(1.1, 40),
    new T.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(-0.5, 0.03, 0);
  root.add(floorGlow);

  let t = 0;
  return {
    root,
    update(dt) {
      t += dt;
      const pulse = 0.9 + 0.1 * Math.sin(t * 2.2);
      digitMeshes.forEach((m, i) => {
        m.material.opacity = pulse * (0.85 + 0.1 * Math.sin(t * 2.5 + i));
      });
      haze.material.opacity = 0.09 + 0.05 * Math.sin(t * 1.4);
      glow.intensity = 0.85 + 0.3 * Math.sin(t * 2);
      floorGlow.material.opacity = 0.08 + 0.05 * Math.sin(t * 1.8);
    },
    reset() {
      t = 0;
    },
  };
}
