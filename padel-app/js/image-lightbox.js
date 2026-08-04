// Finestra a schermo intero per vedere bene una foto piccola (avatar
// "Telecomandi compatibili" / "Accessori telecomandi") toccandola - solo
// visualizzazione, niente ritaglio. Appesa direttamente a document.body
// (come il ritaglio in image-crop.js) così sopravvive al re-render della
// schermata che l'ha aperta. Parte già ingrandita (riempie gran parte dello
// schermo con object-fit:contain, indipendentemente dalla risoluzione della
// foto originale), ma si può anche pizzicare per ingrandire di più o
// rimpicciolire un po', e trascinare quando è ingrandita - stesso gesto del
// ritaglio immagine, qui senza output da salvare.
export function openImageLightbox(url, label = '') {
  if (!url) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.innerHTML = `
    <button class="icon-btn lightbox-close" aria-label="Chiudi">✕</button>
    <img id="lightbox-img" src="${url}" alt="${label.replace(/"/g, '&quot;')}" draggable="false">
  `;
  document.body.appendChild(backdrop);

  const imgEl = backdrop.querySelector('#lightbox-img');
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;
  const activePointers = new Map();
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  const pointerDist = () => {
    const pts = [...activePointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  function render() {
    imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  imgEl.addEventListener('pointerdown', (e) => {
    imgEl.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      dragging = false;
      pinchStartDist = pointerDist();
      pinchStartScale = scale;
    } else {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startTx = tx; startTy = ty;
    }
  });
  imgEl.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const factor = pointerDist() / pinchStartDist;
      scale = Math.min(4, Math.max(0.5, pinchStartScale * factor));
      render();
      return;
    }
    if (!dragging) return;
    tx = startTx + (e.clientX - startX);
    ty = startTy + (e.clientY - startY);
    render();
  });
  const endPointer = (e) => {
    activePointers.delete(e.pointerId);
    dragging = false;
    if (activePointers.size === 1) {
      const [[, p]] = activePointers;
      dragging = true;
      startX = p.x; startY = p.y;
      startTx = tx; startTy = ty;
    }
  };
  imgEl.addEventListener('pointerup', endPointer);
  imgEl.addEventListener('pointercancel', endPointer);
  // Doppio tocco per tornare rapidamente alla dimensione di partenza dopo
  // aver ingrandito/rimpicciolito con le dita.
  imgEl.addEventListener('dblclick', () => { scale = 1; tx = 0; ty = 0; render(); });

  const close = () => backdrop.remove();
  backdrop.querySelector('.lightbox-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}
