// Shared 3D "studio": renderer, dark-stage lighting, floor glow, model creation, thumbnails.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildGuitar } from './guitar.js';

export const EXPOSURE = 1.0;

export function createRenderer({ preserve = false } = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: preserve });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = EXPOSURE;
  return r;
}

// Low-key lighting for a black stage: a warm key from above, rim lights to carve the
// silhouette out of the dark, and a dimmed environment so gloss still catches highlights.
export function setupStudio(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.42;

  const light = (color, intensity, x, y, z) => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  };
  // exposed on scene.userData.studio so pages can move the light (e.g. per scroll step)
  scene.userData.studio = {
    key: light('#fff0d8', 2.6, 0.8, 3, 2.2),     // key, from above
    fill: light('#cfd8ff', 0.22, -2, 0, 2),      // faint cool fill
    rimL: light('#ffffff', 2.4, -2.5, 1.6, -2),  // rim left
    rimR: light('#ffc56e', 1.8, 2.5, 0.6, -1.6), // warm rim right
  };
  return env;
}

// Atmosphere: dust drifting through the overhead light beam + a highlight that glides
// across the gloss every few seconds. Call update(seconds) each frame.
export function createAtmosphere(scene, renderer, { count = 420, width = 1.6, height = 1.5, depth = 0.9 } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * width;
    pos[i * 3 + 1] = (Math.random() - 0.5) * height;
    pos[i * 3 + 2] = (Math.random() - 0.5) * depth + 0.1;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uHeight: { value: height }, uPixel: { value: renderer.getPixelRatio() }, uFade: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float seed;
      uniform float uTime, uHeight, uPixel;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uHeight * 0.5 + uTime * (0.012 + seed * 0.02), uHeight) - uHeight * 0.5;
        p.x += sin(uTime * 0.25 + seed * 40.0) * 0.04;
        p.z += cos(uTime * 0.2 + seed * 25.0) * 0.03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + seed * 2.6) * uPixel * (1.6 / -mv.z);
        float beam = exp(-pow(p.x / 0.32, 2.0));                  // brighter inside the light cone
        float edge = smoothstep(0.5, 0.3, abs(p.y / uHeight));     // fade at top/bottom of the volume
        float twinkle = 0.6 + 0.4 * sin(uTime * (0.6 + seed) + seed * 12.0);
        vAlpha = beam * edge * twinkle;
      }`,
    fragmentShader: /* glsl */`
      uniform float uFade;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(1.0, 0.86, 0.62, a * vAlpha * 0.55 * uFade);
      }`,
  });
  const dust = new THREE.Points(geo, mat);
  dust.frustumCulled = false;
  scene.add(dust);

  // gliding highlight: a light that sweeps left→right in front of the guitar
  const sweep = new THREE.DirectionalLight('#fff4e0', 0);
  scene.add(sweep);
  const PERIOD = 9, ACTIVE = 2.6;

  return {
    dust,
    setFade(v) { mat.uniforms.uFade.value = v; },
    update(t) {
      mat.uniforms.uTime.value = t;
      const u = (t % PERIOD) / ACTIVE;
      if (u <= 1) {
        sweep.position.set(THREE.MathUtils.lerp(-3, 3, u), 1.4, 2.2);
        sweep.intensity = 3.2 * Math.sin(Math.PI * u) ** 2;
      } else sweep.intensity = 0;
    },
  };
}

function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Pool of warm light on the floor with a soft contact shadow in the middle.
export function makeFloor() {
  const floor = new THREE.Group();
  const flat = (w, d, tex, blending = THREE.NormalBlending) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending }));
    m.rotation.x = -Math.PI / 2;
    floor.add(m);
    return m;
  };
  flat(1.6, 0.9, radialTexture([[0, 'rgba(255,214,150,0.16)'], [0.45, 'rgba(255,190,110,0.05)'], [1, 'rgba(0,0,0,0)']]), THREE.AdditiveBlending);
  const shadow = flat(0.7, 0.3, radialTexture([[0, 'rgba(0,0,0,0.85)'], [1, 'rgba(0,0,0,0)']]));
  shadow.position.y = 0.0005;
  return floor;
}

const gltfLoader = new GLTFLoader();

export function disposeGroup(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

// Returns { group, hotspots, height, setFinish } with the group centred vertically on 0.
export async function createModel(model, { wordmark = null, env = null, finish } = {}) {
  let built;
  if (model.kind === 'electric') {
    const { buildElectric } = await import('./electric.js');
    built = buildElectric(model.build, { logoImage: wordmark });
    built.hotspots = {};
  } else if (model.glb) {
    // Blender export convention: Empties named "hotspot_<id>"; their +Z is the facing normal.
    const gltf = await gltfLoader.loadAsync(model.glb);
    const group = gltf.scene;
    const box = new THREE.Box3().setFromObject(group);
    const hotspots = {};
    group.traverse((o) => {
      const m = o.name.match(/^hotspot_(\w+)/);
      if (m) hotspots[m[1]] = { pos: o.position.clone(), normal: new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion) };
    });
    group.position.y = -box.min.y;
    const outer = new THREE.Group(); outer.add(group);
    outer.updateMatrixWorld(true);
    Object.values(hotspots).forEach((h) => { h.pos = outer.worldToLocal(group.localToWorld(h.pos)); });
    built = { group: outer, hotspots, height: box.max.y - box.min.y, setFinish: null };
  } else {
    built = buildGuitar({ profile: model.profile, finish: finish ?? model.defaultFinish, logoImage: wordmark });
  }
  if (env) {
    built.group.traverse((o) => {
      // meshes can carry one material or an array (e.g. headstock face + edges)
      for (const m of [].concat(o.material ?? [])) {
        if (m.userData?.envScale != null && !m.envMap) { m.envMap = env; m.envMapIntensity = m.userData.envScale; m.needsUpdate = true; }
      }
    });
  }
  built.group.position.y = -built.height / 2;
  return built;
}

// Renders a three-quarter product shot of each model on a transparent background.
export async function renderThumbnails(models, { wordmark, width = 480, height = 600 } = {}) {
  const r = createRenderer({ preserve: true });
  r.setPixelRatio(1);
  r.setSize(width, height, false);
  const scene = new THREE.Scene();
  const env = setupStudio(scene, r);
  const cam = new THREE.PerspectiveCamera(30, width / height, 0.01, 20);
  const out = [];
  for (const m of models) {
    const built = await createModel(m, { wordmark, env });
    const holder = new THREE.Group();
    holder.add(built.group);
    holder.rotation.set(0.05, -0.55, -0.32);
    scene.add(holder);
    const t = Math.tan(THREE.MathUtils.degToRad(15));
    cam.position.set(0, 0, (built.height / 2) / t * 1.16);
    cam.lookAt(0, 0, 0);
    r.render(scene, cam);
    out.push({ model: m, src: r.domElement.toDataURL('image/png') });
    scene.remove(holder);
    disposeGroup(built.group);
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}
