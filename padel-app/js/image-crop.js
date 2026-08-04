// Standalone drag-to-pan / slider-to-zoom square cropper. Resolves to a PNG
// blob at a fixed output resolution once the user confirms, or null if they
// cancel - keeps every catalog image (avatars, frames) at a consistent size
// regardless of what the admin picks from their gallery. Appended straight to
// document.body (not the calling screen's el) so it survives that screen's
// own re-renders while open.
const OUTPUT_SIZE = 512;

// aspect = larghezza/altezza del riquadro di ritaglio e dell'immagine finale
// (1 = quadrato/cerchio come prima, 16/9 = rettangolare panoramico).
export function openImageCropper(file, { shape = 'square', aspect = 1 } = {}) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-card crop-modal">
          <h2>Ritaglia immagine <button class="btn ghost small" id="crop-close">✕</button></h2>
          <p class="small">Trascina per spostare, pizzica con due dita o usa il cursore per ingrandire. Quello che vedi nel riquadro è quello che verrà usato.</p>
          <div class="crop-viewport ${shape === 'circle' ? 'crop-circle' : ''}" id="crop-viewport" style="aspect-ratio:${aspect};">
            <img id="crop-img" src="${url}" draggable="false" alt="">
          </div>
          <input type="range" id="crop-zoom" min="1" max="6" step="0.01" value="1" class="mt">
          <div class="row" style="gap:8px;margin-top:14px;">
            <button class="btn secondary block" id="crop-cancel">Annulla</button>
            <button class="btn primary block" id="crop-confirm">Usa questa immagine</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const viewport = backdrop.querySelector('#crop-viewport');
      const imgEl = backdrop.querySelector('#crop-img');
      const zoomEl = backdrop.querySelector('#crop-zoom');

      let baseScale = 1;
      let tx = 0;
      let ty = 0;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startTx = 0;
      let startTy = 0;
      // Pizzico a due dita per ingrandire (oltre al cursore #crop-zoom, più
      // comodo su schermi piccoli): tiene traccia dei puntatori attivi per
      // calcolare la distanza tra le due dita e farla corrispondere allo
      // zoom, come farebbe qualsiasi galleria foto.
      const activePointers = new Map();
      let pinchStartDist = 0;
      let pinchStartZoom = 1;

      const vpSize = () => ({ w: viewport.clientWidth, h: viewport.clientHeight });
      const scale = () => baseScale * parseFloat(zoomEl.value);
      const pointerDist = () => {
        const pts = [...activePointers.values()];
        return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      };

      function clamp() {
        const { w, h } = vpSize();
        const s = scale();
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        tx = Math.min(0, Math.max(w - dw, tx));
        ty = Math.min(0, Math.max(h - dh, ty));
      }

      function render() {
        clamp();
        const s = scale();
        imgEl.style.width = `${img.naturalWidth * s}px`;
        imgEl.style.height = `${img.naturalHeight * s}px`;
        imgEl.style.transform = `translate(${tx}px, ${ty}px)`;
      }

      function reset() {
        const { w, h } = vpSize();
        baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        tx = (w - img.naturalWidth * baseScale) / 2;
        ty = (h - img.naturalHeight * baseScale) / 2;
        render();
      }

      // The viewport has no real layout size until after this element is
      // painted, so the first measurement has to wait a frame.
      requestAnimationFrame(reset);

      zoomEl.addEventListener('input', render);

      viewport.addEventListener('pointerdown', (e) => {
        viewport.setPointerCapture(e.pointerId);
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size === 2) {
          // Un secondo dito è arrivato: passa dal trascinamento al pizzico,
          // ricordando la distanza/zoom di partenza per calcolare il fattore
          // di scala relativo mentre le dita si allontanano o avvicinano.
          dragging = false;
          pinchStartDist = pointerDist();
          pinchStartZoom = parseFloat(zoomEl.value);
        } else {
          dragging = true;
          startX = e.clientX; startY = e.clientY;
          startTx = tx; startTy = ty;
        }
      });
      viewport.addEventListener('pointermove', (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size === 2) {
          const factor = pointerDist() / pinchStartDist;
          const next = Math.min(6, Math.max(1, pinchStartZoom * factor));
          zoomEl.value = next;
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
        // Se resta ancora un dito sul vetro dopo averne sollevato uno
        // durante il pizzico, riparte da lì un trascinamento normale invece
        // di lasciare l'immagine "ferma" finché non si stacca anche l'altro.
        if (activePointers.size === 1) {
          const [[, p]] = activePointers;
          dragging = true;
          startX = p.x; startY = p.y;
          startTx = tx; startTy = ty;
        }
      };
      viewport.addEventListener('pointerup', endPointer);
      viewport.addEventListener('pointercancel', endPointer);

      function finish(result) {
        URL.revokeObjectURL(url);
        backdrop.remove();
        resolve(result);
      }

      backdrop.querySelector('#crop-close').addEventListener('click', () => finish(null));
      backdrop.querySelector('#crop-cancel').addEventListener('click', () => finish(null));
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) finish(null); });

      backdrop.querySelector('#crop-confirm').addEventListener('click', () => {
        const s = scale();
        const { w, h } = vpSize();
        const sourceX = -tx / s;
        const sourceY = -ty / s;
        const sourceW = w / s;
        const sourceH = h / s;
        const outW = aspect >= 1 ? OUTPUT_SIZE : Math.round(OUTPUT_SIZE * aspect);
        const outH = aspect >= 1 ? Math.round(OUTPUT_SIZE / aspect) : OUTPUT_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        canvas.getContext('2d').drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);
        canvas.toBlob((blob) => finish(blob), 'image/png');
      });
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
