// Guitar list (guitars.html with no ?model): a searchable list of every guitar. It shows pre-rendered
// pictures (assets/thumbs/) and never loads three.js, so it opens fast. Picking a guitar opens its 3D
// view (guitars.html?model=…), where the version is chosen and it goes in the cart.
import { MODELS } from './models.js';
import { ELECTRIC_CARD, thumbSrc } from './catalog.js';
import { initSite } from './site.js';

const $ = (id) => document.getElementById(id);
const peso = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

document.documentElement.classList.add('browsing');
$('shop').hidden = false;

const entries = [
  ...MODELS.map((m) => ({
    model: m, href: `guitars.html?model=${m.id}`, type: m.kind ?? 'acoustic', cta: 'View in 3D',
    price: m.variants?.length ? `From ${peso(Math.min(...m.variants.map((v) => v.price)))}` : '',
    text: [m.name, m.series, m.kind, m.tagline, ...Object.values(m.specs ?? {}).flat(2), ...(m.variants ?? []).map((v) => `${v.label} ${v.note}`)].join(' '),
  })),
  {
    model: ELECTRIC_CARD, href: ELECTRIC_CARD.href, type: 'electric', cta: 'Build yours', price: 'Built to order',
    text: `${ELECTRIC_CARD.name} ${ELECTRIC_CARD.series} ${ELECTRIC_CARD.tagline} electric telecaster tele stratocaster strat custom clifton customs humbucker single coil`,
  },
];
const grid = $('shopGrid');
grid.innerHTML = entries.map((e, i) => `
  <a class="shop-card" href="${e.href}" data-i="${i}">
    <div class="shop-img"><img src="${thumbSrc(e.model.id)}" alt="${e.model.alt ?? e.model.name}" width="600" height="750" ${i < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></div>
    <div class="shop-body">
      <p class="eyebrow">${e.model.series} · ${e.type === 'electric' ? 'Electric' : 'Acoustic'}</p>
      <h2>${e.model.name}</h2>
      <p>${e.model.tagline}</p>
      <div class="shop-foot"><span class="shop-price">${e.price}</span><span class="shop-cta">${e.cta}<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></div>
    </div>
  </a>`).join('');

let filter = 'all';
const input = $('shopQuery');
const apply = () => {
  const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  entries.forEach((e, i) => {
    const hay = e.text.toLowerCase();
    const ok = (filter === 'all' || e.type === filter) && words.every((w) => hay.includes(w));
    grid.querySelector(`[data-i="${i}"]`).hidden = !ok;
    shown += ok;
  });
  $('shopCount').textContent = `${shown} guitar${shown === 1 ? '' : 's'}`;
  $('shopEmpty').hidden = shown > 0;
};
const setFilter = () => $('shopFilters').querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === filter)));
input.addEventListener('input', apply);
$('shopSearch').addEventListener('submit', (e) => { e.preventDefault(); apply(); input.blur(); });
$('shopClear').addEventListener('click', () => { input.value = ''; filter = 'all'; setFilter(); apply(); input.focus(); });
$('shopFilters').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  filter = b.dataset.filter; setFilter(); apply();
});
input.value = new URLSearchParams(location.search).get('q') ?? '';
apply();
if (location.hash === '#search') input.focus();

// header, menu, cart (no wordmark processing: that is only needed for the 3D headstock logos)
initSite({ wordmark: false });
