// Shopping cart: items live in localStorage so the cart survives page changes and reloads,
// and every page's header badge / drawer stays in sync (including other open tabs).
// Item: { id, title, subtitle, image, url, lines: [{ label, value, price }], unit, qty }
const KEY = 'clifton-cart-v1';
const listeners = new Set();

function read() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; }
}
let items = read();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); }
  catch {   // storage full (pictures are the heavy part): drop the oldest pictures and retry
    for (const it of items) { it.image = null; try { localStorage.setItem(KEY, JSON.stringify(items)); break; } catch { /* keep trimming */ } }
  }
  listeners.forEach((fn) => fn(items));
}

addEventListener('storage', (e) => { if (e.key === KEY) { items = read(); listeners.forEach((fn) => fn(items)); } });

export const cart = {
  get items() { return items; },
  get count() { return items.reduce((n, it) => n + it.qty, 0); },
  get subtotal() { return items.reduce((s, it) => s + it.unit * it.qty, 0); },
  add(item) {
    const it = { ...item, id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, qty: 1 };
    items = [...items, it];
    save();
    return it;
  },
  setQty(id, qty) { items = items.map((it) => (it.id === id ? { ...it, qty: Math.max(1, Math.min(10, qty)) } : it)); save(); },
  remove(id) { items = items.filter((it) => it.id !== id); save(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
