// Loads the Clifton wordmark, keys out a white/light background, recolours it to the
// brand gold and trims empty margins. Works with transparent PNGs too.
// Returns a canvas, or null if the file is missing (callers fall back to the script font).
export const WORDMARK_SRC = 'assets/logo-wordmark.png';
const GOLD = [253, 184, 63];

export async function loadWordmark(src = WORDMARK_SRC) {
  const img = new Image();
  // onload (not decode()): decode() can stall indefinitely in background tabs; give up after 4s
  const done = new Promise((res) => { img.onload = () => res(true); img.onerror = () => res(false); });
  img.src = src;
  await Promise.race([done, new Promise((res) => setTimeout(res, 4000))]);
  if (!img.complete || !img.naturalWidth) return null;

  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, w, h);
  const p = data.data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < p.length; i += 4) {
    // Gold ink has a low blue channel; white paper has a high one.
    const ink = Math.min(1, Math.max(0, (245 - p[i + 2]) / (245 - 80)));
    const a = (p[i + 3] / 255) * ink;
    p[i] = GOLD[0]; p[i + 1] = GOLD[1]; p[i + 2] = GOLD[2]; p[i + 3] = Math.round(a * 255);
    if (a > 0.08) {
      const px = (i / 4) % w, py = (i / 4 / w) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
  }
  if (x1 <= x0) return null;
  g.putImageData(data, 0, 0);

  const pad = 4;
  const out = document.createElement('canvas');
  out.width = x1 - x0 + pad * 2; out.height = y1 - y0 + pad * 2;
  out.getContext('2d').drawImage(c, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Draw the wordmark fitted inside a box (used for textures).
export function drawFitted(g, img, x, y, w, h) {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
