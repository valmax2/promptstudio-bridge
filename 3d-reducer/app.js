import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import { MeshoptSimplifier } from 'meshoptimizer';

// ─── DOM ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const canvas = $('canvas'), viewport = $('viewport');
const el = {
  fileName: $('fileName'), dropHint: $('dropHint'), spinner: $('spinner'),
  spinnerText: $('spinnerText'), stats: $('stats'),
  statOrig: $('statOrig'), statCur: $('statCur'), statRed: $('statRed'), statSize: $('statSize'),
  ratio: $('ratio'), ratioLabel: $('ratioLabel'), wireframe: $('wireframe'), toast: $('toast'),
  loadBtn: $('loadBtn'), resetBtn: $('resetBtn'),
  exportStl: $('exportStl'), exportObj: $('exportObj'), fileInput: $('fileInput'),
  settingsBtn: $('settingsBtn'), settings: $('settings'), settingsClose: $('settingsClose'),
  settingsBackdrop: $('settingsBackdrop'), themeSeg: $('themeSeg'),
  accentSwatches: $('accentSwatches'), modelSwatches: $('modelSwatches'),
  autoRotate: $('autoRotate'), movingLight: $('movingLight'), viewAxes: $('viewAxes'),
};

// ─── Three.js scene ───────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// autoClear off: puliamo a mano, così il ViewHelper (assi) non cancella la scena
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
camera.position.set(0, 0, 5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.HemisphereLight(0xffffff, 0x202028, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1, 1.5, 1); scene.add(key);
const fill = new THREE.DirectionalLight(0x9fb4ff, 0.5); fill.position.set(-1, -0.3, -0.8); scene.add(fill);

const material = new THREE.MeshStandardMaterial({
  color: 0xcfd3dc, metalness: 0.12, roughness: 0.62,
  flatShading: false, side: THREE.DoubleSide,
});

// ─── Stato configurabile ────────────────────────────────────────────────────
let userModelColor = null;          // null = colore automatico (dipende dal tema)
let autoRotateOn = false;
let movingLightOn = false;
let viewAxesOn = false;
const modelCenter = new THREE.Vector3();
let modelRadius = 1;
const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

// Cubo/assi di orientamento (stile CAD), angolo in basso a destra del canvas
const clock = new THREE.Clock();
const viewHelper = new ViewHelper(camera, renderer.domElement);
viewHelper.center = modelCenter;
canvas.addEventListener('pointerup', (e) => { if (viewAxesOn) viewHelper.handleClick(e); });

// ─── Tema chiaro / scuro ────────────────────────────────────────────────────
const THEMES = {
  dark:  { bg: 0x141416, model: 0xcfd3dc, meta: '#141416' },
  light: { bg: 0xe9e9ee, model: 0xb4b8c2, meta: '#EFEFF4' },
};
function applyTheme(name) {
  const t = THEMES[name] || THEMES.dark;
  document.documentElement.dataset.theme = name;
  scene.background = new THREE.Color(t.bg);
  material.color.setHex(userModelColor != null ? userModelColor : t.model);
  const meta = document.getElementById('themeColor');
  if (meta) meta.setAttribute('content', t.meta);
  el.themeSeg.querySelectorAll('button').forEach((b) =>
    b.classList.toggle('active', b.dataset.themeVal === name));
  store('pr3d-theme', name);
}
el.themeSeg.querySelectorAll('button').forEach((b) =>
  b.addEventListener('click', () => applyTheme(b.dataset.themeVal)));

// ─── Palette interfaccia (colore d'accento) ─────────────────────────────────
const ACCENTS = ['#007AFF', '#AF52DE', '#34C759', '#FF9500', '#FF2D55', '#30B0C7', '#8E8E93'];
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function applyAccent(hex, save = true) {
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-soft', hexA(hex, 0.18));
  el.accentSwatches.querySelectorAll('.swatch').forEach((s) =>
    s.classList.toggle('active', s.dataset.c === hex));
  if (save) store('pr3d-accent', hex);
}
ACCENTS.forEach((hex) => {
  const s = document.createElement('div');
  s.className = 'swatch'; s.dataset.c = hex; s.style.background = hex;
  s.addEventListener('click', () => applyAccent(hex));
  el.accentSwatches.appendChild(s);
});

// ─── Colore del modello 3D ──────────────────────────────────────────────────
const MODELS = [
  { n: 'Auto', auto: true }, { n: 'Grigio', c: '#C6CAD3' }, { n: 'Bianco', c: '#F2F3F5' },
  { n: 'Oro', c: '#E8C066' }, { n: 'Rame', c: '#C57B4E' }, { n: 'Blu', c: '#6EA8FF' },
  { n: 'Verde', c: '#7ED08A' }, { n: 'Rosso', c: '#FF7A7A' }, { n: 'Grafite', c: '#3A3A3E' },
];
function applyModelColor(item, save = true) {
  userModelColor = item.auto ? null : parseInt(item.c.slice(1), 16);
  const theme = THEMES[document.documentElement.dataset.theme] || THEMES.dark;
  material.color.setHex(userModelColor != null ? userModelColor : theme.model);
  el.modelSwatches.querySelectorAll('.swatch').forEach((s) =>
    s.classList.toggle('active', s.dataset.n === item.n));
  if (save) store('pr3d-model', item.n);
}
MODELS.forEach((item) => {
  const s = document.createElement('div');
  s.className = 'swatch' + (item.auto ? ' auto' : '');
  s.dataset.n = item.n; s.title = item.n;
  if (!item.auto) s.style.background = item.c;
  s.addEventListener('click', () => applyModelColor(item));
  el.modelSwatches.appendChild(s);
});

// ─── Interruttori vista ─────────────────────────────────────────────────────
function setSwitch(node, on) { node.setAttribute('aria-checked', on ? 'true' : 'false'); }
el.autoRotate.addEventListener('click', () => {
  autoRotateOn = !autoRotateOn;
  controls.autoRotate = autoRotateOn;
  setSwitch(el.autoRotate, autoRotateOn);
  store('pr3d-autorotate', autoRotateOn ? '1' : '0');
});
el.movingLight.addEventListener('click', () => {
  movingLightOn = !movingLightOn;
  setSwitch(el.movingLight, movingLightOn);
  if (!movingLightOn && mesh) key.position.copy(modelCenter).add(new THREE.Vector3(modelRadius, modelRadius * 1.5, modelRadius));
  store('pr3d-movinglight', movingLightOn ? '1' : '0');
});
el.viewAxes.addEventListener('click', () => {
  viewAxesOn = !viewAxesOn;
  setSwitch(el.viewAxes, viewAxesOn);
  store('pr3d-viewaxes', viewAxesOn ? '1' : '0');
});
controls.autoRotateSpeed = 2.2;

// ─── Apertura / chiusura Impostazioni ───────────────────────────────────────
function openSettings() { el.settings.classList.remove('hidden'); requestAnimationFrame(() => el.settings.classList.add('show')); }
function closeSettings() { el.settings.classList.remove('show'); setTimeout(() => el.settings.classList.add('hidden'), 320); }
el.settingsBtn.addEventListener('click', openSettings);
el.settingsClose.addEventListener('click', closeSettings);
el.settingsBackdrop.addEventListener('click', closeSettings);

// ─── Applica le preferenze salvate ──────────────────────────────────────────
applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
(function restore() {
  let a; try { a = localStorage.getItem('pr3d-accent'); } catch (e) {}
  applyAccent(ACCENTS.includes(a) ? a : ACCENTS[0], false);
  let m; try { m = localStorage.getItem('pr3d-model'); } catch (e) {}
  applyModelColor(MODELS.find((x) => x.n === m) || MODELS[0], false);
  let ar; try { ar = localStorage.getItem('pr3d-autorotate'); } catch (e) {}
  if (ar === '1') { autoRotateOn = true; controls.autoRotate = true; setSwitch(el.autoRotate, true); }
  let ml; try { ml = localStorage.getItem('pr3d-movinglight'); } catch (e) {}
  if (ml === '1') { movingLightOn = true; setSwitch(el.movingLight, true); }
  let va; try { va = localStorage.getItem('pr3d-viewaxes'); } catch (e) {}
  if (va === '1') { viewAxesOn = true; setSwitch(el.viewAxes, true); }
})();

let mesh = null;            // mesh visualizzata
let baseGeometry = null;    // geometria originale indicizzata (mai modificata)
let currentGeometry = null; // geometria attualmente in scena
let debounceTimer = null;

// ─── Render loop ──────────────────────────────────────────────────────────────
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

(function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (movingLightOn && mesh) {
    const t = performance.now() * 0.0012;
    key.position.set(
      modelCenter.x + Math.cos(t) * modelRadius * 2.2,
      modelCenter.y + modelRadius * 1.6,
      modelCenter.z + Math.sin(t) * modelRadius * 2.2,
    );
  }
  // durante l'animazione del cubo di orientamento comanda il ViewHelper, non i controlli
  if (viewHelper.animating) viewHelper.update(delta);
  else controls.update();
  renderer.clear();
  renderer.render(scene, camera);
  if (viewAxesOn) viewHelper.render(renderer);
})();

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmt = (n) => n.toLocaleString('it-IT');
function showSpinner(txt) { el.spinnerText.textContent = txt || 'Elaboro…'; el.spinner.classList.remove('hidden'); }
function hideSpinner() { el.spinner.classList.add('hidden'); }
// lascia respirare il thread per far ridisegnare lo spinner prima di lavori pesanti
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function triCount(geom) {
  return (geom.index ? geom.index.count : geom.getAttribute('position').count) / 3;
}

// dimensione di uno STL binario = intestazione 84 byte + 50 byte per triangolo
function stlBytes(tris) { return 84 + tris * 50; }
function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

let toastTimer = null;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
}

// estrae solo le posizioni da una geometria (scarta uv/normali per un merge robusto)
function positionsOnly(geom) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const pos = g.getAttribute('position');
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos.array.slice(0), 3));
  return out;
}

function fitCamera() {
  const box = new THREE.Box3().setFromObject(mesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius || 1, c = sphere.center;
  modelCenter.copy(c); modelRadius = r;
  camera.near = r / 100; camera.far = r * 100;
  const dir = new THREE.Vector3(1, 0.55, 1).normalize();
  camera.position.copy(c).addScaledVector(dir, r * 2.6);
  camera.updateProjectionMatrix();
  controls.target.copy(c); controls.update();
  key.position.copy(c).add(new THREE.Vector3(r, r * 1.5, r));
}

// ─── Caricamento file ─────────────────────────────────────────────────────────
async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'obj' && ext !== 'stl') { alert('Formato non supportato. Usa .obj o .stl'); return; }

  showSpinner('Carico ' + file.name + '…');
  await nextFrame();
  try {
    let geometries = [];
    if (ext === 'stl') {
      const buf = await file.arrayBuffer();
      geometries = [new STLLoader().parse(buf)];
    } else {
      const text = await file.text();
      const group = new OBJLoader().parse(text);
      group.traverse((o) => { if (o.isMesh && o.geometry) geometries.push(o.geometry); });
    }
    if (!geometries.length) throw new Error('Nessuna geometria trovata nel file.');

    // unifica + salda i vertici → geometria indicizzata pulita
    showSpinner('Preparo la mesh…');
    await nextFrame();
    let merged = mergeGeometries(geometries.map(positionsOnly), false);
    merged = mergeVertices(merged, 1e-4);
    merged.computeVertexNormals();

    baseGeometry = merged;
    setGeometry(merged.clone());
    fitCamera();

    el.fileName.textContent = file.name;
    el.stats.classList.remove('hidden');
    el.dropHint.classList.add('hidden');
    el.statOrig.textContent = fmt(triCount(baseGeometry));
    el.ratio.value = 100; el.ratio.disabled = false;
    el.ratioLabel.textContent = '100%';
    [el.resetBtn, el.exportStl, el.exportObj].forEach((b) => (b.disabled = false));
    updateStats();
  } catch (err) {
    console.error(err);
    alert('Errore nel caricamento: ' + err.message);
  } finally {
    hideSpinner();
  }
}

function setGeometry(geom) {
  if (mesh) { scene.remove(mesh); currentGeometry?.dispose(); }
  currentGeometry = geom;
  mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);
}

function updateStats() {
  if (!currentGeometry) return;
  const orig = triCount(baseGeometry), cur = triCount(currentGeometry);
  el.statCur.textContent = fmt(cur);
  const red = orig ? Math.round((1 - cur / orig) * 100) : 0;
  el.statRed.textContent = red + '%';
  el.statSize.textContent = fmtBytes(stlBytes(cur));
}

// ─── Riduzione poligoni (meshoptimizer) ────────────────────────────────────────
async function simplifyTo(keepRatio) {
  if (!baseGeometry) return;
  await MeshoptSimplifier.ready;

  if (keepRatio >= 0.999) { setGeometry(baseGeometry.clone()); updateStats(); return; }

  const positions = baseGeometry.getAttribute('position').array; // Float32Array
  const index = baseGeometry.index.array;
  const indices = index instanceof Uint32Array ? index : new Uint32Array(index);

  let target = Math.floor((indices.length * keepRatio) / 3) * 3;
  target = Math.max(target, 3);

  // target_error = 1 (massimo) → è il conteggio a comandare la riduzione.
  // 'LockBorder' preserva i bordi aperti per non deformare la geometria.
  const [newIndices] = MeshoptSimplifier.simplify(
    indices, positions, 3, target, 1.0, ['LockBorder']
  );

  const packed = compact(positions, newIndices);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(packed.positions, 3));
  geom.setIndex(new THREE.BufferAttribute(packed.index, 1));
  geom.computeVertexNormals();

  setGeometry(geom);
  updateStats();
}

// rimuove i vertici inutilizzati e rimappa gli indici → file di export puliti
function compact(positions, newIndices) {
  const remap = new Map();
  const outPos = [];
  const outIdx = new Uint32Array(newIndices.length);
  for (let i = 0; i < newIndices.length; i++) {
    const vi = newIndices[i];
    let ni = remap.get(vi);
    if (ni === undefined) {
      ni = outPos.length / 3;
      remap.set(vi, ni);
      outPos.push(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
    }
    outIdx[i] = ni;
  }
  return { positions: new Float32Array(outPos), index: outIdx };
}

// slider: anteprima in tempo reale con debounce
el.ratio.addEventListener('input', () => {
  const pct = +el.ratio.value;
  el.ratioLabel.textContent = pct + '%';
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const heavy = triCount(baseGeometry) > 120000;
    if (heavy) { showSpinner('Riduco…'); await nextFrame(); }
    await simplifyTo(pct / 100);
    if (heavy) hideSpinner();
  }, 130);
});

// ─── Export ────────────────────────────────────────────────────────────────────
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function baseName() {
  const n = el.fileName.textContent.replace(/\.(obj|stl)$/i, '');
  const pct = el.ratio.value;
  return `${n}_ridotto_${pct}pct`;
}

el.exportStl.addEventListener('click', () => {
  const dv = new STLExporter().parse(mesh, { binary: true });
  const blob = new Blob([dv], { type: 'application/octet-stream' });
  download(blob, baseName() + '.stl');
  toast('STL salvato · ' + fmtBytes(blob.size));
});
el.exportObj.addEventListener('click', () => {
  const txt = new OBJExporter().parse(mesh);
  // octet-stream: forza il download come vero file .obj (evita che Android lo salvi come .txt)
  const blob = new Blob([txt], { type: 'application/octet-stream' });
  download(blob, baseName() + '.obj');
  toast('OBJ salvato · ' + fmtBytes(blob.size));
});

el.resetBtn.addEventListener('click', () => {
  el.ratio.value = 100; el.ratioLabel.textContent = '100%';
  setGeometry(baseGeometry.clone()); updateStats();
});

// toggle wireframe (pulsante "Rete")
el.wireframe.addEventListener('click', () => {
  material.wireframe = !material.wireframe;
  el.wireframe.setAttribute('aria-pressed', material.wireframe ? 'true' : 'false');
});

// ─── Input file + drag & drop ──────────────────────────────────────────────────
el.loadBtn.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); el.fileInput.value = ''; });

['dragenter', 'dragover'].forEach((ev) => viewport.addEventListener(ev, (e) => { e.preventDefault(); viewport.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) => viewport.addEventListener(ev, (e) => { e.preventDefault(); viewport.classList.remove('dragover'); }));
viewport.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });

// ─── Service worker (offline / installazione PWA) ───────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
