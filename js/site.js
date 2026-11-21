// Shared page setup: loads fonts + the wordmark, swaps it into [data-wordmark] slots,
// and renders lineup cards. Returns the processed wordmark canvas (or null).
import { loadWordmark } from './logo.js';
import { FINISHES } from './models.js';

// Header: compact after scrolling down; expands while the mouse is near the top of the
// window, while keyboard focus is inside it, or when the visitor scrolls back up.
function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const state = { scrolled: false, near: false, up: false, focus: false };
  let lastY = window.scrollY;
  const apply = () => {
    header.classList.toggle('compact', state.scrolled && !state.near && !state.up && !state.focus);
    header.classList.toggle('at-top', window.scrollY < 8);
  };
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    state.scrolled = y > 60;
    if (y < lastY - 8) state.up = true;        // deliberate scroll up → show full bar
    else if (y > lastY + 4) state.up = false;  // scrolling down → tidy away
    lastY = y;
    apply();
  }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    // hysteresis: open within 110px of the top, close again past 170px
    const near = e.clientY < (state.near ? 170 : 110);
    if (near !== state.near) { state.near = near; apply(); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { state.near = false; apply(); });
  header.addEventListener('focusin', () => { state.focus = true; apply(); });
  header.addEventListener('focusout', () => { state.focus = false; apply(); });
  state.scrolled = window.scrollY > 60;
  apply();
}

export async function initSite() {
  initHeader();
  const [wordmark] = await Promise.all([
    loadWordmark(),
    Promise.race([
      Promise.all([document.fonts.load('64px "Pinyon Script"'), document.fonts.load('600 26px "Archivo"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]),
  ]);
  if (wordmark) {
    const src = wordmark.toDataURL('image/png');
    document.querySelectorAll('[data-wordmark]').forEach((el) => {
      el.innerHTML = `<img src="${src}" alt="Clifton Guitars" />`;
      el.classList.add('has-img');
    });
  }
  return wordmark;
}

// items: [{ model, src }]. `action(model)` returns either an href string or a click handler.
export function renderLineupCards(grid, items, action) {
  for (const { model: m, src } of items) {
    const act = m.href ?? action(m);                 // e.g. the custom electric always links to customize.html
    const label = m.cta ?? 'View in 3D';
    const cta = typeof act === 'string'
      ? `<a class="btn-outline" href="${act}">${label}</a>`
      : `<button class="btn-outline">${label}</button>`;
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-img"><img src="${src}" alt="${m.alt ?? `${m.name} in ${FINISHES[m.defaultFinish]?.label ?? 'natural'}`}" /></div>
      <div class="card-body">
        <p class="eyebrow">${m.series}</p>
        <h3>${m.name}</h3>
        <p>${m.tagline}</p>
        ${cta}
      </div>`;
    if (typeof act === 'function') card.querySelector('button').addEventListener('click', () => act(m));
    grid.insertBefore(card, grid.querySelector('.card-soon'));
  }
}
