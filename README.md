# Clifton Guitars — 3D viewer (proposal demo)

Interactive 3D guitar viewer styled to match cliftonguitars.com (charcoal + gold, script wordmark).
Currently shows **procedural stock acoustic guitars** as stand-ins; specs are placeholder demo values.

## Run locally

```
node server.js
```

Then open http://localhost:5173. No install step — three.js loads from the jsDelivr CDN.

## Logo

Save the script wordmark as `assets/logo-wordmark.png`. It's used in the header, on the headstock and
on the soundhole label. A white or transparent background both work: `js/logo.js` removes the background,
recolours it to the brand gold (#fdb83f) and trims the margins. Without the file the site falls back to the
Pinyon Script font. `logo.png` (round badge) is used as the browser-tab icon.

## Files

| File | What it does |
|---|---|
| `index.html` + `js/home.js` | Home page: hero guitar showcase, lineup, how it works, A Series teaser |
| `guitars.html` + `js/viewer.js` | 3D viewer with specs, finishes, feature tour. `guitars.html?model=<id>` opens a model |
| `css/styles.css` | Colours (top of file), layout, mobile breakpoints |
| `js/models.js` | Model list, specs, finishes, hotspot text — edit this for content |
| `js/stage.js` | Shared black-stage lighting, floor glow, model loading, thumbnails |
| `js/site.js` | Shared header/footer logo and lineup cards |
| `js/guitar.js` | Procedural stand-in guitar (dreadnought + auditorium bodies) |
| `js/logo.js` | Wordmark loading/recolouring |

## Swapping in a real Blender model (A Series)

1. Model the guitar in Blender, in metres, standing upright (tail at the bottom, top facing +Y in Blender = front).
2. Add **Empties** named `hotspot_top`, `hotspot_bridge`, `hotspot_headstock`, etc. at the detail points
   (ids must match keys in `HOTSPOTS` in `js/models.js`). The Empty's local Z axis = the direction it faces.
3. Export **glTF Binary (.glb)** with "+Y Up" into `models/`, ideally with Draco compression.
4. In `js/models.js` add an entry with `glb: 'models/your-file.glb'` and the real specs.

Finish switching currently only applies to the procedural models; GLB finishes will need material variants.
