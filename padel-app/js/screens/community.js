import { getState, setState } from '../store.js';
import { firebaseAvailable, currentUser } from '../firebase.js';
import {
  isCloudReady, findUserByFriendCode, addFriend, listenFriends,
  createCircle, joinCircle, listenMyCircles, addMemberToCircle, leaveCircle, deleteCircle,
} from '../cloud.js';
import { escapeHtml, uid as genId } from '../utils.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { setNavBadge } from '../notifications.js';

let addMemberOpenFor = null;

export async function renderCommunity(el) {
  setNavBadge('community', false);
  const cloud = isCloudReady();
  let unsubFriends = null;
  let unsubCircles = null;
  addMemberOpenFor = null;

  paint();

  function paint(friendsOverride, circlesOverride) {
    const state = getState();
    const friends = friendsOverride || state.friends;
    const circles = circlesOverride || state.circles;
    const myCode = state.profile.friendCode;
    const me = currentUser()?.uid;

    el.innerHTML = `
      <div class="topbar"><h1>Community</h1><div class="subtitle">${cloud ? 'Sincronizzata' : 'Modalità locale'}</div></div>

      ${!cloud ? `<div class="card">
        <p>${firebaseAvailable() ? 'Accedi per aggiungere amici reali e creare gruppi condivisi.' : 'Configura Firebase per la community online.'}</p>
        ${firebaseAvailable() ? '<button class="btn primary block" id="go-login">Accedi</button>' : ''}
      </div>` : ''}

      ${cloud && myCode ? `<div class="card row between">
        <div><strong>Il tuo codice amico</strong><p class="mb0 small">Condividilo per farti aggiungere</p></div>
        <button class="btn secondary" id="copy-code">${escapeHtml(myCode)} 📋</button>
      </div>` : ''}

      <div class="card">
        <h2>👥 Amici</h2>
        ${cloud ? `
        <div class="row">
          <input id="friend-code" placeholder="Codice amico (es. 7K4RTQ)" style="flex:1" maxlength="6">
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
        <div class="row between"><h2>👥 Gruppi</h2>${cloud ? '<button class="btn ghost small" id="new-circle">+ Nuovo</button>' : ''}</div>
        ${!cloud ? '<p class="small">I gruppi richiedono l\'accesso per essere condivisi con gli amici.</p>' : ''}
        <div class="mt">
          ${circles.length ? circles.map((c) => circleRow(c, me, friends)).join('') : `<div class="empty-state"><span class="icon">👥</span>Nessun gruppo</div>`}
        </div>
        ${cloud ? `
        <div class="row mt">
          <input id="circle-code" placeholder="Oppure unisciti con un codice" style="flex:1">
          <button class="btn ghost" id="join-circle">Unisciti</button>
        </div>` : ''}
      </div>
    `;

    el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));

    el.querySelector('#copy-code')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(myCode); toast('Codice copiato!'); } catch { toast(`Il tuo codice: ${myCode}`); }
    });

    el.querySelector('#add-friend-local')?.addEventListener('click', () => {
      const name = el.querySelector('#friend-name').value.trim();
      if (!name) return;
      const next = [...getState().friends, { id: genId(), name, local: true }];
      setState({ friends: next });
      toast('Amico aggiunto (locale)');
      paint(next);
    });

    el.querySelector('#add-friend')?.addEventListener('click', async () => {
      const code = el.querySelector('#friend-code').value.trim();
      if (!code) return;
      try {
        const user = await findUserByFriendCode(code);
        if (!user) { toast('Nessun utente trovato con questo codice'); return; }
        if (user.uid === getState().profile.uid) { toast('Questo è il tuo codice!'); return; }
        const myProfile = getState().profile;
        await addFriend(
          user.uid, { name: user.name, friendCode: user.friendCode },
          { name: myProfile.name, friendCode: myProfile.friendCode },
        );
        toast('Amico aggiunto!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    });

    el.querySelector('#new-circle')?.addEventListener('click', async () => {
      const name = prompt('Nome del gruppo');
      if (!name) return;
      try {
        await createCircle(name.trim());
        toast('Gruppo creato! Usa "+ Aggiungi" per invitare i tuoi amici.');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    });

    el.querySelector('#join-circle')?.addEventListener('click', async () => {
      const code = el.querySelector('#circle-code').value.trim();
      if (!code) return;
      try {
        await joinCircle(code);
        toast('Ti sei unito al gruppo!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    });

    el.querySelectorAll('[data-toggle-add-member]').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.toggleAddMember;
      addMemberOpenFor = addMemberOpenFor === id ? null : id;
      paint();
    }));
    el.querySelectorAll('[data-add-member]').forEach((btn) => btn.addEventListener('click', async () => {
      try {
        await addMemberToCircle(btn.dataset.addMember, btn.dataset.friendUid);
        toast('Amico aggiunto al gruppo!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    }));
    el.querySelectorAll('[data-leave-circle]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Uscire da questo gruppo?')) return;
      try { await leaveCircle(btn.dataset.leaveCircle); toast('Hai lasciato il gruppo'); }
      catch (err) { toast('Errore: ' + err.message); }
    }));
    el.querySelectorAll('[data-delete-circle]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Eliminare questo gruppo per tutti i membri?')) return;
      try { await deleteCircle(btn.dataset.deleteCircle); toast('Gruppo eliminato'); }
      catch (err) { toast('Errore: ' + err.message); }
    }));

    el.querySelectorAll('[data-chat]').forEach((btn) => btn.addEventListener('click', () => {
      // replace:true avoids setting location.hash directly, which would
      // fire the router's hashchange listener a moment later and re-render
      // this route via navigate(name) with no params, wiping out uid/name.
      navigate('chat', { replace: true, params: { uid: btn.dataset.chat, name: btn.dataset.chatName } });
    }));
  }

  if (cloud) {
    unsubFriends = listenFriends((list) => { setState({ friends: list }, { silent: true }); paint(list); });
    unsubCircles = listenMyCircles((list) => { setState({ circles: list }, { silent: true }); paint(undefined, list); });
  }

  return () => { unsubFriends?.(); unsubCircles?.(); };
}

function friendRow(f) {
  const name = f.name || f.friendCode || 'Amico';
  return `<div class="list-item">
    <div class="avatar">🙂</div>
    <div class="meta"><strong>${escapeHtml(name)}</strong>${f.local ? '<span>Solo locale</span>' : ''}</div>
    ${f.local ? '' : `<button class="btn ghost small" data-chat="${f.id}" data-chat-name="${escapeHtml(name)}">💬</button>`}
  </div>`;
}

function circleRow(c, me, friends) {
  const isOwner = c.ownerId === me;
  const memberIds = c.memberIds || [];
  const invitable = friends.filter((f) => !f.local && !memberIds.includes(f.id));
  const pickerOpen = addMemberOpenFor === c.id;
  return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
    <div class="row between">
      <div><strong>${escapeHtml(c.name)}</strong><p class="mb0 small">${memberIds.length} membri · codice: ${c.id}</p></div>
      <div class="row" style="gap:6px;">
        <button class="btn ghost small" data-toggle-add-member="${c.id}">+ Aggiungi</button>
        ${isOwner
          ? `<button class="btn ghost small" data-delete-circle="${c.id}">🗑️</button>`
          : `<button class="btn ghost small" data-leave-circle="${c.id}">🚪</button>`}
      </div>
    </div>
    ${pickerOpen ? `
      <div class="mt">
        ${invitable.length ? invitable.map((f) => `
          <div class="list-item">
            <div class="avatar">🙂</div>
            <div class="meta"><strong>${escapeHtml(f.name || f.friendCode || 'Amico')}</strong></div>
            <button class="btn primary small" data-add-member="${c.id}" data-friend-uid="${f.id}">Aggiungi</button>
          </div>
        `).join('') : '<p class="small">Tutti i tuoi amici sono già in questo gruppo (o non ne hai ancora).</p>'}
      </div>
    ` : ''}
  </div>`;
}
