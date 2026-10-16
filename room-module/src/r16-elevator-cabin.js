/**
 * R16 glass pill-capsule elevator — visual match to references/02-lift.png.
 * Exterior shell frames the existing leaf doors; pad/near/leaves unchanged.
 */
import * as T from 'room-module/vendor/three.module.js';
import { createGraphiteMaterial, r16Enabled } from './graphite-r16.js';

const CYAN = '#00f0ff';
const CYAN_SOFT = '#7af6ff';

export function attachR16ElevatorCabin(root, { width = 2.4, height = 3.4, depth = 3.4 } = {}) {
  if (!r16Enabled()) return null;
  const cabin = new T.Group();
  cabin.name = 'r16-elevator-cabin';
  // Center of cabin volume sits just behind the door plane so the pill reads from the hall
  cabin.position.set(0, 0, -depth * 0.18);
  root.add(cabin);

  const chrome = createGraphiteMaterial(CYAN, {
    color: 0x9aa3ad,
    metalness: 0.96,
    roughness: 0.12,
    clearcoat: 0.75,
    clearcoatRoughness: 0.18,
    emissiveIntensity: 0.1,
  });
  const graphite = createGraphiteMaterial(CYAN, {
    color: 0x1c2430,
    metalness: 0.92,
    roughness: 0.24,
    clearcoat: 0.55,
    emissiveIntensity: 0.12,
  });
  const glass = new T.MeshPhysicalMaterial({
    color: '#c5ecf8',
    metalness: 0.04,
    roughness: 0.04,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: T.DoubleSide,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const neon = new T.MeshStandardMaterial({
    color: CYAN_SOFT,
    emissive: CYAN,
    emissiveIntensity: 2.8,
    roughness: 0.22,
  });
  const neonGlow = new T.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  });

  const r = Math.min(width, depth) * 0.52;
  const bodyH = height * 0.88;
  const ringMats = [];

  // Outer glass pill body — open ~80° toward hall (+Z in root) so doors remain clear
  const openStart = -Math.PI * 0.22;
  const openLen = Math.PI * 1.56;
  const glassBody = new T.Mesh(
    new T.CylinderGeometry(r, r, bodyH * 0.68, 72, 1, true, openStart, openLen),
    glass,
  );
  glassBody.position.y = height * 0.5;
  cabin.add(glassBody);

  // Slightly larger outer shell for silhouette from the hall
  const shellOuter = new T.Mesh(
    new T.CylinderGeometry(r * 1.04, r * 1.04, bodyH * 0.62, 72, 1, true, openStart, openLen),
    new T.MeshPhysicalMaterial({
      color: '#a8d8ea',
      metalness: 0.02,
      roughness: 0.06,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  shellOuter.position.y = height * 0.5;
  cabin.add(shellOuter);

  // Chrome vertical ribs + neon strips (visible around sides)
  for (let i = 0; i < 5; i++) {
    const a = openStart + 0.18 + (i / 4) * (openLen - 0.36);
    const rib = new T.Mesh(new T.BoxGeometry(0.08, bodyH * 0.66, 0.1), chrome);
    rib.position.set(Math.cos(a) * r * 0.99, height * 0.5, Math.sin(a) * r * 0.99);
    rib.lookAt(0, height * 0.5, 0);
    cabin.add(rib);
    const strip = new T.Mesh(new T.BoxGeometry(0.025, bodyH * 0.62, 0.04), neon.clone());
    strip.position.set(Math.cos(a) * (r + 0.03), height * 0.5, Math.sin(a) * (r + 0.03));
    strip.lookAt(0, height * 0.5, 0);
    cabin.add(strip);
    ringMats.push(strip.material);
  }

  // Bottom / top metal caps (domed)
  const bottom = new T.Group();
  bottom.position.y = 0.1;
  bottom.add(new T.Mesh(new T.CylinderGeometry(r * 1.08, r * 1.12, 0.26, 56), graphite));
  const botDome = new T.Mesh(
    new T.SphereGeometry(r * 1.08, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    chrome,
  );
  botDome.scale.y = 0.55;
  botDome.position.y = -0.04;
  bottom.add(botDome);
  cabin.add(bottom);

  const top = new T.Group();
  top.position.y = height - 0.1;
  top.add(new T.Mesh(new T.CylinderGeometry(r * 1.12, r * 1.08, 0.26, 56), graphite));
  const topDome = new T.Mesh(
    new T.SphereGeometry(r * 1.08, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    chrome,
  );
  topDome.scale.y = 0.55;
  topDome.position.y = 0.04;
  top.add(topDome);
  cabin.add(top);

  // Thick cyan neon rings (signature) — full torus, readable from hall
  for (const yy of [0.32, height - 0.32]) {
    const ring = new T.Mesh(new T.TorusGeometry(r * 1.05, 0.055, 16, 72), neon.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yy;
    cabin.add(ring);
    ringMats.push(ring.material);
    const halo = new T.Mesh(new T.TorusGeometry(r * 1.05, 0.14, 12, 56), neonGlow.clone());
    halo.rotation.x = Math.PI / 2;
    halo.position.y = yy;
    cabin.add(halo);
  }

  // Front half-rings on the hall side of the door plane (local +Z relative to cabin)
  const frontZ = depth * 0.18 + 0.04;
  for (const yy of [0.32, height - 0.32]) {
    const arc = new T.Mesh(
      new T.TorusGeometry(r * 1.02, 0.06, 12, 48, Math.PI * 0.85),
      neon.clone(),
    );
    arc.rotation.set(Math.PI / 2, 0, Math.PI * 0.575);
    arc.position.set(0, yy, frontZ);
    cabin.add(arc);
    ringMats.push(arc.material);
  }

  // Exterior door-frame pillars curved as capsule cheeks
  for (const sx of [-1, 1]) {
    const cheek = new T.Mesh(
      new T.CylinderGeometry(0.14, 0.14, height * 0.78, 20, 1, true, 0, Math.PI),
      chrome,
    );
    cheek.position.set(sx * (width * 0.48), height * 0.5, frontZ - 0.02);
    cheek.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    cabin.add(cheek);
    const cheekNeon = new T.Mesh(
      new T.BoxGeometry(0.04, height * 0.72, 0.05),
      neon.clone(),
    );
    cheekNeon.position.set(sx * (width * 0.5), height * 0.5, frontZ + 0.02);
    cabin.add(cheekNeon);
    ringMats.push(cheekNeon.material);
  }

  // Ceiling recessed light
  const ceil = new T.Mesh(
    new T.CircleGeometry(r * 0.52, 40),
    new T.MeshStandardMaterial({
      color: '#eef8ff',
      emissive: '#c8eaff',
      emissiveIntensity: 1.35,
      roughness: 0.3,
    }),
  );
  ceil.rotation.x = -Math.PI / 2;
  ceil.position.y = height - 0.24;
  cabin.add(ceil);

  // Floor disc
  const floor = new T.Mesh(new T.CircleGeometry(r * 0.9, 40), graphite);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.22;
  cabin.add(floor);
  const floorRing = new T.Mesh(new T.RingGeometry(r * 0.72, r * 0.9, 48), neon.clone());
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.23;
  cabin.add(floorRing);
  ringMats.push(floorRing.material);

  // Shaft motion streaks
  const strips = [];
  for (const side of [-1, 1]) {
    for (let j = 0; j < 8; j++) {
      const s = new T.Mesh(new T.BoxGeometry(0.04, 0.35, 0.9), neonGlow.clone());
      s.position.set(side * (r + 0.18), 0.4 + j * 0.45, -0.55);
      s.visible = false;
      cabin.add(s);
      strips.push(s);
    }
  }

  const light = new T.PointLight(CYAN, 0.85, 5.5, 2);
  light.position.set(0, height * 0.62, 0.2);
  light.castShadow = false;
  cabin.add(light);

  // Slim chrome lintel above aperture (does not replace leaves)
  const lintel = new T.Mesh(new T.BoxGeometry(width * 0.92, 0.07, 0.08), chrome);
  lintel.position.set(0, height - 0.02, frontZ);
  cabin.add(lintel);

  return {
    cabin,
    update(time, state, unlocked) {
      const travel = state === 'ELEVATOR_ASCENDING';
      const ei = unlocked ? 3.0 : 0.45;
      ringMats.forEach((m) => {
        if (m.emissiveIntensity != null) m.emissiveIntensity = ei;
      });
      light.intensity = unlocked ? 1.05 : 0.35;
      strips.forEach((o, j) => {
        o.visible = travel;
        if (travel) {
          o.position.y = 0.25 + ((((j * 0.45 - time * 1.6) % 3.2) + 3.2) % 3.2);
          o.material.opacity = 0.25 + 0.35 * Math.abs(Math.sin(time * 4 + j));
        }
      });
    },
  };
}

export function restyleElevatorMaterials(materials) {
  if (!r16Enabled()) return;
  const { dark, metal, glow } = materials;
  if (dark) {
    dark.color.set('#1a2030');
    dark.metalness = 0.8;
    dark.roughness = 0.28;
  }
  if (metal) {
    metal.color.set('#6a7480');
    metal.metalness = 0.9;
    metal.roughness = 0.18;
  }
  if (glow) {
    glow.color.set(CYAN);
    glow.emissive.set(CYAN);
    glow.emissiveIntensity = 1.35;
  }
}
