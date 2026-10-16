/**
 * R16 spherical reactor core — visual match to references/01-reactor.png.
 * Layered graphite orb, cyan energy channels, stabilizer beams, particles.
 * Flasks / fills / pipes remain owned by energyReactor.
 */
import * as T from 'room-module/vendor/three.module.js';
import { createGraphiteMaterial, r16Enabled } from './graphite-r16.js';

const CYAN = '#00e8d8';
const CYAN_HOT = '#7afff0';

export function attachReactorSphere(parent, { y = 1.9, radius = 0.55 } = {}) {
  if (!r16Enabled()) return null;
  const root = new T.Group();
  root.name = 'r16-reactor-sphere';
  root.position.y = y;
  parent.add(root);

  const shellMat = createGraphiteMaterial(CYAN, {
    color: 0x1a1f28,
    metalness: 0.95,
    roughness: 0.22,
    clearcoat: 0.55,
    clearcoatRoughness: 0.3,
    emissiveIntensity: 0.06,
  });
  const plateMat = createGraphiteMaterial(CYAN, {
    color: 0x2c3542,
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.6,
    emissiveIntensity: 0.1,
  });
  const rimMat = createGraphiteMaterial(CYAN, {
    color: 0x3d4a58,
    metalness: 0.9,
    roughness: 0.2,
    emissiveIntensity: 0.14,
  });
  const energy = new T.MeshStandardMaterial({
    color: CYAN_HOT,
    emissive: CYAN,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const energyGlow = new T.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const beamMat = new T.MeshBasicMaterial({
    color: CYAN_HOT,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });

  // Inner glowing core
  const inner = new T.Mesh(new T.SphereGeometry(radius * 0.42, 32, 24), energy);
  root.add(inner);
  const innerHalo = new T.Mesh(new T.SphereGeometry(radius * 0.52, 24, 16), energyGlow);
  root.add(innerHalo);

  // Semi-transparent outer shell so internal cyan + plates read clearly
  const outerMat = shellMat.clone();
  outerMat.transparent = true;
  outerMat.opacity = 0.55;
  outerMat.depthWrite = false;
  const outer = new T.Mesh(new T.SphereGeometry(radius, 48, 32), outerMat);
  outer.castShadow = true;
  root.add(outer);

  // Large mechanical plates (readable from gameplay distance)
  for (let band = 0; band < 4; band++) {
    const phi = -0.45 + band * 0.3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + band * 0.2;
      const plate = new T.Mesh(
        new T.BoxGeometry(radius * 0.55, radius * 0.18, radius * 0.1),
        plateMat,
      );
      const rr = radius * 1.02;
      plate.position.set(
        Math.cos(a) * Math.cos(phi) * rr,
        Math.sin(phi) * rr,
        Math.sin(a) * Math.cos(phi) * rr,
      );
      plate.lookAt(0, 0, 0);
      root.add(plate);
    }
  }
  // Wireframe cage for tech silhouette
  const cage = new T.Mesh(
    new T.IcosahedronGeometry(radius * 1.08, 1),
    new T.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 }),
  );
  root.add(cage);

  // Equatorial ring assemblies
  const rings = [];
  for (const [ry, rr, tube] of [
    [0, radius * 0.82, 0.028],
    [radius * 0.28, radius * 0.68, 0.02],
    [-radius * 0.28, radius * 0.68, 0.02],
    [radius * 0.48, radius * 0.48, 0.016],
    [-radius * 0.48, radius * 0.48, 0.016],
  ]) {
    const ring = new T.Mesh(new T.TorusGeometry(rr, tube, 12, 72), energy);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    root.add(ring);
    rings.push(ring);
    const glowRing = new T.Mesh(
      new T.TorusGeometry(rr, tube * 2.2, 8, 48),
      energyGlow.clone(),
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = ry;
    root.add(glowRing);
  }

  // Vertical energy pillar through poles
  const pillar = new T.Mesh(
    new T.CylinderGeometry(0.055, 0.055, radius * 2.8, 20),
    energyGlow.clone(),
  );
  pillar.material.opacity = 0.55;
  root.add(pillar);
  const pillarCore = new T.Mesh(
    new T.CylinderGeometry(0.022, 0.022, radius * 2.9, 12),
    energy,
  );
  root.add(pillarCore);

  // Polar containment rings (floor/ceiling feel inside flask volume)
  for (const sy of [-1, 1]) {
    const cap = new T.Mesh(new T.TorusGeometry(radius * 0.35, 0.025, 10, 40), rimMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = sy * radius * 1.05;
    root.add(cap);
    const disc = new T.Mesh(
      new T.CircleGeometry(radius * 0.22, 32),
      energyGlow.clone(),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = sy * radius * 1.08;
    root.add(disc);
  }

  // Central equatorial port / eye
  const eye = new T.Mesh(new T.SphereGeometry(radius * 0.14, 20, 16), energy);
  eye.position.set(radius * 0.88, 0.04, 0);
  root.add(eye);
  const eyeRim = new T.Mesh(new T.TorusGeometry(radius * 0.16, 0.02, 8, 32), rimMat);
  eyeRim.position.copy(eye.position);
  eyeRim.lookAt(0, 0, 0);
  root.add(eyeRim);

  // 4 stabilizer arms + beams (aligned with flask angles π/4 + n·π/2)
  const arms = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const group = new T.Group();
    const reach = radius * 1.65;
    group.position.set(Math.cos(a) * reach, 0, Math.sin(a) * reach);

    const base = new T.Mesh(new T.BoxGeometry(0.14, 0.14, radius * 0.55), plateMat);
    base.lookAt(0, 0, 0);
    group.add(base);
    const joint = new T.Mesh(new T.SphereGeometry(0.07, 12, 10), rimMat);
    group.add(joint);

    const beamLen = radius * 0.95;
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.03, 0.018, beamLen, 10),
      beamMat.clone(),
    );
    // Point beam toward center
    beam.position.set(
      -Math.cos(a) * beamLen * 0.45,
      0,
      -Math.sin(a) * beamLen * 0.45,
    );
    beam.lookAt(0, 0, 0);
    beam.rotateX(Math.PI / 2);
    group.add(beam);

    // Soft additive sprite plane along beam
    const streak = new T.Mesh(
      new T.PlaneGeometry(0.08, beamLen * 0.9),
      energyGlow.clone(),
    );
    streak.position.copy(beam.position);
    streak.lookAt(0, 0, 0);
    group.add(streak);

    root.add(group);
    arms.push({ group, beam, streak });
  }

  // Particle cloud
  const count = 96;
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = (Math.random() - 0.5) * Math.PI;
    const r = radius * (0.85 + Math.random() * 0.7);
    positions[i * 3] = Math.cos(u) * Math.cos(v) * r;
    positions[i * 3 + 1] = Math.sin(v) * r * 0.9;
    positions[i * 3 + 2] = Math.sin(u) * Math.cos(v) * r;
    seeds.push({ u, v, r, speed: 0.4 + Math.random() * 0.8 });
  }
  const pGeo = new T.BufferGeometry();
  pGeo.setAttribute('position', new T.BufferAttribute(positions, 3));
  const particles = new T.Points(
    pGeo,
    new T.PointsMaterial({
      color: CYAN_HOT,
      size: 0.04,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: T.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  root.add(particles);

  const glow = new T.PointLight(CYAN, 0.85, 6, 2);
  glow.castShadow = false;
  root.add(glow);

  let pulse = 0;
  return {
    root,
    get rotation() {
      return root.rotation;
    },
    update(dt, fillLevels = []) {
      pulse += dt;
      const filled = fillLevels.reduce((n, v) => n + (v > 0.5 ? 1 : 0), 0);
      const mean = fillLevels.reduce((s, v) => s + v, 0) / Math.max(1, fillLevels.length);
      const boost = 0.7 + filled * 0.45 + mean * 0.5;
      energy.emissiveIntensity = 1.6 + boost * (0.6 + 0.4 * Math.sin(pulse * 2.4));
      glow.intensity = 0.45 + filled * 0.28 + 0.12 * Math.sin(pulse * 3);
      inner.scale.setScalar(0.95 + 0.06 * Math.sin(pulse * 2));
      rings.forEach((r, i) => {
        r.rotation.z = pulse * (0.4 + i * 0.1);
      });
      particles.rotation.y = pulse * 0.2;
      // Drift particles slightly
      const attr = particles.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        s.u += dt * s.speed * 0.35;
        attr.setXYZ(
          i,
          Math.cos(s.u) * Math.cos(s.v) * s.r,
          Math.sin(s.v) * s.r * 0.9 + Math.sin(pulse + i) * 0.02,
          Math.sin(s.u) * Math.cos(s.v) * s.r,
        );
      }
      attr.needsUpdate = true;
      arms.forEach((a, i) => {
        const on = (fillLevels[i] ?? 0) > 0.12;
        a.beam.material.opacity = on ? 0.7 : 0.18;
        a.streak.material.opacity = on ? 0.35 : 0.08;
      });
    },
    reset() {
      pulse = 0;
      energy.emissiveIntensity = 2.2;
      glow.intensity = 0.85;
    },
  };
}
