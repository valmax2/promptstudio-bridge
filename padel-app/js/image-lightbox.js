// Finestra a schermo intero per vedere bene una foto piccola (avatar
// "Telecomandi compatibili" / "Accessori telecomandi") toccandola - solo
// visualizzazione, niente ritaglio. Appesa direttamente a document.body
// (come il ritaglio in image-crop.js) così sopravvive al re-render della
// schermata che l'ha aperta.
export function openImageLightbox(url, label = '') {
  if (!url) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.innerHTML = `
    <button class="icon-btn lightbox-close" aria-label="Chiudi">✕</button>
    <img src="${url}" alt="${label.replace(/"/g, '&quot;')}">
  `;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.lightbox-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}
