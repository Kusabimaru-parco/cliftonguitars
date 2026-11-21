// Customize page: Clifton's custom-electric builder with a live 3D guitar that rebuilds as options are picked.
// Builds are shareable: every visible choice is mirrored into the URL (?body=strat&sfin=teal…).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, setupStudio, makeFloor, createAtmosphere, EXPOSURE } from './stage.js';
import { initSite, openCart } from './site.js';
import { cart } from './cart.js';
import {
  DEFAULT_BUILD, normalizeBuild, activeQuestions, listOf, labelOf, choiceOf, specOf,
  priceOf, describeBuild, buildParams, peso, buildElectric, partImage,
} from './electric.js';

const $ = (id) => document.getElementById(id);
const wrap = $('canvasWrap');
const stage = document.querySelector('.stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ---------------------------------------------------------------- scene
const renderer = createRenderer();
wrap.prepend(renderer.domElement);
const scene = new THREE.Scene();
const env = setupStudio(scene, renderer);
const atmo = createAtmosphere(scene, renderer, { count: innerWidth < 720 ? 200 : 380 });
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 0.2, autoRotateSpeed: 1.1 });
const pivot = new THREE.Group(); scene.add(pivot);
const floor = makeFloor(); scene.add(floor);

let wordmark = null, current = null, build = null;
let fitDist = 2.2, offY = 0, visible = true, fade = 0, dip = 1, swapFx = null, tween = null;

function resize() {
  const { clientWidth: w, clientHeight: h } = wrap;
  if (!w || !h || !current) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  // stepping (phones/tablets): short pinned stage with only the view buttons under the guitar
  const topUI = stepping() ? 56 : 24, bottomUI = stepping() ? 56 : 110, usable = Math.max(h - topUI - bottomUI, h * 0.5);
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  fitDist = Math.max((current.height / 2) / t * (h / usable), 0.2 / (t * camera.aspect)) * 1.06;
  offY = ((bottomUI - topUI) / 2) * ((2 * fitDist * t) / h);
  controls.maxDistance = fitDist * 1.8;
}
new ResizeObserver(resize).observe(wrap);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

// ---------------------------------------------------------------- build / rebuild
function applyEnv(group) {
  group.traverse((o) => {
    for (const m of [].concat(o.material ?? [])) {
      if (m.userData?.envScale != null && !m.envMap) { m.envMap = env; m.envMapIntensity = m.userData.envScale; m.needsUpdate = true; }
    }
  });
}
function dispose(group) { group.traverse((o) => o.geometry?.dispose()); }

function makeGuitar() {
  const g = buildElectric(build, { logoImage: wordmark });
  applyEnv(g.group);
  g.group.position.y = -g.height / 2;
  if (current) { pivot.remove(current.group); dispose(current.group); }
  pivot.add(g.group);
  floor.position.y = -g.height / 2 - 0.004;
  current = g;
  window.__custom = { ...window.__custom, scene, camera, current, build };
}

// change an option: lights dip, the guitar swaps at the darkest point (body / pickguard-type changes also turn)
const TURN_KEYS = new Set(['body', 'tpg', 'spg']);
function setOption(key, value) {
  const next = normalizeBuild({ ...build, [key]: value });
  if (JSON.stringify(next) === JSON.stringify(build)) return;
  build = next;
  renderAll(key, value);
  if (reduceMotion) { makeGuitar(); return; }
  const turn = TURN_KEYS.has(key);
  swapFx = { s: performance.now(), dur: turn ? 900 : 480, swapped: false, turn, r0: pivot.rotation.y };
}

// ---------------------------------------------------------------- UI (mirrors Clifton's builder: same questions, order, prices)
// Every option is a picture tile (Clifton's own part pictures). Desktop: hovering a tile shows a larger
// preview card. Phones/tablets: one question per step with Previous / Next, the 3D guitar pinned above.
const stepQuery = matchMedia('(max-width: 1000px)');
const stepping = () => stepQuery.matches;
let stepKey = null;   // current step on phones: a question key or 'review'

function optionButton(q, c) {
  const btn = document.createElement('button');
  btn.className = 'ptile';
  btn.setAttribute('role', 'radio');
  btn.setAttribute('aria-checked', String(c.id === build[q.key]));
  btn.dataset.key = q.key; btn.dataset.id = c.id;
  const sub = c.price ? peso(c.price) : (c.note ?? (c.id === 'none' ? 'Not included' : 'Included'));
  btn.innerHTML = `<span class="pt-img"><img src="${partImage(q, c, build)}" alt="" loading="lazy" decoding="async" /></span><b>${c.label}</b><small>${sub}</small>`;
  btn.addEventListener('click', () => setOption(q.key, c.id));
  btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !stepping()) showPreview(btn, q, c); });
  btn.addEventListener('pointerleave', hidePreview);
  return btn;
}

// ---- desktop hover preview: a larger picture card beside the panel, over the 3D stage
const preview = $('partPreview');
function showPreview(tile, q, c) {
  preview.querySelector('img').src = partImage(q, c, build);
  preview.querySelector('.pp-q').textContent = labelOf(q, build);
  preview.querySelector('.pp-name').textContent = c.label;
  preview.querySelector('.pp-price').textContent = c.price ? peso(c.price) : '';
  const spec = specOf(q, c, build);
  preview.querySelector('.pp-spec').innerHTML = c.facts ? spec.join('<br>') : spec.join(' · ');
  const panel = document.querySelector('.builder-panel').getBoundingClientRect();
  const r = tile.getBoundingClientRect(), h = preview.offsetHeight || 420;
  preview.style.left = `${Math.max(12, panel.left - preview.offsetWidth - 18)}px`;
  preview.style.top = `${Math.min(innerHeight - h - 12, Math.max(76, r.top + r.height / 2 - h / 2))}px`;
  preview.classList.add('show');
}
function hidePreview() { preview.classList.remove('show'); }

function questionBlock(q) {
  const sel = choiceOf(q, build), label = labelOf(q, build);
  const block = document.createElement('div');
  block.className = 'block opt-group';
  block.innerHTML = `<div class="block-head"><h2>${label}</h2><span>${sel.label}${sel.price ? `<em>${peso(sel.price)}</em>` : ''}</span></div>`;
  const row = document.createElement('div');
  row.className = 'ptiles';
  row.setAttribute('role', 'radiogroup');
  row.setAttribute('aria-label', label);
  for (const c of listOf(q, build)) row.appendChild(optionButton(q, c));
  block.appendChild(row);
  const lines = specOf(q, sel, build);
  if (lines.length) {
    const p = document.createElement('p');
    p.className = 'opt-desc';
    p.innerHTML = sel.facts ? lines.join('<br>') : lines.join(' · ');
    block.appendChild(p);
  }
  return block;
}

// ---- phones/tablets: steps = every visible question, then a review step (summary + Add to cart)
function stepList() { return [...activeQuestions(build).map((q) => q.key), 'review']; }
function renderSteps() {
  const steps = stepList();
  if (!steps.includes(stepKey)) stepKey = steps[0];
  const i = steps.indexOf(stepKey), last = steps.length - 1;
  const q = activeQuestions(build).find((x) => x.key === stepKey);
  $('stepCount').textContent = `Step ${i + 1} of ${steps.length}`;
  $('stepName').textContent = q ? labelOf(q, build) : 'Review your build';
  $('stepBar').style.width = `${((i + 1) / steps.length) * 100}%`;
  $('stepPrev').disabled = i === 0;
  const next = $('stepNext');
  next.hidden = i === last;
  next.childNodes[0].textContent = i === last - 1 ? 'Review' : 'Next';
  document.querySelector('.builder-panel').dataset.step = stepKey === 'review' ? 'review' : 'question';
}
// bring the current step to just under the pinned 3D stage
function scrollToStep() {
  const stageBottom = document.querySelector('.stage').getBoundingClientRect().bottom;
  const target = document.querySelector('.builder-panel').getBoundingClientRect().top + scrollY - stageBottom;
  scrollTo({ top: Math.max(0, target), behavior: reduceMotion ? 'auto' : 'smooth' });
}
function goStep(delta) {
  const steps = stepList();
  stepKey = steps[Math.max(0, Math.min(steps.length - 1, steps.indexOf(stepKey) + delta))];
  renderOptions();
  scrollToStep();
}
$('stepPrev').addEventListener('click', () => goStep(-1));
$('stepNext').addEventListener('click', () => goStep(1));
stepQuery.addEventListener('change', () => { document.body.classList.toggle('stepping', stepping()); hidePreview(); renderOptions(); resize(); });
document.body.classList.toggle('stepping', stepping());

function renderOptions(focusKey, focusId) {
  const host = $('options');
  host.innerHTML = '';
  hidePreview();
  $('stepNav').hidden = !stepping();
  if (stepping()) {
    renderSteps();
    const q = activeQuestions(build).find((x) => x.key === stepKey);
    if (q) host.appendChild(questionBlock(q));
    if (focusKey) host.querySelector(`[data-key="${focusKey}"][data-id="${focusId}"]`)?.focus({ preventScroll: true });
    return;
  }
  delete document.querySelector('.builder-panel').dataset.step;
  for (const q of activeQuestions(build)) host.appendChild(questionBlock(q));
  // keep keyboard focus on the option that was just picked (the list re-renders)
  if (focusKey) host.querySelector(`[data-key="${focusKey}"][data-id="${focusId}"]`)?.focus({ preventScroll: true });
}

function renderSummary() {
  const rows = describeBuild(build).map((r) => `<dt>${r.label}</dt><dd>${r.value}${r.price ? `<small>${peso(r.price)}</small>` : ''}</dd>`);
  $('summary').innerHTML = rows.join('') + `<dt class="total">Total</dt><dd class="total">${peso(priceOf(build))}</dd>`;
  $('priceTotal').textContent = peso(priceOf(build));
}

function renderAll(focusKey, focusId) { renderOptions(focusKey, focusId); renderSummary(); syncUrl(); }

function buildUrl() {
  const u = new URL(location.href);
  u.search = new URLSearchParams(buildParams(build)).toString();
  u.hash = '';
  return u.toString();
}
function syncUrl() { history.replaceState(null, '', buildUrl()); }

// small front-view picture of the current build for the cart (rendered off the live scene, then restored)
function thumbnail() {
  const w = 240, h = 320, prevPR = renderer.getPixelRatio();
  const prevPos = camera.position.clone(), prevTarget = controls.target.clone(), rot = pivot.rotation.y;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  pivot.rotation.y = 0;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), c = V(0, 0, 0);
  camera.position.copy(around(c, (current.height / 2) / t * 1.06, 0, 0)); camera.lookAt(c);
  renderer.setClearColor('#0b0b0c', 1); renderer.toneMappingExposure = EXPOSURE;
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/jpeg', 0.82);
  renderer.setClearColor('#000000', 0); renderer.setPixelRatio(prevPR);
  camera.position.copy(prevPos); controls.target.copy(prevTarget); pivot.rotation.y = rot;
  resize();
  return url;
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2400);
}

$('addToCart').addEventListener('click', () => {
  const rows = describeBuild(build);
  const val = (key) => rows.find((r) => r.key === key)?.value;
  cart.add({
    title: `Custom ${build.body === 'tele' ? 'Telecaster' : 'Stratocaster'}`,
    subtitle: `${val(build.body === 'tele' ? 'tfin' : 'sfin')} · ${val('neck')}`,
    image: thumbnail(),
    url: buildUrl(),
    lines: rows.map(({ label, value, price }) => ({ label, value, price })),
    unit: priceOf(build),
  });
  const btn = document.querySelector('.cart-btn');
  btn?.classList.remove('bump'); void btn?.offsetWidth; btn?.classList.add('bump');
  toast('Added to cart');
  setTimeout(openCart, reduceMotion ? 0 : 350);
});
$('copyLink').addEventListener('click', async () => toast((await copy(buildUrl())) ? 'Link copied — it opens this exact build' : buildUrl()));
// Start over: ask first (it wipes every choice), then reset and go back to the first step
const resetDialog = $('resetDialog');
$('resetBuild').addEventListener('click', () => resetDialog.showModal());
$('resetCancel').addEventListener('click', () => resetDialog.close());
resetDialog.addEventListener('click', (e) => { if (e.target === resetDialog) resetDialog.close(); });   // tap outside
$('resetConfirm').addEventListener('click', () => {
  resetDialog.close();
  build = normalizeBuild(DEFAULT_BUILD);
  stepKey = null;   // phones: back to step 1 (Body Type)
  renderAll();
  if (stepping()) scrollToStep(); else scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  // camera back to the front view too
  setAutoRotate(false); pivot.rotation.y = 0;
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === 'front'));
  flyTo(VIEWS.front());
  if (!reduceMotion) swapFx = { s: performance.now(), dur: 900, swapped: false, turn: true, r0: pivot.rotation.y };
  else makeGuitar();
  toast('Started over');
});

// ---------------------------------------------------------------- camera views
function around(target, dist, az, el) {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  return target.clone().add(V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(dist));
}
const VIEWS = {
  front: () => { const c = V(0, -offY, 0); return [around(c, fitDist, 0, 0), c]; },
  back: () => { const c = V(0, -offY, 0); return [around(c, fitDist, 180, 0), c]; },
  body: () => { const c = V(0.01, -current.height / 2 + 0.2, 0.01); return [around(c, 0.62, -18, 14), c]; },
  headstock: () => { const c = V(0.004, current.height / 2 - 0.1, 0); return [around(c, 0.36, 12, 8), c]; },
};
function flyTo([pos, target], dur = 1) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), dur: reduceMotion ? 1 : dur * 1000 };
}
function setAutoRotate(on) {
  controls.autoRotate = on && !reduceMotion;
  $('toggleRotate').classList.toggle('active', controls.autoRotate);
  $('toggleRotate').setAttribute('aria-pressed', String(controls.autoRotate));
}
$('views').addEventListener('click', (e) => {
  const v = e.target.closest('button')?.dataset.view; if (!v) return;
  setAutoRotate(false); pivot.rotation.y = 0;
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  flyTo(VIEWS[v]());
});
$('toggleRotate').addEventListener('click', () => setAutoRotate(!controls.autoRotate));
controls.addEventListener('start', () => { tween = null; setAutoRotate(false); document.querySelectorAll('#views button').forEach((b) => b.classList.remove('active')); });

$('snapshot').addEventListener('click', () => {
  const w = 2000, h = Math.round(w / camera.aspect), prev = renderer.getPixelRatio();
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.setClearColor('#050505', 1);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setClearColor('#000000', 0); renderer.setPixelRatio(prev); resize();
  const a = document.createElement('a'); a.href = url; a.download = `clifton-custom-${build.body}.png`; a.click();
  toast('Image saved');
});

// ---------------------------------------------------------------- loop
let last = performance.now();
const t0 = last;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!visible || !current) return;
  fade += (1 - fade) * Math.min(1, dt * 2.2);
  if (swapFx) {
    const k = Math.min(1, (now - swapFx.s) / swapFx.dur);
    dip = 1 - 0.75 * Math.sin(k * Math.PI);
    if (swapFx.turn) pivot.rotation.y = swapFx.r0 + easeIO(k) * Math.PI * 2;   // one full turn, new guitar revealed mid-spin
    if (k >= 0.5 && !swapFx.swapped) { makeGuitar(); swapFx.swapped = true; }
    if (k >= 1) { swapFx = null; dip = 1; pivot.rotation.y = 0; }
  }
  if (tween) {
    const k = Math.min(1, (now - tween.s) / tween.dur), e = easeIO(k);
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (k >= 1) tween = null;
  }
  renderer.toneMappingExposure = EXPOSURE * fade * dip;
  controls.update();
  atmo.update((now - t0) / 1000);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- start
wordmark = await initSite();
build = normalizeBuild(Object.fromEntries(new URLSearchParams(location.search)));
renderAll();
makeGuitar();
resize();
{ const [p, c] = VIEWS.front(); camera.position.copy(around(c, fitDist * 1.3, 28, 10)); controls.target.copy(c); flyTo([p, c], 1.8); }
setTimeout(() => setAutoRotate(true), 1900);
$('loader').classList.add('done');
window.__custom.shot = (az = 0, el = 0, k = 1, target) => {   // debug hook for visual checks
  setAutoRotate(false); tween = null; fade = 1;
  const c = target ?? V(0, -offY, 0);
  camera.position.copy(around(c, fitDist * k, az, el)); controls.target.copy(c); camera.lookAt(c);
  renderer.toneMappingExposure = EXPOSURE; renderer.render(scene, camera);
  return 'ok';
};
requestAnimationFrame(frame);
