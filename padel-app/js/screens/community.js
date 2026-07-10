import { getState, setState } from '../store.js';
import { firebaseAvailable } from '../firebase.js';
import {
  isCloudReady, findUserByPhone, addFriend, listenFriends,
  createCircle, joinCircle, listenMyCircles,
} from '../cloud.js';
import { escapeHtml, uid as genId } from '../utils.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';

export async function renderCommunity(el) {
  const cloud = isCloudReady();
  let unsubFriends = null;
  let unsubCircles = null;

  paint();

  function paint(friendsOverride, circlesOverride) {
    const state = getState();
    const friends = friendsOverride || state.friends;
    const circles = circlesOverride || state.circles;

    el.innerHTML = `
      <div class="topbar"><h1>Community</h1><div class="subtitle">${cloud ? 'Sincronizzata' : 'Modalità locale'}</div></div>

      ${!cloud ? `<div class="card">
        <p>${firebaseAvailable() ? 'Accedi per aggiungere amici reali e creare cerchie condivise.' : 'Configura Firebase per la community online.'}</p>
        ${firebaseAvailable() ? '<button class="btn primary block" id="go-login">Accedi</button>' : ''}
      </div>` : ''}

      <div class="card">
        <h2>👥 Amici</h2>
        ${cloud ? `
        <div class="row">
          <input id="friend-phone" placeholder="Numero di telefono amico" style="flex:1">
          <button class="btn primary" id="add-friend">Aggiungi</button>
        </div>` : `
        <div class="row">
          <input id="friend-name" placeholder="Nome amico (locale)" style="flex:1">
          <button class="btn primary" id="add-friend-local">Aggiungi</button>
        </div>`}
        <div class="mt">
          ${friends.length ? friends.map(friendRow).join('') : `<div class="empty-state"><span class="icon">🙋</span>Nessun amico ancora</div>`}
        </div>
      </div>

      <div class="card">
        <div class="row between"><h2>🔒 Cerchie</h2>${cloud ? '<button class="btn ghost small" id="new-circle">+ Nuova</button>' : ''}</div>
        ${!cloud ? '<p class="small">Le cerchie richiedono l\'accesso per essere condivise con gli amici.</p>' : ''}
        ${cloud ? `
        <div class="row">
          <input id="circle-code" placeholder="Codice cerchia da unire" style="flex:1">
          <button class="btn secondary" id="join-circle">Unisciti</button>
        </div>` : ''}
        <div class="mt">
          ${circles.length ? circles.map(circleRow).join('') : `<div class="empty-state"><span class="icon">🔒</span>Nessuna cerchia</div>`}
        </div>
      </div>
    `;

    el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));

    el.querySelector('#add-friend-local')?.addEventListener('click', () => {
      const name = el.querySelector('#friend-name').value.trim();
      if (!name) return;
      const next = [...getState().friends, { id: genId(), name, local: true }];
      setState({ friends: next });
      toast('Amico aggiunto (locale)');
      paint(next);
    });

    el.querySelector('#add-friend')?.addEventListener('click', async () => {
      const phone = el.querySelector('#friend-phone').value.trim();
      if (!phone) return;
      try {
        const user = await findUserByPhone(phone);
        if (!user) { toast('Nessun utente trovato con questo numero'); return; }
        await addFriend(user.uid, { name: user.name, phone: user.phone });
        toast('Amico aggiunto!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    });

    el.querySelector('#new-circle')?.addEventListener('click', async () => {
      const name = prompt('Nome della cerchia');
      if (!name) return;
      try {
        const id = await createCircle(name.trim());
        toast(`Cerchia creata! Codice da condividere: ${id}`);
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    });

    el.querySelector('#join-circle')?.addEventListener('click', async () => {
      const code = el.querySelector('#circle-code').value.trim();
      if (!code) return;
      try {
        await joinCircle(code);
        toast('Ti sei unito alla cerchia!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    });
  }

  if (cloud) {
    unsubFriends = listenFriends((list) => { setState({ friends: list }, { silent: true }); paint(list); });
    unsubCircles = listenMyCircles((list) => { setState({ circles: list }, { silent: true }); paint(undefined, list); });
  }

  return () => { unsubFriends?.(); unsubCircles?.(); };
}

function friendRow(f) {
  return `<div class="list-item">
    <div class="avatar">🙂</div>
    <div class="meta"><strong>${escapeHtml(f.name || f.phone || 'Amico')}</strong>${f.local ? '<span>Solo locale</span>' : ''}</div>
  </div>`;
}

function circleRow(c) {
  return `<div class="list-item">
    <div class="avatar">🔒</div>
    <div class="meta"><strong>${escapeHtml(c.name)}</strong><span>${(c.memberIds || []).length} membri · codice: ${c.id}</span></div>
  </div>`;
}
