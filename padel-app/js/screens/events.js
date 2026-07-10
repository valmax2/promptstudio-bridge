import { getState, setState } from '../store.js';
import { isCloudReady, createEvent, respondToEvent, listenEventsForCircles, listenMyCircles } from '../cloud.js';
import { escapeHtml, formatDateTime, uid as genId } from '../utils.js';
import { currentUser, firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';

export async function renderEvents(el) {
  const cloud = isCloudReady();
  let unsubCircles = null;
  let unsubEvents = null;
  let myCircles = getState().circles;

  paint();

  function paint() {
    const { events } = getState();
    const me = currentUser()?.uid;
    const sorted = [...events].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    el.innerHTML = `
      <div class="topbar">
        <div><h1>Eventi</h1><div class="subtitle">${cloud ? 'Sincronizzati' : 'Modalità locale'}</div></div>
        <button class="btn primary small" id="new-event">+ Crea</button>
      </div>

      ${!cloud ? `<div class="card"><p>${firebaseAvailable() ? 'Accedi per invitare amici e ricevere conferme in tempo reale.' : 'Configura Firebase per gli eventi condivisi.'}</p>${firebaseAvailable() ? '<button class="btn primary block" id="go-login">Accedi</button>' : ''}</div>` : ''}

      <div class="card">
        ${sorted.length ? sorted.map((e) => eventCard(e, me)).join('') : `<div class="empty-state"><span class="icon">📅</span>Nessun evento in programma</div>`}
      </div>
    `;

    el.querySelector('#new-event').addEventListener('click', () => openNewEventForm());
    el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));

    el.querySelectorAll('[data-rsvp]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { id, resp } = btn.dataset;
        if (cloud) {
          try { await respondToEvent(id, btn.dataset.rsvp); toast(resp === 'yes' ? 'Presenza confermata!' : 'Hai rifiutato l\'invito'); }
          catch (err) { toast('Errore: ' + err.message); }
        } else {
          const events = getState().events.map((e) => e.id === id ? { ...e, participants: { ...e.participants, me: btn.dataset.rsvp } } : e);
          setState({ events });
          paint();
        }
      });
    });
  }

  function openNewEventForm() {
    const title = prompt('Titolo evento (es. Partita al Club Padel Roma)');
    if (!title) return;
    const dateStr = prompt('Data e ora (YYYY-MM-DD HH:MM)', defaultDateTimeHint());
    if (!dateStr) return;
    const dateTime = parseDateTime(dateStr);
    if (!dateTime) { toast('Formato data non valido'); return; }
    const location = prompt('Luogo (facoltativo)', '') || '';

    if (cloud) {
      const circleId = myCircles[0]?.id;
      if (!circleId) { toast('Crea prima una cerchia in Community per invitare i tuoi amici'); return; }
      createEvent({ title, dateTime, location, circleId, maxPlayers: 4 })
        .then(() => toast('Evento creato! I membri della cerchia riceveranno una notifica.'))
        .catch((err) => toast('Errore: ' + err.message));
    } else {
      const events = [...getState().events, {
        id: genId(), title, dateTime, location, maxPlayers: 4,
        participants: { me: 'yes' }, hostName: 'Tu',
      }];
      setState({ events });
      toast('Evento creato (locale)');
      paint();
    }
  }

  if (cloud) {
    unsubCircles = listenMyCircles((circles) => {
      myCircles = circles;
      setState({ circles }, { silent: true });
      unsubEvents?.();
      const ids = circles.map((c) => c.id);
      if (ids.length) {
        unsubEvents = listenEventsForCircles(ids, (list) => { setState({ events: list }, { silent: true }); paint(); });
      }
    });
  }

  return () => { unsubCircles?.(); unsubEvents?.(); };
}

function eventCard(e, me) {
  const participants = e.participants || {};
  const yes = Object.values(participants).filter((v) => v === 'yes').length;
  const myStatus = me ? participants[me] : participants.me;
  const full = yes >= (e.maxPlayers || 4);
  return `
    <div class="list-item" style="align-items:flex-start;">
      <div class="avatar">📅</div>
      <div class="meta">
        <strong>${escapeHtml(e.title)}</strong>
        <span>${formatDateTime(e.dateTime)}${e.location ? ' · ' + escapeHtml(e.location) : ''}</span>
        <div class="row mt" style="gap:6px;">
          <span class="badge ${full ? 'accent' : 'warn'}">${yes}/${e.maxPlayers || 4} giocatori</span>
          ${myStatus ? `<span class="badge">${myStatus === 'yes' ? '✅ Confermato' : myStatus === 'no' ? '❌ Rifiutato' : '⏳ In attesa'}</span>` : ''}
        </div>
        <div class="row mt" style="gap:8px;">
          <button class="btn primary small" data-rsvp="yes" data-id="${e.id}">Partecipo</button>
          <button class="btn secondary small" data-rsvp="no" data-id="${e.id}">Non posso</button>
        </div>
      </div>
    </div>`;
}

function defaultDateTimeHint() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function parseDateTime(str) {
  const iso = str.trim().replace(' ', 'T');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
