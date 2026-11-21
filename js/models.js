// Model catalogue. To swap in a real Blender model later, export a .glb into /models
// and set `glb: 'models/your-file.glb'` — the viewer then loads it instead of the
// procedural stand-in. Hotspot `id`s map to positions defined by the model source.
// NOTE: the A1 entry uses Clifton's Shopee listing + the owner's measurements.
// Custom electric guitars live in js/electric.js (customize.html), not here.

export const MODELS = [
  {
    id: 'a1-grand-orchestra',
    name: 'A1 Grand Orchestra',
    series: 'A Series',
    tagline: 'No frills, just tone. Solid Sitka spruce over sapele, with a cutaway for the upper frets.',
    profile: 'grandOrchestra',
    glb: null,
    defaultFinish: 'natural',
    finishes: ['natural'],
    specs: {
      Body: [
        ['Body shape', '41" Grand Orchestra, cutaway'],
        ['Top', 'Solid Sitka spruce'],
        ['Back & sides', 'Laminated sapele'],
        ['Binding', 'None'],
        ['Lower bout', '405 mm'],
        ['Body depth', '118 mm tail · 98 mm neck'],
        ['Finish', 'Natural satin'],
        ['Designed in', 'the Philippines'],
      ],
      Neck: [
        ['Fretboard', 'Rosewood'],
        ['Scale length', '648 mm (25.5")'],
        ['Nut width', '43 mm'],
        ['Frets', '20, 304 stainless steel'],
        ['Inlays', '4 mm dots'],
        ['Neck joint', '14th fret'],
      ],
      Hardware: [
        ['Tuners', 'Die-cast, black'],
        ['Nut & saddle', 'Bone'],
        ['Bridge', 'Rosewood'],
        ['Strings', 'Alice phosphor bronze'],
      ],
    },
    // overrides for the shared hotspot text (the A1 has no rosette, gloss or chrome)
    hotspotText: {
      top: { title: 'Solid Sitka spruce top', text: 'A solid Sitka spruce soundboard under a natural satin finish. It opens up the more it is played.' },
      rosette: { title: 'Soundhole', text: 'A plain, unbound soundhole. No frills, just tone.' },
      bridge: { title: 'Bridge & saddle', text: 'Rosewood belly bridge with a bone saddle and white bridge pins.' },
      fretboard: { title: 'Fretboard', text: '648 mm (25.5") scale rosewood fretboard with 20 stainless steel frets and 4 mm dots.' },
      headstock: { title: 'Headstock', text: 'Rosewood-veneer face with the gold Clifton script, flaring wide at the nut.' },
      tuners: { title: 'Die-cast tuners', text: 'Black die-cast machine heads.' },
      back: { title: 'Back & sides', text: 'Laminated sapele back and sides.' },
      neck: { title: 'Neck', text: 'Joins the body at the 14th fret; the cutaway opens up the frets above it.' },
    },
  },
];

export const FINISHES = {
  natural: { label: 'Natural', swatch: 'linear-gradient(135deg,#f1d6a2,#d6ae6b)' },
  sunburst: { label: 'Sunburst', swatch: 'radial-gradient(circle at 45% 40%,#f0c27a 0 30%,#8a3a10 62%,#1c0a03 85%)' },
  vintage: { label: 'Vintage amber', swatch: 'linear-gradient(135deg,#e3b061,#9c6a2c)' },
  black: { label: 'Gloss black', swatch: 'linear-gradient(135deg,#3a3a3e,#050506)' },
};

export const HOTSPOTS = {
  top: { title: 'Solid spruce top', text: 'A stiff, light soundboard that opens up the more it is played. Gloss finish shown.', view: 'front' },
  rosette: { title: 'Abalone rosette', text: 'Hand-inlaid abalone ring framed by ivoroid and black purfling.' },
  bridge: { title: 'Bridge & saddle', text: 'Rosewood belly bridge with a compensated bone saddle for accurate intonation.' },
  fretboard: { title: 'Fretboard', text: '645 mm scale rosewood fretboard with pearl dot inlays and 20 medium frets.' },
  headstock: { title: 'Headstock', text: 'Gloss black veneer with the Clifton script logo, angled back 14° for string tension.' },
  tuners: { title: 'Sealed tuners', text: 'Chrome 18:1 sealed machine heads hold tune through heavy strumming.' },
  back: { title: 'Back & sides', text: 'Mahogany back and sides for a warm, focused midrange.' },
  neck: { title: 'Neck profile', text: 'Comfortable C-shape mahogany neck with a sculpted heel.' },
};
