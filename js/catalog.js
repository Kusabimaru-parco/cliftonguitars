// Small, three.js-free catalogue data shared by the light pages (the guitar list) and the 3D code.
// Keep anything that imports 'three' out of this file, so the guitar list loads fast.

// Clifton Customs starting point: a butterscotch Telecaster
export const DEFAULT_BUILD = {
  body: 'tele', tfin: 'butterscotch', sfin: 'khaki', neck: 'rw-std-9',
  tpg: 'sc', tpgc: 'vw', tn: 'classic', thn: 'vc', tb: 'classic',
  spg: 'sss', spgc: 'vw', sn: 'lowgauss', sm: 'lowgauss', sb: 'lowgauss', shn: 'vc', shb: 'vc',
  bag: 'none',
};

// lineup card entry (home + guitars pages): rendered with the default build, links to the customizer
export const ELECTRIC_CARD = {
  id: 'custom-electric', kind: 'electric', build: DEFAULT_BUILD, href: 'customize.html',
  name: 'Custom Electric', series: 'Custom Shop',
  tagline: 'Telecaster or Stratocaster. Choose the body, neck, pickguard and pickups.',
  alt: 'Custom Telecaster in butterscotch with a vintage white pickguard', cta: 'Build yours',
};

// Pre-rendered pictures of each guitar (made by tools/export-models.html → "Render list pictures").
// Used by every lineup / list so those pages never build 3D models just to show a picture.
export const thumbSrc = (id) => `assets/thumbs/${id}.webp`;
