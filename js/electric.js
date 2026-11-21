// Custom electric guitar: Clifton's custom-build catalogue + a procedural 3D model of each build.
// Same frame as guitar.js: metres, tail at y = 0, headstock up (+y), top faces +z, treble side = +x.
//
// Options, prices and specs are copied from Clifton's own builder (cliftonguitars.com/products/custom-guitar,
// a Kickflip customizer), November 2026, including which questions show for which choices.
// Body, pickguard and headstock outlines were traced from that builder's artwork at 0.5427 mm per pixel
// (nut-to-saddle 648 mm), so the 3D guitar has the same shapes customers already see there.
import * as THREE from 'three';
import { drawFitted } from './logo.js';
import { DEFAULT_BUILD, ELECTRIC_CARD } from './catalog.js';

// ================================================================ catalogue
const NONE_NOTE = 'Our wiring comes with bullet connectors. To fit your own pickups, remove the pre-installed connectors or add bullet connectors to yours.';
const noPickup = { id: 'none', label: 'None', spec: [NONE_NOTE] };

// facts → "4,400 winds · 42 AWG · Ceramic"; rl = DC resistance (kΩ) / inductance (H) per position
const pu = (id, label, price, look, facts, tone, rl = null) => ({ id, label, price, look, facts, tone, rl });

const STRAT_SC = [
  pu('lowgauss', 'Low Gauss Vintage', 470, 'sc', ['4,400 winds', '42 AWG', 'Ceramic'], 'Bright, articulate low-output tone with lively, dynamic Strat-style clarity.', { neck: [1.88, 1.4], mid: [1.9, 1.54], bridge: [1.81, 1.53] }),
  pu('classic', 'Classic Ceramic', 550, 'sc', ['8,000 winds', '42 AWG', 'Ceramic'], 'Balanced, versatile medium-output tone with ceramic clarity, punch and excellent note definition.', { neck: [5.93, 4.11], mid: [6.19, 4.23], bridge: [6.21, 4.04] }),
  pu('howler', 'Howler High Output Ceramic', 600, 'sc', ['12,000 winds', '43 AWG', 'Ceramic'], 'High-output ceramic pickup with thick, powerful tone, strong mids, sustain and aggressive clarity.', { neck: [9.36, 7.05], mid: [9.05, 6.85], bridge: [9.06, 6.06] }),
  pu('a54', "54' Alnico", 910, 'sc', ['4,400 winds', '42 AWG', 'Alnico V', 'Vulcanized fiberboard bobbins'], 'Clear, open vintage tone with sparkling highs, tight lows and exceptional touch sensitivity.', { neck: [3.43, 0.77], mid: [3.49, 0.79], bridge: [3.6, 0.81] }),
  pu('a62', "62' Alnico", 660, 'sc', ['8,000 winds', '42 AWG', 'Alnico V'], 'Classic ’62 Strat tone with clarity, warmth, sparkle, snap and dynamic vintage character.', { neck: [6.04, 2.02], mid: [6.04, 1.95], bridge: [6.06, 2.05] }),
  pu('texas', 'Texas Special Alnico', 990, 'sc', ['12,000 winds', '43 AWG', 'Alnico', 'Vulcanized fiberboard bobbins'], 'Overwound Alnico V pickup with bold Texas blues grit, bite, sustain and punch.', { neck: [4.67, 7.93], mid: [4.81, 8.39], bridge: [5.08, 8.66] }),
  pu('mfd', "G&L's MFD Inspired Pickups", 630, 'hex', ['8,000 winds', '42 AWG', 'Ceramic', 'Adjustable pole pieces'], 'Precise string balance with a powerful, articulate single-coil voice.'),
  pu('hotrails', 'Hot Rails Pups', 810, 'rail', ['5,200 winds', '44 AWG', 'Ceramic'], 'Compact single-coil humbucker with massive output, thick mids, tight lows and powerful sustain.', { neck: [11, 1.5], mid: [10.26, 1.95], bridge: [12.7, 3.71] }),
];
const HUMBUCKERS = [
  pu('vc', 'Vintage Ceramic', 720, 'open', ['4,200 winds', 'Ceramic'], 'Low-wind ceramic humbucker with clear articulation, tight lows, focused mids and punchy attack.', { neck: [6.7, 2.8], bridge: [6.87, 2.6] }),
  pu('hp', 'High Power', 720, 'open', ['6,200 winds', 'Ceramic'], 'High-output ceramic humbucker with tight lows, aggressive mids and powerful attack.', { neck: [8.73, 3.99], bridge: [14.46, 5.76] }),
  pu('paf', 'PAF-style Humbucker', 910, 'open', ['4,200 winds', 'Alnico'], 'Vintage PAF-style humbucker: warm, dynamic, clear and woody low-output tone.', { neck: [3.36, 1.37], bridge: [3.36, 1.37] }),
  pu('ov', 'Overwound Vintage', 910, 'open', ['5,200 winds', 'Alnico'], 'Fuller Alnico humbucker tone with stronger mids, more output, warmth and dynamics.', { neck: [8.63, 4.23], bridge: [14.93, 6.02] }),
  pu('vcc', 'Vintage Ceramic w/ cover', 810, 'cover', ['4,200 winds', 'Ceramic', 'With cover'], 'Low-wind ceramic humbucker with clear articulation, tight lows, focused mids and punchy attack.', { neck: [6.7, 2.8], bridge: [6.87, 2.6] }),
  pu('hpc', 'High Power w/ cover', 810, 'cover', ['5,200 winds', 'Ceramic', 'With cover'], 'High-output ceramic humbucker with tight lows, aggressive mids and powerful attack.', { neck: [8.73, 3.99], bridge: [14.46, 5.76] }),
  pu('pafc', 'PAF-style Humbucker w/ cover', 990, 'cover', ['4,000 winds', 'Alnico', 'With cover'], 'Low-output PAF-style humbucker with warm, dynamic, clear, woody vintage tone.', { neck: [3.36, 1.37], bridge: [3.36, 1.37] }),
  pu('ovc', 'Overwound Vintage w/ cover', 990, 'cover', ['5,200 winds', 'Alnico', 'With cover'], 'Fuller Alnico humbucker tone with stronger mids, more output, warmth and dynamics.', { neck: [8.63, 4.23], bridge: [14.93, 6.02] }),
  pu('inv', 'Invader Style', 890, 'invader', ['6,200 winds', 'Ceramic'], 'Maximum-output humbucker with massive, aggressive tone for heavy rock and metal.', { neck: [8.73, 5.3], bridge: [14.66, 7.76] }),
];
const TELE_NECK_SC = [
  pu('classic', 'Standard Classic', 440, 'lipstick', ['7,200 winds', 'Ceramic'], 'Balanced, clear Telecaster tone with dynamic bite, character and excellent definition.', { neck: [3.73, 3.64] }),
  pu('ovc', 'Overwound Ceramic', 670, 'lipstick', ['10,000 winds', 'Ceramic'], 'High-output ceramic Telecaster tone with thick mids, tight lows and aggressive attack.', { neck: [5.6, 5.5] }),
  pu('vlo', 'Vintage Low Output Alnico', 760, 'lipstick', ['7,200 winds', 'Alnico'], 'Low-output Alnico pickup with clear, dynamic tone and natural resonance.', { neck: [5.09, 2.03] }),
  pu('redhot', 'Red Hot Alnico', 990, 'lipstick', ['10,000 winds', 'Alnico'], 'Powerful Telecaster tone with aggressive bite, lively highs, clarity, snap and overdrive.', { neck: [3.07, 5.8] }),
];
const TELE_BRIDGE = [
  pu('classic', 'Standard Classic', 550, 'tele', ['8,500 winds', 'Ceramic'], 'Balanced, clear Telecaster tone with dynamic bite, character and excellent definition.', { bridge: [2.08, 2.34] }),
  pu('ovc', 'Overwound Ceramic', 670, 'tele', ['10,000 winds', 'Ceramic'], 'High-output ceramic Telecaster tone with thick mids, tight lows and aggressive attack.', { bridge: [4.08, 6.02] }),
  pu('vlo', 'Vintage Low Output Alnico', 750, 'tele', ['8,500 winds', 'Alnico'], 'Low-output Alnico tone with clear dynamics, open response and natural resonance.', { bridge: [4.02, 2.05] }),
  pu('redhot', 'Red Hot Alnico', 850, 'tele', ['10,000 winds', 'Alnico'], 'Powerful Telecaster tone with aggressive bite, lively highs, clarity, snap and rich overdrive.', { bridge: [4.37, 3.66] }),
  pu('hotrail', 'Hot Rail Ceramic High Output', 950, 'teleRail', ['5,200 winds', 'Ceramic']),
];

const neckSpec = (board, thick, radius) => [
  board === 'maple' ? 'Roasted maple fretboard' : 'Rosewood fretboard', 'Roasted maple neck',
  thick === 'wizard' ? 'Wizard thickness (20.2 mm at 1st fret, 21.6 mm at 12th)' : 'Standard thickness (21 mm at 1st fret, 22.8 mm at 12th)',
  `${radius}″ radius`, '2.7 mm jumbo stainless steel frets', 'String tree with bronze rollers',
];
const NECKS = [
  ['rw-std-9', 'RW Standard 9R', 'rosewood', 'standard', 9], ['rw-std-12', 'RW Standard 12R', 'rosewood', 'standard', 12],
  ['rw-wiz-9', 'RW Wizard 9R', 'rosewood', 'wizard', 9], ['rw-wiz-12', 'RW Wizard 12R', 'rosewood', 'wizard', 12],
  ['mp-wiz-9', 'Maple Wizard 9R', 'maple', 'wizard', 9], ['mp-wiz-12', 'Maple Wizard 12R', 'maple', 'wizard', 12],
].map(([id, label, board, thick, r]) => ({ id, label, price: 4880, board, note: `${board === 'maple' ? 'Maple' : 'Rosewood'} · ${thick === 'wizard' ? 'Wizard' : 'Standard'} · ${r}″`, spec: neckSpec(board, thick, r) }));

const GUARD_COLOURS = [
  { id: 'vw', label: 'Vintage White', swatch: 'linear-gradient(135deg,#f3ead4,#dccfae)' },
  { id: 'black', label: 'Black', swatch: 'linear-gradient(135deg,#3a3a3c,#070708)' },
  { id: 'white', label: 'White', swatch: 'linear-gradient(135deg,#ffffff,#dedcd8)' },
  { id: 'tort', label: 'Red Tortoise', swatch: 'radial-gradient(circle at 30% 30%,#b0582f,#5b2014 45%,#2a0b07 80%)' },
];
const guards = (prices) => GUARD_COLOURS.map((c, i) => ({ ...c, price: prices?.[i] }));
const TELE_GUARD_NAME = { sc: 'Single Coil', hb: 'Humbucker', na: 'No Attachment' };
const STRAT_GUARD_SPEC = {
  sss: ['Cotton braided wires', 'Vintage-inspired giant potentiometers', 'Push-pull knob for 7-way wiring'],
  hss: ['Cotton braided wires', 'Vintage-inspired giant potentiometers', 'Push-pull knob for 9-way wiring'],
  hh: ['Cotton braided wires', 'Vintage-inspired giant potentiometers', 'Dual push-pull knobs for individual coil splitting'],
};

const isTele = (b) => b.body === 'tele';
const isStrat = (b) => b.body === 'strat';

// Every question in Clifton's builder, in their order. `when` mirrors their show/hide rules.
// kind: chips (short choices), swatch (colours), list (long pickup lists with prices)
export const QUESTIONS = [
  { key: 'body', label: 'Body Type', kind: 'chips', choices: [
    { id: 'tele', label: 'Telecaster', note: 'Single cutaway', spec: ['Poplar body', 'Ashtray-type bridge', 'Solid bronze saddles', 'Cotton braided wires', 'Big potentiometers'] },
    { id: 'strat', label: 'Stratocaster', note: 'Double cutaway', spec: ['Poplar body', 'Two-point tremolo bridge', 'Big tremolo block', 'Stainless steel saddles'] },
  ] },
  { key: 'tfin', label: 'Telecaster Body', when: isTele, kind: 'swatch', choices: [
    { id: 'butterscotch', label: 'Butterscotch', price: 6450, swatch: 'linear-gradient(135deg,#ffd43a,#f0b400)' },
    { id: 'sunburst', label: 'Sunburst', price: 6450, swatch: 'radial-gradient(circle at 50% 45%,#f2980c 0 34%,#b33a02 62%,#120302 84%)' },
    { id: 'white', label: 'White', price: 6450, swatch: 'linear-gradient(135deg,#ffffff,#e4e2de)' },
    { id: 'black', label: 'Black', price: 6450, swatch: 'linear-gradient(135deg,#3a3a3e,#050506)' },
  ] },
  { key: 'sfin', label: 'Stratocaster Body', when: isStrat, kind: 'swatch', choices: [
    { id: 'khaki', label: 'Khaki', price: 6350, swatch: 'linear-gradient(135deg,#f6ead0,#e2d0ab)' },
    { id: 'sunburst', label: 'Sunburst', price: 6350, swatch: 'radial-gradient(circle at 50% 45%,#f78a05 0 24%,#c53400 46%,#5a0500 62%,#070101 74%)' },
    { id: 'teal', label: 'Metallic Teal', price: 6350, swatch: 'linear-gradient(135deg,#7cc0d2,#2f7389)' },
    { id: 'black', label: 'Black', price: 6350, swatch: 'linear-gradient(135deg,#3a3a3e,#050506)' },
  ] },
  { key: 'neck', label: 'Neck', kind: 'chips', choices: NECKS },
  { key: 'tpg', label: 'Telecaster Pickguard Type', when: isTele, kind: 'chips', choices: [
    { id: 'sc', label: 'Single Coil', note: 'Neck single coil' }, { id: 'hb', label: 'Humbucker', note: 'Neck humbucker' }, { id: 'na', label: 'No Attachment', note: 'Bridge pickup only' },
  ] },
  { key: 'tpgc', label: (b) => `Telecaster ${TELE_GUARD_NAME[b.tpg]} Pickguard`, when: isTele, kind: 'swatch', choices: (b) => guards(b.tpg === 'na' ? null : [360, 250, 250, 550]) },
  { key: 'tn', label: 'Telecaster Single Coil Pickup', when: (b) => isTele(b) && b.tpg === 'sc', kind: 'list', pos: 'neck', choices: [noPickup, ...TELE_NECK_SC] },
  { key: 'thn', label: 'Telecaster Humbucker Pickup', when: (b) => isTele(b) && b.tpg === 'hb', kind: 'list', pos: 'neck', choices: [noPickup, ...HUMBUCKERS] },
  { key: 'tb', label: 'Telecaster Bridge Pickup', when: isTele, kind: 'list', pos: 'bridge', choices: [noPickup, ...TELE_BRIDGE] },
  { key: 'spg', label: 'Stratocaster Pickguard Type', when: isStrat, kind: 'chips', choices: [
    { id: 'sss', label: 'SSS Pickup Guard', note: 'Three single coils' }, { id: 'hss', label: 'HSS Pickup Guard', note: 'Bridge humbucker' }, { id: 'hh', label: 'HH Pickup Guard', note: 'Two humbuckers' },
  ] },
  { key: 'spgc', label: (b) => `Stratocaster ${b.spg.toUpperCase()} Pickguard`, when: isStrat, kind: 'swatch', spec: (b) => STRAT_GUARD_SPEC[b.spg], choices: guards([1540, 1390, 1390, 1760]) },
  { key: 'sn', label: 'Stratocaster Single Coil Neck Pick Up', when: (b) => isStrat(b) && b.spg !== 'hh', kind: 'list', pos: 'neck', choices: [noPickup, ...STRAT_SC] },
  { key: 'sm', label: 'Stratocaster Single Coil Middle Pick Up', when: (b) => isStrat(b) && b.spg !== 'hh', kind: 'list', pos: 'mid', choices: [noPickup, ...STRAT_SC] },
  { key: 'sb', label: 'Stratocaster Single Coil Bridge Pick Up', when: (b) => isStrat(b) && b.spg === 'sss', kind: 'list', pos: 'bridge', choices: [noPickup, ...STRAT_SC] },
  { key: 'shn', label: 'Stratocaster Humbucker Neck Pickup', when: (b) => isStrat(b) && b.spg === 'hh', kind: 'list', pos: 'neck', choices: [noPickup, ...HUMBUCKERS] },
  { key: 'shb', label: 'Stratocaster Humbucker Bridge Pickup', when: (b) => isStrat(b) && b.spg !== 'sss', kind: 'list', pos: 'bridge', choices: [noPickup, ...HUMBUCKERS] },
  { key: 'bag', label: 'Gigbag', kind: 'chips', choices: [
    { id: 'none', label: 'None' }, { id: 'padded', label: 'Clifton Padded Gigbag', price: 999, spec: ['10 mm padding'] }, { id: 'deluxe', label: 'Clifton Deluxe Gigbag', price: 2800 },
  ] },
];
const Q = Object.fromEntries(QUESTIONS.map((q) => [q.key, q]));

// Clifton's starting point (a butterscotch Telecaster) and the lineup card live in catalog.js,
// which has no three.js, so the guitar list can use them without loading the 3D engine.
export { DEFAULT_BUILD, ELECTRIC_CARD };

export const peso = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const listOf = (q, b) => (typeof q.choices === 'function' ? q.choices(b) : q.choices);
export const labelOf = (q, b) => (typeof q.label === 'function' ? q.label(b) : q.label);
export const choiceOf = (q, b) => listOf(q, b).find((c) => c.id === b[q.key]);
export const activeQuestions = (b) => QUESTIONS.filter((q) => !q.when || q.when(b));

// keep a build valid: unknown keys/values fall back to Clifton's defaults
export function normalizeBuild(input = {}) {
  const out = { ...DEFAULT_BUILD };
  for (const q of QUESTIONS) if (listOf(q, { ...out, ...input }).some((c) => c.id === input[q.key])) out[q.key] = input[q.key];
  return out;
}
// only the questions that are showing go into the share link
export const buildParams = (b) => Object.fromEntries(activeQuestions(b).map((q) => [q.key, b[q.key]]));

// one-line description of the chosen answer (shown under each question)
export function specOf(q, c, b) {
  if (c.facts) {
    const rl = c.rl?.[q.pos];
    return [[...c.facts, ...(rl ? [`${rl[0]} kΩ`, `${rl[1]} H`] : [])].join(' · '), c.tone].filter(Boolean);
  }
  return c.spec ?? q.spec?.(b) ?? [];
}

// picture of an option (Clifton's own part thumbnails, saved in assets/parts/); pickguard colours
// have a picture per pickguard type, e.g. assets/parts/spgc-hss-tort.webp
export function partImage(q, c, b) {
  const key = q.key === 'tpgc' ? `tpgc-${b.tpg}` : q.key === 'spgc' ? `spgc-${b.spg}` : q.key;
  return `assets/parts/${key}-${c.id}.webp`;
}

export const priceOf = (b) => activeQuestions(b).reduce((sum, q) => sum + (choiceOf(q, b).price ?? 0), 0);

// rows for the build summary: { label, value, price }
export const describeBuild = (b) => activeQuestions(b).map((q) => {
  const c = choiceOf(q, b);
  return { key: q.key, label: labelOf(q, b), value: c.label, price: c.price ?? 0 };
});


// ================================================================ helpers
const mm = (v) => v / 1000;
const { lerp, clamp } = THREE.MathUtils;
const deg = THREE.MathUtils.degToRad;

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function canvasTexture(w, h, draw, { srgb = true, wrap = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function grain(g, w, h, { base, dark, light, lines = 220, wobble = 4, alpha = 0.3, seed = 3 }) {
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < lines; i++) {
    const x0 = r() * w; g.strokeStyle = r() < 0.6 ? dark : light; g.globalAlpha = alpha * (0.3 + r() * 0.7); g.lineWidth = 0.6 + r() * 2.6;
    const ph = r() * 6.28, fr = 0.003 + r() * 0.005;
    g.beginPath();
    for (let y = 0; y <= h; y += 6) { const x = x0 + Math.sin(y * fr + ph) * wobble; y ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
}
const texCache = new Map();
function cached(key, make) { if (!texCache.has(key)) texCache.set(key, make()); return texCache.get(key); }

function outlineFrom(points, n = 320) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(mm(x), mm(y), 0)), true, 'centripetal');
  const pts = curve.getSpacedPoints(n).slice(0, n).map((p) => new THREE.Vector2(p.x, p.y));
  return THREE.ShapeUtils.isClockWise(pts) ? pts.reverse() : pts;   // counter-clockwise, so "inward" is well defined
}
function offsetInward(pts, d) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    return p.clone().addScaledVector(new THREE.Vector2(t.y, -t.x), -d);
  });
}
function rr(w, h, r) {
  const s = new THREE.Shape(); const x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}
function stadium(L, H) {
  const s = new THREE.Shape(), R = H / 2;
  s.moveTo(-L / 2 + R, -R); s.lineTo(L / 2 - R, -R); s.absarc(L / 2 - R, 0, R, -Math.PI / 2, Math.PI / 2); s.lineTo(-L / 2 + R, R); s.absarc(-L / 2 + R, 0, R, Math.PI / 2, Math.PI * 1.5);
  return s;
}

// ================================================================ shapes (traced from Clifton's builder art; mm, tail at y = 0)
const SHAPES = {
  strat: {
    saddle: 147.6, pocket: 395.1, bevel: [0.006, 0.003], screws: 11,
    outline: [[-111.5, 444.8], [-105.6, 444.7], [-101.8, 443.6], [-98.6, 441.8], [-95.2, 438], [-92.4, 429.8], [-91.3, 409.7], [-89, 400], [-86.3, 394], [-83.1, 389.7], [-77.9, 385], [-73.5, 381.9], [-68.1, 379.1], [-62.7, 377.4], [-55.1, 376.1], [-48.6, 376.4], [-41, 378.9], [-36.6, 381.9], [-33.4, 385.3], [-28.9, 392.3], [-26.3, 394.2], [-12.2, 395.1], [20.9, 395.3], [23.8, 393.4], [25.1, 390.7], [25.2, 379], [25.4, 368], [25.7, 362.5], [26.4, 360.1], [31.1, 354.4], [37.2, 349], [44.8, 344.9], [52.4, 342.7], [60.5, 341.9], [67, 342.7], [73.5, 344.4], [83.3, 349.6], [90.4, 356], [94.9, 362], [97.6, 367.4], [100.1, 374.5], [103.3, 390.2], [106, 397.3], [108.7, 401.6], [112.1, 404.6], [117.5, 406.8], [121.8, 407], [125.6, 406.2], [128.9, 404.3], [132.4, 401.1], [136.4, 395.1], [140.3, 386.4], [142.5, 376.1], [143.5, 363.6], [142.3, 352.2], [140, 340.8], [137.3, 331], [122.3, 289.3], [120.4, 279.5], [119.7, 271.9], [120.1, 263.8], [122.4, 251.8], [126.5, 240.4], [141.8, 208.9], [153.6, 182.3], [164, 154.1], [167.8, 140], [171.3, 121.6], [172.1, 112.9], [172, 103.7], [171.5, 96], [170.1, 83], [166.6, 70], [162.9, 60.2], [157.2, 49.7], [151.1, 40.6], [142.5, 30.4], [135, 24.1], [121.5, 15.2], [109.2, 9.5], [98.6, 6], [86, 3.2], [73, 1.8], [50, 0.6], [25, 0.1], [0, 0], [-25, 0.4], [-45, 1.5], [-61.6, 3.2], [-76.4, 6.6], [-89.4, 10.6], [-101.2, 15.3], [-116.4, 23.7], [-127.8, 31.7], [-137.3, 40.9], [-143.4, 48.3], [-148.4, 55.9], [-152.1, 63], [-155.7, 72.2], [-157.6, 78.1], [-159.3, 87.4], [-160.4, 108.5], [-157.8, 129.7], [-154.8, 142.7], [-147.5, 165], [-136.7, 192.1], [-121.1, 228.5], [-117.5, 238.2], [-114, 250.7], [-112.4, 260], [-111.5, 271.3], [-112.5, 283.8], [-114.4, 293.6], [-118.9, 308.8], [-129.9, 339.7], [-135.7, 362], [-138.1, 379.3], [-138.1, 400], [-134.8, 417.3], [-129.2, 430.4], [-125.4, 435.8], [-121.3, 439.9], [-117, 442.9]],
    guards: {
      sss: [[119.1, 398.5], [122.4, 398.5], [124.8, 396.3], [127.5, 391.4], [130.5, 382.5], [132.1, 374.4], [132.1, 355.7], [130.5, 346.7], [126.4, 331.3], [119.4, 311.8], [113.2, 296.4], [109.4, 282.6], [108.6, 278.5], [108.6, 259.8], [111.8, 245.2], [115.6, 233.8], [122.9, 216], [138.1, 182.7], [144.6, 166.4], [152.4, 142.9], [156.5, 127.4], [158.1, 117.7], [158.1, 112], [156, 104.7], [154.1, 101.5], [150.8, 98.7], [145.1, 96.6], [142.7, 96.6], [135.4, 98.7], [132.1, 100.4], [122.4, 107.1], [114.3, 114.4], [105.3, 122.6], [96.4, 129.9], [83.4, 138.3], [76.1, 141.5], [63.9, 145.3], [53.3, 146.1], [43.1, 146.7], [42.8, 158.3], [42, 159.9], [39.5, 161.6], [-33.6, 161.6], [-35.2, 160.7], [-36.8, 158.3], [-37.1, 146.9], [-40.9, 145.3], [-48.2, 146.1], [-54.7, 148.3], [-61.2, 152.6], [-65.2, 156.7], [-69.6, 163.2], [-73.4, 173.7], [-75, 181.1], [-75, 198.9], [-71.7, 215.2], [-67.1, 229], [-59.3, 247.7], [-52.2, 268], [-49.8, 279.3], [-48.2, 288.3], [-46.6, 298], [-46.6, 315.9], [-47.4, 324.8], [-49, 334.6], [-54.7, 358.9], [-53.1, 363.8], [-49, 367.3], [-44.9, 367.3], [-37.6, 366.5], [-30.3, 363], [-29.5, 361.4], [-29.5, 341.1], [-27.1, 337.8], [-21.4, 335.4], [-14.9, 334.6], [14.4, 333.8], [22.5, 334.6], [26.5, 337], [28.4, 342.7], [30.6, 343.8], [41.2, 338.4], [50.1, 335.4], [58.2, 332.9], [64.7, 332.9], [72, 335.4], [81, 338.1], [93.1, 345.9], [98.8, 351.6], [106.4, 362.2], [109.7, 368.7], [113.4, 380.1], [116.7, 395.5]],
      hss: [[117.5, 401.7], [121.6, 401.4], [126.7, 393], [128.9, 386.5], [130.5, 378.4], [130.5, 358.1], [126.4, 339.4], [121, 323.2], [113.2, 303.7], [109.4, 292.3], [107, 281], [107, 263.9], [110.2, 248.5], [113.2, 239.5], [119.7, 223.3], [130, 201.4], [140.5, 176.2], [144.6, 165.6], [152.4, 141.3], [154.9, 131.5], [156.5, 120.9], [156.5, 114.4], [154.6, 108], [152.4, 104.7], [149.2, 102], [143.5, 99.8], [141.1, 99.8], [133.8, 102], [128.1, 105.2], [119.9, 111.2], [110.2, 120.1], [102.9, 126.6], [91.5, 135.6], [83.4, 140.7], [76.9, 144], [62.3, 148.6], [51.7, 149.4], [41.4, 150.5], [41.2, 162.4], [40.3, 164], [38.7, 164.8], [-35.2, 164.8], [-36.8, 164], [-38.4, 160.7], [-38.7, 150.2], [-43.3, 148.6], [-49, 149.4], [-53.9, 150.7], [-57.1, 152.1], [-62.8, 155.9], [-66.1, 159.1], [-69.6, 164], [-72.8, 170.5], [-75, 177], [-76.6, 185.1], [-76.6, 201.4], [-74.2, 215.2], [-72.6, 220.9], [-54.7, 268], [-51.4, 280.1], [-49.8, 288.3], [-48.2, 300.5], [-48.2, 321.6], [-49.8, 331.3], [-50.6, 338.6], [-55.5, 358.1], [-56, 362.2], [-55, 366.2], [-52.2, 369.5], [-49, 371.1], [-43.3, 371.1], [-32.8, 367.1], [-31.1, 364.6], [-31.1, 344.3], [-28.7, 341.1], [-25.4, 339.4], [-13.3, 337], [20.9, 337.8], [25.7, 341.1], [26.8, 345.9], [29, 346.7], [37.9, 342.4], [48.5, 338.6], [57.4, 336.2], [63.1, 336.2], [74.5, 338.9], [84.2, 344], [91.5, 349.2], [98, 355.7], [102.3, 361.4], [108.8, 373.6], [111.8, 382.5], [115.1, 397.9]],
      hh: [[118.3, 401.7], [122.4, 401.4], [125.4, 397.9], [127.5, 393], [129.7, 386.5], [131.3, 379.2], [132.1, 364.6], [130.5, 352.4], [125.6, 333.8], [121, 320.8], [113.2, 301.3], [109.4, 289.1], [107.8, 280.1], [107.8, 264.7], [111, 249.3], [115.6, 235.5], [121.3, 221.7], [124.3, 216], [138.9, 182.7], [144.6, 168.1], [151.6, 146.9], [155.7, 131.5], [157.3, 121.8], [157.3, 114.4], [155.1, 107.1], [150, 102], [144.3, 99.8], [138.6, 100.6], [132.9, 102.8], [127.3, 106.3], [120.8, 111.2], [111, 120.1], [103.7, 126.6], [94.8, 133.9], [84.2, 140.7], [73.6, 145.6], [63.1, 148.6], [52.5, 149.4], [42.2, 150.5], [42, 162.4], [41.2, 164], [39.5, 164.8], [-34.4, 164.8], [-36, 164], [-37.6, 160.7], [-37.6, 150.2], [-42.5, 148.6], [-48.2, 149.4], [-53.1, 150.7], [-59.6, 154.2], [-65.2, 159.1], [-71.2, 168.9], [-74.2, 177.8], [-75.8, 185.9], [-75.8, 200.5], [-74.2, 211.1], [-72.6, 217.6], [-67.1, 233.8], [-57.7, 256.6], [-53.1, 270.4], [-50.6, 279.3], [-49, 287.5], [-47.4, 299.6], [-47.4, 322.4], [-48.2, 329.7], [-49.8, 339.4], [-54.7, 358.9], [-54.7, 364.6], [-53.1, 367.9], [-48.2, 371.1], [-42.5, 371.1], [-31.9, 367.1], [-30.3, 364.6], [-30.3, 345.1], [-28.7, 341.9], [-24.6, 339.4], [-12.4, 337], [21.7, 337.8], [26.5, 341.1], [28.4, 346.5], [29.8, 346.7], [38.7, 342.4], [49.3, 338.6], [58.2, 336.2], [63.9, 336.2], [74.5, 338.6], [81, 341.6], [92.3, 349.2], [99.6, 356.5], [104.8, 363.8], [108, 369.5], [112.6, 382.5], [115.9, 397.9]],
    },
    // pickup centres (mm from the tail); neck humbucker sits a touch lower so it clears the 22nd-fret board end
    slots: { neck: 305.3, mid: 249.6, bridge: 192.1, bridgeSlant: -8.8, hbNeck: 301, hbBridge: 188.3 },
    trem: { cx: 2, cy: 138.4, w: 76, h: 44.5 },
    knobs: [[62.1, 184.0], [100.7, 159.6], [133.8, 130.8]],
    switch: [101.2, 210.6, -47],
    jack: [104.5, 81.9, -40],
    strapTop: [-111.5, 444.8],
  },
  tele: {
    saddle: 148.7, pocket: 409.2, bevel: [0.003, 0.0022], screws: 8,
    outline: [[-101.8, 419.1], [-91.4, 419.5], [-82.8, 418.1], [-76.8, 416.3], [-64.9, 411], [-57.8, 406.9], [-44.2, 397.8], [-39.3, 395.9], [-37.2, 396], [-35, 397.3], [-28.4, 405.9], [-24.7, 408.3], [0.3, 409.2], [14.6, 408.3], [18.7, 408.7], [22, 407.7], [24.3, 405.9], [25.2, 403.2], [25.4, 386.9], [25.5, 375], [25.4, 364.7], [25.7, 363.1], [29.8, 360.3], [33.9, 352.2], [40.4, 345.4], [44.8, 343.1], [54, 341.4], [60, 342.2], [68.7, 345.5], [75.2, 350], [81.8, 356.6], [86, 362.5], [90, 370.1], [94.5, 381.5], [100, 398.3], [104.2, 405.4], [107.7, 408.6], [112.1, 410.8], [117.5, 411.8], [122.4, 410.7], [125.1, 409.4], [130, 405.4], [135.6, 396.7], [139.4, 386.4], [141.9, 368.5], [141.4, 359.3], [139.9, 349], [133.2, 325.6], [118.3, 287.1], [115.3, 271.3], [115.9, 259.4], [118.3, 248], [121.4, 239.3], [129.3, 221.4], [147.5, 183.4], [151.7, 173.7], [159.7, 150.9], [163.9, 134.6], [165.9, 122.7], [167.4, 108.5], [167.4, 99.9], [165.4, 85.2], [162.4, 72.2], [157.3, 59.2], [151.1, 47.8], [145.4, 39.6], [136.5, 29.8], [126.7, 22], [118, 16.7], [105.6, 11], [88.7, 6.3], [70.3, 3.3], [48.6, 1.1], [27.9, 0], [-35.5, 0], [-57.3, 1.6], [-72.5, 3.6], [-85.5, 6.3], [-100.7, 11], [-107.7, 14], [-120.2, 20.7], [-128.9, 27], [-136.5, 33.6], [-144.3, 42.9], [-152.9, 56.4], [-157.6, 66.8], [-160.8, 76.5], [-164.2, 95.5], [-164.7, 107.5], [-161.6, 133.5], [-158, 147.6], [-147.3, 178], [-125.2, 226.3], [-122.5, 233.4], [-117.9, 249.6], [-116.6, 263.8], [-117.5, 275.1], [-119.3, 284.4], [-124.5, 299.6], [-134.9, 325.6], [-140.6, 344.1], [-143, 360.4], [-141.9, 373.9], [-138.7, 387.5], [-135.2, 395.6], [-130.3, 403.2], [-126.2, 408.1], [-119.7, 413], [-115.3, 415.3], [-108.8, 417.8]],
    guards: {
      sc: [[112.6, 407.9], [119.7, 407.8], [124.5, 405.1], [127.4, 402.1], [132, 394], [135.1, 386.4], [137, 377.2], [137, 360.9], [135.1, 347.9], [125.9, 320.7], [116.1, 295.8], [113.5, 287.1], [111, 270.8], [111, 261.6], [113, 249.6], [117.6, 236.1], [124.9, 220.3], [125.1, 217.6], [124.4, 216.2], [121.3, 214.9], [113.7, 214.9], [111.5, 215.5], [109.5, 217.6], [106.4, 224.1], [102.8, 227.7], [96.9, 230.3], [90.9, 230.6], [85.5, 229.1], [81.1, 226.2], [78.3, 222.5], [76.1, 216], [74.1, 214.9], [46.9, 214], [45.4, 215], [44.7, 216.5], [44.2, 225.2], [43.1, 227.3], [39.9, 228.5], [31.7, 228.5], [18.7, 227.9], [-41, 227.4], [-43.1, 226.6], [-44.3, 225.2], [-45, 214.9], [-46.9, 213], [-56.2, 212.7], [-77.3, 212.2], [-79.5, 212.8], [-81.7, 214.4], [-84, 217.6], [-86.7, 226.3], [-88.2, 235], [-89.3, 245.8], [-89.8, 254.5], [-89.8, 280], [-89.3, 295.8], [-87.6, 309.9], [-84.1, 327.2], [-77.8, 344.6], [-66.9, 366.9], [-60.6, 376.1], [-56.7, 380.4], [-50.7, 385], [-41.5, 390.1], [-33.9, 392.4], [-29.8, 391.6], [-29, 389.7], [-29, 364.7], [-28.5, 350.6], [-27.6, 346.2], [-26.3, 345.3], [-19.3, 344.7], [-13.3, 343], [-3.5, 343], [-1.4, 341.9], [4.6, 341.9], [10.6, 343], [21.4, 343], [24.7, 342.6], [26.1, 343.5], [26.9, 345.7], [26.9, 357.1], [27.6, 358.6], [30, 355.5], [33.7, 348.4], [38.3, 343.7], [45.9, 340.7], [50.2, 339.7], [54, 339.7], [61.6, 341.1], [69.2, 344.2], [74.6, 348.2], [81.1, 355.5], [87.9, 364.2], [92.4, 372.3], [95.2, 379.3], [99.9, 388], [103.5, 400.5], [106.6, 404.6], [109.9, 406.9]],
      hb: [[114.2, 407.9], [121.3, 406.9], [125, 404.5], [128, 401.1], [131.5, 395.1], [134.5, 387.5], [136.1, 382.6], [137, 376.1], [137, 360.9], [135.1, 347.9], [125.9, 320.7], [114.5, 290.9], [112.6, 283.3], [111, 270.8], [111, 261.6], [113.5, 247.5], [117.6, 236.1], [124.9, 220.3], [125.1, 217.6], [124.4, 216.2], [121.3, 214.9], [113.7, 214.9], [111.5, 215.6], [110, 217.1], [107.1, 223.6], [102.3, 228.3], [97.4, 230.2], [90.9, 230.6], [85.5, 229.1], [81.1, 226.2], [78.3, 222.5], [76.1, 216], [74.1, 214.9], [46.9, 214.1], [45, 216], [44.8, 224.7], [43.7, 226.8], [39.9, 228.5], [30.7, 228.5], [17.1, 227.9], [-41, 227.4], [-43.1, 226.6], [-44.3, 225.2], [-45, 214.9], [-46.9, 213], [-56.7, 212.7], [-77.3, 212.2], [-79.5, 212.8], [-81.6, 214.4], [-83.7, 217.6], [-86.2, 225.8], [-88.2, 237.2], [-89.3, 251.3], [-89.3, 288.7], [-87.6, 306.6], [-83.5, 327.8], [-76.7, 346.2], [-66.4, 366.9], [-61.7, 373.9], [-56.7, 379.9], [-49.1, 385.5], [-40.4, 390.1], [-31.7, 392.4], [-29.7, 391.3], [-29, 389.7], [-29, 364.7], [-27.9, 345.7], [-26.3, 343.2], [-19.6, 342.7], [-13.3, 339.7], [3.5, 339.2], [12.8, 340.9], [23.6, 340.5], [25.7, 341.9], [27.1, 344.6], [27.4, 349.5], [26.9, 356], [27.9, 358.1], [28.9, 357.1], [33.6, 348.4], [37.7, 343.9], [42.6, 341.5], [50.2, 339.6], [56.7, 339.7], [64.9, 341.7], [71.4, 344.9], [76.1, 349], [82.2, 356], [88.4, 364.2], [92.4, 371.2], [96.2, 380.4], [99.5, 385.9], [102.6, 396.7], [104.7, 401.6], [108.8, 405.7]],
    },
    slots: { lipstick: 316.5, hbNeck: 302.5, bridge: 198.4, bridgeSlant: -18.4 },
    plate: { cx: 0.8, top: 223.6, bottom: 130.2, w: 80.3 },
    control: { cx: 94.7, top: 230.6, bottom: 61.3, w: 33.6, slot: 196.5, tip: 183.4, knobs: [146.5, 81.4], screws: [223.6, 65.1] },
    jack: [167.4, 108.5],
    strapTop: [-95, 419.5],
  },
};

// Clifton's headstock (the same roasted-maple neck art is used for both bodies). mm, nut line at y = 0.
const HEAD = [[20.9, 4], [20.9, 11.9], [20.9, 16.3], [20.9, 20.6], [22, 25], [23.1, 29.3], [25.2, 33.6], [27.4, 35.8], [29.6, 38], [32.3, 40.2], [35, 42.3], [38.3, 44.5], [41.5, 46.7], [44.2, 48.8], [46.4, 51], [48.6, 55.4], [49.7, 59.7], [49.7, 64], [49.1, 68.4], [48, 72.7], [46.4, 77.1], [44.8, 81.4], [43.7, 85.7], [42.1, 90.1], [40.4, 94.4], [39.3, 98.8], [37.7, 103.1], [36.6, 107.5], [35, 111.8], [33.9, 116.1], [32.8, 120.5], [32.3, 124.8], [31.2, 129.2], [31.2, 135.7], [31.2, 140], [32.3, 144.4], [33.4, 146.5], [35.5, 148.7], [37.7, 150.9], [41, 153], [45.3, 157.4], [48, 161.7], [49.7, 163.9], [50.7, 168.2], [51.8, 172.6], [51.8, 179.1], [51.3, 183.4], [49.7, 187.8], [48, 192.1], [45.9, 194.3], [41.5, 198.6], [38.3, 200.8], [31.2, 203], [24.7, 203], [17.6, 200.8], [13.8, 198.6], [9, 194.3], [6.2, 189.9], [4.1, 185.6], [2.4, 181.3], [0.3, 172.6], [-1.4, 166.1], [-2.4, 161.7], [-4.1, 157.4], [-5.2, 153], [-5.7, 148.7], [-7.3, 144.4], [-8.4, 140], [-9.5, 135.7], [-10.6, 131.3], [-11.7, 127], [-12.8, 122.7], [-13.8, 118.3], [-14.9, 114], [-16, 109.6], [-17.1, 105.3], [-18.2, 101], [-19.3, 96.6], [-20.4, 92.3], [-21.4, 87.9], [-22.5, 83.6], [-23.6, 79.2], [-24.7, 74.9], [-25.8, 70.6], [-26.9, 66.2], [-27.9, 61.9], [-29, 57.5], [-30.7, 53], [-31.9, 48.8], [-33.4, 44.5], [-35, 40.2], [-35.5, 35.8], [-35.5, 33.6], [-34.5, 31.5], [-33.4, 29.3], [-31.2, 27.1], [-29, 25], [-26.9, 22.8], [-25.2, 20.6], [-23.6, 18.5], [-22.5, 16.3], [-21.4, 14.1], [-21.4, 11.9], [-21.4, 4]];
const POSTS = [[-21.3, 44.3], [-15.1, 71.0], [-7.7, 96.1], [-1.0, 121.3], [5.7, 146.3], [11.7, 171.2]];   // low E → high E
const TREES = [[12.5, 44.7], [-1, 23.7]];   // E/B and G/D string trees

const SCALE = 0.648, FRETS = 22;

// ================================================================ materials
function chrome() {
  const m = new THREE.MeshStandardMaterial({ color: '#f1f1f4', metalness: 1, roughness: 0.13 });
  m.userData.envScale = 2.0;   // reads as polished metal on the black stage
  return m;
}

function finishMaterials(body, fin, pts) {
  const W = 0.36, L = 0.48;
  const gloss = { roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.05 };
  if (fin === 'sunburst') {
    const strat = body === 'strat';
    const top = cached(`burst:${body}`, () => {
      const t = canvasTexture(768, Math.round(768 * (L / W)), (g, w, h) => {
        grain(g, w, h, strat
          ? { base: '#f58a06', dark: '#c25a00', light: '#ffb347', lines: 200, wobble: 6, alpha: 0.22, seed: 9 }
          : { base: '#ee9206', dark: '#c46a00', light: '#ffbb4d', lines: 200, wobble: 6, alpha: 0.22, seed: 9 });
        const px = (p) => [(p.x / W + 0.5) * w, (1 - p.y / L) * h];
        g.save();
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...px(p)) : g.moveTo(...px(p)))); g.closePath(); g.clip();
        // measured from Clifton's art: the Strat burst has a wide black edge, the Tele is mostly amber
        const rings = strat
          ? [[405, 'rgba(225,90,0,0.45)', 60], [300, 'rgba(150,15,0,0.8)', 40], [205, 'rgba(45,0,0,0.92)', 24], [150, 'rgba(7,1,1,1)', 10]]
          : [[300, 'rgba(214,100,0,0.35)', 40], [190, 'rgba(170,40,0,0.7)', 22], [120, 'rgba(60,0,0,0.85)', 12], [72, 'rgba(7,0,0,1)', 6]];
        for (const [lw, col, blur] of rings) { g.filter = `blur(${blur}px)`; g.strokeStyle = col; g.lineWidth = lw; g.stroke(); }
        g.restore(); g.filter = 'none';
      }, { wrap: false });
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(1 / W, 1 / L); t.offset.set(0.5, 0);
      return t;
    });
    return [new THREE.MeshPhysicalMaterial({ map: top, ...gloss }), new THREE.MeshPhysicalMaterial({ color: '#0a0302', ...gloss })];
  }
  const solid = {
    butterscotch: { color: '#fec400' },
    white: { color: '#f5f5f2' },
    black: { color: '#070707' },
    khaki: { color: '#efdfc0' },
    teal: { color: '#4794a8', metalness: 0.5, roughness: 0.32 },
  }[fin];
  const m = new THREE.MeshPhysicalMaterial({ ...gloss, ...solid });
  return [m, m];
}

const GUARD_FACE = { vw: '#ece1c6', white: '#f6f5f2', black: '#121212' };
function guardMats(id) {
  if (id === 'tort') {
    const t = cached('tort', () => canvasTexture(512, 512, (g, w, h) => {
      const r = rng(11); g.fillStyle = '#3a130b'; g.fillRect(0, 0, w, h); g.filter = 'blur(6px)';
      for (let i = 0; i < 260; i++) { g.fillStyle = ['#6e2a16', '#8f3d1f', '#a8552a', '#22080a', '#c06a33'][Math.floor(r() * 5)]; g.globalAlpha = 0.3 + r() * 0.5; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 30, 3 + r() * 12, r() * 3, 0, Math.PI * 2); g.fill(); }
      g.filter = 'none'; g.globalAlpha = 1;
    }));
    t.repeat.set(9, 9);
    return [new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 1 }), new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.4 })];
  }
  const edge = id === 'black' ? '#e4e4e4' : '#1a1a1a';   // 3-ply: the bevel shows the middle layer
  return [new THREE.MeshPhysicalMaterial({ color: GUARD_FACE[id], roughness: 0.3, clearcoat: 0.6 }), new THREE.MeshStandardMaterial({ color: edge, roughness: 0.5 })];
}

function roastedMaple(seed, base = '#a9562e') {
  return canvasTexture(512, 1024, (g, w, h) => {
    grain(g, w, h, { base, dark: '#6b2e14', light: '#cf7a46', lines: 160, wobble: 3, alpha: 0.3, seed });
    const r = rng(seed + 7);   // flame: soft wavy bands across the grain
    for (let i = 0; i < 90; i++) {
      const y0 = r() * h, ph = r() * 6.28, amp = 4 + r() * 8;
      g.strokeStyle = r() < 0.5 ? 'rgba(255,196,130,0.10)' : 'rgba(70,22,6,0.12)'; g.lineWidth = 3 + r() * 9;
      g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * 0.03 + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
  });
}

function cliftonLogo(image) {
  return cached(`logo:${!!image}`, () => canvasTexture(512, 300, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const ink = '#1c120b';   // the builder art prints the script logo dark on the roasted maple
    if (image) {
      const c = document.createElement('canvas'); c.width = Math.round(image.width * 0.47); c.height = image.height;
      c.getContext('2d').drawImage(image, 0, 0);
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
      const tg = t.getContext('2d'); tg.drawImage(c, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = ink; tg.fillRect(0, 0, t.width, t.height);
      drawFitted(g, t, 6, 6, w - 12, h - 12);
    } else {
      g.fillStyle = ink; g.font = '180px "Pinyon Script", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Clifton', w / 2, h / 2);
    }
  }, { wrap: false }));
}

// which pickup sits where, for the 3D model (null = no pickup, cavity shown)
function pickupLayout(b) {
  const look = (key) => { const c = choiceOf(Q[key], b); return c.id === 'none' ? null : c.look; };
  if (isTele(b)) {
    return {
      neck: b.tpg === 'sc' ? { kind: 'lipstick', look: look('tn') } : b.tpg === 'hb' ? { kind: 'hb', look: look('thn') } : null,
      bridge: { kind: 'tele', look: look('tb') },
    };
  }
  if (b.spg === 'hh') return { neck: { kind: 'hb', look: look('shn') }, bridge: { kind: 'hb', look: look('shb') } };
  return {
    neck: { kind: 'sc', look: look('sn') }, mid: { kind: 'sc', look: look('sm') },
    bridge: b.spg === 'hss' ? { kind: 'hb', look: look('shb') } : { kind: 'sc', look: look('sb') },
  };
}

// ================================================================ builder
export function buildElectric(buildIn, { logoImage = null } = {}) {
  const b = normalizeBuild(buildIn);
  const shapeId = b.body, S = SHAPES[shapeId], strat = shapeId === 'strat';
  const group = new THREE.Group(); group.name = 'electric';
  const add = (geo, mat, parent = group) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };

  const saddleY = mm(S.saddle), nutY = saddleY + SCALE;
  const fretY = (n) => nutY - SCALE * (1 - Math.pow(2, -n / 12));
  const fbEnd = fretY(FRETS) - 0.004;
  const nutW = 0.042, fbEndW = 0.056;
  const fbHalf = (y) => lerp(fbEndW, nutW, clamp((y - fbEnd) / (nutY - fbEnd), 0, 1)) / 2;
  const BODY_T = 0.045, FB_BOT = 0.006, FB_T = 0.0055, FB_TOP = FB_BOT + FB_T;

  const hw = chrome();
  const dark = new THREE.MeshBasicMaterial({ color: '#030303' });
  const bone = new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 0.35 });
  const roast = cached('roast', () => roastedMaple(21));
  const neckMat = new THREE.MeshPhysicalMaterial({ map: roast, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  neckMat.userData.envScale = 0.5;
  const headTex = cached('roastHead', () => { const t = roastedMaple(33); t.repeat.set(6, 3); return t; });
  const headMat = new THREE.MeshPhysicalMaterial({ map: headTex, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  headMat.userData.envScale = 0.6;
  const board = choiceOf(Q.neck, b).board;
  const fbMat = board === 'maple'
    ? Object.assign(new THREE.MeshPhysicalMaterial({ map: cached('roastBoard', () => roastedMaple(5, '#b4683f')), roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.2 }), { userData: { envScale: 0.5 } })
    : new THREE.MeshStandardMaterial({ map: cached('rose', () => canvasTexture(256, 1024, (g, w, h) => grain(g, w, h, { base: '#46322f', dark: '#1d110d', light: '#644740', lines: 160, wobble: 5, alpha: 0.5, seed: 5 }))), roughness: 0.7 });

  // ---- body: traced outline, rounded edge (the bevel is grown inward so the silhouette stays exact)
  const outline = outlineFrom(S.outline, 360);
  const [bevT, bevS] = S.bevel;
  const body = add(new THREE.ExtrudeGeometry(new THREE.Shape(offsetInward(outline, bevS)), { depth: BODY_T - 2 * bevT, bevelEnabled: true, bevelThickness: bevT, bevelSize: bevS, bevelSegments: 6, curveSegments: 64 }),
    finishMaterials(shapeId, strat ? b.sfin : b.tfin, outline));
  body.position.z = -(BODY_T - bevT);

  // ---- pickguard (3-ply) + screws
  const guardId = strat ? b.spg : (b.tpg === 'hb' ? 'hb' : 'sc');
  const guardColour = strat ? b.spgc : b.tpgc;
  const pgTopZ = 0.0025;
  const pgPts = outlineFrom(S.guards[guardId], 300);
  const pg = add(new THREE.ExtrudeGeometry(new THREE.Shape(pgPts), { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 32 }), guardMats(guardColour));
  pg.position.z = 0.0007;
  {
    const screwGeo = new THREE.SphereGeometry(0.0023, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const ring = offsetInward(pgPts, 0.0042);
    for (let k = 0; k < S.screws; k++) {
      const p = ring[Math.floor(((k + 0.5) / S.screws) * ring.length)];
      const sc = add(screwGeo, hw); sc.rotation.x = Math.PI / 2; sc.position.set(p.x, p.y, pgTopZ);
    }
  }

  // ---- pickups
  const cream = new THREE.MeshPhysicalMaterial({ color: '#ebe2cd', roughness: 0.35, clearcoat: 0.5 });
  const blackPlastic = new THREE.MeshPhysicalMaterial({ color: '#0e0e10', roughness: 0.4, clearcoat: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: '#8d8a84', metalness: 1, roughness: 0.3 }); steel.userData.envScale = 1.2;
  const stringX = (i, spread) => lerp(-spread / 2, spread / 2, i / 5);
  const place = (g, y, slantDeg = 0) => { g.position.y = y; g.rotation.z = deg(slantDeg); group.add(g); return g; };
  const cavity = (w, h, y, slantDeg = 0, base = pgTopZ) => { const g = new THREE.Group(); const c = add(new THREE.ShapeGeometry(rr(w, h, Math.min(w, h) / 2.2)), dark, g); c.position.z = base + 0.0001; return place(g, y, slantDeg); };
  const poles = (g, look, z, spread, rowY = 0) => {
    if (look === 'rail') {
      for (const dy of [-0.0032, 0.0032]) { const r = add(new THREE.BoxGeometry(0.056, 0.0018, 0.0012), hw, g); r.position.set(0, rowY + dy, z); }
      return;
    }
    for (let i = 0; i < 6; i++) {
      const hex = look === 'hex' || look === 'invader';
      const p = add(new THREE.CylinderGeometry(hex ? 0.0031 : 0.0024, hex ? 0.0031 : 0.0024, 0.0012, hex ? 6 : 14), look === 'invader' ? steel : hw, g);
      p.rotation.x = Math.PI / 2; p.position.set(stringX(i, spread), rowY, z);
    }
  };
  function singleCoil(y, look, slantDeg = 0) {   // Strat-size: cream cover; round, hex or rail poles
    if (!look) return cavity(0.086, 0.019, y, slantDeg);
    const g = new THREE.Group();
    const cov = add(new THREE.ExtrudeGeometry(stadium(0.083, 0.0175), { depth: 0.0052, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0008, bevelSegments: 3, curveSegments: 16 }), cream, g);
    cov.position.z = pgTopZ + 0.001;
    poles(g, look, pgTopZ + 0.0072, 0.0525);
    return place(g, y, slantDeg);
  }
  function humbucker(y, look, slantDeg = 0, base = pgTopZ) {
    if (!look) return cavity(0.071, 0.039, y, slantDeg, base);
    const g = new THREE.Group();
    const ring = add(new THREE.ExtrudeGeometry(rr(0.086, 0.044, 0.005), { depth: 0.0018, bevelEnabled: false }), blackPlastic, g); ring.position.z = base;
    const top = base + 0.0018 + 0.0048 + 0.0008;
    if (look === 'open') {   // zebra open-coil: one cream bobbin, one black, slugs + screws
      for (const [dy, mat] of [[0.0095, cream], [-0.0095, blackPlastic]]) {
        const bob = add(new THREE.ExtrudeGeometry(rr(0.068, 0.0175, 0.004), { depth: 0.0048, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0005, bevelSegments: 2 }), mat, g);
        bob.position.set(0, dy, base + 0.0018);
      }
      poles(g, 'sc', top + 0.0002, 0.0505, 0.0095); poles(g, 'sc', top + 0.0002, 0.0505, -0.0095);
    } else {
      const cov = add(new THREE.ExtrudeGeometry(rr(0.069, 0.038, 0.003), { depth: 0.0048, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 2 }), look === 'cover' ? hw : blackPlastic, g);
      cov.position.z = base + 0.0018;
      if (look === 'invader') { poles(g, 'invader', top + 0.0004, 0.0505, 0.0095); poles(g, 'invader', top + 0.0004, 0.0505, -0.0095); }
      else for (let i = 0; i < 6; i++) { const h = add(new THREE.CircleGeometry(0.0019, 12), dark, g); h.position.set(stringX(i, 0.0505), 0.0095, top + 0.0001); }
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const sc = add(new THREE.SphereGeometry(0.0015, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), hw, g); sc.rotation.x = Math.PI / 2; sc.position.set(sx * 0.038, sy * 0.0185, base + 0.0018); }
    return place(g, y, slantDeg);
  }
  function lipstick(y, look) {   // Tele neck: chrome lipstick tube
    if (!look) return cavity(0.082, 0.017, y);
    const g = new THREE.Group();
    const tube = add(new THREE.ExtrudeGeometry(stadium(0.077, 0.0115), { depth: 0.002, bevelEnabled: true, bevelThickness: 0.0022, bevelSize: 0.002, bevelSegments: 6, curveSegments: 20 }), hw, g);
    tube.position.z = pgTopZ + 0.0022;
    const seam = add(new THREE.BoxGeometry(0.07, 0.0005, 0.0004), dark, g); seam.position.z = pgTopZ + 0.0066;
    return place(g, y);
  }
  function teleBridgePickup(y, look, slantDeg, base) {   // black, mounted in the bridge plate
    if (!look) return cavity(0.074, 0.02, y, slantDeg, base);
    const g = new THREE.Group();
    const cov = add(new THREE.ExtrudeGeometry(stadium(0.071, 0.018), { depth: 0.0058, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 16 }), blackPlastic, g);
    cov.position.z = base + 0.0008;
    poles(g, look === 'teleRail' ? 'rail' : 'sc', base + 0.0076, 0.0525);
    return place(g, y, slantDeg);
  }

  const P = pickupLayout(b), sl = S.slots;
  if (strat) {
    if (P.neck.kind === 'hb') humbucker(mm(sl.hbNeck), P.neck.look); else singleCoil(mm(sl.neck), P.neck.look);
    if (P.mid) singleCoil(mm(sl.mid), P.mid.look);
    if (P.bridge.kind === 'hb') humbucker(mm(sl.hbBridge), P.bridge.look); else singleCoil(mm(sl.bridge), P.bridge.look, sl.bridgeSlant);
  } else {
    if (P.neck?.kind === 'lipstick') lipstick(mm(sl.lipstick), P.neck.look);
    if (P.neck?.kind === 'hb') humbucker(mm(sl.hbNeck), P.neck.look);
  }

  // ---- bridge + saddles
  const saddleTop = [];
  let anchorY;
  if (strat) {
    const T = S.trem;
    const plate = add(new THREE.ExtrudeGeometry(rr(mm(T.w), mm(T.h), 0.004), { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0005, bevelSegments: 2 }), hw);
    plate.position.set(mm(T.cx), mm(T.cy), 0.0005);
    const stagger = [3.2, 2.4, 1.7, 2.3, 1.4, 0.2].map(mm);   // intonation: low E furthest back
    for (let i = 0; i < 6; i++) {
      const h = [0.0088, 0.0092, 0.0095, 0.0095, 0.0092, 0.0088][i];
      const s = add(new THREE.BoxGeometry(0.0094, 0.017, h), hw);
      const x = stringX(i, 0.0525), y = saddleY - stagger[i] - 0.0045;
      s.position.set(x, y, 0.0028 + h / 2);
      saddleTop.push(new THREE.Vector3(x, saddleY - stagger[i], 0.0028 + h + 0.0004));
    }
    anchorY = mm(T.cy - T.h / 2) + 0.006;
    for (let i = 0; i < 6; i++) { const hole = add(new THREE.CircleGeometry(0.0013, 10), dark); hole.position.set(stringX(i, 0.0525), anchorY, 0.0034); }
    for (const sx of [-1, 1]) {   // two pivot screws at the front corners
      const sc = add(new THREE.SphereGeometry(0.0028, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), hw); sc.rotation.x = Math.PI / 2;
      sc.position.set(mm(T.cx) + sx * (mm(T.w) / 2 - 0.0045), mm(T.cy + T.h / 2) - 0.0045, 0.0028);
    }
  } else {
    // flat plate with a raised back lip, three solid bronze barrel saddles; the bridge pickup sits in the plate
    const T = S.plate, h = mm(T.top - T.bottom), cy = mm((T.top + T.bottom) / 2);
    const plate = add(new THREE.ExtrudeGeometry(rr(mm(T.w), h, 0.005), { depth: 0.0016, bevelEnabled: false }), hw);
    plate.position.set(mm(T.cx), cy, 0.0004);
    const lip = add(new THREE.BoxGeometry(mm(T.w) - 0.004, 0.0016, 0.0085), hw); lip.position.set(mm(T.cx), mm(T.bottom) + 0.0012, 0.0004 + 0.0016 + 0.00425);
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a35b', metalness: 1, roughness: 0.28 }); brass.userData.envScale = 1.6;
    for (let k = 0; k < 3; k++) {
      const barrel = add(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0176, 18), brass);
      barrel.rotation.z = Math.PI / 2;
      const x = lerp(-0.0175, 0.0175, k / 2), y = saddleY - mm([2.6, 2.0, 1.0][k]);
      barrel.position.set(x, y, 0.0068);
      const screw = add(new THREE.CylinderGeometry(0.0011, 0.0011, y - mm(T.bottom) - 0.002, 8), hw); screw.position.set(x, (y + mm(T.bottom)) / 2, 0.0062);
    }
    for (let i = 0; i < 6; i++) saddleTop.push(new THREE.Vector3(stringX(i, 0.0525), saddleY - mm([2.6, 2.6, 2.0, 2.0, 1.0, 1.0][i]), 0.0112));
    anchorY = mm(T.bottom) + 0.006;
    for (let i = 0; i < 6; i++) { const hole = add(new THREE.CircleGeometry(0.0013, 10), dark); hole.position.set(stringX(i, 0.0525), anchorY, 0.0021); }
    teleBridgePickup(mm(sl.bridge), P.bridge.look, sl.bridgeSlant, 0.002);
  }

  // ---- controls
  if (strat) {
    const knobCol = { vw: '#ece1c6', white: '#f6f5f2', black: '#151515', tort: '#ece1c6' }[guardColour];
    const knobPlastic = new THREE.MeshPhysicalMaterial({ color: knobCol, roughness: 0.35, clearcoat: 0.6 });
    for (const [x, y] of S.knobs) {
      const k = add(new THREE.CylinderGeometry(0.0085, 0.0105, 0.012, 24), knobPlastic); k.rotation.x = Math.PI / 2; k.position.set(mm(x), mm(y), pgTopZ + 0.006);
      const cap = add(new THREE.CylinderGeometry(0.0072, 0.0085, 0.0012, 24), knobPlastic); cap.rotation.x = Math.PI / 2; cap.position.set(mm(x), mm(y), pgTopZ + 0.0126);
    }
    const [sx, sy, ang] = S.switch;
    const slot = add(new THREE.BoxGeometry(0.004, 0.026, 0.0006), dark); slot.rotation.z = deg(ang + 90); slot.position.set(mm(sx), mm(sy), pgTopZ + 0.0004);
    const tip = add(new THREE.BoxGeometry(0.0055, 0.0095, 0.012), knobPlastic); tip.rotation.z = deg(ang + 90); tip.position.set(mm(sx), mm(sy), pgTopZ + 0.006);
    // boat-style output jack plate
    const [jx, jy, ja] = S.jack;
    const boat = new THREE.Shape(); boat.absellipse(0, 0, 0.03, 0.013, 0, Math.PI * 2);
    const jp = add(new THREE.ExtrudeGeometry(boat, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 32 }), hw);
    jp.rotation.z = deg(ja); jp.position.set(mm(jx), mm(jy), 0.0006);
    const sock = add(new THREE.CylinderGeometry(0.0065, 0.0065, 0.003, 20), hw); sock.rotation.x = Math.PI / 2; sock.position.set(mm(jx), mm(jy), 0.0018);
    const hole = add(new THREE.CircleGeometry(0.0045, 18), dark); hole.position.set(mm(jx), mm(jy), 0.0034);
  } else {
    const C = S.control, len = mm(C.top - C.bottom);
    const cp = add(new THREE.ExtrudeGeometry(rr(mm(C.w), len, mm(C.w) / 2), { depth: 0.0015, bevelEnabled: false }), hw);
    cp.position.set(mm(C.cx), mm((C.top + C.bottom) / 2), 0.0004);
    for (const ky of C.knobs) {
      const k = add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.012, 28), hw); k.rotation.x = Math.PI / 2; k.position.set(mm(C.cx), mm(ky), 0.0075);
      const dome = add(new THREE.SphereGeometry(0.0095, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), hw); dome.rotation.x = Math.PI / 2; dome.scale.set(1, 1, 0.35); dome.position.set(mm(C.cx), mm(ky), 0.0135);
    }
    const slot = add(new THREE.BoxGeometry(0.0028, 0.026, 0.0006), dark); slot.position.set(mm(C.cx), mm(C.slot), 0.0021);
    const tip = add(new THREE.CylinderGeometry(0.0042, 0.0052, 0.012, 18), new THREE.MeshPhysicalMaterial({ color: '#0c0c0d', roughness: 0.3, clearcoat: 0.8 }));
    tip.rotation.x = Math.PI / 2; tip.position.set(mm(C.cx), mm(C.tip), 0.0085);
    for (const y of C.screws) { const sc = add(new THREE.SphereGeometry(0.002, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), hw); sc.rotation.x = Math.PI / 2; sc.position.set(mm(C.cx), mm(y), 0.0019); }
    // side-mounted cup jack on the treble edge
    const [jx, jy] = S.jack;
    const cup = add(new THREE.CylinderGeometry(0.0115, 0.0115, 0.002, 28), hw); cup.rotation.z = Math.PI / 2; cup.position.set(mm(jx) + 0.0005, mm(jy), -BODY_T / 2);
    const jh = add(new THREE.CircleGeometry(0.0045, 18), dark); jh.rotation.y = Math.PI / 2; jh.position.set(mm(jx) + 0.0016, mm(jy), -BODY_T / 2);
  }

  // ---- strap buttons
  const strap = (x, y, z, dir) => {
    const s = add(new THREE.CylinderGeometry(0.0042, 0.0055, 0.009, 18), hw);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); s.position.set(x, y, z);
  };
  strap(0, -0.003, -BODY_T / 2, new THREE.Vector3(0, -1, 0));
  strap(mm(S.strapTop[0]), mm(S.strapTop[1]) + 0.002, -BODY_T / 2, new THREE.Vector3(0, 1, 0));

  // ---- neck plate on the back
  const pocketY = mm(S.pocket), npY = pocketY - 0.04;
  const np = add(new THREE.ExtrudeGeometry(rr(0.051, 0.064, 0.006), { depth: 0.0012, bevelEnabled: false }), hw);
  np.position.set(0, npY, -BODY_T - 0.0013);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const sc = add(new THREE.SphereGeometry(0.0028, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), hw); sc.rotation.x = -Math.PI / 2; sc.position.set(sx * 0.0175, npY + sy * 0.024, -BODY_T - 0.0013);
  }

  // ---- fretboard, frets, dots, nut
  const fbShape = new THREE.Shape([new THREE.Vector2(-fbHalf(fbEnd), fbEnd), new THREE.Vector2(fbHalf(fbEnd), fbEnd), new THREE.Vector2(fbHalf(nutY), nutY), new THREE.Vector2(-fbHalf(nutY), nutY)]);
  add(new THREE.ExtrudeGeometry(fbShape, { depth: FB_T, bevelEnabled: false }), fbMat).position.z = FB_BOT;
  const fretMat = new THREE.MeshStandardMaterial({ color: '#dcdad4', metalness: 1, roughness: 0.2 });
  fretMat.userData.envScale = 1.4;
  for (let n = 1; n <= FRETS; n++) {
    const y = fretY(n);
    const f = add(new THREE.CylinderGeometry(0.0012, 0.0012, fbHalf(y) * 2, 10), fretMat); f.rotation.z = Math.PI / 2; f.position.set(0, y, FB_TOP);
  }
  const dotMat = new THREE.MeshStandardMaterial({ color: board === 'maple' ? '#121212' : '#f2eee4', roughness: 0.35 });
  for (const n of [3, 5, 7, 9, 12, 15, 17, 19, 21]) {
    const y = (fretY(n) + fretY(n - 1)) / 2;
    for (const x of n === 12 ? [-0.0085, 0.0085] : [0]) { const d = add(new THREE.CircleGeometry(0.003, 24), dotMat); d.position.set(x, y, FB_TOP + 0.0002); }
    const sd = add(new THREE.CircleGeometry(0.001, 12), dotMat); sd.rotation.y = -Math.PI / 2; sd.position.set(-fbHalf(y) - 0.0002, y, FB_BOT + FB_T * 0.55);
  }
  const nutTop = FB_TOP + 0.0032;
  const nut = add(new THREE.BoxGeometry(nutW, 0.0048, nutTop - FB_BOT), bone); nut.position.set(0, nutY + 0.0024, FB_BOT + (nutTop - FB_BOT) / 2);

  // ---- neck shaft (outward-wound loft): C-profile from the fretboard end to a flat headstock back
  const HEAD_FACE = 0.0045, HEAD_T = 0.014;
  {
    const y0 = fbEnd, y1 = nutY + 0.03, segY = 90, segA = 28;
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= segY; j++) {
      const y = lerp(y0, y1, j / segY);
      let halfW = fbHalf(clamp(y, fbEnd, nutY));
      let zTop = FB_BOT, depth = lerp(0.0175, 0.0155, clamp((y - pocketY) / (nutY - pocketY), 0, 1)), q = 1;
      if (y > nutY) {
        const v = clamp((y - nutY) / 0.03, 0, 1), sv = v * v * (3 - 2 * v);
        zTop = lerp(FB_BOT, HEAD_FACE, sv);
        const zBottom = lerp(FB_BOT - depth, HEAD_FACE - HEAD_T, sv) - 0.0015 * Math.sin(Math.PI * v);
        depth = zTop - zBottom; q = lerp(1, 0.45, sv); halfW *= lerp(1, 1.05, sv);
      }
      for (let i = 0; i <= segA; i++) {
        const th = (i / segA) * Math.PI, s = Math.sin(th);
        pos.push(Math.cos(th) * halfW, y, zTop - depth * Math.pow(s, q));
        uv.push(i / segA, (y - y0) / 0.3);
      }
    }
    for (let j = 0; j < segY; j++) for (let i = 0; i < segA; i++) { const a = j * (segA + 1) + i, c = a + segA + 1; idx.push(a, a + 1, c, c, a + 1, c + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    add(geo, neckMat);
  }

  // ---- headstock: Clifton's 6-in-line outline, roasted flame maple, tuners on the bass edge
  const head = new THREE.Group(); head.position.set(0, nutY, 0); group.add(head);
  const headPts = HEAD.map(([x, y]) => new THREE.Vector2(mm(x), mm(y)));
  const hs = add(new THREE.ExtrudeGeometry(new THREE.Shape(headPts), { depth: HEAD_T - 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0008, bevelSegments: 3, curveSegments: 24 }), headMat, head);
  hs.position.z = HEAD_FACE - HEAD_T + 0.001;
  const logo = add(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ map: cliftonLogo(logoImage), transparent: true, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }), head);
  logo.rotation.z = deg(60); logo.position.set(0.008, 0.054, HEAD_FACE + 0.0004);
  const bassEdge = (y) => { // x of the bass edge at height y (head-local)
    let best = 0; for (const p of headPts) if (p.x < 0 && Math.abs(p.y - y) < 0.004) best = Math.min(best, p.x); return best;
  };
  const posts = [];
  POSTS.forEach(([px, py]) => {
    const x = mm(px), y = mm(py), ex = bassEdge(y);
    const bush = add(new THREE.CylinderGeometry(0.0045, 0.0048, 0.002, 20), hw, head); bush.rotation.x = Math.PI / 2; bush.position.set(x, y, HEAD_FACE + 0.001);
    const post = add(new THREE.CylinderGeometry(0.003, 0.003, 0.011, 16), hw, head); post.rotation.x = Math.PI / 2; post.position.set(x, y, HEAD_FACE + 0.0055);
    const housing = add(new THREE.BoxGeometry(0.012, 0.017, 0.009), hw, head); housing.position.set(x, y, HEAD_FACE - HEAD_T - 0.0045);
    const shaftLen = x - ex + 0.008;
    const shaft = add(new THREE.CylinderGeometry(0.0016, 0.0016, shaftLen, 10), hw, head); shaft.rotation.z = Math.PI / 2; shaft.position.set(x - shaftLen / 2, y, HEAD_FACE - HEAD_T - 0.0045);
    const btn = add(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 24), hw, head); btn.scale.set(1.05, 1, 0.75); btn.position.set(ex - 0.012, y, HEAD_FACE - HEAD_T - 0.0045);
    posts.push(new THREE.Vector3(x + 0.0031, y, HEAD_FACE + 0.007));
  });
  for (const [tx, ty] of TREES) { const tree = add(new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 14), hw, head); tree.rotation.x = Math.PI / 2; tree.position.set(mm(tx), mm(ty), HEAD_FACE + 0.002); }

  // ---- strings: bridge → saddle → nut → post
  group.updateMatrixWorld(true);
  const radii = [0.00058, 0.00046, 0.00036, 0.00026, 0.00017, 0.00013];
  const stringMat = new THREE.MeshStandardMaterial({ color: '#d4d4d6', metalness: 1, roughness: 0.25 });
  for (let i = 0; i < 6; i++) {
    const sad = saddleTop[i].clone(); sad.z += radii[i];
    const anchor = new THREE.Vector3(sad.x, anchorY, strat ? 0.0036 : 0.0024);
    const nt = new THREE.Vector3(lerp(-0.0175, 0.0175, i / 5), nutY + 0.0024, nutTop + radii[i]);
    const post = group.worldToLocal(head.localToWorld(posts[i].clone()));
    for (const [a, c] of [[anchor, sad], [sad, nt], [nt, post]]) {
      const dir = new THREE.Vector3().subVectors(c, a), len = dir.length();
      const m = add(new THREE.CylinderGeometry(radii[i], radii[i], len, 6, 1, true), stringMat);
      m.position.copy(a).addScaledVector(dir, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
  }

  const height = nutY + 0.205;
  return { group, height, build: b };
}
