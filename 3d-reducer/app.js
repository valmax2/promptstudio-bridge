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
  sheet: $('sheet'), sheetToggle: $('sheetToggle'),
  exportStl: $('exportStl'), exportObj: $('exportObj'), fileInput: $('fileInput'),
  settingsBtn: $('settingsBtn'), settings: $('settings'), settingsClose: $('settingsClose'),
  settingsBackdrop: $('settingsBackdrop'), themeSeg: $('themeSeg'),
  accentSwatches: $('accentSwatches'), modelSwatches: $('modelSwatches'),
  autoRotate: $('autoRotate'), movingLight: $('movingLight'), viewAxes: $('viewAxes'),
  orientRow: $('orientRow'), viewCube: $('viewCube'), freeRotate: $('freeRotate'),
  orientX: $('orientX'), orientY: $('orientY'), orientZ: $('orientZ'),
  displaySeg: $('displaySeg'), logoRow: $('logoRow'), appVer: $('appVer'),
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

// Turntable: l'OGGETTO gira attorno alla VERTICALE (piatto girevole), senza toccare l'export
let spinAngle = 0;
const spinSpeed = 0.8;                          // rad/s
const spinAxis = new THREE.Vector3(0, 1, 0);   // Y = verticale
const modelOrient = new THREE.Quaternion();    // orientamento manuale del modello
const orientDeg = { x: 0, y: 0, z: 0 };        // gradi impostati dall'utente
let freeRotateOn = false;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
let viewTween = null;                           // animazione delle viste fisse (camera)
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
  setSwitch(el.autoRotate, autoRotateOn);
  store('pr3d-autorotate', autoRotateOn ? '1' : '0');
});

// ─── Orientamento del modello: gradi X/Y/Z + rotazione col dito ──────────────
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const _euler = new THREE.Euler();
function orientFromDeg() {
  _euler.set(orientDeg.x * D2R, orientDeg.y * D2R, orientDeg.z * D2R, 'XYZ');
  modelOrient.setFromEuler(_euler);
}
function syncDegInputs() {
  el.orientX.value = Math.round(orientDeg.x);
  el.orientY.value = Math.round(orientDeg.y);
  el.orientZ.value = Math.round(orientDeg.z);
}
function degFromOrient() { // dopo la rotazione col dito, aggiorna i campi gradi
  _euler.setFromQuaternion(modelOrient, 'XYZ');
  orientDeg.x = _euler.x * R2D; orientDeg.y = _euler.y * R2D; orientDeg.z = _euler.z * R2D;
  syncDegInputs();
}
// al caricamento: metti in verticale l'asse più lungo (spesso l'altezza)
function autoStand(geom) {
  geom.computeBoundingBox();
  const s = new THREE.Vector3();
  geom.boundingBox.getSize(s);
  orientDeg.x = 0; orientDeg.y = 0; orientDeg.z = 0;
  const m = 1.05;
  if (s.z > s.y * m && s.z >= s.x) orientDeg.x = -90;       // Z-up → Y-up
  else if (s.x > s.y * m && s.x >= s.z) orientDeg.z = 90;   // X-up → Y-up
  orientFromDeg(); syncDegInputs();
}
[el.orientX, el.orientY, el.orientZ].forEach((inp, i) => {
  inp.addEventListener('input', () => {
    const key = ['x', 'y', 'z'][i];
    orientDeg[key] = parseFloat(inp.value) || 0;
    orientFromDeg();
  });
});
el.orientRow.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
  const a = b.dataset.orient;
  if (a === 'reset') { orientDeg.x = orientDeg.y = orientDeg.z = 0; }
  else if (a === 'tilt') { orientDeg.x = ((orientDeg.x + 90) % 360); }
  else if (a === 'roll') { orientDeg.z = ((orientDeg.z + 90) % 360); }
  orientFromDeg(); syncDegInputs();
}));

// Rotazione col dito: trascina per girare l'OGGETTO (disattiva la rotazione della camera)
el.freeRotate.addEventListener('click', () => {
  freeRotateOn = !freeRotateOn;
  setSwitch(el.freeRotate, freeRotateOn);
  controls.enableRotate = !freeRotateOn;
  store('pr3d-freerotate', freeRotateOn ? '1' : '0');
});
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (!freeRotateOn) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('pointermove', (e) => {
  if (!freeRotateOn || !dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  modelOrient.premultiply(new THREE.Quaternion().setFromAxisAngle(AX.y, dx * 0.01));
  modelOrient.premultiply(new THREE.Quaternion().setFromAxisAngle(AX.x, dy * 0.01));
  degFromOrient();
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
el.movingLight.addEventListener('click', () => {
  movingLightOn = !movingLightOn;
  setSwitch(el.movingLight, movingLightOn);
  if (!movingLightOn && mesh) key.position.copy(modelCenter).add(new THREE.Vector3(modelRadius, modelRadius * 1.5, modelRadius));
  store('pr3d-movinglight', movingLightOn ? '1' : '0');
});
el.viewAxes.addEventListener('click', () => {
  viewAxesOn = !viewAxesOn;
  setSwitch(el.viewAxes, viewAxesOn);
  el.viewCube.classList.toggle('hidden', !viewAxesOn);
  store('pr3d-viewaxes', viewAxesOn ? '1' : '0');
});

// ─── Viste fisse: orienta la camera esattamente su un asse ──────────────────
const VIEW_DIRS = {
  front:  { dir: new THREE.Vector3(0, 0, 1),  up: new THREE.Vector3(0, 1, 0) },
  back:   { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
  right:  { dir: new THREE.Vector3(1, 0, 0),  up: new THREE.Vector3(0, 1, 0) },
  left:   { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
  top:    { dir: new THREE.Vector3(0, 1, 0),  up: new THREE.Vector3(0, 0, -1) },
  bottom: { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
};
function orientTo(name) {
  const v = VIEW_DIRS[name];
  if (!v) return;
  const dist = camera.position.distanceTo(modelCenter) || modelRadius * 2.6 || 5;
  controls.target.copy(modelCenter);
  viewTween = {
    startPos: camera.position.clone(),
    endPos: modelCenter.clone().addScaledVector(v.dir, dist),
    startUp: camera.up.clone(),
    endUp: v.up.clone(),
    t0: performance.now(), dur: 480,
  };
}
el.viewCube.querySelectorAll('button').forEach((b) =>
  b.addEventListener('click', () => orientTo(b.dataset.dir)));

// ─── Apertura / chiusura Impostazioni ───────────────────────────────────────
function openSettings() { el.settings.classList.remove('hidden'); requestAnimationFrame(() => el.settings.classList.add('show')); }
function closeSettings() { el.settings.classList.remove('show'); setTimeout(() => el.settings.classList.add('hidden'), 320); }
el.settingsBtn.addEventListener('click', openSettings);
el.settingsClose.addEventListener('click', closeSettings);
el.settingsBackdrop.addEventListener('click', closeSettings);

// Abbassa / rialza il pannello inferiore per avere più visuale 3D
el.sheetToggle.addEventListener('click', () => {
  const collapsed = el.sheet.classList.toggle('collapsed');
  el.sheetToggle.setAttribute('aria-label', collapsed ? 'Espandi pannello' : 'Riduci pannello');
  store('pr3d-collapsed', collapsed ? '1' : '0');
});

// ─── Modalità di visualizzazione: filo di ferro / sfaccettato / smooth ──────
let displayMode = 'smooth';
let prevShaded = 'smooth';   // ultima modalità piena, per il tasto rapido "Rete"
function applyDisplayMode(mode, save = true) {
  displayMode = mode;
  material.wireframe = (mode === 'wire');
  material.flatShading = (mode === 'flat');
  material.needsUpdate = true;
  if (mode !== 'wire') prevShaded = mode;
  el.displaySeg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  el.wireframe.setAttribute('aria-pressed', mode === 'wire' ? 'true' : 'false');
  if (save) store('pr3d-display', mode);
}
el.displaySeg.querySelectorAll('button').forEach((b) =>
  b.addEventListener('click', () => applyDisplayMode(b.dataset.mode)));
// pulsante "Rete": scorciatoia filo di ferro ⇄ ultima modalità piena
el.wireframe.addEventListener('click', () =>
  applyDisplayMode(displayMode === 'wire' ? prevShaded : 'wire'));

// ─── Applica le preferenze salvate ──────────────────────────────────────────
applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
(function restore() {
  let a; try { a = localStorage.getItem('pr3d-accent'); } catch (e) {}
  applyAccent(ACCENTS.includes(a) ? a : ACCENTS[0], false);
  let m; try { m = localStorage.getItem('pr3d-model'); } catch (e) {}
  applyModelColor(MODELS.find((x) => x.n === m) || MODELS[0], false);
  let ar; try { ar = localStorage.getItem('pr3d-autorotate'); } catch (e) {}
  if (ar === '1') { autoRotateOn = true; setSwitch(el.autoRotate, true); }
  let ml; try { ml = localStorage.getItem('pr3d-movinglight'); } catch (e) {}
  if (ml === '1') { movingLightOn = true; setSwitch(el.movingLight, true); }
  let va; try { va = localStorage.getItem('pr3d-viewaxes'); } catch (e) {}
  if (va === '1') { viewAxesOn = true; setSwitch(el.viewAxes, true); el.viewCube.classList.remove('hidden'); }
  let fr; try { fr = localStorage.getItem('pr3d-freerotate'); } catch (e) {}
  if (fr === '1') { freeRotateOn = true; setSwitch(el.freeRotate, true); controls.enableRotate = false; }
  let dm; try { dm = localStorage.getItem('pr3d-display'); } catch (e) {}
  applyDisplayMode(['wire', 'flat', 'smooth'].includes(dm) ? dm : 'smooth', false);
  let cl; try { cl = localStorage.getItem('pr3d-collapsed'); } catch (e) {}
  if (cl === '1') { el.sheet.classList.add('collapsed'); el.sheetToggle.setAttribute('aria-label', 'Espandi pannello'); }
})();

// ─── Logo d'avvio 3D (gira finché non carichi un modello) ───────────────────
const logoMat = new THREE.MeshStandardMaterial({ color: 0x2E7CF6, metalness: 0.5, roughness: 0.34 });
let logoMesh = null;
function gemGeometry() {
  const g = new THREE.OctahedronGeometry(1, 0);
  g.scale(1, 1.55, 1);
  return g;
}
// orienta la geometria del logo: forme piatte → faccia verso la camera; solidi → asse lungo in verticale
function orientLogo(g) {
  g.computeBoundingBox();
  const s = new THREE.Vector3(); g.boundingBox.getSize(s);
  const min = Math.min(s.x, s.y, s.z), max = Math.max(s.x, s.y, s.z);
  if (min < 0.35 * max) {                 // medaglione/disco: metti la faccia di fronte
    if (s.y === min) g.rotateX(Math.PI / 2);
    else if (s.x === min) g.rotateY(-Math.PI / 2);
  } else {                                // solido: asse più lungo in verticale
    if (s.z >= s.x && s.z >= s.y) g.rotateX(-Math.PI / 2);
    else if (s.x >= s.y && s.x >= s.z) g.rotateZ(Math.PI / 2);
  }
  g.computeBoundingBox();
  const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);          // centra all'origine
}
function loadSavedLogo() {
  let s; try { s = localStorage.getItem('pr3d-logo'); } catch (e) { return null; }
  if (!s) return null;
  try { const g = new THREE.BufferGeometryLoader().parse(JSON.parse(s)); g.computeVertexNormals(); return g; }
  catch (e) { return null; }
}
async function loadDefaultLogo() {
  try {
    const res = await fetch('./vendor/assets/logo.stl');
    if (!res.ok) return null;
    return new STLLoader().parse(await res.arrayBuffer()); // normali già nell'STL → look nitido
  } catch (e) { return null; }
}
async function showLogo() {
  hideLogo();
  let g = loadSavedLogo();
  if (!g) g = await loadDefaultLogo();
  if (mesh) { if (g) g.dispose(); return; } // l'utente ha caricato un modello nel frattempo
  if (!g) g = gemGeometry();
  orientLogo(g);
  logoMesh = new THREE.Mesh(g, logoMat);
  scene.add(logoMesh);
  fitCamera(logoMesh);
  el.dropHint.classList.add('hidden');
}
function hideLogo() {
  if (logoMesh) { scene.remove(logoMesh); logoMesh.geometry.dispose(); logoMesh = null; }
}
function saveLogoFromModel() {
  if (!currentGeometry) { toast('Carica prima un modello'); return; }
  try {
    localStorage.setItem('pr3d-logo', JSON.stringify(currentGeometry.toJSON()));
    toast('Logo salvato · apparirà all’avvio');
  } catch (e) {
    toast('Logo troppo pesante: riduci prima i poligoni');
  }
}
el.logoRow.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.logo === 'save') saveLogoFromModel();
  else { try { localStorage.removeItem('pr3d-logo'); } catch (e) {} toast('Logo predefinito ripristinato'); showLogo(); }
}));

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

const _q = new THREE.Quaternion();
const _R = new THREE.Quaternion();
const _tmp = new THREE.Vector3();
function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

(function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (logoMesh) logoMesh.rotation.y += delta * 0.6;   // il logo d'avvio gira sempre

  if (movingLightOn && mesh) {
    const t = performance.now() * 0.0012;
    key.position.set(
      modelCenter.x + Math.cos(t) * modelRadius * 2.2,
      modelCenter.y + modelRadius * 1.6,
      modelCenter.z + Math.sin(t) * modelRadius * 2.2,
    );
  }

  // Turntable: l'OGGETTO (già raddrizzato) gira attorno alla verticale, passando per il suo centro
  if (mesh) {
    if (autoRotateOn) spinAngle += delta * spinSpeed;
    _q.setFromAxisAngle(spinAxis, spinAngle);
    _R.multiplyQuaternions(_q, modelOrient);   // prima raddrizza, poi gira
    mesh.quaternion.copy(_R);
    mesh.position.copy(modelCenter).sub(_tmp.copy(modelCenter).applyQuaternion(_R));
  }

  // Viste fisse (pulsanti) e cubetto di orientamento animano la camera
  if (viewTween) {
    const k = Math.min((performance.now() - viewTween.t0) / viewTween.dur, 1);
    const e = easeInOut(k);
    camera.position.lerpVectors(viewTween.startPos, viewTween.endPos, e);
    camera.up.lerpVectors(viewTween.startUp, viewTween.endUp, e).normalize();
    camera.lookAt(modelCenter);
    if (k >= 1) viewTween = null;
  } else if (viewHelper.animating) {
    viewHelper.update(delta);
  } else {
    controls.update();
  }

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

function fitCamera(obj = mesh) {
  const box = new THREE.Box3().setFromObject(obj);
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

    hideLogo();                       // via il logo d'avvio: ora mostri il modello
    baseGeometry = merged;
    spinAngle = 0;                    // il nuovo modello parte di fronte
    autoStand(merged);                // mettilo in piedi (asse più lungo → verticale)
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

// esporta dalla geometria nelle coordinate originali (ignora la rotazione di visualizzazione)
function exportMesh() { return new THREE.Mesh(currentGeometry); }
el.exportStl.addEventListener('click', () => {
  const dv = new STLExporter().parse(exportMesh(), { binary: true });
  const blob = new Blob([dv], { type: 'application/octet-stream' });
  download(blob, baseName() + '.stl');
  toast('STL salvato · ' + fmtBytes(blob.size));
});
el.exportObj.addEventListener('click', () => {
  const txt = new OBJExporter().parse(exportMesh());
  // octet-stream: forza il download come vero file .obj (evita che Android lo salvi come .txt)
  const blob = new Blob([txt], { type: 'application/octet-stream' });
  download(blob, baseName() + '.obj');
  toast('OBJ salvato · ' + fmtBytes(blob.size));
});

el.resetBtn.addEventListener('click', () => {
  el.ratio.value = 100; el.ratioLabel.textContent = '100%';
  setGeometry(baseGeometry.clone()); updateStats();
});

// ─── Input file + drag & drop ──────────────────────────────────────────────────
el.loadBtn.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); el.fileInput.value = ''; });

['dragenter', 'dragover'].forEach((ev) => viewport.addEventListener(ev, (e) => { e.preventDefault(); viewport.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) => viewport.addEventListener(ev, (e) => { e.preventDefault(); viewport.classList.remove('dragover'); }));
viewport.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });

// ─── Versione app (per verificare gli aggiornamenti) ────────────────────────
const APP_VERSION = 'v12';
if (el.appVer) el.appVer.textContent = 'Poly Reducer 3D · ' + APP_VERSION;

// ─── Service worker (offline / installazione PWA) ───────────────────────────────
if ('serviceWorker' in navigator) {
  // updateViaCache:'none' → il browser non usa la cache HTTP per sw.js: aggiornamenti più rapidi
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update();
    // ricarica SOLO quando una nuova versione si installa mentre una vecchia è già attiva
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('App aggiornata · ricarico…');
          setTimeout(() => location.reload(), 900);
        }
      });
    });
  }).catch(() => {});
}

// mostra il logo d'avvio (dopo che tutto è definito)
showLogo();

// hook di sola lettura per test/debug
window.PR3D = { get mesh() { return mesh; }, get camera() { return camera; }, get material() { return material; }, get logo() { return logoMesh; } };
