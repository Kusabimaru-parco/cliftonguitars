// Home page: a sticky 3D stage. The hero guitar spins on a turntable, then glides,
// turns and finally pulls apart as the visitor scrolls through the story sections.
import * as THREE from 'three';
import { MODELS, FINISHES } from './models.js';
import { createRenderer, setupStudio, makeFloor, createModel, createAtmosphere, EXPOSURE } from './stage.js';import { initSite } from './site.js';

const stageEl = document.getElementById('heroStage');
const showcase = document.getElementById('showcase');
const heroSection = document.querySelector('.showcase .hero');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { lerp, clamp, smoothstep } = THREE.MathUtils;

const wordmark = await initSite();

// ---------------------------------------------------------------- scene
const renderer = createRenderer();
renderer.domElement.setAttribute('aria-label', 'Rotating 3D guitar. Drag to turn it.');
renderer.domElement.setAttribute('role', 'img');
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
const env = setupStudio(scene, renderer);
const atmo = createAtmosphere(scene, renderer, { count: innerWidth < 720 ? 200 : 380 });
const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 50);

const model = MODELS[0];
const built = await createModel(model, { wordmark, env });
let finish = model.defaultFinish;

const spin = new THREE.Group();   // turntable / pose yaw
spin.add(built.group);
const rig = new THREE.Group();    // pose: position, tilt, lean, scale
rig.add(spin);
scene.add(rig);
const floor = makeFloor();
scene.add(floor);

let dist = 3, visH = 1, visW = 1, mobile = false;
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  if (!w || !h) return;
  mobile = w <= 1000; // matches the CSS breakpoint where hero copy stacks and story cards dock at the bottom
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  dist = Math.max((built.height / 2) / t, 0.3 / (t * camera.aspect)) * 1.18;
  visH = 2 * dist * t;
  visW = visH * camera.aspect;
  camera.position.set(0, 0.03, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  if (mobile) fitMobileHero(h);
}

// Phone/tablet hero: the guitar fills the space between the header and the docked copy
// (leaving room for the "Featuring" tag under it), whatever the screen's height.
function fitMobileHero(H) {
  const copy = heroSection.querySelector('.hero-copy');
  const copyTop = copy.getBoundingClientRect().top - heroSection.getBoundingClientRect().top;   // px from the stage top
  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
  const top = headerH + 10, bottom = copyTop - 72;                                            // 72 px: the tag + breathing room
  if (bottom - top < 120) return;
  const pose = POSES_MOBILE[0];
  pose.scale = Math.min(1.1, ((bottom - top) * visH) / (H * built.height));
  pose.y = 1 - (top + bottom) / H;                                                             // centre between top and bottom
}
new ResizeObserver(resize).observe(stageEl);

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stageEl);

// ---------------------------------------------------------------- scroll poses
// x / y are fractions of the half-width / half-height of the view; s = section index.
const POSES_DESKTOP = [
  { x: 0.42, y: 0.0, scale: 1.0, yaw: 0, pitch: 0, lean: -0.07, explode: 0 },          // hero (yaw = turntable)
  { x: -0.36, y: -0.06, scale: 1.04, yaw: -0.55, pitch: 0.14, lean: 0.38, explode: 0 }, // tonewoods
  { x: 0.4, y: -0.5, scale: 1.75, yaw: 0.6, pitch: 0.06, lean: -0.32, explode: 0 },    // details
  { x: 0.36, y: -0.1, scale: 0.78, yaw: -0.95, pitch: 0.05, lean: -0.04, explode: 1 }, // built by us
];
const POSES_MOBILE = [
  { x: 0, y: 0.31, scale: 0.5, yaw: 0, pitch: 0, lean: -0.05, explode: 0 },   // hero: guitar up top, copy docked below
  { x: 0, y: 0.32, scale: 1.1, yaw: -0.55, pitch: 0.14, lean: 0.3, explode: 0 },
  { x: 0, y: -0.15, scale: 1.5, yaw: 0.6, pitch: 0.06, lean: -0.25, explode: 0 },
  { x: 0, y: 0.3, scale: 0.72, yaw: -0.95, pitch: 0.05, lean: -0.04, explode: 1 },
];
const KEYS = ['x', 'y', 'scale', 'pitch', 'lean'];

// Light per section: the 3D key light position, rim balance, warmth, and where the visible
// light cone starts (src = horizontal offset from the guitar, as a fraction of stage width).
const LIGHTS = [
  { kx: 0.8, ky: 3.0, kz: 2.2, rimL: 1.0, rimR: 1.0, warm: 0, src: 0 },        // hero: straight down
  { kx: 2.9, ky: 2.1, kz: 1.3, rimL: 1.25, rimR: 0.55, warm: 0, src: 0.3 },    // tonewoods: raking from upper right
  { kx: -2.8, ky: 2.3, kz: 1.5, rimL: 0.55, rimR: 1.35, warm: 0.2, src: -0.32 }, // details: from upper left
  { kx: -0.7, ky: 1.7, kz: 3.0, rimL: 0.9, rimR: 1.1, warm: 1, src: -0.12 },   // built: low, warm, from the front
];
const LIGHT_KEYS = ['kx', 'ky', 'kz', 'rimL', 'rimR', 'warm', 'src'];
const studio = scene.userData.studio;
const BASE = { key: studio.key.intensity, rimL: studio.rimL.intensity, rimR: studio.rimR.intensity };
const KEY_COOL = new THREE.Color('#fff0d8'), KEY_WARM = new THREE.Color('#ffc98a');

// section k is in place when its top reaches the stage's sticky top (just under the header)
const pinTop = () => parseFloat(getComputedStyle(stageEl).top) || 0;
const rawIndex = () => (window.scrollY + pinTop() - showcase.offsetTop) / (stageEl.clientHeight || 1);
const scrollIndex = () => clamp(rawIndex(), 0, POSES_DESKTOP.length - 1);
let sTarget = scrollIndex(), s = sTarget;
window.addEventListener('scroll', () => { sTarget = scrollIndex(); }, { passive: true });

// ---------------------------------------------------------------- stopping points (mouse / trackpad / keys)
// Inside the story, one scroll gesture = one step: glide to the next section, then hold.
// Leftover trackpad momentum is swallowed until the wheel goes quiet. Touch uses CSS snapping.
const LAST = POSES_DESKTOP.length - 1;
const coarse = matchMedia('(pointer: coarse)');
let stepping = false, lastWheel = 0;
const stepY = (k) => showcase.offsetTop - pinTop() + k * stageEl.clientHeight;

function goToStep(k) {
  stepping = true;
  const y0 = window.scrollY, y1 = stepY(clamp(k, 0, LAST));
  const dur = reduceMotion ? 1 : 950;
  const t0 = performance.now();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tick = (now) => {
    const f = Math.min(1, (now - t0) / dur);
    window.scrollTo({ top: lerp(y0, y1, ease(f)), behavior: 'instant' });
    if (f < 1) requestAnimationFrame(tick);
    else {
      // release only once the wheel has been quiet for a moment (ignores trackpad inertia)
      const release = () => (performance.now() - lastWheel > 180 ? (stepping = false) : setTimeout(release, 60));
      release();
    }
  };
  requestAnimationFrame(tick);
}

// returns the step to go to, or null when the gesture should scroll the page normally
function stepFor(dir) {
  const r = rawIndex();
  if (dir > 0 && r >= -0.02 && r < LAST - 0.02) return Math.floor(r + 0.02) + 1;
  if (dir < 0 && r > 0.02 && r <= LAST + 0.02) return Math.ceil(r - 0.02) - 1;
  return null;
}

window.addEventListener('wheel', (e) => {
  if (coarse.matches || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
  lastWheel = performance.now();
  if (stepping) { e.preventDefault(); return; }
  const k = stepFor(Math.sign(e.deltaY));
  if (k == null) return;
  e.preventDefault();
  goToStep(k);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.shiftKey ? 1
    : ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey) ? -1 : 0;
  if (!dir) return;
  if (stepping) { e.preventDefault(); return; }
  const k = stepFor(dir);
  if (k == null) return;
  e.preventDefault();
  goToStep(k);
});

function poseAt(sv) {
  const P = mobile ? POSES_MOBILE : POSES_DESKTOP;
  const i = Math.min(Math.floor(sv), P.length - 2);
  const f = smoothstep(sv - i, 0, 1);
  const a = P[i], b = P[i + 1];
  const out = {};
  for (const k of KEYS) out[k] = lerp(a[k], b[k], f);
  const la = LIGHTS[i], lb = LIGHTS[i + 1];
  for (const k of LIGHT_KEYS) out[k] = lerp(la[k], lb[k], f);
  out.yawA = a.yaw; out.yawB = b.yaw; out.f = f; out.i = i;
  // explode happens late in the last step so the parts hold while the card reads
  out.explode = i === P.length - 2 ? smoothstep(sv - i, 0.35, 0.95) * b.explode : a.explode;
  return out;
}

// ---------------------------------------------------------------- interaction (hero turntable)
const pointer = { x: 0, y: 0 };
const tilt = { x: 0, y: 0 };
let angle = -1.3;
let velocity = 0.32;
let dragging = null;

window.addEventListener('pointermove', (e) => {
  const r = stageEl.getBoundingClientRect();
  pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
  pointer.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  if (dragging) {
    const dx = e.clientX - dragging.x;
    angle += dx * 0.008;
    dragging.v = dx * 0.008 / Math.max(1 / 120, (e.timeStamp - dragging.t) / 1000);
    dragging.x = e.clientX; dragging.t = e.timeStamp;
  }
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (s > 0.3) return;
  dragging = { x: e.clientX, t: e.timeStamp, v: 0 };
  renderer.domElement.setPointerCapture(e.pointerId);
  stageEl.classList.add('grabbing');
});
const endDrag = () => {
  if (!dragging) return;
  velocity = clamp(dragging.v, -4, 4);
  dragging = null;
  stageEl.classList.remove('grabbing');
};
renderer.domElement.addEventListener('pointerup', endDrag);
renderer.domElement.addEventListener('pointercancel', endDrag);

// finish chips
const chips = document.getElementById('heroFinishes');
const feature = document.getElementById('heroFeature');
let finishFx = null;
const finishIds = model.finishes ?? Object.keys(FINISHES);
chips.hidden = finishIds.length < 2; // the A1 comes in one finish: no chips
finishIds.map((id) => [id, FINISHES[id]]).forEach(([id, f]) => {
  const b = document.createElement('button');
  b.className = 'swatch';
  b.role = 'radio';
  b.dataset.finish = id;
  b.title = f.label;
  b.setAttribute('aria-label', f.label);
  b.setAttribute('aria-checked', String(id === finish));
  b.style.background = f.swatch;
  b.addEventListener('click', () => {
    if (id === finish) return;
    chips.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    if (reduceMotion) { built.setFinish(id); finish = id; return; }
    finishFx = { s: performance.now(), id, swapped: false };
  });
  chips.appendChild(b);
});

// story cards fade/slide in as they enter
const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { threshold: 0.35 });
document.querySelectorAll('.story-card').forEach((el) => io.observe(el));

// ---------------------------------------------------------------- loop
const shortest = (from, to) => from + ((((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
const start = performance.now();
let last = start;
const _v = new THREE.Vector3();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!visible) return;

  s += (sTarget - s) * Math.min(1, dt * (reduceMotion ? 60 : 5));
  const p = poseAt(s);

  // intro: lights come up from black; turntable swings in then settles to a slow spin
  const k = reduceMotion ? 1 : Math.min(1, (now - start) / 2200);
  let exposure = EXPOSURE * (1 - Math.pow(1 - k, 3));
  if (!dragging) {
    velocity += ((reduceMotion ? 0 : 0.32) - velocity) * Math.min(1, dt * 1.5);
    angle += velocity * dt * (k < 1 ? 1 + 2.5 * (1 - k) : 1);
  }
  // yaw: turntable in the hero, blending to each section's fixed angle
  const yawA = p.i === 0 ? angle : p.yawA;
  spin.rotation.y = lerp(yawA, shortest(yawA, p.yawB), p.f);

  tilt.x += (pointer.y * 0.06 - tilt.x) * Math.min(1, dt * 4);
  tilt.y += (pointer.x * 0.12 - tilt.y) * Math.min(1, dt * 4);
  const parallax = 1 - Math.min(1, s);
  rig.position.set(p.x * visW / 2, p.y * visH / 2, 0);
  rig.scale.setScalar(p.scale);
  rig.rotation.set(p.pitch + tilt.x * parallax, tilt.y * parallax, p.lean);
  built.setExplode?.(p.explode);

  floor.position.set(rig.position.x, rig.position.y - (built.height / 2) * p.scale - 0.004, 0);
  floor.scale.setScalar(p.scale);
  floor.visible = s < 0.6 || s > 2.6;

  // 3D light follows the section's rig
  studio.key.position.set(p.kx, p.ky, p.kz);
  studio.key.color.copy(KEY_COOL).lerp(KEY_WARM, p.warm);
  studio.rimL.intensity = BASE.rimL * p.rimL;
  studio.rimR.intensity = BASE.rimR * p.rimR;

  // the visible light cone starts at the section's source and swings to point at the guitar
  const W = stageEl.clientWidth, H = stageEl.clientHeight;
  _v.copy(rig.position).project(camera);
  const gx = ((_v.x + 1) / 2) * W, gy = ((1 - _v.y) / 2) * H;
  const sx = gx + p.src * W, sy = -0.12 * H;
  const dx = gx - sx, dy = gy - sy;
  const st = stageEl.style;
  st.setProperty('--beam-x', `${gx}px`);
  st.setProperty('--pool-y', `${gy}px`);
  _v.copy(floor.position).project(camera);                       // where the guitar stands (phone: "Featuring" tag sits here)
  st.setProperty('--floor-y', `${((1 - _v.y) / 2) * H}px`);
  st.setProperty('--beam-sx', `${sx}px`);
  st.setProperty('--beam-sy', `${sy}px`);
  st.setProperty('--beam-rot', `${-Math.atan2(dx, dy)}rad`);
  st.setProperty('--beam-len', `${Math.hypot(dx, dy) * 1.35}px`);
  chips.style.opacity = String(1 - clamp(s * 3, 0, 1));
  feature.style.opacity = chips.style.opacity;   // "Featuring" tag under the guitar leaves with the hero
  feature.style.pointerEvents = s > 0.2 ? 'none' : '';
  // hero copy fades as it leaves, so it never ghosts behind the compact header
  heroSection.style.opacity = String(1 - clamp(s * 1.8, 0, 1));
  chips.style.pointerEvents = s > 0.2 ? 'none' : '';

  if (finishFx) {
    const f = Math.min(1, (now - finishFx.s) / 420);
    exposure *= 1 - 0.6 * Math.sin(f * Math.PI);
    if (f >= 0.5 && !finishFx.swapped) { built.setFinish(finishFx.id); finish = finishFx.id; finishFx.swapped = true; }
    if (f >= 1) finishFx = null;
  }
  renderer.toneMappingExposure = exposure;
  atmo.update((now - start) / 1000);
  renderer.render(scene, camera);
}
resize();
requestAnimationFrame(frame);
document.body.classList.add('ready');
