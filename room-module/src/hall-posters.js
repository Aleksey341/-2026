/**
 * Framed Soviet-era posters for the reactor hall walls.
 * All frames share one material set so the gallery reads as a single style.
 */
import * as T from 'room-module/vendor/three.module.js';
import { assetURL } from 'room-module/src/assets.js';

const POSTER_PATHS = [
  'assets/textures/hall-posters/01-goals.png',
  'assets/textures/hall-posters/02-rabotnitsa.png',
  'assets/textures/hall-posters/03-plan.png',
  'assets/textures/hall-posters/04-economy.png',
  'assets/textures/hall-posters/05-factory.png',
];

function makeFrameMaterials() {
  return {
    outer: new T.MeshStandardMaterial({
      color: 0x1a1612,
      roughness: 0.48,
      metalness: 0.42,
    }),
    lip: new T.MeshStandardMaterial({
      color: 0xa58b54,
      roughness: 0.32,
      metalness: 0.78,
    }),
    mat: new T.MeshStandardMaterial({
      color: 0x0c0c0e,
      roughness: 0.85,
      metalness: 0.08,
    }),
  };
}

function framedPoster(tex, mats) {
  const img = tex.image;
  const aspect = (img?.width || 2) / (img?.height || 3);
  // +60% vs first gallery size (1.72 / 1.18)
  const maxH = 1.72 * 1.6;
  const maxW = 1.18 * 1.6;
  let h = maxH;
  let w = h * aspect;
  if (w > maxW) {
    w = maxW;
    h = w / aspect;
  }

  const root = new T.Group();
  root.name = 'hall-poster';

  const frameT = 0.055;
  const frameD = 0.07;
  const lipT = 0.018;
  const matPad = 0.04;

  // Outer frame rails (identical profile for every poster)
  const ow = w + frameT * 2 + matPad * 2;
  const oh = h + frameT * 2 + matPad * 2;
  const rails = [
    [ow, frameT, frameD, 0, oh / 2 - frameT / 2, 0],
    [ow, frameT, frameD, 0, -(oh / 2 - frameT / 2), 0],
    [frameT, oh - frameT * 2, frameD, ow / 2 - frameT / 2, 0, 0],
    [frameT, oh - frameT * 2, frameD, -(ow / 2 - frameT / 2), 0, 0],
  ];
  for (const [rw, rh, rd, x, y, z] of rails) {
    const rail = new T.Mesh(new T.BoxGeometry(rw, rh, rd), mats.outer);
    rail.position.set(x, y, z);
    rail.castShadow = true;
    root.add(rail);
  }

  // Brass inner lip
  const iw = w + matPad * 2 + lipT;
  const ih = h + matPad * 2 + lipT;
  const lips = [
    [iw, lipT, 0.02, 0, ih / 2 - lipT / 2, frameD * 0.22],
    [iw, lipT, 0.02, 0, -(ih / 2 - lipT / 2), frameD * 0.22],
    [lipT, ih - lipT * 2, 0.02, iw / 2 - lipT / 2, 0, frameD * 0.22],
    [lipT, ih - lipT * 2, 0.02, -(iw / 2 - lipT / 2), 0, frameD * 0.22],
  ];
  for (const [lw, lh, ld, x, y, z] of lips) {
    const lip = new T.Mesh(new T.BoxGeometry(lw, lh, ld), mats.lip);
    lip.position.set(x, y, z);
    root.add(lip);
  }

  // Dark mat board
  const matBoard = new T.Mesh(
    new T.PlaneGeometry(w + matPad * 2, h + matPad * 2),
    mats.mat,
  );
  matBoard.position.z = frameD * 0.12;
  root.add(matBoard);

  // Artwork
  const art = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshStandardMaterial({
      map: tex,
      roughness: 0.72,
      metalness: 0.05,
      emissive: 0x222018,
      emissiveIntensity: 0.12,
      emissiveMap: tex,
    }),
  );
  art.position.z = frameD * 0.2;
  root.add(art);

  return root;
}

/**
 * Hang five matching framed posters:
 * — opposite the lift (left wall, facing +X)
 * — to the left of the lift when facing it (front wall, toward the lift corner)
 */
export async function hangHallPosters(group, { width: W, depth: D, height: H, centerZ: Z, gateZ }) {
  const mats = makeFrameMaterials();
  const loader = new T.TextureLoader();
  const wall = 0.17;
  const liftZ = gateZ ?? Z + 3;
  // Tall frames: keep clear of floor/ceiling
  const y = Math.min(2.7, H * 0.55);

  const placements = [
    // Opposite the elevator — left wall; +Z is left when facing the wall, so "правее" = lower z
    { x: -W / 2 + wall, y, z: liftZ - 3.4, ry: Math.PI / 2 },
    { x: -W / 2 + wall, y, z: liftZ - 0.6, ry: Math.PI / 2 },
    { x: -W / 2 + wall, y, z: liftZ + 2.2, ry: Math.PI / 2 },
    // Left of the elevator (facing the lift) — front wall, clear of wall trim / lift corner
    { x: W / 2 - 3.3, y, z: Z + D / 2 - wall, ry: Math.PI },
    { x: W / 2 - 1.05, y, z: Z + D / 2 - wall, ry: Math.PI },
  ];

  const gallery = new T.Group();
  gallery.name = 'hall-poster-gallery';
  group.add(gallery);

  await Promise.all(
    POSTER_PATHS.map(async (path, i) => {
      const tex = await loader.loadAsync(assetURL(path));
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 4;
      const frame = framedPoster(tex, mats);
      const p = placements[i];
      frame.position.set(p.x, p.y, p.z);
      frame.rotation.y = p.ry;
      gallery.add(frame);
    }),
  );

  return gallery;
}
