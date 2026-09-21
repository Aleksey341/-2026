import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import fs from 'fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function isSkin(h, s, l, r, g, b) {
  if (s < 0.07) return false;
  if (l < 0.28 || l > 0.93) return false;
  return r > g && g >= b * 0.8 && h >= 5 && h <= 55 && s < 0.58;
}

function isHair(h, s, l) {
  return l < 0.3 && s < 0.5 && !(h > 200 && h < 280 && s > 0.2);
}

function isLip(h, s, l) {
  return h >= 340 || h <= 20 && s > 0.2 && l > 0.35 && l < 0.75;
}

function recolorWhiteSuit(r, g, b, a) {
  if (a < 8) return [r, g, b, a];
  const [h, s, l] = rgbToHsl(r, g, b);
  if (isSkin(h, s, l, r, g, b) || isHair(h, s, l) || isLip(h, s, l)) return [r, g, b, a];

  // Nearly neutral bright fabric → crisp blouse (small share)
  const neutral = s < 0.16;
  if (neutral && l > 0.88) {
    const [nr, ng, nb] = hslToRgb(40, 0.04, Math.min(0.95, l));
    return [nr, ng, nb, a];
  }

  // Main white / light clothing islands → dark navy suit
  if (neutral && l > 0.35) {
    // Preserve fold shading via original lightness
    const nl = 0.14 + (1 - Math.min(1, (l - 0.35) / 0.55)) * 0.16;
    const [nr, ng, nb] = hslToRgb(222, 0.38, nl);
    return [nr, ng, nb, a];
  }

  // Mid grey clothing details
  if (neutral && l >= 0.18 && l <= 0.35) {
    const [nr, ng, nb] = hslToRgb(225, 0.32, Math.max(0.1, l * 0.7));
    return [nr, ng, nb, a];
  }

  return [r, g, b, a];
}

function recolorPurpleSuit(r, g, b, a) {
  if (a < 8) return [r, g, b, a];
  const [h, s, l] = rgbToHsl(r, g, b);
  if (isSkin(h, s, l, r, g, b) || isHair(h, s, l) || isLip(h, s, l)) return [r, g, b, a];

  const purple =
    (h >= 235 && h <= 325 && s > 0.1 && l > 0.08 && l < 0.88) ||
    (h >= 210 && h <= 280 && s > 0.08 && l > 0.12 && l < 0.78);

  if (purple) {
    const nl = Math.max(0.1, Math.min(0.34, l * 0.5 + 0.07));
    const [nr, ng, nb] = hslToRgb(222, 0.4, nl);
    return [nr, ng, nb, a];
  }

  // Dark bottoms → charcoal navy
  if (s < 0.22 && l < 0.38 && l > 0.05) {
    const [nr, ng, nb] = hslToRgb(225, 0.3, Math.max(0.09, l * 0.85));
    return [nr, ng, nb, a];
  }

  // Light trim → white blouse/shirt
  if (s < 0.18 && l > 0.7) {
    const [nr, ng, nb] = hslToRgb(40, 0.04, Math.min(0.94, l));
    return [nr, ng, nb, a];
  }

  return [r, g, b, a];
}

async function processGlb(inputPath, outputPath, mode, previewPath) {
  const document = await io.read(inputPath);
  let touched = 0;
  for (const texture of document.getRoot().listTextures()) {
    const name = (texture.getName() || '').toLowerCase();
    if (name.includes('normal') || name.includes('metallic') || name.includes('roughness')) continue;
    const image = texture.getImage();
    if (!image) continue;

    const { data, info } = await sharp(Buffer.from(image)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const fn = mode === 'white' ? recolorWhiteSuit : recolorPurpleSuit;
    for (let i = 0; i < data.length; i += channels) {
      const [nr, ng, nb, na] = fn(data[i], data[i + 1], data[i + 2], data[i + 3]);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb; data[i + 3] = na;
    }
    const png = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
    texture.setImage(png);
    texture.setMimeType('image/png');
    if (previewPath) await fs.promises.writeFile(previewPath, png);
    touched++;
  }
  await io.write(outputPath, document);
  console.log(`Wrote ${outputPath} (textures: ${touched})`);
}

await processGlb('assets/models/_backup/heroine-purple-walk.glb', 'assets/models/heroine-purple-walk.glb', 'purple', 'assets/textures/hero/purple-suit-preview.png');
await processGlb('assets/models/_backup/heroine-white-walk.glb', 'assets/models/heroine-white-walk.glb', 'white', 'assets/textures/hero/white-suit-preview.png');
console.log('done');
