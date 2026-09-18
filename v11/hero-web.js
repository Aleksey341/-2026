import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const CHARACTER_VERSION = '1120';
const PARTS = [
  '0','1','2',
  'g00','g01','g02','g03','g04','g05','g06','g07','g08','g09',
  '4b','5a','5b','6a','6b'
].map(name => `./assets/business_woman_character.glb.gz.b64.${name}?v=${CHARACTER_VERSION}`);

async function fetchCharacterBuffer() {
  const chunks = await Promise.all(PARTS.map(async url => {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Не загружена часть модели: ${url} (${response.status})`);
    return (await response.text()).trim();
  }));

  const encoded = chunks.join('');
  if (encoded.length !== 70376) throw new Error(`Повреждён пакет модели: ${encoded.length}/70376`);

  const binary = atob(encoded);
  const packed = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i);

  if ('DecompressionStream' in window) {
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }

  const { ungzip } = await import('https://cdn.jsdelivr.net/npm/pako@2.1.0/+esm');
  const unpacked = ungzip(packed);
  return unpacked.buffer.slice(unpacked.byteOffset, unpacked.byteOffset + unpacked.byteLength);
}

async function parseGLB(buffer) {
  const loader = new GLTFLoader();
  return await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
}

export async function createHero() {
  const buffer = await fetchCharacterBuffer();
  const gltf = await parseGLB(buffer);

  const model = new T.Group();
  model.name = 'RT-Business-Woman-v112';
  model.userData.forwardAxis = '-Z';

  const fit = new T.Group();
  const heading = new T.Group();
  const upright = new T.Group();
  model.add(fit);
  fit.add(heading);
  heading.add(upright);
  upright.add(gltf.scene);

  // Source asset: Z-up, front = -Y. Convert to Three.js Y-up and face -Z.
  upright.rotation.x = -Math.PI / 2;
  heading.rotation.y = Math.PI;

  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.geometry && !object.geometry.getAttribute('normal')) object.geometry.computeVertexNormals();
    if (object.material) {
      object.material = object.material.clone();
      if ('roughness' in object.material) object.material.roughness = Math.max(.48, object.material.roughness ?? .65);
      object.material.needsUpdate = true;
    }
  });

  model.updateMatrixWorld(true);
  let bounds = new T.Box3().setFromObject(model);
  const size = new T.Vector3();
  bounds.getSize(size);
  const scale = size.y > .001 ? 1.69 / size.y : 1;
  fit.scale.setScalar(scale);

  model.updateMatrixWorld(true);
  bounds = new T.Box3().setFromObject(model);
  const center = bounds.getCenter(new T.Vector3());
  fit.position.x -= center.x;
  fit.position.z -= center.z;
  fit.position.y -= bounds.min.y;

  model.updateMatrixWorld(true);
  bounds = new T.Box3().setFromObject(model);
  const finalSize = bounds.getSize(new T.Vector3());
  model.userData.characterHeight = finalSize.y;
  model.userData.source = 'business_woman_character.glb';
  model.userData.staticAsset = true;

  const head = new T.Group();
  head.position.set(0, 1.54, -.04);
  model.add(head);

  const hand = new T.Group();
  hand.position.set(-.31, 1.05, -.05);
  model.add(hand);

  let lastError = 0;
  function update() {
    // The supplied GLB is static. Movement is handled by the player controller.
  }
  function touch(worldTarget) {
    model.updateWorldMatrix(true, true);
    lastError = hand.getWorldPosition(new T.Vector3()).distanceTo(worldTarget);
  }

  return {
    model,
    head,
    hand,
    update,
    touch,
    contactError: () => lastError,
    skeleton: null,
    sourceAnimations: gltf.animations || []
  };
}
