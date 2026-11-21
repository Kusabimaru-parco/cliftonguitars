// Shared page setup: loads fonts + the wordmark, swaps it into [data-wordmark] slots,
// and renders lineup cards. Returns the processed wordmark canvas (or null).
import { loadWordmark } from './logo.js';
import { cart } from './cart.js';
import { FINISHES } from './models.js';

// Header: compact after scrolling down; expands while the mouse is near the top of the
// window, while keyboard focus is inside it, or when the visitor scrolls back up.
function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const state = { scrolled: false, near: false, up: false, focus: false };
  let lastY = window.scrollY;
  initMobileNav(header);
  const apply = () => {
    header.classList.toggle('compact', state.scrolled && !state.near && !state.up && !state.focus && !header.classList.contains('menu-open'));
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

// Phones: the header links are hidden, so a menu button opens them as a dropdown under the header.
// Built from the page's own .nav, so every page gets it without extra markup.
const BURGER = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function initMobileNav(header) {
  const nav = header.querySelector('.nav'), icons = header.querySelector('.header-icons');
  if (!nav || !icons) return;
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-controls', 'mobileNav');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = BURGER;
  icons.appendChild(btn);
  const panel = document.createElement('nav');
  panel.id = 'mobileNav'; panel.className = 'mobile-nav'; panel.setAttribute('aria-label', 'Main');
  panel.innerHTML = nav.innerHTML;
  header.appendChild(panel);
  const set = (open) => {
    header.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = open ? CLOSE : BURGER;
    if (open) header.classList.remove('compact');
  };
  btn.addEventListener('click', () => set(!header.classList.contains('menu-open')));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  // tap outside closes it (composedPath: the button's icon is swapped mid-click, so e.target may be detached)
  document.addEventListener('click', (e) => { if (!e.composedPath().includes(header)) set(false); });
}

// ---------------------------------------------------------------- cart drawer (every page)
const peso = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let drawer = null, lastFocus = null;

function cartItemHTML(it) {
  const rows = it.lines.map((l) => `<dt>${esc(l.label)}</dt><dd>${esc(l.value)}${l.price ? `<small>${peso(l.price)}</small>` : ''}</dd>`).join('');
  return `<article class="cart-item" data-id="${it.id}">
    <div class="ci-img">${it.image ? `<img src="${it.image}" alt="" />` : ''}</div>
    <div class="ci-main">
      <div class="ci-head"><h3>${esc(it.title)}</h3><b>${peso(it.unit * it.qty)}</b></div>
      <p class="ci-sub">${esc(it.subtitle)}</p>
      <details><summary>Build details</summary><dl class="ci-specs">${rows}</dl></details>
      <div class="ci-row">
        <div class="qty" role="group" aria-label="Quantity">
          <button data-act="dec" aria-label="One fewer" ${it.qty <= 1 ? 'disabled' : ''}>−</button>
          <span aria-live="polite">${it.qty}</span>
          <button data-act="inc" aria-label="One more">+</button>
        </div>
        <a class="ci-link" href="${esc(it.url)}">${esc(it.linkLabel ?? 'Edit build')}</a>
        <button class="ci-link" data-act="remove">Remove</button>
      </div>
    </div>
  </article>`;
}

function renderCart() {
  const body = drawer.querySelector('.cart-body'), foot = drawer.querySelector('.cart-foot');
  if (!cart.items.length) {
    body.innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p>
      <a class="btn-gold" href="customize.html">Clifton Customs</a><a class="btn-ghost" href="guitars.html">Browse guitars</a></div>`;
    foot.hidden = true;
  } else {
    body.innerHTML = cart.items.map(cartItemHTML).join('');
    foot.hidden = false;
    foot.querySelector('.cart-sub b').textContent = peso(cart.subtotal);
  }
  drawer.querySelector('#cartTitle small').textContent = cart.count ? `(${cart.count})` : '';
  document.querySelectorAll('.cart-count').forEach((b) => { b.textContent = cart.count; b.hidden = !cart.count; });
}

export function openCart() {
  if (!drawer) return;
  lastFocus = document.activeElement;
  drawer.querySelector('.cart-msg').textContent = '';
  document.documentElement.classList.add('cart-open');
  drawer.setAttribute('aria-hidden', 'false');
  drawer.inert = false;
  setTimeout(() => drawer.querySelector('.cart-close').focus(), 50);
}
function closeCart() {
  if (!document.documentElement.classList.contains('cart-open')) return;
  document.documentElement.classList.remove('cart-open');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.inert = true;
  lastFocus?.focus?.();
}

function initCart(header) {
  const scrim = document.createElement('div');
  scrim.className = 'cart-scrim';
  drawer = document.createElement('aside');
  drawer.className = 'cart-drawer';
  drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'cartTitle'); drawer.setAttribute('aria-hidden', 'true');
  drawer.inert = true;
  drawer.innerHTML = `
    <div class="cart-top"><h2 id="cartTitle">Your cart <small></small></h2>
      <button class="cart-close" aria-label="Close cart"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="cart-body"></div>
    <div class="cart-foot">
      <div class="cart-sub"><span>Subtotal</span><b></b></div>
      <p class="cart-note">Pre-orders now available. 15% off listed price.</p>
      <button class="btn-gold cart-checkout">Checkout</button>
      <p class="cart-msg" role="status"></p>
    </div>`;
  document.body.append(scrim, drawer);

  // header cart button + count badge
  const btn = header?.querySelector('.header-icons [aria-label="Cart"]');
  if (btn) {
    btn.classList.add('cart-btn');
    btn.insertAdjacentHTML('beforeend', '<span class="cart-count" hidden></span>');
    btn.addEventListener('click', openCart);
  }
  scrim.addEventListener('click', closeCart);
  drawer.querySelector('.cart-close').addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
  drawer.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const id = e.target.closest('.cart-item')?.dataset.id;
    if (!act || !id) return;
    const it = cart.items.find((x) => x.id === id);
    if (act === 'inc') cart.setQty(id, it.qty + 1);
    if (act === 'dec') cart.setQty(id, it.qty - 1);
    if (act === 'remove') cart.remove(id);
  });
  // this is a proposal site: there is no payment backend yet
  drawer.querySelector('.cart-checkout').addEventListener('click', () => {
    drawer.querySelector('.cart-msg').textContent = 'Checkout will open Shopify’s secure checkout once this site is connected to the Clifton store.';
  });
  cart.subscribe(renderCart);
  renderCart();
}

export async function initSite() {
  initHeader();
  initCart(document.getElementById('siteHeader'));
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
