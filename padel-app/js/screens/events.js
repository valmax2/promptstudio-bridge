import { getState, setState } from '../store.js';
import { isCloudReady, createEvent, deleteEvent, leaveEvent, respondToEvent, listenMyEvents, listenFriends } from '../cloud.js';
import { escapeHtml, formatDateTime, uid as genId } from '../utils.js';
import { currentUser, firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { setNavBadge } from '../notifications.js';

let formOpen = false;
let invitedIds = [];

export async function renderEvents(el) {
  setNavBadge('events', false);
  const cloud = isCloudReady();
  let unsubEvents = null;
  let unsubFriends = null;
  formOpen = false;
  invitedIds = [];

  paint();

  function paint() {
    const { events, friends } = getState();
    const me = currentUser()?.uid;
    const sorted = [...events].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    el.innerHTML = `
      <div class="topbar">
        <div><h1>Eventi</h1><div class="subtitle">${cloud ? 'Sincronizzati' : 'Modalità locale'}</div></div>
        <button class="btn primary small" id="new-event">${formOpen ? 'Annulla' : '+ Crea'}</button>
      </div>

      ${!cloud ? `<div class="card"><p>${firebaseAvailable() ? 'Accedi per invitare amici e ricevere conferme in tempo reale.' : 'Configura Firebase per gli eventi condivisi.'}</p>${firebaseAvailable() ? '<button class="btn primary block" id="go-login">Accedi</button>' : ''}</div>` : ''}

      ${formOpen ? newEventForm(cloud, friends.filter((f) => !f.local)) : ''}

      <div class="card">
        ${sorted.length ? sorted.map((e) => eventCard(e, me, cloud, friends, getState().profile)).join('') : `<div class="empty-state"><span class="icon">📅</span>Nessun evento in programma</div>`}
      </div>
    `;

    el.querySelector('#new-event').addEventListener('click', () => {
      formOpen = !formOpen;
      if (formOpen) invitedIds = [];
      paint();
    });
    el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));

    el.querySelectorAll('[data-invite]').forEach((input) => input.addEventListener('change', (e) => {
      const id = input.dataset.invite;
      invitedIds = e.target.checked ? [...invitedIds, id] : invitedIds.filter((x) => x !== id);
    }));

    el.querySelector('#create-event')?.addEventListener('click', () => onCreateEvent(el));
    el.querySelector('#cancel-event')?.addEventListener('click', () => { formOpen = false; paint(); });

    el.querySelectorAll('[data-rsvp]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { id, rsvp } = btn.dataset;
        if (cloud) {
          try { await respondToEvent(id, rsvp); toast(rsvp === 'yes' ? 'Presenza confermata!' : 'Hai rifiutato l\'invito'); }
          catch (err) { toast('Errore: ' + err.message); }
        } else {
          const events = getState().events.map((e) => e.id === id ? { ...e, participants: { ...e.participants, me: btn.dataset.rsvp } } : e);
          setState({ events });
          paint();
        }
      });
    });

    el.querySelectorAll('[data-delete-event]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questo evento per tutti gli invitati?')) return;
        const id = btn.dataset.deleteEvent;
        if (cloud) {
          try { await deleteEvent(id); toast('Evento eliminato'); }
          catch (err) { toast('Errore: ' + err.message); }
        } else {
          setState({ events: getState().events.filter((e) => e.id !== id) });
          toast('Evento eliminato');
          paint();
        }
      });
    });

    el.querySelectorAll('[data-leave-event]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Rimuovere questo evento dal tuo account? (resterà visibile agli altri invitati)')) return;
        const id = btn.dataset.leaveEvent;
        try { await leaveEvent(id); toast('Evento rimosso dal tuo account'); }
        catch (err) { toast('Errore: ' + err.message); }
      });
    });
  }

  function onCreateEvent(el) {
    const title = el.querySelector('#ev-title').value.trim();
    const date = el.querySelector('#ev-date').value;
    const time = el.querySelector('#ev-time').value;
    const location = el.querySelector('#ev-location').value.trim();
    const maxPlayers = parseInt(el.querySelector('#ev-max').value, 10) || 4;
    if (!title) { toast('Inserisci un titolo'); return; }
    if (!date || !time) { toast('Scegli data e ora'); return; }
    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt.getTime())) { toast('Data/ora non valida'); return; }
    const dateTime = dt.toISOString();

    if (cloud) {
      const hostName = getState().profile.name;
      createEvent({ title, dateTime, location, maxPlayers, hostName }, invitedIds)
        .then(() => { toast('Evento creato! Gli amici invitati riceveranno una notifica.'); formOpen = false; paint(); })
        .catch((err) => toast('Errore: ' + err.message));
    } else {
      const events = [...getState().events, {
        id: genId(), title, dateTime, location, maxPlayers,
        participants: { me: 'yes' }, hostName: 'Tu',
      }];
      setState({ events });
      toast('Evento creato (locale)');
      formOpen = false;
      paint();
    }
  }

  if (cloud) {
    unsubEvents = listenMyEvents((list) => { setState({ events: list }, { silent: true }); paint(); });
    unsubFriends = listenFriends((list) => { setState({ friends: list }, { silent: true }); if (formOpen) paint(); });
  }

  return () => { unsubEvents?.(); unsubFriends?.(); };
}

function newEventForm(cloud, friends) {
  return `
    <div class="card">
      <h2>Nuovo evento</h2>
      <div class="field">
        <label>Titolo</label>
        <input id="ev-title" placeholder="es. Partita al Club Padel Roma" maxlength="60">
      </div>
      <div class="row" style="gap:10px;">
        <div class="field" style="flex:1;">
          <label>Data</label>
          <input id="ev-date" type="date" value="${defaultDateHint()}">
        </div>
        <div class="field" style="flex:1;">
          <label>Ora</label>
          <input id="ev-time" type="time" value="19:00">
        </div>
      </div>
      <div class="field">
        <label>Luogo (facoltativo)</label>
        <input id="ev-location" placeholder="es. Padel Center Milano" maxlength="60">
      </div>
      <div class="field mb0">
        <label>Numero massimo giocatori</label>
        <input id="ev-max" type="number" min="2" max="20" value="4">
      </div>
      ${cloud ? `
      <div class="field mt mb0">
        <label>Invita amici</label>
        ${friends.length ? friends.map((f) => `
          <div class="toggle-row">
            <div>${escapeHtml(f.name || f.friendCode || 'Amico')}</div>
            <label class="switch"><input type="checkbox" data-invite="${f.id}"><span class="slider"></span></label>
          </div>
        `).join('') : '<p class="small">Nessun amico ancora - aggiungine in Community.</p>'}
      </div>` : ''}
      <button class="btn primary block mt" id="create-event">Crea evento</button>
      <button class="btn ghost small block mt" id="cancel-event">Annulla</button>
    </div>
  `;
}

function eventCard(e, me, cloud, friends, myProfile) {
  const participants = e.participants || {};
  const yes = Object.values(participants).filter((v) => v === 'yes').length;
  const myStatus = me ? participants[me] : participants.me;
  const full = yes >= (e.maxPlayers || 4);
  const isHost = cloud ? e.hostId === me : true;
  const invitedIds = e.invitedIds || Object.keys(participants);

  return `
    <div class="list-item" style="align-items:flex-start;">
      <div class="avatar">📅</div>
      <div class="meta">
        <strong>${escapeHtml(e.title)}</strong>
        <span>${formatDateTime(e.dateTime)}${e.location ? ' · ' + escapeHtml(e.location) : ''}</span>
        ${e.hostName ? `<span class="small">Organizzato da ${escapeHtml(e.hostName)}</span>` : ''}
        <div class="row mt" style="gap:6px;">
          <span class="badge ${full ? 'accent' : 'warn'}">${yes}/${e.maxPlayers || 4} giocatori</span>
        </div>
        ${invitedIds.length ? `
        <div class="mt" style="width:100%;">
          ${invitedIds.map((uid) => participantRow(uid, e, me, participants, friends, myProfile)).join('')}
        </div>` : ''}
        <div class="row mt" style="gap:8px;">
          <button class="btn primary small" data-rsvp="yes" data-id="${e.id}">Partecipo</button>
          <button class="btn secondary small" data-rsvp="no" data-id="${e.id}">Non posso</button>
          ${isHost
            ? `<button class="btn ghost small" data-delete-event="${e.id}" aria-label="Elimina evento per tutti">🗑️</button>`
            : (cloud ? `<button class="btn ghost small" data-leave-event="${e.id}" aria-label="Rimuovi evento dal mio account">🗑️</button>` : '')}
        </div>
      </div>
    </div>`;
}

function participantRow(uid, event, me, participants, friends, myProfile) {
  const name = participantName(uid, event, me, friends, myProfile);
  const status = participants[uid];
  const icon = status === 'yes' ? '✅' : status === 'no' ? '❌' : '⏳';
  const cls = status === 'yes' ? 'yes' : status === 'no' ? 'no' : 'pending';
  return `<div class="row between" style="padding:3px 0;"><span class="small">${escapeHtml(name)}</span><span class="rsvp-status-chip ${cls}">${icon}</span></div>`;
}

function participantName(uid, event, me, friends, myProfile) {
  if (uid === me) return `${myProfile.name} (tu)`;
  if (uid === event.hostId && event.hostName) return event.hostName;
  const friend = friends.find((f) => f.id === uid);
  if (friend) return friend.name || friend.friendCode || 'Amico';
  return 'Giocatore';
}

function defaultDateHint() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
