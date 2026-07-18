import { getState, setState, replaceCollection } from '../store.js';
import { escapeHtml, SHARE_ICON, EDIT_ICON, DELETE_ICON, TROPHY_ICON, LOSS_ICON } from '../utils.js';
import { toast } from '../app.js';
import { matchShareSupported, shareMatch, renderMatchCardPreview } from '../match-share.js';
import { listenShareAssets, listenMatchResultIcons } from '../cloud.js';

// Editor pre-condivisione (aperto dalla matita): id della partita in
// modifica + scelte correnti di sfondo/cornice ('' = default).
let shareEditorMatchId = null;
let shareEditorBg = '';
let shareEditorFrame = '';

export async function renderStats(el) {
  shareEditorMatchId = null;
  await paint(el);
  const unsubs = [
    listenShareAssets('background', (items) => setState({ shareBackgrounds: items }, { silent: true })),
    listenShareAssets('frame', (items) => setState({ shareFrames: items }, { silent: true })),
    listenMatchResultIcons((icons) => { setState({ matchResultIcons: icons }, { silent: true }); paint(el); }),
  ];
  return () => unsubs.forEach((u) => u());
}

async function paint(el) {
  const { matches, matchResultIcons } = getState();

  const total = matches.length;
  const wins = matches.filter((m) => m.winner === 'A').length; // scoreboard operator plays as Team A by convention
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const streak = computeStreak(matches);
  const last10 = matches.slice(0, 10).reverse();

  el.innerHTML = `
    <div class="topbar"><h1>Statistiche</h1></div>

    <div class="grid-2">
      <div class="card center"><div class="badge accent">Partite</div><h2>${total}</h2></div>
      <div class="card center"><div class="badge accent">% Vittorie</div><h2>${winRate}%</h2></div>
      <div class="card center"><div class="badge accent">Vittorie</div><h2>${wins}</h2></div>
      <div class="card center"><div class="badge accent">Striscia</div><h2>${streak.count}${streak.type === 'W' ? '🔥' : streak.count ? '❄️' : ''}</h2></div>
    </div>

    ${total ? `
    <div class="card">
      <h2>Andamento (ultime ${last10.length})</h2>
      <div class="row" style="align-items:flex-end;height:90px;gap:6px;">
        ${last10.map((m) => `<div style="flex:1;height:${m.winner === 'A' ? 100 : 40}%;border-radius:6px 6px 0 0;background:${m.winner === 'A' ? 'var(--accent)' : 'var(--danger)'}"></div>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <h2>Storico partite</h2>
      ${matches.length ? matches.map((m) => matchRow(m, matchResultIcons)).join('') : `<div class="empty-state"><span class="icon">📊</span>Gioca la tua prima partita dal segnapunti!</div>`}
    </div>

    ${shareEditorMatchId ? shareEditorModal() : ''}
  `;

  el.querySelectorAll('[data-share-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      shareEditorMatchId = btn.dataset.shareEdit;
      shareEditorBg = '';
      shareEditorFrame = '';
      paint(el);
    });
  });
  el.querySelectorAll('[data-delete-match]').forEach((btn) => {
    btn.addEventListener('click', () => onDeleteMatch(btn.dataset.deleteMatch, el));
  });
  el.querySelectorAll('[data-share-match]').forEach((btn) => {
    btn.addEventListener('click', () => onShareMatch(btn.dataset.shareMatch));
  });

  wireShareEditor(el);
}

function matchRow(m, icons) {
  const won = m.winner === 'A';
  const iconUrl = won ? icons?.wonUrl : icons?.lostUrl;
  const iconHtml = iconUrl ? `<img src="${iconUrl}" alt="">` : (won ? TROPHY_ICON : LOSS_ICON);
  return `<div class="list-item">
    <div class="avatar match-result-icon big ${won ? 'won' : 'lost'}">${iconHtml}</div>
    <div class="meta">
      <strong>${escapeHtml(m.teamAName)} vs ${escapeHtml(m.teamBName)}</strong>
      <span>${m.mode === 'singles' ? 'Singolo' : 'Doppio'} · ${(m.sets || []).map((s) => `${s.a}-${s.b}`).join(', ')} · ${new Date(m.date).toLocaleDateString('it-IT')}</span>
    </div>
    <span class="badge ${won ? 'accent' : ''}">${won ? 'Vinta' : 'Persa'}</span>
    ${matchShareSupported() ? `<button class="icon-btn match-row-action" data-share-match="${m.id}" aria-label="Condividi partita">${SHARE_ICON}</button>` : ''}
    <button class="icon-btn match-row-action" data-share-edit="${m.id}" aria-label="Personalizza e condividi immagine">${EDIT_ICON}</button>
    <button class="icon-btn match-row-action" data-delete-match="${m.id}" aria-label="Elimina partita">${DELETE_ICON}</button>
  </div>`;
}

// ===== Editor pre-condivisione =====
// Anteprima dell'immagine + scelta di sfondo e cornice tra quelli messi a
// disposizione dall'admin (max 4 per tipo, gestiti dalla schermata Admin).

function shareEditorModal() {
  const { shareBackgrounds, shareFrames } = getState();
  const swatch = (kind, id, url, selected) => `
    <button class="share-asset-btn ${selected ? 'selected' : ''}" data-pick-${kind}="${id}">
      ${url ? `<img src="${url}" alt="">` : '<span>Base</span>'}
    </button>`;
  return `
    <div class="modal-backdrop" id="share-editor-modal">
      <div class="modal-card">
        <h2><span>🖼️ Personalizza immagine</span><button class="icon-btn" id="share-editor-close" aria-label="Chiudi">✕</button></h2>
        <div class="share-preview-wrap"><img id="share-editor-preview" alt="Anteprima"></div>
        <div class="field mt mb0">
          <label>Sfondo</label>
          <div class="share-asset-row">
            ${swatch('bg', '', null, shareEditorBg === '')}
            ${shareBackgrounds.map((b) => swatch('bg', b.id, b.imageUrl, shareEditorBg === b.id)).join('')}
          </div>
        </div>
        <div class="field mt mb0">
          <label>Cornice</label>
          <div class="share-asset-row">
            ${swatch('frame', '', null, shareEditorFrame === '')}
            ${shareFrames.map((f) => swatch('frame', f.id, f.imageUrl, shareEditorFrame === f.id)).join('')}
          </div>
        </div>
        <button class="btn primary block mt" id="share-editor-share">📤 Condividi</button>
      </div>
    </div>
  `;
}

function currentEditorOpts() {
  const { shareBackgrounds, shareFrames } = getState();
  return {
    backgroundUrl: shareBackgrounds.find((b) => b.id === shareEditorBg)?.imageUrl || null,
    frameUrl: shareFrames.find((f) => f.id === shareEditorFrame)?.imageUrl || null,
  };
}

function wireShareEditor(el) {
  if (!shareEditorMatchId) return;
  const { matches } = getState();
  const m = matches.find((x) => x.id === shareEditorMatchId);
  if (!m) { shareEditorMatchId = null; return; }

  const refreshPreview = async () => {
    const img = el.querySelector('#share-editor-preview');
    if (!img) return;
    try { img.src = await renderMatchCardPreview(m, currentEditorOpts()); } catch {}
  };
  refreshPreview();

  el.querySelector('#share-editor-close')?.addEventListener('click', () => { shareEditorMatchId = null; paint(el); });
  el.querySelector('#share-editor-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'share-editor-modal') { shareEditorMatchId = null; paint(el); }
  });
  el.querySelectorAll('[data-pick-bg]').forEach((btn) => btn.addEventListener('click', () => {
    shareEditorBg = btn.dataset.pickBg;
    el.querySelectorAll('[data-pick-bg]').forEach((b) => b.classList.toggle('selected', b === btn));
    refreshPreview();
  }));
  el.querySelectorAll('[data-pick-frame]').forEach((btn) => btn.addEventListener('click', () => {
    shareEditorFrame = btn.dataset.pickFrame;
    el.querySelectorAll('[data-pick-frame]').forEach((b) => b.classList.toggle('selected', b === btn));
    refreshPreview();
  }));
  el.querySelector('#share-editor-share')?.addEventListener('click', async () => {
    if (!matchShareSupported()) { toast('Condivisione disponibile solo nell\'app installata'); return; }
    const ok = await shareMatch(m, currentEditorOpts());
    if (!ok) toast('Condivisione non riuscita');
  });
}

async function onShareMatch(id) {
  const { matches } = getState();
  const m = matches.find((x) => x.id === id);
  if (!m) return;
  const ok = await shareMatch(m, {});
  if (!ok) toast('Condivisione non riuscita');
}

async function onDeleteMatch(id, el) {
  if (!confirm('Eliminare questa partita dallo storico?')) return;
  const { matches } = getState();
  replaceCollection('matches', matches.filter((x) => x.id !== id));
  toast('Partita eliminata');
  await paint(el);
}

function computeStreak(matches) {
  if (!matches.length) return { count: 0, type: null };
  const type = matches[0].winner === 'A' ? 'W' : 'L';
  let count = 0;
  for (const m of matches) {
    const t = m.winner === 'A' ? 'W' : 'L';
    if (t !== type) break;
    count++;
  }
  return { count, type };
}
