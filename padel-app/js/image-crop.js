// Standalone drag-to-pan / slider-to-zoom square cropper. Resolves to a PNG
// blob at a fixed output resolution once the user confirms, or null if they
// cancel - keeps every catalog image (avatars, frames) at a consistent size
// regardless of what the admin picks from their gallery. Appended straight to
// document.body (not the calling screen's el) so it survives that screen's
// own re-renders while open.
const OUTPUT_SIZE = 512;

export function openImageCropper(file, { shape = 'square' } = {}) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-card crop-modal">
          <h2>Ritaglia immagine <button class="btn ghost small" id="crop-close">✕</button></h2>
          <p class="small">Trascina per spostare, usa il cursore per ingrandire. Quello che vedi nel riquadro è quello che verrà usato.</p>
          <div class="crop-viewport ${shape === 'circle' ? 'crop-circle' : ''}" id="crop-viewport">
            <img id="crop-img" src="${url}" draggable="false" alt="">
          </div>
          <input type="range" id="crop-zoom" min="1" max="3" step="0.01" value="1" class="mt">
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

      const vpSize = () => viewport.clientWidth;
      const scale = () => baseScale * parseFloat(zoomEl.value);

      function clamp() {
        const vs = vpSize();
        const s = scale();
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        tx = Math.min(0, Math.max(vs - dw, tx));
        ty = Math.min(0, Math.max(vs - dh, ty));
      }

      function render() {
        clamp();
        const s = scale();
        imgEl.style.width = `${img.naturalWidth * s}px`;
        imgEl.style.height = `${img.naturalHeight * s}px`;
        imgEl.style.transform = `translate(${tx}px, ${ty}px)`;
      }

      function reset() {
        const vs = vpSize();
        baseScale = Math.max(vs / img.naturalWidth, vs / img.naturalHeight);
        tx = (vs - img.naturalWidth * baseScale) / 2;
        ty = (vs - img.naturalHeight * baseScale) / 2;
        render();
      }

      // The viewport has no real layout size until after this element is
      // painted, so the first measurement has to wait a frame.
      requestAnimationFrame(reset);

      zoomEl.addEventListener('input', render);

      viewport.addEventListener('pointerdown', (e) => {
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        startTx = tx; startTy = ty;
        viewport.setPointerCapture(e.pointerId);
      });
      viewport.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        tx = startTx + (e.clientX - startX);
        ty = startTy + (e.clientY - startY);
        render();
      });
      viewport.addEventListener('pointerup', () => { dragging = false; });
      viewport.addEventListener('pointercancel', () => { dragging = false; });

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
        const vs = vpSize();
        const sourceX = -tx / s;
        const sourceY = -ty / s;
        const sourceSize = vs / s;
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        canvas.getContext('2d').drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        canvas.toBlob((blob) => finish(blob), 'image/png');
      });
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
