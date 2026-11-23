// Clifton Customs start page: a sunburst Stratocaster that comes apart into its parts, cinematically.
// "Explode" / "Assemble" toggles it; "Build yours" goes to the builder (customize.html).
//
// Drama: a close, low hero angle; parts leave one after another (strings first, back hardware last),
// overshoot and settle, tilting as they fan out; a hit of warm key + rim light and a burst of dust in
// the beam as it breaks apart; a gold spotlight behind brightens; the camera pushes in a little.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, setupStudio, createAtmosphere, EXPOSURE } from './stage.js';
import { initSite } from './site.js';
import { buildElectric } from './electric.js';

const $ = (id) => document.getElementById(id);
const wrap = $('csCanvas');
const stageEl = document.querySelector('.cs-stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { clamp, lerp } = THREE.MathUtils;
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => { const c1 = 1.55, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

const renderer = createRenderer();
wrap.prepend(renderer.domElement);
const scene = new THREE.Scene();
const env = setupStudio(scene, renderer);
scene.environmentIntensity = 0.3;                     // darker, moodier than the other pages
const studio = scene.userData.studio;
studio.key.position.set(1.2, 3.2, 1.6);               // steep warm key from above-right
studio.fill.intensity = 0.12;
studio.rimL.position.set(-2.6, 1.2, -1.6);
studio.key.intensity = 3.0; studio.rimL.intensity = 2.8; studio.rimR.intensity = 2.2;
const atmo = createAtmosphere(scene, renderer, { count: innerWidth < 720 ? 220 : 420, width: 1.8, height: 1.9 });
const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: false, rotateSpeed: 0.7 });
const pivot = new THREE.Group(); scene.add(pivot);
// no floor here: the guitar floats in the dark (the other pages keep their floor glow)

const wordmark = await initSite();
const guitar = buildElectric({ body: 'strat', sfin: 'sunburst', spg: 'sss', spgc: 'vw' }, { logoImage: wordmark });
guitar.group.traverse((o) => {
  for (const m of [].concat(o.material ?? [])) {
    if (m.userData?.envScale != null && !m.envMap) { m.envMap = env; m.envMapIntensity = m.userData.envScale; m.needsUpdate = true; }
  }
});
guitar.group.position.y = -guitar.height / 2;
const holder = new THREE.Group(); holder.add(guitar.group);
holder.rotation.set(0.1, -0.72, -0.2);   // three-quarter view, leaning, so parts flying toward you read clearly
pivot.add(holder);

// ---------------------------------------------------------------- framing: close + low hero angle
let wide = true, baseDist = 2;
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  wide = w > 860;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const span = guitar.height * 1.04;                     // close: the assembled guitar nearly fills the stage height
  let y = -0.04;
  if (wide) {
    baseDist = Math.max((span / 2) / t, 0.42 / (t * camera.aspect));
  } else {
    // phones: fill the space above the copy (the copy is docked at the bottom)
    const copyTop = document.querySelector('.cs-copy').getBoundingClientRect().top - wrap.getBoundingClientRect().top;
    const top = 6, bottom = Math.max(copyTop + 30, h * 0.5), avail = bottom - top;
    baseDist = (span / 2) / t * (h / avail);
    y = (h / 2 - (top + bottom) / 2) * ((2 * baseDist * t) / h) - 0.02;
  }
  const visW = 2 * baseDist * t * camera.aspect;
  pivot.position.set(wide ? visW * 0.19 : 0, y, 0);
  controls.target.set(0, 0, 0);
  placeCamera(0);
}
// low camera looking slightly up at the guitar; pushes in a touch while exploded
// while exploded it also lifts its aim, so the neck assembly sliding up stays in frame
// close while assembled; as it comes apart the camera pulls back a little (a reveal) so every part stays in frame
function placeCamera(push) {
  const d = baseDist * (1 + 0.16 * push);
  controls.target.set(0, 0.01 + 0.08 * push, 0);
  camera.position.set(0, -0.16 * (d / 2) + 0.05 * push, d);
  camera.lookAt(controls.target);
}
new ResizeObserver(resize).observe(wrap);
resize();

// ---------------------------------------------------------------- explode timeline
// leave order (s): strings first, then the hardware on top, the neck assembly, back hardware last
const DELAY = { strings: 0, controls: 0.06, pickups: 0.1, headstock: 0.04, fretboard: 0.12, bridge: 0.14, pickguard: 0.18, neck: 0.2, hardware: 0.26, body: 0 };
// a little tilt as each part fans out (radians at full explode)
const TILT = {
  strings: [-0.05, 0, 0], controls: [-0.22, 0.12, 0], pickups: [-0.16, 0, 0.02], pickguard: [-0.1, 0, 0],
  bridge: [-0.2, -0.08, 0], fretboard: [-0.05, 0, 0.03], neck: [0, 0, 0.02], headstock: [0.06, 0.1, 0.07], hardware: [0.08, 0, 0],
};
const names = Object.keys(guitar.parts);
const p = Object.fromEntries(names.map((n) => [n, 0]));     // each part's progress, 0 … 1
let anim = null, target = 0, pulse = 0;
const DUR = 1.05, ASSEMBLE_DUR = 0.85;
function applyParts() {
  for (const n of names) {
    const g = guitar.parts[n], o = guitar.explodeOffsets[n] ?? [0, 0, 0], r = TILT[n] ?? [0, 0, 0], v = p[n];
    g.position.set(o[0] * v, o[1] * v, o[2] * v);
    g.rotation.set(r[0] * v, r[1] * v, r[2] * v);
  }
}
const btn = $('csExplode');
function setTarget(v) {
  if (v === target && anim) return;
  target = v;
  btn.setAttribute('aria-pressed', String(v === 1));
  btn.querySelector('span').textContent = v === 1 ? 'Assemble' : 'Explode';
  stageEl.classList.toggle('exploded', v === 1);
  if (reduceMotion) { names.forEach((n) => { p[n] = v; }); applyParts(); return; }
  anim = { s: performance.now(), from: { ...p }, to: v };
  if (v === 1) pulse = 1;   // the hit: a burst of dust in the light beam (no flash)
}
btn.addEventListener('click', () => setTarget(target ? 0 : 1));
controls.addEventListener('start', () => { controls.userTouched = true; });
// it comes apart on its own shortly after the page opens
setTimeout(() => { if (target === 0) setTarget(1); }, reduceMotion ? 0 : 1300);

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);
$('loader').classList.add('done');

// ---------------------------------------------------------------- loop
const t0 = performance.now();
let last = t0, fade = 0, push = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!visible) return;
  fade += (1 - fade) * Math.min(1, dt * 1.6);
  if (anim) {
    const a = (now - anim.s) / 1000, exploding = anim.to === 1;
    let done = true;
    for (const n of names) {
      // exploding: strings first; assembling: reverse order, everything snaps home
      const delay = exploding ? DELAY[n] ?? 0 : 0.26 - (DELAY[n] ?? 0);
      const u = clamp((a - delay) / (exploding ? DUR : ASSEMBLE_DUR), 0, 1);
      if (u < 1) done = false;
      const e = exploding ? easeOutBack(u) : easeIO(u);
      p[n] = lerp(anim.from[n], anim.to, e);
    }
    applyParts();
    if (done) anim = null;
  }
  // dust burst decays after the hit (lights stay steady: no flash)
  pulse = Math.max(0, pulse - dt * 1.4);
  const hit = pulse * pulse;
  atmo.setFade(1 + 2.2 * hit);
  // camera eases in while exploded
  push += ((target ? 1 : 0) - push) * Math.min(1, dt * 1.2);
  if (!controls.userTouched) {
    placeCamera(push);
    if (!reduceMotion) pivot.rotation.y = Math.sin((now - t0) / 3600) * 0.22;   // slow, wide sway
  }
  renderer.toneMappingExposure = EXPOSURE * fade;
  controls.update();
  atmo.update((now - t0) / 1000);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// debug hook for visual checks: jump straight to a state (0 assembled … 1 exploded) and draw it
window.__customs = {
  explode: setTarget,
  snap: (v) => {
    target = v ? 1 : 0; anim = null; names.forEach((n) => { p[n] = v; }); applyParts();
    push = v; placeCamera(v); fade = 1; renderer.toneMappingExposure = EXPOSURE; renderer.render(scene, camera); return 'ok';
  },
};
