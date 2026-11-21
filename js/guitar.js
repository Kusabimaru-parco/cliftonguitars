// Procedural stock acoustic guitar (stand-in until real Blender models exist).
// Units are meters. Guitar stands upright: tail at y = 0, headstock up (+y), top faces +z.
import * as THREE from 'three';
import { drawFitted } from './logo.js';

// ---------------------------------------------------------------- helpers
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw, { srgb = true, wrap = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Grain runs vertically in the canvas (texture v / world y).
function drawGrain(g, w, h, { base, dark, light, lines = 200, wobble = 5, alpha = 0.25, seed = 1, flame = 0, ribbon = false }) {
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  if (ribbon) { // ribbon-stripe figure: broad alternating light/dark bands along the grain
    for (let x = 0; x < w;) {
      const bw = 8 + r() * 34;
      g.globalAlpha = 0.07 + r() * 0.08;
      g.fillStyle = r() < 0.5 ? light : dark;
      g.fillRect(x, 0, bw, h);
      x += bw;
    }
    g.globalAlpha = 1;
  }
  for (let i = 0; i < lines; i++) {
    const x0 = r() * w;
    g.strokeStyle = r() < 0.65 ? dark : light;
    g.globalAlpha = alpha * (0.3 + r() * 0.7);
    g.lineWidth = 0.6 + r() * 2.4;
    const ph = r() * 6.28, fr = 0.003 + r() * 0.005;
    g.beginPath();
    for (let y = 0; y <= h; y += 6) {
      const x = x0 + Math.sin(y * fr + ph) * wobble + Math.sin(y * fr * 3.7 + ph * 2) * wobble * 0.25;
      y === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  // subtle cross-grain shimmer (silking / medullary rays)
  for (let i = 0; i < flame; i++) {
    g.globalAlpha = 0.04 + r() * 0.05;
    g.fillStyle = r() < 0.5 ? light : dark;
    g.fillRect(r() * w, r() * h, 6 + r() * 30, 1 + r() * 2);
  }
  g.globalAlpha = 1;
}

const WOODS = {
  spruce: { base: '#e7c690', dark: '#b88a4c', light: '#f6e2b5', lines: 260, wobble: 3, alpha: 0.32, seed: 7, flame: 400 },
  aged: { base: '#d9a85e', dark: '#9c6a2c', light: '#ecc785', lines: 260, wobble: 3, alpha: 0.3, seed: 7, flame: 400 },
  mahogany: { base: '#6e3518', dark: '#3c1a0a', light: '#8c4a24', lines: 220, wobble: 9, alpha: 0.35, seed: 11, flame: 120 },
  rosewood: { base: '#2e1a12', dark: '#120905', light: '#55301d', lines: 260, wobble: 7, alpha: 0.45, seed: 3, flame: 60 },
  black: { base: '#0b0b0c', dark: '#000000', light: '#1a1a1c', lines: 60, wobble: 4, alpha: 0.2, seed: 5, flame: 0 },
  // A1: solid Sitka spruce under satin — warm tan with wide, straight grain (from the A1 video)
  // (colours taken from the white-background product photos, not the red-lit video)
  spruceA1: { base: '#dcbd86', dark: '#b48c52', light: '#eed8ae', lines: 300, wobble: 2, alpha: 0.3, seed: 21, flame: 300 },
  // A1: laminated sapele — warm mid-brown with straight ribbon stripe
  sapele: { base: '#7d5233', dark: '#54331b', light: '#9c7050', lines: 260, wobble: 3, alpha: 0.36, seed: 17, flame: 80, ribbon: true },
  // A1 neck + back of headstock: warm orange-brown satin (owner's side-frets video; species not listed)
  neckA1: { base: '#b07a48', dark: '#86552c', light: '#c99566', lines: 200, wobble: 3, alpha: 0.3, seed: 29, flame: 60 },
  // A1 headstock face: reddish-brown rosewood veneer with dark streaks (owner's headstock photo)
  rosewoodFace: { base: '#4e2718', dark: '#22100a', light: '#76412a', lines: 140, wobble: 6, alpha: 0.5, seed: 33, flame: 40 },
  // A1 interior lining / braces: pale spruce-like strips (owner's soundhole photo)
  lining: { base: '#d6b98a', dark: '#b2925e', light: '#e8d3aa', lines: 80, wobble: 2, alpha: 0.3, seed: 41, flame: 0 },
};

const texCache = {};
function wood(name, repeatX = 6, repeatY = 2) {
  const key = `${name}:${repeatX}:${repeatY}`;
  if (!texCache[key]) {
    const t = canvasTexture(1024, 1024, (g, w, h) => drawGrain(g, w, h, WOODS[name]));
    t.repeat.set(repeatX, repeatY);
    texCache[key] = t;
  }
  return texCache[key];
}

// ---------------------------------------------------------------- body profiles
// Right half of the body outline, tail (0,0) to neck joint (0, length). [halfWidth, y]
export const PROFILES = {
  dreadnought: {
    length: 0.508, depth: 0.115, soundhole: { y: 0.355, r: 0.05 }, pickguardScale: 1,
    pts: [[0, 0], [0.06, 0.006], [0.12, 0.025], [0.165, 0.06], [0.19, 0.11], [0.197, 0.16], [0.19, 0.21],
      [0.168, 0.26], [0.142, 0.3], [0.139, 0.325], [0.145, 0.365], [0.148, 0.405], [0.144, 0.442],
      [0.128, 0.476], [0.095, 0.498], [0.045, 0.507], [0, 0.508]],
  },
  auditorium: {
    length: 0.495, depth: 0.105, soundhole: { y: 0.345, r: 0.049 }, pickguardScale: 0.82,
    pts: [[0, 0], [0.07, 0.007], [0.13, 0.03], [0.172, 0.07], [0.19, 0.12], [0.188, 0.17], [0.17, 0.22],
      [0.14, 0.262], [0.121, 0.297], [0.122, 0.322], [0.137, 0.362], [0.1425, 0.398], [0.135, 0.432],
      [0.112, 0.466], [0.075, 0.487], [0.035, 0.495], [0, 0.495]],
  },

  // Clifton A1 Grand Orchestra — from the owner's measurements, Clifton's Shopee listing and the A1 video.
  // Lower bout 405, waist 245 @300, upper bout 295, body 505, depth 118 tail → 98 neck, scale 648 (mm).
  // Outline traced from reference/A1 GO front.png (white-background product shot), scaled so the body
  // is 505 mm long; widths agree with the measured 405 / 245 / 295 mm to within ~2%.
  grandOrchestra: {
    length: 0.505, depth: 0.118, depthNeck: 0.098, soundhole: { y: 0.352, r: 0.047 }, fbToSoundhole: true,
    scale: 0.648, frets: 20, nutW: 0.043, fbW12: 0.054, dots: [3, 5, 7, 9, 12, 15, 17],
    binding: 'strip', pickguard: false, rosette: false, satin: true,  // cream strip binding (owner's request), plain soundhole, satin
    bridge: 'belly', tuners: 'black', headstock: 'a1', headFace: 'rosewoodFace', topWood: 'spruceA1',
    pinDots: false, interior: 'a1', labelStyle: 'a1',
    finishes: { natural: { top: 'natural', body: 'sapele', neck: 'neckA1' } },
    // bass side (mirrored to the left)
    pts: [[0, 0], [0.079, 0.011], [0.11, 0.023], [0.129, 0.034], [0.145, 0.046], [0.168, 0.069], [0.184, 0.091],
      [0.193, 0.114], [0.2, 0.137], [0.2025, 0.16], [0.2, 0.183], [0.194, 0.206], [0.184, 0.229], [0.17, 0.252],
      [0.151, 0.274], [0.13, 0.297], [0.122, 0.32], [0.122, 0.332], [0.126, 0.343], [0.135, 0.366], [0.144, 0.389],
      [0.148, 0.412], [0.147, 0.434], [0.137, 0.457], [0.115, 0.48], [0.093, 0.492], [0.04, 0.502], [0, 0.505]],
    // treble side: rounded (Venetian) cutaway — horn top at ~0.43, meets the neck at ~0.46
    ptsTreble: [[0, 0], [0.079, 0.011], [0.11, 0.023], [0.129, 0.034], [0.145, 0.046], [0.168, 0.069], [0.184, 0.091],
      [0.193, 0.114], [0.2, 0.137], [0.2025, 0.16], [0.201, 0.183], [0.196, 0.206], [0.187, 0.229], [0.171, 0.252],
      [0.152, 0.274], [0.133, 0.297], [0.122, 0.32], [0.118, 0.332], [0.12, 0.354], [0.126, 0.377], [0.13, 0.4],
      [0.127, 0.416], [0.115, 0.427], [0.092, 0.432], [0.07, 0.435], [0.046, 0.445], [0.036, 0.455], [0.0305, 0.468],
      // the cutaway wall runs straight up the side of the heel (≥ the 27.5 mm half-width of the neck there),
      // so the heel buried in the body never pokes through it
      [0.0292, 0.484], [0.029, 0.497], [0.0278, 0.5035], [0.02, 0.5048], [0, 0.505]],
  },
};

function outline(profile, n = 300) {
  const right = profile.ptsTreble ?? profile.pts;   // +x = treble side (cutaway side on the A1)
  const left = profile.pts;
  const all = right.map(([x, y]) => new THREE.Vector3(x, y, 0));
  for (let i = left.length - 2; i >= 1; i--) all.push(new THREE.Vector3(-left[i][0], left[i][1], 0));
  const curve = new THREE.CatmullRomCurve3(all, true, 'centripetal');
  return curve.getSpacedPoints(n).slice(0, n).map((p) => new THREE.Vector2(p.x, p.y));
}

function offsetInward(pts, d) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    const outward = new THREE.Vector2(t.y, -t.x); // CCW outline
    return p.clone().addScaledVector(outward, -d);
  });
}

function cylinderBetween(a, b, radius, material, radial = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, radial, 1, true);
  const m = new THREE.Mesh(geo, material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// ---------------------------------------------------------------- textures (one-off)
function rosetteTexture() {
  return canvasTexture(1024, 1024, (g, w) => {
    const c = w / 2, R = w / 2; // R ↔ outer radius
    const ring = (r0, r1, style) => {
      g.beginPath(); g.arc(c, c, r1 * R, 0, Math.PI * 2); g.arc(c, c, r0 * R, 0, Math.PI * 2, true);
      g.fillStyle = style; g.fill('evenodd');
    };
    const inner = 0.053 / 0.069; // normalized inner radius
    ring(inner, 1, '#120a06');
    ring(inner + 0.02, inner + 0.03, '#efe6d2');
    ring(inner + 0.04, 0.955, '#0e0907');
    // abalone band
    const r = rng(42), a0 = inner + 0.07, a1 = 0.9;
    for (let i = 0; i < 2600; i++) {
      const ang = r() * Math.PI * 2, rad = (a0 + r() * (a1 - a0)) * R;
      const hue = [170, 190, 260, 300, 120, 40][Math.floor(r() * 6)];
      g.fillStyle = `hsla(${hue}, ${50 + r() * 40}%, ${35 + r() * 40}%, 0.9)`;
      g.save(); g.translate(c + Math.cos(ang) * rad, c + Math.sin(ang) * rad); g.rotate(ang + r());
      g.fillRect(-6, -3, 6 + r() * 16, 3 + r() * 6); g.restore();
    }
    ring(a0 - 0.012, a0, '#efe6d2');
    ring(a1, a1 + 0.012, '#efe6d2');
    ring(0.97, 0.985, '#efe6d2');
  }, { wrap: false });
}

function tortoiseTexture() {
  const t = canvasTexture(512, 512, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = '#1d0c05'; g.fillRect(0, 0, w, h);
    g.filter = 'blur(6px)';
    for (let i = 0; i < 220; i++) {
      g.fillStyle = ['#5a2a0c', '#7a3a10', '#a35a1c', '#2b1206'][Math.floor(r() * 4)];
      g.globalAlpha = 0.35 + r() * 0.5;
      g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 30, 3 + r() * 12, r() * 3, 0, Math.PI * 2); g.fill();
    }
    g.filter = 'none'; g.globalAlpha = 1;
  });
  t.repeat.set(9, 9);
  return t;
}

function logoTexture(text, image) {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (image) return drawFitted(g, image, 8, 8, w - 16, h - 16);
    g.fillStyle = '#fdb83f';
    g.font = '190px "Pinyon Script", "Great Vibes", Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 8);
  }, { wrap: false });
}

// Box with softly rounded vertical edges (tuner housings) — an extruded rounded rectangle, bevelled.
function RoundedBoxGeometryLite(w, h, d, r) {
  const s = new THREE.Shape();
  const x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y);
  s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  s.lineTo(-x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y);
  s.lineTo(-w / 2, -y); s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0006, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 0.002) / 2);
  return g;
}

// ---------------------------------------------------------------- A1 bridge (owner's SVG)
// Outline copied verbatim from reference/Bridge.svg (viewBox in mm; x 90 = centreline; top edge at
// y 10.56, belly bottom 49.44, wing tips to x 11.3–168.7). The SVG doesn't mark the saddle, so the
// saddle centre line is placed 5.7 mm below the top edge (owner's bridge photo) → SVG y 16.26.
const A1_BRIDGE_PATH = 'M 90.00,10.56 C 119.59,10.56 144.95,11.40 166.51,11.51 C 169.78,17.95 169.47,29.58 165.35,37.29 C 160.80,35.07 154.46,34.54 147.59,35.71 C 134.38,38.03 117.48,49.44 90.00,49.44 C 62.52,49.44 45.62,38.03 32.41,35.71 C 25.54,34.54 19.20,35.07 14.65,37.29 C 10.53,29.58 10.22,17.95 13.49,11.51 C 35.05,11.40 60.41,10.56 90.00,10.56 Z';
const A1_BRIDGE_SADDLE_Y = 16.26;
function createCliftonBridgeShape() {
  const shape = new THREE.Shape();
  applySvgPath(shape, A1_BRIDGE_PATH, { cx: 90, nutY: A1_BRIDGE_SADDLE_Y });   // origin = saddle centre, +y toward the neck
  return shape;
}
// Pins (owner's photo): straight row 14.5 mm below the saddle centre, 10.6 mm apart
const CLIFTON_PINS_MM = [-26.5, -15.9, -5.3, 5.3, 15.9, 26.5].map((x, i) => ({ pin: i + 1, x, y: -14.5 }));
// Raised wing faces: narrow in straight lines from the centre block (x ±41.5) to the wing ends, kept
// inside the SVG outline (top edge ≈ +5.4 there, belly ≈ −24.5; wing tips ≈ +4.8 / −21).
const WING_FACE = { x0: 41.5, top0: 5.2, bot0: -21.5, x1: 74.5, top1: 1.0, bot1: -16.0 };

// ---------------------------------------------------------------- SVG outlines
// A1 headstock outline, copied verbatim from reference/headstock-shape.svg (units: mm).
const A1_HEADSTOCK_PATH = 'M 71.50,165.00 C 72.09,147.15 80.17,135.26 86.37,127.18 C 87.05,126.08 86.88,125.23 86.03,123.78 C 79.32,91.92 72.52,56.23 71.50,21.81 C 66.15,17.56 58.92,12.72 50.00,12.72 C 41.08,12.72 33.85,17.56 28.50,21.81 C 27.48,56.23 20.68,91.92 13.97,123.78 C 13.12,125.23 12.95,126.08 13.63,127.18 C 19.83,135.26 27.91,147.15 28.50,165.00 Z';

// Replays an SVG path (absolute M / L / C / Q / Z) into a THREE.Shape. SVG y grows downward and is
// in mm; the shape is in metres with +y running from the nut toward the tip.
function applySvgPath(shape, d, { cx = 0, nutY = 0 } = {}) {
  const P = (x, y) => [(x - cx) / 1000, (nutY - y) / 1000];
  const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  let i = 0, cmd = null;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLCQZ]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === 'M') { shape.moveTo(...P(num(), num())); cmd = 'L'; }
    else if (cmd === 'L') shape.lineTo(...P(num(), num()));
    else if (cmd === 'C') shape.bezierCurveTo(...P(num(), num()), ...P(num(), num()), ...P(num(), num()));
    else if (cmd === 'Q') shape.quadraticCurveTo(...P(num(), num()), ...P(num(), num()));
    else if (cmd === 'Z') { shape.closePath(); break; }
  }
}

// Half-width of a (left-right symmetric) shape at height y, sampled from its outline.
function halfWidthFromShape(shape) {
  const pts = shape.getSpacedPoints(400).filter((p) => p.x >= 0).sort((a, b) => a.y - b.y);
  return (y) => {
    let best = 0;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      if ((y >= a.y && y <= b.y) || (y >= b.y && y <= a.y)) {
        const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
        best = Math.max(best, a.x + (b.x - a.x) * t);
      }
    }
    return best;
  };
}

// Just the "Clifton" half of the wordmark (the A1 headstock reads "Clifton" only)
function cliftonOnlyTexture(text, image) {
  return canvasTexture(512, 350, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (image) {
      const c = document.createElement('canvas');
      c.width = Math.round(image.width * 0.47); c.height = image.height;
      c.getContext('2d').drawImage(image, 0, 0);
      drawFitted(g, tinted(c, '#d9b25a'), 6, 6, w - 12, h - 12);   // gold leaf, a touch softer than UI gold
    } else {
      g.fillStyle = '#d9b25a'; g.font = '200px "Pinyon Script", Georgia, serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2);
    }
  }, { wrap: false });
}

// recolour a (gold, transparent) wordmark canvas to any ink colour
function tinted(image, color) {
  const c = document.createElement('canvas');
  c.width = image.width; c.height = image.height;
  const g = c.getContext('2d');
  g.drawImage(image, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// The A1's real label (owner's photo): cream paper, navy double border, navy script wordmark,
// "Model : A-1 GO", "No frills, just tone", "Designed in the Philippines".
function a1LabelTexture(image) {
  return canvasTexture(768, 512, (g, w, h) => {
    g.fillStyle = '#e6cf9e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a3346';
    g.lineWidth = 6; g.strokeRect(22, 22, w - 44, h - 44);
    g.lineWidth = 2; g.strokeRect(36, 36, w - 72, h - 72);
    if (image) drawFitted(g, tinted(image, '#2a3346'), 110, 70, w - 220, 170);
    else { g.fillStyle = '#2a3346'; g.font = '110px "Pinyon Script", Georgia, serif'; g.textAlign = 'center'; g.fillText('Clifton Guitars', w / 2, 190); }
    g.textAlign = 'center';
    g.fillStyle = '#5a4a62'; g.font = '500 48px "Archivo", sans-serif'; g.fillText('Model : A-1 GO', w / 2, 300);
    g.fillStyle = '#3c3a40'; g.font = '400 26px "Archivo", sans-serif'; g.fillText('No frills, just tone', w / 2, 360);
    g.fillStyle = '#2a3346'; g.font = '700 28px "Archivo", sans-serif'; g.fillText('Designed in the Philippines', w / 2, 412);
  }, { wrap: false });
}

function labelTexture(text, image, line = 'HANDCRAFTED · DEMO MODEL') {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = image ? '#1c1714' : '#8c7a58'; g.fillRect(0, 0, w, h);   // shaded label (sits in the dark body)
    g.strokeStyle = image ? '#8a6a2a' : '#4a3b22'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = image ? '#c9a45a' : '#2a1e0e'; g.textAlign = 'center';
    if (image) drawFitted(g, image, 60, 34, w - 120, 120);
    else { g.font = '96px "Pinyon Script", Georgia, serif'; g.fillText(`${text} Guitars`, w / 2, 120); }
    g.font = '600 26px "Archivo", sans-serif'; g.fillText(line, w / 2, 190);
  }, { wrap: false });
}

// Top texture covers the body bounding box exactly so a sunburst can follow the outline.
function topTexture(profile, pts, finish) {
  const W = 0.42, L = profile.length;
  const t = canvasTexture(1024, Math.round(1024 * (L / W)), (g, w, h) => {
    if (finish === 'black') { g.fillStyle = '#0a0a0b'; g.fillRect(0, 0, w, h); return; }
    drawGrain(g, w, h, { ...WOODS[finish === 'vintage' ? 'aged' : (profile.topWood ?? 'spruce')], lines: 340 });
    if (finish === 'sunburst' || finish === 'vintage') {
      const px = (p) => [(p.x / W + 0.5) * w, (1 - p.y / L) * h];
      g.save();
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...px(p)) : g.moveTo(...px(p)))); g.closePath();
      g.clip();
      const passes = finish === 'sunburst'
        ? [[150, 'rgba(120,45,10,0.55)', 40], [70, 'rgba(45,14,4,0.85)', 22], [26, 'rgba(12,4,1,0.95)', 8]]
        : [[90, 'rgba(110,55,15,0.35)', 30]];
      for (const [lw, col, blur] of passes) {
        g.filter = `blur(${blur}px)`; g.strokeStyle = col; g.lineWidth = lw; g.stroke();
      }
      g.restore(); g.filter = 'none';
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1 / W, 1 / L);
  t.offset.set(0.5, 0);
  return t;
}

// ---------------------------------------------------------------- builder
export function buildGuitar({ profile: profileName = 'dreadnought', logo = 'Clifton', logoImage = null, finish = 'natural' } = {}) {
  const P = PROFILES[profileName];
  const D = P.depth, DN = P.depthNeck ?? P.depth, L = P.length, SH = P.soundhole;
  const depthAt = (y) => THREE.MathUtils.lerp(D, DN, THREE.MathUtils.clamp(y / L, 0, 1)); // body tapers toward the neck
  const scale = P.scale ?? 0.645;
  const joinY = L;                                   // neck meets body at the 14th fret
  const nutY = joinY + scale * (1 - Math.pow(2, -14 / 12));
  const saddleY = nutY - scale;
  const fretY = (n) => nutY - scale * (1 - Math.pow(2, -n / 12));
  const rosetteOuter = 0.069;
  const fbEnd = P.fbToSoundhole ? SH.y + SH.r - 0.003            // A1: fretboard runs to the soundhole edge
    : P.frets ? fretY(P.frets) - 0.006 : SH.y + rosetteOuter + 0.006;
  const nutW = P.nutW ?? 0.043;
  const fbEndW = P.fbW12 ? nutW + (P.fbW12 - nutW) * (nutY - fbEnd) / (nutY - fretY(12)) : 0.057;
  const fbHalf = (y) => THREE.MathUtils.lerp(fbEndW, nutW, (y - fbEnd) / (nutY - fbEnd)) / 2;

  const group = new THREE.Group();
  group.name = 'guitar';

  // ---- materials (satin = the A1's open-pore matte finish)
  const gloss = P.satin
    ? { roughness: 0.52, clearcoat: 0.2, clearcoatRoughness: 0.45 }
    : { roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 };
  const mats = {
    top: new THREE.MeshPhysicalMaterial({ ...gloss }),
    body: new THREE.MeshPhysicalMaterial({ ...gloss }),
    neck: new THREE.MeshPhysicalMaterial(P.satin ? { roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 } : { roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    tuner: P.tuners === 'black'
      ? new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0.75, roughness: 0.32 })   // die-cast black
      : new THREE.MeshStandardMaterial({ color: '#e8e8ea', metalness: 1, roughness: 0.12 }),
    fretboard: new THREE.MeshStandardMaterial({ map: wood('rosewood', 1 / 0.06, 1 / 0.5), roughness: 0.7 }),
    bridge: new THREE.MeshStandardMaterial({ map: wood('rosewood', 1 / 0.16, 1 / 0.03), roughness: 0.55 }),
    binding: new THREE.MeshPhysicalMaterial({ color: '#e6d6b4', roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
    purfling: new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 }),
    interior: new THREE.MeshStandardMaterial({ color: '#160c06', roughness: 1 }),
    bone: new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.35 }),
    pin: new THREE.MeshPhysicalMaterial({ color: '#f6f4ee', roughness: 0.3, clearcoat: 0.6 }),
    fret: new THREE.MeshStandardMaterial({ color: '#d9d6cf', metalness: 1, roughness: 0.22 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e8e8ea', metalness: 1, roughness: 0.12 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: '#f3efe6', roughness: 0.2, iridescence: 0.8, iridescenceIOR: 1.6 }),
    bronze: new THREE.MeshStandardMaterial({ color: '#c79c62', metalness: 1, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: '#e2e2e2', metalness: 1, roughness: 0.25 }),
    veneer: new THREE.MeshPhysicalMaterial({ color: '#060505', roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.3, envMapIntensity: 0.12 }),
    logo: new THREE.MeshStandardMaterial({ map: logoTexture(logo, logoImage), transparent: true, metalness: 0.8, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }),
    rosette: new THREE.MeshPhysicalMaterial({ map: rosetteTexture(), roughness: 0.3, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
    pickguard: new THREE.MeshPhysicalMaterial({ map: tortoiseTexture(), roughness: 0.25, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
  // Every mesh goes into a named part group so the exploded view can move parts independently.
  const PART_NAMES = ['back', 'sides', 'braces', 'top', 'pickguard', 'bridge', 'strap', 'neck', 'fretboard', 'headstock', 'strings'];
  const parts = {};
  for (const n of PART_NAMES) { parts[n] = new THREE.Group(); parts[n].name = `part:${n}`; group.add(parts[n]); }
  let part = parts.top;
  const into = (name) => { part = parts[name]; };
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); if (name) m.name = name; part.add(m); return m; };
  const markers = {}; // label anchors that travel with their part
  const mark = (id, parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); markers[id] = o; };

  // ---- body
  const pts = outline(P);
  const inner = offsetInward(pts, 0.003);

  into('top');
  const topShape = new THREE.Shape(pts);
  topShape.holes.push(new THREE.Path().absarc(0, SH.y, SH.r, 0, Math.PI * 2, true));
  add(new THREE.ExtrudeGeometry(topShape, { depth: 0.003, bevelEnabled: false, curveSegments: 64 }), mats.top, 'top').position.z = -0.003;

  into('sides');
  const rimShape = new THREE.Shape(pts);
  rimShape.holes.push(new THREE.Path(inner));
  add(new THREE.ExtrudeGeometry(rimShape, { depth: D - 0.006, bevelEnabled: false }), mats.body, 'sides').position.z = -D + 0.003;
  mark('sides', parts.sides, -P.pts[5][0], P.pts[5][1], -depthAt(P.pts[5][1]) / 2);

  into('back');
  add(new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.003, bevelEnabled: false }), mats.body, 'back').position.z = -D;
  add(new THREE.ShapeGeometry(new THREE.Shape(inner)), mats.interior).position.z = -D + 0.0035;
  mark('back', parts.back, -0.13, 0.2, -depthAt(0.2));

  // binding + purfling
  const loop = (p2, z) => new THREE.CatmullRomCurve3(p2.map((p) => new THREE.Vector3(p.x, p.y, z)), true);
  if (P.binding === 'strip') {
    // Crisp cream binding (#EAD9B7, satin) on BOTH edges, following the exact outline incl. the cutaway:
    // a 2 mm ring on the face (0.2 mm proud) + a 2 mm band on the side (0.3 mm proud) = an L-shaped strip.
    const bMat = mats.bindStrip ||= new THREE.MeshStandardMaterial({ color: '#ead9b7', roughness: 0.55, side: THREE.DoubleSide });
    const ring = (outerOff, innerOff) => {
      const sh = new THREE.Shape(offsetInward(pts, -outerOff));
      sh.holes.push(new THREE.Path(innerOff === 0 ? pts : offsetInward(pts, innerOff)));
      return sh;
    };
    const faceRing = ring(0.0002, 0.002);                 // on the top / back face
    const sideRing = ring(0.0003, 0);                     // wraps the side wall
    into('top');
    add(new THREE.ShapeGeometry(faceRing, 4), bMat).position.z = 0.0002;
    add(new THREE.ExtrudeGeometry(sideRing, { depth: 0.002, bevelEnabled: false }), bMat).position.z = -0.002;
    into('back');   // built at the untapered depth; the back/sides taper below warps it with the back
    add(new THREE.ShapeGeometry(faceRing, 4), bMat).position.z = -D - 0.0002;
    add(new THREE.ExtrudeGeometry(sideRing, { depth: 0.002, bevelEnabled: false }), bMat).position.z = -D;
  }
  into('top');
  if (P.binding !== false && P.binding !== 'strip') add(new THREE.TubeGeometry(loop(pts, -0.0011), 500, 0.0014, 8, true), mats.binding);
  mark('top', parts.top, 0.12, 0.16, 0);
  into('back');
  if (P.binding !== false && P.binding !== 'strip') add(new THREE.TubeGeometry(loop(pts, -D + 0.0011), 500, 0.0014, 8, true), mats.binding);

  // interior: X bracing + transverse brace + maker's label, visible through the soundhole
  {
    into('braces');
    mark('braces', parts.braces, -0.13, SH.y - 0.17, -0.009);
    const braceMat = new THREE.MeshStandardMaterial({ color: '#5c4428', roughness: 1 });
    // braces stop short of the side walls on each side independently, so nothing pokes through the
    // narrower cutaway side (the full-width braces used to stick out of the cutaway as small wedges)
    const safe = offsetInward(pts, 0.007);
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = safe.length - 1; i < safe.length; j = i++) {
        const a = safe[i], b = safe[j];
        if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
      }
      return c;
    };
    const reach = (x, y, dx, dy, max) => { let t = 0; while (t + 0.002 <= max && inside(x + dx * (t + 0.002), y + dy * (t + 0.002))) t += 0.002; return t; };
    const fitted = (len, x, y, ang) => {   // → [length, centre x, centre y] clipped to the inside of the body
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const a = reach(x, y, dx, dy, len / 2), c = reach(x, y, -dx, -dy, len / 2);
      return [a + c, x + (dx * (a - c)) / 2, y + (dy * (a - c)) / 2];
    };
    const brace = (len, x, y, ang) => {
      const [l, bx, by] = fitted(len, x, y, ang);
      const b = add(new THREE.BoxGeometry(l, 0.008, 0.012), braceMat);
      b.position.set(bx, by, -0.009); b.rotation.z = ang;
    };
    const cy = SH.y - 0.09;
    brace(0.34, 0, cy, THREE.MathUtils.degToRad(40));
    brace(0.34, 0, cy, THREE.MathUtils.degToRad(-40));
    brace(0.25, 0, SH.y + SH.r + 0.022, 0);
    into('back');
    const a1Label = P.labelStyle === 'a1';
    const label = add(
      a1Label ? new THREE.PlaneGeometry(0.075, 0.05) : new THREE.PlaneGeometry(0.07, 0.035),
      new THREE.MeshStandardMaterial({ map: a1Label ? a1LabelTexture(logoImage) : labelTexture(logo, logoImage, P.label), roughness: 0.9 }),
    );
    label.position.set(0, SH.y + 0.012, -D + 0.0045);

    if (P.interior === 'a1') {
      // what the owner's soundhole photo shows: sapele-toned inside, pale bracing, kerfed lining
      mats.interior.color.set('#4a2716');
      braceMat.color.set('#a8865a');
      const liningMat = new THREE.MeshStandardMaterial({ map: wood('lining', 1 / 0.05, 1 / 0.05), roughness: 0.9 });

      // back braces: four transverse strips across the back (positions from D; the depth taper warps them)
      for (const y of [0.11, 0.22, 0.31, 0.415]) {
        const [l, bx, by] = fitted(0.5, 0, y, 0);
        const b = add(new THREE.BoxGeometry(l, 0.007, 0.01), liningMat);
        b.position.set(bx, by, -D + 0.003 + 0.005);
      }

      // kerfed lining: notched blocks glued along the inside of the rim at the top and back edges
      const n = inner.length, blk = new THREE.BoxGeometry(0.0038, 0.006, 0.012);
      const kerf = new THREE.InstancedMesh(blk, liningMat, n * 2);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), zAxis = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < n; i++) {
        const a = inner[(i - 1 + n) % n], b = inner[(i + 1) % n], p = inner[i];
        const t = new THREE.Vector2().subVectors(b, a).normalize();
        const inward = new THREE.Vector2(-t.y, t.x);                 // CCW outline: left normal points inside
        q.setFromAxisAngle(zAxis, Math.atan2(t.y, t.x));
        const cx = p.x + inward.x * 0.003, cy = p.y + inward.y * 0.003;
        m4.compose(new THREE.Vector3(cx, cy, -0.003 - 0.006), q, s1); kerf.setMatrixAt(i * 2, m4);
        m4.compose(new THREE.Vector3(cx, cy, -depthAt(cy) + 0.003 + 0.006), q, s1); kerf.setMatrixAt(i * 2 + 1, m4);
      }
      parts.sides.add(kerf);
    }
  }
  into('top');
  if (P.binding !== false && P.binding !== 'strip') add(new THREE.TubeGeometry(loop(offsetInward(pts, 0.0032), 0), 500, 0.0006, 6, true), mats.purfling);

  // body depth taper: pull the back and sides in toward the neck (A1: 118 mm tail → 98 mm at the neck)
  if (DN !== D) {
    for (const pn of ['back', 'sides']) parts[pn].traverse((m) => {
      if (!m.isMesh || m.isInstancedMesh) return; // instanced kerfing is already placed at the tapered depth
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const zw = pos.getZ(i) + m.position.z;
        if (zw < -0.004) pos.setZ(i, zw * (depthAt(pos.getY(i) + m.position.y) / D) - m.position.z);
      }
      pos.needsUpdate = true;
      m.geometry.computeVertexNormals();
    });
  }

  // rosette (the A1's soundhole is plain)
  if (P.rosette !== false) {
    const ros = add(new THREE.RingGeometry(0.053, rosetteOuter, 160, 1), mats.rosette, 'rosette');
    ros.position.set(0, SH.y, 0.0002);
  }

  // pickguard (treble side, below soundhole)
  if (P.pickguard !== false) {
    into('pickguard');
    const R = rosetteOuter + 0.003, cy = SH.y, k = P.pickguardScale;
    mark('pickguard', parts.pickguard, 0.105 * k, cy - 0.06 * k, 0.0003);
    const a0 = THREE.MathUtils.degToRad(12), a1 = THREE.MathUtils.degToRad(-105);
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * R, cy + Math.sin(a0) * R);
    s.absarc(0, cy, R, a0, a1, true);
    const outer = [[0.0, -0.1], [0.05, -0.115], [0.093, -0.09], [0.113, -0.045], [0.11, -0.003], [0.09, 0.022]]
      .map(([x, y]) => new THREE.Vector2(x * k, cy + y * k));
    outer.push(new THREE.Vector2(Math.cos(a0) * R, cy + Math.sin(a0) * R));
    s.splineThru(outer);
    const pg = add(new THREE.ShapeGeometry(s, 48), mats.pickguard, 'pickguard');
    pg.position.z = 0.0003;
  }

  // bridge, saddle, pins
  const bridgeTopZ = 0.0012 * 2 + 0.006;
  // compensated (slanted) saddle: y offset per metre of x. A1 = 0.0485 (2.8°, bass end toward the tail)
  const SADDLE_SLOPE = P.bridge === 'belly' ? 0.0485 : 0;
  into('bridge');
  mark('bridge', parts.bridge, 0.078, saddleY - 0.006, bridgeTopZ);
  const belly = P.bridge === 'belly';
  {
    const w = 0.155, h = 0.028, r = 0.008;
    // A1: outline traced from the owner's spec drawing (origin = saddle centre line)
    const s = belly ? createCliftonBridgeShape(0.001) : new THREE.Shape();
    if (!belly) {
      s.moveTo(-w / 2 + r, -h / 2);
      s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    }
    // A1: the full outline is the thinner wing layer (5.4 mm); a raised, bevelled centre block under
    // the saddle and pins brings the middle up to the full 8.4 mm — the wings step down from it.
    const bGeo = new THREE.ExtrudeGeometry(s, { depth: belly ? 0.003 : 0.006, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 3, curveSegments: belly ? 28 : 12 });
    const b = add(bGeo, mats.bridge, 'bridge');
    b.position.set(0, belly ? saddleY : saddleY - 0.006, 0.0012);
    if (belly) {
      // Raised centre block, cut from the SAME spec outline: its top edge and belly are the outline's
      // own curves for |x| ≤ 40 mm (inset 0.4 mm so faces don't z-fight), so the only visible step is
      // on the sides where the wings begin.
      const X = WING_FACE.x0 / 1000, IN = 0.0004;
      const pts = s.getSpacedPoints(600).filter((p) => Math.abs(p.x) <= X);
      const mid = (Math.max(...pts.map((p) => p.y)) + Math.min(...pts.map((p) => p.y))) / 2;
      const topRun = pts.filter((p) => p.y > mid).sort((a, b) => a.x - b.x).map((p) => new THREE.Vector2(p.x, p.y - IN));
      const botRun = pts.filter((p) => p.y <= mid).sort((a, b) => b.x - a.x).map((p) => new THREE.Vector2(p.x, p.y + IN));
      const c = new THREE.Shape([...topRun, ...botRun]);
      const block = add(new THREE.ExtrudeGeometry(c, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0008, bevelSegments: 4, curveSegments: 24 }), mats.bridge);
      block.position.set(0, saddleY, bridgeTopZ - 0.0018 - 0.0012);   // top lands exactly at bridgeTopZ

      // Wing faces ("Taper" in the drawing): from the centre block each wing's raised face narrows in
      // straight lines toward the end and drops from 8.4 mm to 6.6 mm high. Height depends only on x,
      // so the top is a flat plane (no shading facets). Sits on the 5.4 mm wing layer.
      const F = WING_FACE, m = (v) => v / 1000;
      const zTop0 = bridgeTopZ, zTop1 = 0.0066, zBase = 0.0045;
      for (const sx of [1, -1]) {
        const A = [sx * m(F.x0), m(F.top0)], B = [sx * m(F.x0), m(F.bot0)];
        const C = [sx * m(F.x1), m(F.bot1)], D = [sx * m(F.x1), m(F.top1)];
        const v = (p, z) => [p[0], p[1], z];
        const At = v(A, zTop0), Bt = v(B, zTop0), Ct = v(C, zTop1), Dt = v(D, zTop1);
        const Ab = v(A, zBase), Bb = v(B, zBase), Cb = v(C, zBase), Db = v(D, zBase);
        const quads = [[At, Bt, Ct, Dt], [Dt, Ct, Cb, Db], [At, Dt, Db, Ab], [Bt, Bb, Cb, Ct]]; // top, end, neck side, tail side
        const pos = [], uv = [];
        for (const [a, b, c, d] of quads) {
          const tri = sx > 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];   // keep outward winding when mirrored
          for (const p of tri) { pos.push(...p); uv.push(p[0], p[1] + p[2]); }   // grain runs along x like the rest of the bridge
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        mats.bridgeWing ||= Object.assign(mats.bridge.clone(), { side: THREE.DoubleSide });
        const wing = add(g, mats.bridgeWing);
        wing.position.set(0, saddleY, 0);
      }
    }

    if (belly) {
      // A1 saddle: 68 mm, compensated (slanted 2.8°, bass end 3.3 mm toward the tail). It sits in the
      // wood with no dark slot outline; a faint bone-toned step marks the B-string compensation.
      const ang = Math.atan(SADDLE_SLOPE);
      const saddle = add(new THREE.BoxGeometry(0.068, 0.0029, 0.006), mats.bone, 'saddle');
      saddle.rotation.z = ang; saddle.position.set(0, saddleY, bridgeTopZ + 0.0032 - 0.003);
      const notch = add(new THREE.BoxGeometry(0.003, 0.0011, 0.0006), new THREE.MeshStandardMaterial({ color: '#cfc4ab', roughness: 0.6 }));
      notch.rotation.z = ang; notch.position.set(0.0145, saddleY + SADDLE_SLOPE * 0.0145 + 0.0009, bridgeTopZ + 0.0032 + 0.0001);
    } else {
      const saddle = add(new THREE.BoxGeometry(0.076, 0.0028, 0.006), mats.bone, 'saddle');
      saddle.position.set(0, saddleY, bridgeTopZ + 0.0032 - 0.003);
    }
  }
  const saddleTopZ = bridgeTopZ + 0.0032;
  // pin row: A1 as drawn (straight row, 14.6 mm below the saddle centre)
  const pinY = belly ? saddleY + CLIFTON_PINS_MM[0].y / 1000 : saddleY - 0.0145;
  const stringXSaddle = (i) => THREE.MathUtils.lerp(-0.0265, 0.0265, i / 5);
  const pinX = (i) => (belly ? CLIFTON_PINS_MM[i].x / 1000 : stringXSaddle(i) * 1.02);
  const pinR = belly ? 0.0029 : 0.0026;   // A1 pin heads ~5.7 mm
  for (let i = 0; i < 6; i++) {
    const pin = add(new THREE.CylinderGeometry(pinR, pinR, 0.003, 20), mats.bone);
    pin.rotation.x = Math.PI / 2; pin.position.set(pinX(i), pinY, bridgeTopZ + 0.0015);
    if (P.pinDots === false) {   // A1: plain white domed pins (as on the owner's guitar)
      const dome = add(new THREE.SphereGeometry(pinR, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.pin);
      dome.rotation.x = Math.PI / 2; dome.position.set(pinX(i), pinY, bridgeTopZ + 0.003);
    } else {
      const dot = add(new THREE.CircleGeometry(0.0009, 16), mats.purfling);
      dot.position.set(pinX(i), pinY, bridgeTopZ + 0.0031);
    }
  }

  // strap button at the tail
  into('strap');
  const strap = add(new THREE.CylinderGeometry(0.004, 0.005, 0.008, 20), mats.bone);
  strap.position.set(0, -0.004, -depthAt(0) / 2);

  // ---- fretboard, frets, nut
  const fbT = 0.006;
  into('fretboard');
  mark('fretboard', parts.fretboard, fbHalf(fretY(9)), fretY(9), fbT);
  {
    const s = new THREE.Shape([
      new THREE.Vector2(-fbHalf(fbEnd), fbEnd), new THREE.Vector2(fbHalf(fbEnd), fbEnd),
      new THREE.Vector2(fbHalf(nutY), nutY), new THREE.Vector2(-fbHalf(nutY), nutY),
    ]);
    add(new THREE.ExtrudeGeometry(s, { depth: fbT, bevelEnabled: false }), mats.fretboard, 'fretboard');
  }
  for (let n = 1; n <= 22; n++) {
    const y = fretY(n);
    if (y < fbEnd + 0.004) break;
    const f = add(new THREE.CylinderGeometry(0.0011, 0.0011, fbHalf(y) * 2, 10, 1), mats.fret);
    f.rotation.z = Math.PI / 2; f.position.set(0, y, fbT);
  }
  for (const n of P.dots ?? [3, 5, 7, 9, 12, 15, 17, 19]) {
    const y = (fretY(n) + fretY(n - 1)) / 2;
    if (y < fbEnd + 0.01) continue;
    const xs = n === 12 ? [-0.009, 0.009] : [0];
    for (const x of xs) {
      const d = add(new THREE.CircleGeometry(0.0028, 24), mats.pearl);
      d.position.set(x, y, fbT + 0.0002);
    }
    // side position dot on the bass edge (what the player sees)
    const sd = add(new THREE.CircleGeometry(0.0011, 16), mats.bone);
    sd.rotation.y = -Math.PI / 2;
    sd.position.set(-fbHalf(y) - 0.0002, y, fbT * 0.55);
  }
  const nutTopZ = fbT + 0.0035;
  const nut = add(new THREE.BoxGeometry(nutW, 0.005, nutTopZ), mats.bone, 'nut');
  nut.position.set(0, nutY + 0.0025, nutTopZ / 2);

  // ---- neck shaft with heel
  into('neck');
  mark('neck', parts.neck, -0.02, fretY(12), -0.018);
  {
    // One lofted surface: cross-sections from inside the body, along the heel and the C-profile shaft,
    // past the nut into the back of the headstock. Each section runs θ = 0…π from the treble edge,
    // under the neck, to the bass edge; the top (z = 0) is closed by the fretboard.
    const { lerp, clamp, smoothstep } = THREE.MathUtils;
    // heel, from the owner's side photo: a straight full-depth block (its end face is the heel cap) rises
    // ~29 mm off the body, then a concave sweep ~53 mm long curves up into the back of the neck
    const HEEL_BLOCK = 0.0295, HEEL_SWEEP = 0.053, HEEL = HEEL_BLOCK + HEEL_SWEEP;
    const VOL = 0.034;                          // nut → full headstock-back blend (volute zone)
    const tan14 = Math.tan(THREE.MathUtils.degToRad(14));
    const y0 = joinY - 0.012, y1 = nutY + VOL, segY = 140, segA = 36;
    const pos = [], uv = [], idx = [];
    // cross-section at y → surface point at angle θ (0 = treble edge, π/2 = underside, π = bass edge)
    function sectionAt(y) {
      // C-profile depth: 20.5 mm at the nut, thickening slightly to 22 mm toward the body
      let zTop = 0;
      let depth = lerp(0.022, 0.0205, clamp((y - joinY) / (nutY - joinY), 0, 1));
      let hw = fbHalf(clamp(y, fbEnd, nutY));
      let taper = 0, q = 1;                     // taper: heel narrows toward the back; q < 1 flattens the bottom
      // heel: quarter-ellipse sweep (vertical tangent at the neck, horizontal at the block), then the block
      const w = clamp((joinY + HEEL - y) / HEEL, 0, 1);            // 0 at the top of the heel → 1 at the body
      if (w > 0) {
        const u = clamp((joinY + HEEL - y) / HEEL_SWEEP, 0, 1);     // sweep progress; 1 all along the block
        const sweep = 1 - Math.sqrt(1 - u * u);
        depth = lerp(depth, DN - 0.0002, sweep);                    // block is flush with the back, like the photo
        taper = 0.62 * Math.pow(w, 0.85);                           // teardrop / rounded-V from the back
      }
      // volute: past the nut, the shaft drops with the angled headstock face and blends into its
      // flat back with a subtle rounded bump — no boxy step
      if (y > nutY) {
        const v = clamp((y - nutY) / VOL, 0, 1), sv = smoothstep(v, 0, 1);
        zTop = Math.min(0, 0.0035 - Math.max(0, y - nutY - 0.006) * tan14);
        const headBack = zTop - 0.0145;                             // headstock back plane (14 mm thick)
        const zBottom = lerp(-depth, headBack, sv) - 0.0028 * Math.sin(Math.PI * v) * (1 - 0.4 * v);
        depth = zTop - zBottom;
        hw *= lerp(1, 1.04, sv);
        q = lerp(1, 0.4, sv);                                       // round C → flat headstock back
      }
      return (th) => {
        const s = Math.sin(th);
        return [Math.cos(th) * hw * (1 - taper * Math.pow(s, 1.6)), y, zTop - depth * Math.pow(s, q)];
      };
    }
    for (let j = 0; j <= segY; j++) {
      const y = lerp(y0, y1, j / segY);
      const at = sectionAt(y);
      for (let i = 0; i <= segA; i++) {
        pos.push(...at((i / segA) * Math.PI));
        uv.push(i / segA, (y - y0) / 0.25);
      }
    }
    for (let j = 0; j < segY; j++) for (let i = 0; i < segA; i++) {
      const a = j * (segA + 1) + i, b = a + segA + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);   // wound so normals face OUT (was inverted: back of neck vanished)
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    add(geo, mats.neck, 'neck');

    // heel cap: flat cream cap on the end face of the heel block, flush with the back binding
    const capTop = joinY + HEEL_BLOCK;
    const cap = new THREE.Shape();
    cap.moveTo(-0.0055, joinY - 0.003);
    cap.lineTo(0.0055, joinY - 0.003);
    cap.lineTo(0.006, capTop - 0.006);
    cap.quadraticCurveTo(0.0062, capTop, 0, capTop + 0.0005);
    cap.quadraticCurveTo(-0.0062, capTop, -0.006, capTop - 0.006);
    cap.lineTo(-0.0055, joinY - 0.003);
    const capMesh = add(new THREE.ShapeGeometry(cap, 16), mats.heelCap ||= new THREE.MeshStandardMaterial({ color: '#ead9b7', roughness: 0.55, side: THREE.DoubleSide }));
    capMesh.position.z = -DN - 0.0003;

    // black strap button on the treble (cutaway) side of the heel
    const sbMat = mats.strapBlack ||= new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.35, metalness: 0.2 });
    // placed exactly on the heel surface, on the treble side, high on the block (~26 mm below the top and
    // ~26 mm above the body, as in the photo), pointing out along the surface normal
    const sbY = joinY + 0.026, th = THREE.MathUtils.degToRad(16);
    const sAt = sectionAt(sbY), p = new THREE.Vector3(...sAt(th));
    const n = new THREE.Vector3(...sAt(th + 0.02)).sub(new THREE.Vector3(...sAt(th - 0.02)));   // tangent around the section
    const outward = new THREE.Vector3(n.z, 0, -n.x).normalize();                                // ⟂ tangent, in the section plane
    if (outward.x < 0) outward.negate();                                                        // treble side faces +x
    const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
    const sbBase = add(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 24), sbMat);
    sbBase.quaternion.copy(q2); sbBase.position.copy(p).addScaledVector(outward, 0.0016);
    const sbHead = add(new THREE.CylinderGeometry(0.0062, 0.0056, 0.0024, 28), sbMat);
    sbHead.quaternion.copy(q2); sbHead.position.copy(p).addScaledVector(outward, 0.0046);
  }

  // ---- headstock (angled back ~14°)
  const head = new THREE.Group();
  head.position.set(0, nutY + 0.006, 0.0035);
  head.rotation.x = -THREE.MathUtils.degToRad(14);
  parts.headstock.add(head);
  const tuners = { [-1]: new THREE.Group(), [1]: new THREE.Group() };
  head.add(tuners[-1], tuners[1]);
  mark('headstock', head, -0.03, 0.13, 0.001);
  mark('tuners', tuners[1], 0.066, 0.095, -0.02);
  const headShape = new THREE.Shape();
  let headTop, headHalf, postYs, logoY;
  if (P.headstock === 'a1') {
    // A1 headstock — the owner's outline, reference/headstock-shape.svg (viewBox in mm). The path is
    // pasted verbatim and converted: SVG x 50 = centreline, SVG y 165 = nut, tip at y 12.72 (152 mm).
    // To change the shape, paste the new path `d` here.
    applySvgPath(headShape, A1_HEADSTOCK_PATH, { cx: 50, nutY: 165 });
    headTop = (165 - 12.72) / 1000; logoY = 0.086; postYs = [0.061, 0.094, 0.127];
    headHalf = halfWidthFromShape(headShape);
  } else {
    headTop = 0.193; logoY = 0.162; postYs = [0.05, 0.095, 0.14];
    headHalf = (y) => THREE.MathUtils.lerp(0.025, 0.0415, THREE.MathUtils.clamp(y / 0.165, 0, 1));
    headShape.moveTo(-0.025, 0); headShape.lineTo(0.025, 0);
    headShape.lineTo(0.0415, 0.165); headShape.quadraticCurveTo(0.043, 0.184, 0.036, 0.186);
    headShape.quadraticCurveTo(0, 0.193, -0.036, 0.186);
    headShape.quadraticCurveTo(-0.043, 0.184, -0.0415, 0.165); headShape.closePath();
  }
  // A1: no bevel (a bevel pushes the light neck wood out past the veneer as a tan border) and dark
  // side edges, so the rosewood face runs cleanly to the edge; the back stays natural neck wood.
  const a1Head = P.headstock === 'a1';
  const headT = 0.014, bev = a1Head ? 0 : 0.0015;
  const headGeo = new THREE.ExtrudeGeometry(headShape, a1Head
    ? { depth: headT, bevelEnabled: false, curveSegments: 24 }
    : { depth: headT, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 20 });
  const headEdge = new THREE.MeshStandardMaterial({ map: wood('rosewoodFace', 1 / 0.05, 1 / 0.16), roughness: 0.65 });
  const hs = new THREE.Mesh(headGeo, a1Head ? [mats.neck, headEdge] : mats.neck); // groups: 0 = faces, 1 = sides
  hs.position.z = -(headT + bev);
  head.add(hs);
  mats.veneer.specularIntensity = 0.25;
  mats.veneer.userData.envScale = 0.15; // main.js applies a reduced environment reflection
  if (P.headFace) {
    // A1: rosewood-veneer face (not black), satin
    mats.veneer = new THREE.MeshPhysicalMaterial({ map: wood(P.headFace, 1 / 0.05, 1 / 0.16), roughness: 0.62, clearcoat: 0.1, clearcoatRoughness: 0.5, specularIntensity: 0.35 });
    mats.veneer.userData.envScale = 0.2; // the face tilts up at the studio ceiling; keep reflections low so the rosewood reads
  }
  const veneer = new THREE.Mesh(new THREE.ShapeGeometry(headShape, 20), mats.veneer);
  veneer.position.z = 0.0002; head.add(veneer);
  let logoMesh;
  if (P.headstock === 'a1') {
    // A1: gold "Clifton" script only, running along the headstock (reads nut → tip), between the tuner rows
    mats.logo.map = cliftonOnlyTexture(logo, logoImage);
    logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.022), mats.logo);
    logoMesh.rotation.z = Math.PI / 2;
  } else {
    logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.0165), mats.logo);
  }
  logoMesh.position.set(0, logoY, 0.0006); head.add(logoMesh);

  // tuners: posts on the face, housings on the back, buttons out the sides
  const posts = []; // [side][k] local positions
  const backZ = -(headT + 2 * bev);
  const tm = mats.tuner;
  for (const side of [-1, 1]) {
    posts[side] = [];
    postYs.forEach((py) => {
      const hw = headHalf(py);
      const a1h = P.headstock === 'a1';
      const x = side * (hw - (a1h ? 0.0125 : 0.0115));
      const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0052, 0.0022, 24), tm);
      const T = tuners[side];
      bush.rotation.x = Math.PI / 2; bush.position.set(x, py, 0.0011); T.add(bush);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 20), tm);
      post.rotation.x = Math.PI / 2; post.position.set(x, py, 0.006); T.add(post);
      // A1: sealed housings (and their shafts) on the back are polished chrome; posts/buttons stay black
      // brighter env reflection so it reads as polished silver on the black stage
      const hm = a1h ? (mats.chromeBright ||= Object.assign(
        new THREE.MeshStandardMaterial({ color: '#f4f4f6', metalness: 1, roughness: 0.14 }),
        { userData: { envScale: 2.4 } })) : tm;
      const housing = new THREE.Mesh(new RoundedBoxGeometryLite(0.013, 0.019, 0.009, 0.002), hm);
      housing.position.set(x, py, backZ - 0.0045); T.add(housing);
      // A1 (photo): buttons sit right against the headstock edge, on short shafts
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, a1h ? 0.012 : 0.018, 12), hm);
      shaft.rotation.z = Math.PI / 2; shaft.position.set(side * (hw + (a1h ? 0.0005 : 0.004)), py, backZ - 0.0045); T.add(shaft);
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0045, 32), tm);
      btn.scale.set(1.1, 1, 0.8); btn.position.set(side * (hw + (a1h ? 0.0125 : 0.02)), py, backZ - 0.0045); T.add(btn);
      posts[side].push(new THREE.Vector3(x - side * 0.0032, py, 0.007));
    });
  }

  // ---- strings: pin → saddle → nut → tuner post
  group.updateMatrixWorld(true);
  const radii = [0.00068, 0.00056, 0.00045, 0.00036, 0.00021, 0.00017];
  const postFor = [posts[-1][0], posts[-1][1], posts[-1][2], posts[1][2], posts[1][1], posts[1][0]];
  for (let i = 0; i < 6; i++) {
    const mat = i < 4 ? mats.bronze : mats.steel;
    const xs = stringXSaddle(i), xn = THREE.MathUtils.lerp(-0.0178, 0.0178, i / 5);
    const pin = new THREE.Vector3(pinX(i), pinY, bridgeTopZ + 0.002);   // string anchors at its bridge pin
    const sad = new THREE.Vector3(xs, saddleY + SADDLE_SLOPE * xs, saddleTopZ + radii[i]); // breaks over the slanted saddle
    const nt = new THREE.Vector3(xn, nutY + 0.0025, nutTopZ + radii[i]);
    const post = head.localToWorld(postFor[i].clone());
    group.worldToLocal(post);
    for (const [a, b] of [[pin, sad], [sad, nt], [nt, post]]) parts.strings.add(cylinderBetween(a, b, radii[i], mat));
  }
  mats.bronze.transparent = mats.steel.transparent = true;

  // ---- exploded view: [offset in guitar-local metres, start delay 0..1]
  const EXPLODE = {
    bridge: [[0, -0.03, 0.32], 0.0],
    pickguard: [[0.02, 0.02, 0.23], 0.06],
    top: [[0, 0, 0.14], 0.14],
    braces: [[0, 0, 0.06], 0.22],
    back: [[0, 0, -0.18], 0.18],
    strap: [[0, -0.08, 0], 0.26],
    fretboard: [[0, 0.13, 0.075], 0.24],
    neck: [[0, 0.13, 0], 0.3],
    headstock: [[0, 0.22, -0.01], 0.36],
  };
  const SPREAD = 0.55; // each part's own move takes this fraction of the timeline
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let explodeT = 0;
  function setExplode(t) {
    explodeT = t;
    for (const [name, [off, delay]] of Object.entries(EXPLODE)) {
      const e = easeIO(THREE.MathUtils.clamp((t - delay) / SPREAD, 0, 1));
      parts[name].position.set(off[0] * e, off[1] * e, off[2] * e);
    }
    const te = easeIO(THREE.MathUtils.clamp((t - 0.4) / SPREAD, 0, 1));
    tuners[-1].position.x = -0.045 * te;
    tuners[1].position.x = 0.045 * te;
    // strings tie the parts together, so they fade out first
    const so = 1 - THREE.MathUtils.clamp(t * 6, 0, 1);
    mats.bronze.opacity = mats.steel.opacity = so;
    parts.strings.visible = so > 0.01;
  }

  // ---- finishes
  const finishes = P.finishes ?? {
    natural: { top: 'natural', body: 'mahogany', neck: 'mahogany' },
    sunburst: { top: 'sunburst', body: 'mahogany', neck: 'mahogany' },
    vintage: { top: 'vintage', body: 'rosewood', neck: 'mahogany' },
    black: { top: 'black', body: 'black', neck: 'black' },
  };
  markers.tuners.position.set(headHalf(postYs[1]) + 0.032, postYs[1], backZ - 0.0045);
  markers.headstock.position.set(-headHalf(headTop * 0.7), headTop * 0.7, 0.001);
  const topCache = {};
  function setFinish(name) {
    const f = finishes[name] || finishes.natural;
    topCache[f.top] ||= topTexture(P, pts, f.top);
    mats.top.map = topCache[f.top];
    mats.body.map = wood(f.body, 1 / 0.12, 1 / 0.25);
    mats.neck.map = wood(f.neck, 1, 3);
    [mats.top, mats.body, mats.neck].forEach((m) => { m.color.set('#ffffff'); m.needsUpdate = true; });
  }
  setFinish(finish);

  // ---- hotspots (in guitar-local coordinates)
  const headPoint = (x, y, z) => group.worldToLocal(head.localToWorld(new THREE.Vector3(x, y, z)));
  const headNormal = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(head.quaternion);
  const hotspots = {
    top: { pos: new THREE.Vector3(-0.11, 0.17, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    rosette: { pos: new THREE.Vector3(-0.043, SH.y + 0.043, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    bridge: { pos: new THREE.Vector3(0.065, saddleY - 0.006, bridgeTopZ), normal: new THREE.Vector3(0, 0, 1) },
    fretboard: { pos: new THREE.Vector3(0, (fretY(5) + fretY(4)) / 2, fbT + 0.001), normal: new THREE.Vector3(0, 0, 1) },
    headstock: { pos: headPoint(0, headTop * 0.6, 0.001), normal: headNormal(0, 0, 1) },
    tuners: { pos: headPoint(headHalf(postYs[1]) + 0.026, postYs[1], backZ - 0.0045), normal: new THREE.Vector3(1, 0, 0.2).normalize() },
    back: { pos: new THREE.Vector3(0.06, 0.2, -depthAt(0.2) - 0.001), normal: new THREE.Vector3(0, 0, -1) },
    neck: { pos: new THREE.Vector3(0, fretY(7), -0.022), normal: new THREE.Vector3(0, 0, -1) },
  };

  const height = head.localToWorld(new THREE.Vector3(0, headTop, 0)).y;
  return {
    group, setFinish, hotspots, height, finishes: Object.keys(finishes),
    parts, markers, setExplode, getExplode: () => explodeT,
  };
}
