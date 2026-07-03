import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';

// ─── DOM ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const canvas = $('canvas'), viewport = $('viewport');
const el = {
  fileName: $('fileName'), dropHint: $('dropHint'), spinner: $('spinner'),
  spinnerText: $('spinnerText'), stats: $('stats'),
  statOrig: $('statOrig'), statCur: $('statCur'), statRed: $('statRed'),
  ratio: $('ratio'), ratioLabel: $('ratioLabel'), wireframe: $('wireframe'),
  loadBtn: $('loadBtn'), resetBtn: $('resetBtn'),
  exportStl: $('exportStl'), exportObj: $('exportObj'), fileInput: $('fileInput'),
};

// ─── Three.js scene ───────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

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
  controls.update();
  renderer.render(scene, camera);
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
  download(new Blob([dv], { type: 'application/octet-stream' }), baseName() + '.stl');
});
el.exportObj.addEventListener('click', () => {
  const txt = new OBJExporter().parse(mesh);
  download(new Blob([txt], { type: 'text/plain' }), baseName() + '.obj');
});

el.resetBtn.addEventListener('click', () => {
  el.ratio.value = 100; el.ratioLabel.textContent = '100%';
  setGeometry(baseGeometry.clone()); updateStats();
});

el.wireframe.addEventListener('change', () => { material.wireframe = el.wireframe.checked; });

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
