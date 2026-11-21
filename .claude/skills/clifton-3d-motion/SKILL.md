---
name: clifton-3d-motion
description: three.js staging, lighting and motion rules for the Clifton Guitars site: black-stage lighting, camera framing, the cinematic spec intro, model-switch transition, scroll-driven home guitar, exploded view, atmosphere, easing and performance. Use whenever adding or changing any 3D scene, guitar model, camera move, intro shot, transition or animation on the site.
---

# Clifton 3D staging & motion

Feel: **a product film, not a tech demo.** Slow, weighty camera moves; light that comes up out of
black; nothing snaps. Every motion ends in a still, readable composition.

## Where things live

| File | Owns |
|---|---|
| `js/stage.js` | `createRenderer`, `setupStudio` (lighting), `makeFloor`, `createAtmosphere`, `createModel`, `renderThumbnails` |
| `js/guitar.js` | Procedural guitar: named `parts`, `markers`, `setExplode(t)`, `setFinish(id)`, `hotspots` |
| `js/viewer.js` | Guitars page: `SHOTS` + `POSES` (intro), `switchTo` (transition), exploded view, explore mode |
| `js/home.js` | Home page: `POSES_DESKTOP` / `POSES_MOBILE` scroll keyframes |
| `css/styles.css` | Overlay motion (callouts, title card, sweep, story cards, view transitions) |

## Real models (procedural profiles)

Each guitar is a profile in `PROFILES` (`guitar.js`). The A1 (`grandOrchestra`) is the reference
for real models: outline traced from a white-background product photo (`reference/A1 GO front.png`)
and scaled to the measured body length; `ptsTreble` gives an asymmetric (cutaway) side.
Per-profile switches: `scale`, `frets`, `nutW`, `fbW12`, `dots`, `depthNeck` (body taper),
`binding`, `pickguard`, `rosette`, `satin`, `bridge: 'belly'`, `tuners: 'black'`,
`headstock: 'a1'`, `headFace` (veneer wood), `pinDots`, `interior: 'a1'` (kerfed lining + back
braces), `labelStyle: 'a1'` (the real cream/navy label), `fbToSoundhole`, `topWood`, `finishes`, `label`.
A1 details come from the owner's close-ups and corrections in chat (clean, symmetric `THREE.Shape`s).
Headstock: the outline IS the owner's SVG, `reference/headstock-shape.svg` (mm; x 50 = centreline,
y 165 = nut, tip at 12.72). Its path is pasted verbatim into `A1_HEADSTOCK_PATH` in `guitar.js` and
replayed by `applySvgPath()`; to change the shape, paste a new `d` there, never hand-edit curves.
`halfWidthFromShape()` derives widths from it, so posts follow the outline (top pair closest together). No bevel and dark side edges, so the rosewood
face runs to the edge (no tan border); gold "Clifton" reads nut → tip; buttons sit right at the edge.
Bridge: the outline IS the owner's SVG, `reference/Bridge.svg` (mm; x 90 = centreline). Its path is
pasted verbatim into `A1_BRIDGE_PATH` and replayed by `applySvgPath()`; to change it, paste a new `d`.
The SVG doesn't mark the saddle: `A1_BRIDGE_SADDLE_Y = 16.26` puts the saddle centre 5.7 mm below the
top edge (from the bridge photo). Pins from `CLIFTON_PINS_MM` (10.6 mm apart, 14.5 mm below the saddle)
anchor the strings. 3D: 5.4 mm base layer + raised centre block (full 8.4 mm, cut from the outline for
|x| ≤ 41.5) + `WING_FACE` raised faces that narrow and drop toward the wing ends. (An earlier
Gemini "spec drawing" had code that contradicted its own picture; don't reuse it.)
Neck: one lofted surface (`sectionAt(y)`), wound so normals face OUT (it was inverted and the back of
the neck vanished). C-profile 20.5 → 22 mm toward the body; heel = concave fillet down to the back at
the body edge, narrowing to a rounded V from behind, small cream heel cap; volute past the nut blends
into the flat headstock back. Black strap button on the treble (cutaway) side of the heel, high on the heel block, placed on the surface.
Binding: `binding: 'strip'` = cream #EAD9B7 L-strip (2 mm face ring + 2 mm side band) on front and
back, following the outline incl. the cutaway; the back strip is warped with the body taper. Note:
Clifton's listing says "Body binding: None"; the binding was added at the owner's request.
Tuners (A1): posts and buttons black; housings and shafts on the back polished chrome
(`envScale` 2.4 so they read silver on the black stage). Saddle 68 mm, SLANTED
2.8° (bass end toward the tail, `SADDLE_SLOPE`), no dark slot outline; pins plain white (as on the
owner's guitar, although the drawing shows dots); strings break over the slanted saddle per string. Never vertex-warp the
bridge's flat caps to fake taper; it shows as streaky facets. Use layered extrusions. belly bridge with flared ends; white domed pins; tuners black
(the owner's set was replaced, and the originals are black). Models in `models.js` can set
`finishes: [...]` (fewer than 2 hides the pickers) and `hotspotText` to override shared hotspot copy.
When photos and tape measurements disagree on a position, prefer the straight-on photo and keep the
scale-length geometry (nut and saddle positions) as the anchor.

## Lighting (black stage)

Use `setupStudio()`; don't add ad-hoc lights. Recipe: warm key from above (`#fff0d8`, 2.6), faint cool
fill (0.22), white rim left (2.4) and warm rim right (`#ffc56e`, 1.8), RoomEnvironment at
`environmentIntensity 0.42`, ACES tone mapping, exposure 1.0. Rim lights are what separate the
guitar from black. If a surface reads grey, lower its env reflection (`material.userData.envScale`)
rather than brightening lights. Canvas is transparent; the CSS `--stage-bg` supplies the darkness.

## Camera

- FOV 26–30. Fit using the model height, and reserve pixels for UI (top pills ≈70px, bottom toolbar ≈100–110px).
- Pose helper: `around(target, dist, azimuthDeg, elevationDeg)`, where azimuth 0 = front, + = treble side.
- During scripted motion set position + target and call `camera.lookAt(target)`. OrbitControls only
  re-aims inside `controls.update()`, which is paused in the intro.
- Close-ups: 0.35–0.5 m from the detail. Full guitar: `fitDist`.

## Easing & timing

| Motion | Curve | Duration |
|---|---|---|
| Camera fly / shot blend | cubic in-out (`easeIO`) | 0.9–1.6 s (blend 1.4 s) |
| Reveals, settles | cubic out (`easeOut`) | 1.4–2.2 s |
| UI fades/slides | `cubic-bezier(.2,.7,.2,1)` | 0.45–0.8 s, stagger 35–110 ms |
| Finish swap | exposure dip 60% → swap at midpoint | 0.42 s |
| Model switch out | turn 1.8 rad + sink 0.25 + fade to 3% | 0.85 s, then new reveal |
| Scroll follow | exponential smoothing `s += (target - s) * dt * 5` | — |

Never linear camera motion. Never move the camera and the guitar fast at the same time.

## Cinematic intro (guitars page)

`SHOTS` in `viewer.js`: `{ id, label, dur, keys?, anchor?, side? }` with a matching `POSES[id](t)`.
- `keys` are spec labels pulled from `models.js` and shown in the callout; `anchor` is a hotspot id the
  leader line points at; `side` puts the callout left/right of the guitar (opposite to where the detail sits).
- Shots whose anchor hotspot is missing are skipped automatically (useful for GLB models).
- Keep each shot 3.8–4.8 s and the total under ~30 s. Callouts max 4 rows.
- Any drag, Esc or "Explore it yourself" hands control to the visitor. Never trap them.
- Reduced motion: skip straight to explore mode.

## Scroll story (home)

The home stage is **full-screen**: `.showcase` is pulled up under the fixed header
(`margin-top: -header-h`), the stage is `sticky; top: 0; height: 100svh`, and hero/story sections
pad their content down by `--header-h`. Never pin the stage below the header, because that clips
the guitar and the light cone at an awkward band. The hero section fades out as `s` grows so its
copy never ghosts behind the compact header pill.

One keyframe per section (`x`, `y` as fractions of the half-view, `scale`, `yaw`, `pitch`, `lean`, `explode`).
Keep full-guitar poses at `scale` ≤ ~1.05 so the headstock stays in frame; only deliberate
close-ups (details) should crop.
Write separate mobile poses: on phones the guitar stays centred and the text docks at the bottom.
Explode only in the second half of its section so the parts hold while the card is read.

**Stopping points.** Mouse/trackpad/keys: `home.js` turns one wheel gesture (or ↓/PageDown/Space)
into one step, a 950 ms eased glide to the next section, and swallows trackpad inertia until the
wheel is quiet for 180 ms. Outside the story range the page scrolls natively. Touch (`pointer: coarse`):
CSS `scroll-snap-type: y mandatory` + `scroll-snap-stop: always` on the story sections; later sections
are snap areas too so the page never gets pulled back. Don't enable mandatory snapping for mice:
Chrome snaps short wheel scrolls back to the nearest point. Step positions use the sticky top:
`s = (scrollY + pinTop - showcase.offsetTop) / stageHeight`.

**Light per step.** `LIGHTS[]` in `home.js` (one per section, blended like the poses): key light
position `kx/ky/kz`, rim balance `rimL/rimR`, `warm` (key colour toward `#ffc98a`), and `src`, the
horizontal offset of the visible light cone's source from the guitar (fraction of stage width).
The CSS cone (`.showcase-stage::before`) starts at `--beam-sx/--beam-sy` and is rotated
(`--beam-rot`) and stretched (`--beam-len`) to point at the guitar every frame. Keep the 3D key on the
same side as `src` so the visible beam and the highlights agree. Current rig: hero from above,
tonewoods raking from upper right, details from upper left, built-by-us low and warm from the front.
Studio lights are reachable at `scene.userData.studio.{key,fill,rimL,rimR}`.

## Exploded view

Offsets live in `EXPLODE` in `guitar.js` (`[offset, delay]`). Parts separate mostly along Z
(front/back), so view it from the side (azimuth ≈ −58°). Strings fade out first. Labels follow
`markers`; labels on back-side parts use `.flip`. For a real Blender model, name part objects
to match `parts` keys so the same offsets apply.

## Atmosphere

`createAtmosphere()`: about 400 additive dust points (200 on phones) brightest inside the light cone,
plus a sweep light gliding left→right every 9 s. Keep it subtle: it should be noticed only on a second look.

## Performance

- Pixel ratio cap 2. Pause rendering when the stage is off-screen (IntersectionObserver).
- Dispose geometries when swapping models (`disposeGroup`).
- Real models: GLB with Draco, under ~8 MB, textures ≤ 2K.
