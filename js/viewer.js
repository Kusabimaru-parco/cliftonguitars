// Guitars page: each guitar opens with an auto-playing cinematic intro that walks through
// its specs, then hands over to free exploration (orbit, views, hotspots, exploded view).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODELS, FINISHES, HOTSPOTS } from './models.js';
import {
  createRenderer, setupStudio, makeFloor, createModel, disposeGroup, createAtmosphere, EXPOSURE,
} from './stage.js';
import { initSite, renderLineupCards, openCart } from './site.js';
import { cart } from './cart.js';
import { thumbSrc } from './catalog.js';

const $ = (id) => document.getElementById(id);
const wrap = $('canvasWrap');
const stage = document.querySelector('.stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const { lerp, clamp, degToRad } = THREE.MathUtils;
const clamp01 = (x) => clamp(x, 0, 1);
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

// ---------------------------------------------------------------- renderer / scene
const renderer = createRenderer();
wrap.prepend(renderer.domElement);
const scene = new THREE.Scene();
const env = setupStudio(scene, renderer);
const atmo = createAtmosphere(scene, renderer, { count: innerWidth < 720 ? 220 : 420 });

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
camera.position.set(0, 0, 2.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 0.25;
controls.maxDistance = 4;
controls.autoRotateSpeed = 1.1;

const pivot = new THREE.Group();
scene.add(pivot);
const floor = makeFloor();
scene.add(floor);

// ---------------------------------------------------------------- state
let wordmark = null;
let current = null;      // { model, group, setFinish, setExplode, hotspots, markers, height, finish }
let mode = 'intro';      // 'intro' | 'explore' | 'switching'
let specTab = 'Body';
let fitDist = 2.4;
let frameOffsetY = 0;
let visible = true;
let fade = 1;            // reveal / switch fade (multiplies exposure)
let finishDip = 1;

function setMode(m) {
  mode = m;
  stage.dataset.mode = m;
  $('hint').textContent = m === 'intro'
    ? 'Drag the guitar any time to take over'
    : 'Drag to rotate · Scroll or pinch to zoom · Tap a dot for details';
}

function resize() {
  const { clientWidth: w, clientHeight: h } = wrap;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (current) {
    const topUI = 70, bottomUI = w <= 720 ? 140 : 110;   // phones: the toolbar is two rows
    const usable = Math.max(h - topUI - bottomUI, h * 0.5);
    const t = Math.tan(degToRad(camera.fov / 2));
    fitDist = Math.max((current.height / 2) / t * (h / usable), 0.25 / (t * camera.aspect)) * 1.08;
    frameOffsetY = ((bottomUI - topUI) / 2) * ((2 * fitDist * t) / h);
    controls.maxDistance = fitDist * 1.8;
  }
}
new ResizeObserver(resize).observe(wrap);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

// ---------------------------------------------------------------- camera helpers
function around(target, dist, azDeg, elDeg) {
  const az = degToRad(azDeg), el = degToRad(elDeg);
  return target.clone().add(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist));
}
const center = () => V(0, -frameOffsetY, 0);

let tween = null;
function flyTo(pos, target, dur = 0.9, onDone) {
  if (reduceMotion) dur = 0.01;
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), dur: dur * 1000, onDone };
}

function hotspotWorld(id) {
  const h = current?.hotspots[id];
  if (!h) return null;
  return { pos: current.group.localToWorld(h.pos.clone()), normal: h.normal.clone().transformDirection(current.group.matrixWorld) };
}
const hp = (id) => hotspotWorld(id)?.pos ?? center();

const VIEWS = {
  front: () => [V(0, -frameOffsetY, fitDist), center()],
  back: () => [V(0, -frameOffsetY, -fitDist), center()],
  side: () => [V(fitDist * 0.96, 0.05 - frameOffsetY, fitDist * 0.28), center()],
  headstock: () => { const t = hp('headstock'); return [t.clone().add(V(0.16, 0.02, 0.36)), t]; },
};

function markView(name) {
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
function setView(name) {
  closeInfo();
  setAutoRotate(false);
  if (explode.target) setExplodeTarget(0);
  const [p, t] = VIEWS[name]();
  flyTo(p, t);
  markView(name);
}

// ---------------------------------------------------------------- spec helpers
function spec(key) {
  for (const rows of Object.values(current.model.specs)) for (const [k, v] of rows) if (k === key) return v;
  return null;
}

// ================================================================ CINEMATIC INTRO
// Each shot: a camera pose as a function of shot progress t (0..1), plus the specs it presents.
const SHOTS = [
  { id: 'reveal', label: 'Reveal', dur: 4.6 },
  { id: 'body', label: 'Body', dur: 4.4, keys: ['Body shape', 'Top', 'Body depth'], anchor: 'top', side: 'right' },
  { id: 'details', label: 'Details', dur: 4.4, keys: ['Binding', 'Bridge', 'Nut & saddle'], anchor: 'bridge', side: 'left' },
  { id: 'neck', label: 'Neck', dur: 4.8, keys: ['Scale length', 'Fretboard', 'Frets', 'Inlays'], anchor: 'fretboard', side: 'left' },
  { id: 'headstock', label: 'Headstock', dur: 4.4, keys: ['Tuners', 'Strings'], anchor: 'tuners', side: 'right' },
  { id: 'back', label: 'Back', dur: 4.6, keys: ['Back & sides', 'Neck'], anchor: 'back', side: 'left' },
  { id: 'finale', label: 'Finale', dur: 3.8 },
];
// Title shots leave room for the title card: guitar shifted right on wide screens, up on phones.
function titleFrame() {
  const t = Math.tan(degToRad(camera.fov / 2));
  return camera.aspect > 1.15
    ? { c: center().add(V(-fitDist * t * camera.aspect * 0.42, 0, 0)), k: 1 }
    : { c: center().add(V(0, -fitDist * t * 0.3, 0)), k: 1.15 };
}
const POSES = {
  reveal: (t) => { const e = easeOut(t), { c, k } = titleFrame(); return { target: c, pos: around(c, fitDist * k * lerp(1.4, 1, e), lerp(30, 0, e), lerp(12, 0, e)) }; },
  body: (t) => {
    const p = hp('top'), tg = V(p.x * 0.45, p.y + 0.02, 0);
    return { target: tg, pos: around(tg, lerp(0.86, 0.74, t), lerp(-30, -16, t), lerp(14, 8, t)) };
  },
  details: (t) => {
    const tg = hp('rosette').clone().lerp(hp('bridge'), easeIO(t));
    tg.x *= 0.4;
    return { target: tg, pos: around(tg, lerp(0.48, 0.42, t), lerp(22, 32, t), 20) };
  },
  neck: (t) => {
    const start = hp('rosette').clone().lerp(hp('fretboard'), 0.33); start.x = 0;
    const end = hp('fretboard').clone().lerp(hp('headstock'), 0.55); end.x = 0;
    const tg = start.lerp(end, easeIO(t));
    return { target: tg, pos: around(tg, 0.38, lerp(40, 30, t), 24) };
  },
  headstock: (t) => { const tg = hp('headstock'); return { target: tg, pos: around(tg, 0.4, lerp(40, -40, easeIO(t)), 12) }; },
  back: (t) => { const tg = V(0, -frameOffsetY - 0.05, 0); return { target: tg, pos: around(tg, fitDist * 0.84, lerp(150, 212, t), 6) }; },
  finale: (t) => { const e = easeOut(t), { c, k } = titleFrame(); return { target: c, pos: around(c, fitDist * k * lerp(1.1, 1, e), lerp(-24, 0, e), lerp(5, 0, e)) }; },
};
const BLEND = 1.4; // seconds to blend from the previous shot into the next

const intro = { playing: false, shot: 0, t: 0, from: null, shots: SHOTS };

function availableShots() {
  return SHOTS.filter((s) => !s.anchor || current.hotspots[s.anchor]);
}

function startIntro() {
  if (reduceMotion) { exitIntro({ toFront: true }); return; }
  closeInfo();
  setExplodeTarget(0, true);
  setAutoRotate(false);
  setMode('intro');
  intro.shots = availableShots();
  intro.playing = true;
  pivot.rotation.y = -1.7;
  pivot.position.y = -0.12;
  fade = 0;
  const p0 = POSES.reveal(0);
  camera.position.copy(p0.pos);
  controls.target.copy(p0.target);
  renderSegments();
  setPlayButton();
  enterShot(0);
}

function enterShot(i) {
  intro.shot = i;
  intro.t = 0;
  intro.from = i === 0 ? null : { pos: camera.position.clone(), target: controls.target.clone() };
  const s = intro.shots[i];
  if (s.keys) showCallout(s, i); else hideCallout();
  if (s.id === 'reveal') showTitle(500);
  else if (s.id === 'finale') showTitle(200, true);
  else hideTitle();
  syncPanel(s.keys);
  [...$('segments').children].forEach((el, k) => {
    el.classList.toggle('done', k < i);
    el.classList.toggle('current', k === i);
    if (k > i) el.firstElementChild.style.transform = 'scaleX(0)';
  });
}

function updateIntro(dt) {
  if (mode !== 'intro') return;
  if (intro.playing) intro.t += dt;
  const s = intro.shots[intro.shot];
  const k = clamp01(intro.t / s.dur);
  const pose = POSES[s.id](k);
  let { pos, target } = pose;
  if (intro.from) {
    const b = easeIO(clamp01(intro.t / BLEND));
    pos = intro.from.pos.clone().lerp(pos, b);
    target = intro.from.target.clone().lerp(target, b);
  }
  camera.position.copy(pos);
  controls.target.copy(target);
  camera.lookAt(target);
  if (s.id === 'reveal') {
    pivot.rotation.y = lerp(-1.7, 0, easeOut(k));
    pivot.position.y = lerp(-0.12, 0, easeOut(clamp01(k * 1.3)));
    fade = easeOut(clamp01(intro.t / 1.8));
  }
  const fill = $('segments').children[intro.shot]?.firstElementChild;
  if (fill) fill.style.transform = `scaleX(${k})`;
  if (k >= 1 && intro.playing) {
    if (intro.shot < intro.shots.length - 1) enterShot(intro.shot + 1);
    else exitIntro({ toFront: true });
  }
}

function exitIntro({ toFront = false, autoRotate = false } = {}) {
  intro.playing = false;
  setMode('explore');
  hideCallout();
  hideTitle();
  syncPanel(null);
  [...$('segments').children].forEach((el) => el.classList.remove('current'));
  markView(toFront ? 'front' : null);
  if (toFront) {
    const [p, t] = VIEWS.front();
    flyTo(p, t, 1.1, () => setAutoRotate(true));
  } else setAutoRotate(autoRotate);
}

function renderSegments() {
  const el = $('segments');
  el.innerHTML = '';
  intro.shots.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'seg';
    b.setAttribute('aria-label', `Jump to ${s.label}`);
    b.title = s.label;
    b.innerHTML = '<span></span>';
    b.addEventListener('click', () => {
      if (mode !== 'intro') startIntro();
      intro.playing = true; setPlayButton();
      enterShot(i);
    });
    el.appendChild(b);
  });
}

function setPlayButton() {
  const b = $('introPlay');
  b.setAttribute('aria-label', intro.playing ? 'Pause intro' : 'Play intro');
  b.innerHTML = intro.playing
    ? '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
}

// ---- spec callout with an animated leader line
const callout = $('callout');
const leader = $('leaderPath');
const leaderDot = $('leaderDot');
let calloutShot = null;
let calloutTimer = null;

function showCallout(s, i) {
  callout.classList.remove('show');
  stage.classList.remove('leader-on');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => {
    calloutShot = s;
    callout.dataset.side = s.side;
    $('calloutEyebrow').textContent = `${String(i).padStart(2, '0')} — ${s.label}`;
    $('calloutList').innerHTML = s.keys
      .map((k) => [k, spec(k)]).filter(([, v]) => v)
      .map(([k, v], n) => `<div class="row" style="--i:${n}"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    callout.hidden = false;
    void callout.offsetWidth;
    callout.classList.add('show');
    stage.classList.add('leader-on');
  }, intro.from ? 450 : 0);
}
function hideCallout() {
  clearTimeout(calloutTimer);
  calloutShot = null;
  callout.classList.remove('show');
  stage.classList.remove('leader-on');
}

const _p = V();
function updateLeader() {
  if (!calloutShot) return;
  const h = hotspotWorld(calloutShot.anchor);
  if (!h) return;
  const w = wrap.clientWidth, H = wrap.clientHeight;
  _p.copy(h.pos).project(camera);
  const ax = ((_p.x + 1) / 2) * w, ay = ((1 - _p.y) / 2) * H;
  const r = callout.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const mobile = w < 720;
  let bx, by, path;
  if (mobile) {
    bx = r.left - sr.left + 28; by = r.top - sr.top;
    path = `M${ax},${ay} L${bx},${by - 18} L${bx},${by}`;
  } else if (calloutShot.side === 'right') {
    bx = r.left - sr.left; by = r.top - sr.top + 22;
    path = `M${ax},${ay} L${bx - 36},${by} L${bx},${by}`;
  } else {
    bx = r.right - sr.left; by = r.top - sr.top + 22;
    path = `M${ax},${ay} L${bx + 36},${by} L${bx},${by}`;
  }
  leader.setAttribute('d', path);
  leaderDot.setAttribute('cx', ax);
  leaderDot.setAttribute('cy', ay);
}

// ---- title card (reveal + finale)
function showTitle(delay = 0, finale = false) {
  const card = $('titleCard');
  const m = current.model;
  $('tcSeries').textContent = finale ? 'Your turn' : m.series;
  let i = 0;
  $('tcName').innerHTML = m.name.split(' ')
    .map((word) => `<span class="word">${[...word].map((ch) => `<span class="ch" style="--i:${i++}">${ch}</span>`).join('')}</span>`)
    .join(' ');
  $('tcTagline').textContent = finale ? 'Drag to rotate, zoom into the details, or pull it apart.' : m.tagline;
  card.classList.toggle('finale', finale);
  card.classList.remove('show');
  setTimeout(() => { if (mode === 'intro') card.classList.add('show'); }, delay);
}
function hideTitle() { $('titleCard').classList.remove('show'); }

// ---- keep the spec panel in sync with what's on screen
function syncPanel(keys) {
  if (keys) {
    const tab = Object.keys(current.model.specs).find((t) => current.model.specs[t].some(([k]) => k === keys[0]));
    if (tab && tab !== specTab) { specTab = tab; renderSpecs(keys); return; }
  }
  renderSpecs(keys, false);
}

// ================================================================ EXPLODED VIEW
const explode = { t: 0, target: 0 };
const PART_LABELS = {
  top: ['Top', 'Top'], back: ['Back', 'Back & sides'], sides: ['Sides', null], braces: ['Bracing', 'Bracing'],
  pickguard: ['Pickguard', null], bridge: ['Bridge & saddle', 'Bridge'], fretboard: ['Fretboard', 'Fretboard'],
  neck: ['Neck', 'Neck'], headstock: ['Headstock', null], tuners: ['Tuners', 'Tuners'],
};
let partLabelEls = {};

function buildPartLabels() {
  const layer = $('partLabels');
  layer.innerHTML = '';
  partLabelEls = {};
  if (!current.markers) return;
  for (const [id, marker] of Object.entries(current.markers)) {
    const [title, key] = PART_LABELS[id] ?? [id, null];
    const v = key ? spec(key) : null;
    const el = document.createElement('div');
    el.className = `part-label${['back', 'sides', 'neck', 'headstock'].includes(id) ? ' flip' : ''}`;
    el.innerHTML = `<i></i><span><b>${title}</b>${v ? `<em>${v}</em>` : ''}</span>`;
    layer.appendChild(el);
    partLabelEls[id] = { el, marker };
  }
}

function setExplodeTarget(v, instant = false) {
  if (!current?.setExplode) return;
  explode.target = v;
  if (instant) { explode.t = v; current.setExplode(v); }
  const b = $('toggleExplode');
  b.classList.toggle('active', !!v);
  b.setAttribute('aria-pressed', String(!!v));
  stage.classList.toggle('exploded', !!v);
}

function toggleExplode() {
  if (mode !== 'explore') return;
  const on = !explode.target;
  setExplodeTarget(on ? 1 : 0);
  closeInfo();
  setAutoRotate(false);
  markView(null);
  const c = center();
  // three-quarter view from the bass side so parts separate left (back) to right (front)
  const ec = c.clone().add(V(0, 0.07, 0.06));
  if (on) flyTo(around(ec, fitDist * 1.26, -58, 12), ec, 1.6);
  else { const [p, t] = VIEWS.front(); flyTo(p, t, 1.4); markView('front'); }
}

function updateExplode(dt) {
  if (!current?.setExplode) return;
  if (explode.t !== explode.target) {
    const step = dt / (reduceMotion ? 0.01 : 1.9);
    explode.t = explode.target > explode.t ? Math.min(explode.target, explode.t + step) : Math.max(explode.target, explode.t - step);
    current.setExplode(explode.t);
  }
  const op = clamp01((explode.t - 0.75) / 0.2);
  $('partLabels').style.opacity = op;
  if (op <= 0) return;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  for (const { el, marker } of Object.values(partLabelEls)) {
    marker.getWorldPosition(_p).project(camera);
    el.style.transform = `translate(${((_p.x + 1) / 2) * w}px, ${((1 - _p.y) / 2) * h}px)`;
  }
}

// ================================================================ HOTSPOTS
const hotspotLayer = $('hotspots');
let hotspotEls = {};
let tourIds = [];
let activeHotspot = null;

// shared hotspot copy, overridden per model (e.g. the A1 has no rosette, gloss or chrome)
const hotspotInfo = (id) => ({ ...HOTSPOTS[id], ...current.model.hotspotText?.[id] });

function buildHotspots() {
  hotspotLayer.innerHTML = '';
  hotspotEls = {};
  tourIds = Object.keys(HOTSPOTS).filter((id) => current.hotspots[id]);
  tourIds.forEach((id, i) => {
    const info = hotspotInfo(id);
    const b = document.createElement('button');
    b.className = 'hotspot';
    b.setAttribute('aria-label', `${i + 1}. ${info.title}`);
    b.innerHTML = `<span class="label">${info.title}</span>`;
    b.addEventListener('click', () => focusHotspot(id));
    hotspotLayer.appendChild(b);
    hotspotEls[id] = b;
  });
}

function focusHotspot(id) {
  const h = hotspotWorld(id);
  if (!h) return;
  activeHotspot = id;
  setAutoRotate(false);
  const dist = id === 'back' || id === 'top' ? 0.75 : 0.42;
  flyTo(h.pos.clone().addScaledVector(h.normal, dist).add(V(0.06, 0.04, 0)), h.pos.clone());
  Object.entries(hotspotEls).forEach(([k, el]) => el.classList.toggle('active', k === id));
  $('infoStep').textContent = `${tourIds.indexOf(id) + 1} / ${tourIds.length}`;
  $('infoTitle').textContent = hotspotInfo(id).title;
  $('infoText').textContent = hotspotInfo(id).text;
  const card = $('infoCard');
  card.hidden = false;
  card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
  markView(null);
}
function stepTour(dir) {
  const i = activeHotspot ? tourIds.indexOf(activeHotspot) : -1;
  focusHotspot(tourIds[(i + dir + tourIds.length) % tourIds.length]);
}
function closeInfo() {
  activeHotspot = null;
  $('infoCard').hidden = true;
  Object.values(hotspotEls).forEach((el) => el.classList.remove('active'));
}

function updateHotspots() {
  const show = mode === 'explore' && explode.t === 0;
  hotspotLayer.classList.toggle('mode-off', !show);
  if (!show) return;
  const w = wrap.clientWidth, h = wrap.clientHeight, toCam = V();
  for (const [id, el] of Object.entries(hotspotEls)) {
    const hw = hotspotWorld(id);
    toCam.subVectors(camera.position, hw.pos).normalize();
    const facing = hw.normal.dot(toCam) > 0.15;
    _p.copy(hw.pos).project(camera);
    const onScreen = _p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05;
    el.classList.toggle('hidden', !(facing && onScreen));
    el.style.transform = `translate(${((_p.x + 1) / 2) * w}px, ${((1 - _p.y) / 2) * h}px)`;
  }
}

// ================================================================ MODELS + TRANSITIONS
async function loadModel(model) {
  if (model.glb) $('loader').classList.remove('done');
  const built = await createModel(model, { wordmark, env });
  if (current) { pivot.remove(current.group); disposeGroup(current.group); }
  pivot.add(built.group);
  floor.position.y = -built.height / 2 - 0.004;
  current = { model, ...built };
  current.group.updateMatrixWorld(true);
  explode.t = explode.target = 0;
  // debug hook: render a fixed camera angle immediately (used for visual checks)
  window.__viewer = {
    scene, camera, current, intro,
    shot(az = 0, el = 0, k = 1, target = center()) {
      exitIntro(); setAutoRotate(false); tween = null; fade = 1;
      camera.position.copy(around(target, fitDist * k, az, el));
      controls.target.copy(target); camera.lookAt(target);
      renderer.toneMappingExposure = EXPOSURE;
      renderer.render(scene, camera);
      return 'ok';
    },
  };

  resize();
  buildHotspots();
  buildPartLabels();
  renderPanel(model);
  applyFinish(model.defaultFinish);
  $('toggleExplode').hidden = !current.setExplode;
  setExplodeTarget(0);
  const url = new URL(location.href);
  url.searchParams.set('model', model.id);
  history.replaceState(null, '', url);
  $('loader').classList.add('done');
  startIntro();
}

const wait = (ms, fn) => new Promise((resolve) => {
  const s = performance.now();
  const step = (now) => {
    const k = clamp01((now - s) / ms);
    fn(k);
    if (k < 1) requestAnimationFrame(step); else resolve();
  };
  requestAnimationFrame(step);
});

// Switch: current guitar turns away and sinks into the dark, a light sweeps across, the next rises.
let switching = false;
async function switchTo(model) {
  if (switching || current?.model.id === model.id) return;
  switching = true;
  intro.playing = false;
  setMode('switching');
  hideCallout(); hideTitle(); closeInfo();
  if (!reduceMotion) {
    stage.classList.remove('sweep'); void stage.offsetWidth; stage.classList.add('sweep');
    const r0 = pivot.rotation.y, y0 = pivot.position.y, f0 = fade;
    await wait(850, (k) => {
      const e = easeIO(k);
      pivot.rotation.y = r0 + e * 1.8;
      pivot.position.y = y0 - e * 0.25;
      fade = f0 * (1 - e * 0.97);
      atmo.setFade(1 - e * 0.6);
    });
  }
  pivot.position.y = 0;
  await loadModel(model);
  atmo.setFade(1);
  switching = false;
}

// ================================================================ PANEL
// (no model tabs: other guitars are reached through the "All guitars" back button → the shop list)

// ---- buying: version picker (e.g. A1 with / without pickup) + Add to cart
const peso = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let variantId = null;
function renderBuy(model) {
  const vs = model.variants ?? [];
  $('buyBlock').hidden = $('addToCart').hidden = !vs.length;
  if (!vs.length) return;
  if (!vs.some((v) => v.id === variantId)) variantId = vs[0].id;
  const sel = vs.find((v) => v.id === variantId);
  $('variantPrice').textContent = peso(sel.price);
  $('variantNote').textContent = sel.note;
  const host = $('variants');
  host.innerHTML = '';
  for (const v of vs) {
    const b = document.createElement('button');
    b.className = 'chip'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(v.id === variantId));
    b.innerHTML = `<b>${v.label}</b><small>${peso(v.price)}</small>`;
    b.addEventListener('click', () => { variantId = v.id; renderBuy(model); host.querySelector('[aria-checked="true"]')?.focus(); });
    host.appendChild(b);
  }
}
$('addToCart').addEventListener('click', () => {
  const model = current?.model, v = model?.variants?.find((x) => x.id === variantId);
  if (!v) return;
  cart.add({
    title: `Clifton ${model.name}`,
    subtitle: v.pickup ? `With pickup · ${v.pickup}` : v.label,
    image: thumbSrc(model.id),   // the guitar's saved picture (assets/thumbs/)
    url: `guitars.html?model=${model.id}`, linkLabel: 'View in 3D',
    lines: [
      { label: 'Model', value: `${model.series} · ${model.name}` },
      { label: 'Version', value: v.label, price: v.price },
      { label: 'Pickup', value: v.pickup ? 'KLT18B piezo + gooseneck mic' : 'None' },
    ],
    unit: v.price,
  });
  const btn = document.querySelector('.cart-btn');
  btn?.classList.remove('bump'); void btn?.offsetWidth; btn?.classList.add('bump');
  setTimeout(openCart, 250);
});

function renderPanel(model) {
  $('modelSeries').textContent = model.series;
  $('modelName').textContent = model.name;
  $('modelTagline').textContent = model.tagline;
  renderBuy(model);

  const sw = $('swatches');
  sw.innerHTML = '';
  const finishIds = model.finishes ?? Object.keys(FINISHES);
  sw.closest('.block').hidden = !current.setFinish || finishIds.length < 2; // single-finish models: no picker
  finishIds.map((id) => [id, FINISHES[id]]).forEach(([id, f]) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.role = 'radio';
    b.dataset.finish = id;
    b.title = f.label;
    b.setAttribute('aria-label', f.label);
    b.style.background = f.swatch;
    b.addEventListener('click', () => setFinish(id));
    sw.appendChild(b);
  });

  const tabs = $('specTabs');
  tabs.innerHTML = '';
  Object.keys(model.specs).forEach((name) => {
    const b = document.createElement('button');
    b.role = 'tab';
    b.textContent = name;
    b.addEventListener('click', () => { specTab = name; renderSpecs(); });
    tabs.appendChild(b);
  });
  if (!model.specs[specTab]) specTab = Object.keys(model.specs)[0];
  renderSpecs();

  const panel = document.querySelector('.panel');
  panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter');
}

function renderSpecs(highlight = null, animate = true) {
  if (!current) return; // e.g. "Explore" pressed before the first model has loaded
  const { specs } = current.model;
  $('specTabs').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.textContent === specTab)));
  const dl = $('specs');
  const hl = new Set(highlight ?? []);
  dl.innerHTML = specs[specTab].map(([k, v]) => {
    const c = hl.has(k) ? ' class="hl"' : '';
    return `<dt${c}>${k}</dt><dd${c}>${v}</dd>`;
  }).join('');
  if (animate) { dl.classList.remove('fade'); void dl.offsetWidth; dl.classList.add('fade'); }
}

function applyFinish(id) {
  current.finish = id;
  current.setFinish?.(id);
  $('finishLabel').textContent = FINISHES[id]?.label ?? '';
  $('swatches').querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.finish === id)));
}

let finishFx = null;
function setFinish(id) {
  if (id === current.finish) return;
  if (reduceMotion) return applyFinish(id);
  finishFx = { s: performance.now(), id, swapped: false };
}

function setAutoRotate(on) {
  controls.autoRotate = on && !reduceMotion;
  const b = $('toggleRotate');
  b.classList.toggle('active', controls.autoRotate);
  b.setAttribute('aria-pressed', String(controls.autoRotate));
}

function snapshot() {
  const w = 2000, h = Math.round(w / camera.aspect);
  const prev = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.setClearColor('#050505', 1);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setClearColor('#000000', 0);
  renderer.setPixelRatio(prev);
  resize();
  const a = document.createElement('a');
  a.href = url;
  a.download = `clifton-${current.model.id}-${current.finish}.png`;
  a.click();
  toast('Image saved');
}

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ================================================================ EVENTS
$('toggleRotate').addEventListener('click', () => setAutoRotate(!controls.autoRotate));
$('toggleHotspots').addEventListener('click', (e) => {
  const off = hotspotLayer.classList.toggle('off');
  e.currentTarget.classList.toggle('active', !off);
  e.currentTarget.setAttribute('aria-pressed', String(!off));
  if (off) closeInfo();
});
$('toggleExplode').addEventListener('click', toggleExplode);
$('replayIntro').addEventListener('click', startIntro);
$('panelReplay').addEventListener('click', () => { startIntro(); stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); });
$('snapshot').addEventListener('click', snapshot);
$('fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else stage.requestFullscreen?.();
});
document.addEventListener('fullscreenchange', () => $('fullscreen').classList.toggle('active', !!document.fullscreenElement));
$('views').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.view; if (v) setView(v); });
$('infoClose').addEventListener('click', closeInfo);
$('infoPrev').addEventListener('click', () => stepTour(-1));
$('infoNext').addEventListener('click', () => stepTour(1));
$('introSkip').addEventListener('click', () => exitIntro({ toFront: true }));
$('introPlay').addEventListener('click', () => { intro.playing = !intro.playing; setPlayButton(); });
document.addEventListener('keydown', (e) => {
  if (!current || e.target.closest('input, textarea')) return;   // no 3D view on the shop list
  if (mode === 'intro') {
    if (e.key === ' ') { e.preventDefault(); intro.playing = !intro.playing; setPlayButton(); }
    else if (e.key === 'Escape') exitIntro({ toFront: true });
    else if (e.key === 'ArrowRight' && intro.shot < intro.shots.length - 1) enterShot(intro.shot + 1);
    else if (e.key === 'ArrowLeft' && intro.shot > 0) enterShot(intro.shot - 1);
  } else if (!$('infoCard').hidden) {
    if (e.key === 'ArrowRight') stepTour(1);
    else if (e.key === 'ArrowLeft') stepTour(-1);
    else if (e.key === 'Escape') { closeInfo(); setView('front'); }
  }
});
// grabbing the guitar during the intro hands control to the visitor
controls.addEventListener('start', () => {
  tween = null;
  if (mode === 'intro') exitIntro();
  setAutoRotate(false);
  markView(null);
});

// ================================================================ LOOP
let last = performance.now();
const clock0 = last;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!visible || !current) return;

  updateIntro(dt);
  if (mode === 'explore') {
    // settle anything the intro / switch left mid-way
    pivot.rotation.y += (0 - pivot.rotation.y) * Math.min(1, dt * 4);
    pivot.position.y += (0 - pivot.position.y) * Math.min(1, dt * 4);
  }
  if (mode !== 'switching' && !(mode === 'intro' && intro.shots[intro.shot]?.id === 'reveal')) fade += (1 - fade) * Math.min(1, dt * 3);

  if (tween) {
    const k = clamp01((now - tween.s) / tween.dur), e = easeIO(k);
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (k >= 1) { const done = tween.onDone; tween = null; done?.(); }
  }
  if (finishFx) {
    const k = clamp01((now - finishFx.s) / 420);
    finishDip = 1 - 0.6 * Math.sin(k * Math.PI);
    if (k >= 0.5 && !finishFx.swapped) { applyFinish(finishFx.id); finishFx.swapped = true; }
    if (k >= 1) { finishFx = null; finishDip = 1; }
  }
  updateExplode(dt);
  renderer.toneMappingExposure = EXPOSURE * fade * finishDip;
  if (mode !== 'intro') controls.update();
  atmo.update((now - clock0) / 1000);
  renderer.render(scene, camera);
  updateHotspots();
  updateLeader();
}

// ================================================================ START (3D view: guitars.html?model=…)
// The guitar list itself is js/shop.js (no three.js); js/guitars.js picks which one to load.
const requested = MODELS.find((m) => m.id === new URLSearchParams(location.search).get('model'));
if (!requested) location.replace('guitars.html');   // unknown guitar → back to the list
else {
wordmark = await initSite();
await loadModel(requested);
requestAnimationFrame(frame);

renderSeriesLineup(requested);
}

// Lineup under the viewer: the other guitars of the SAME series only (no Clifton Customs card), so each
// series (A1 today; A2 / S Series later) keeps to itself. Re-drawn when the visitor switches guitars.
function renderSeriesLineup(model) {
  const grid = $('lineupGrid');
  if (!grid) return;
  grid.querySelectorAll('.card:not(.card-soon)').forEach((c) => c.remove());
  const others = MODELS.filter((m) => m.series === model.series && m.id !== model.id);
  $('lineupTitle').textContent = `More from the ${model.series}`;
  const soon = grid.querySelector('.card-soon');   // "More A Series · coming soon" belongs to the A Series only
  if (soon) soon.hidden = model.series !== 'A Series';
  grid.closest('.lineup').hidden = !others.length && (!soon || soon.hidden);
  renderLineupCards(grid, others.map((m) => ({ model: m, src: thumbSrc(m.id) })), () => (m) => {
    stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    switchTo(m).then(() => renderSeriesLineup(m));
  });
}
