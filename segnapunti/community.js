/* Segnapunti — Community: account, amici, avatar, eventi con conferma disponibilità.
 * Richiede un progetto Supabase gratuito configurato in community-config.js
 * (vedi README.md § Community). Finché non è configurato, mostra solo le
 * istruzioni e non tenta nessuna connessione di rete. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const AVATAR_COLORS = [
    { id: 'indigo', top: '#5B76FF', bot: '#3B5BDB' },
    { id: 'orange', top: '#FF8A3D', bot: '#E8590C' },
    { id: 'green',  top: '#4FC26B', bot: '#2F9E44' },
    { id: 'red',    top: '#F0524B', bot: '#E03131' },
    { id: 'violet', top: '#B657CE', bot: '#9C36B5' },
    { id: 'teal',   top: '#17A9BF', bot: '#0C8599' },
    { id: 'pink',   top: '#F16D97', bot: '#E64980' },
    { id: 'slate',  top: '#68727D', bot: '#495057' },
  ];
  function colorOf(id) { return AVATAR_COLORS.find((c) => c.id === id) || AVATAR_COLORS[0]; }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  let sb = null;
  let session = null;
  let profile = null;
  let friendsCache = [];
  const selectedInvitees = new Set();

  function isConfigured() {
    const cfg = window.SEGNAPUNTI_SUPABASE;
    return !!(cfg && cfg.url && cfg.anonKey
      && !cfg.url.includes('INCOLLA_QUI') && !cfg.anonKey.includes('INCOLLA_QUI'));
  }

  function getClient() {
    if (!sb && isConfigured() && window.supabase) {
      sb = window.supabase.createClient(window.SEGNAPUNTI_SUPABASE.url, window.SEGNAPUNTI_SUPABASE.anonKey);
    }
    return sb;
  }

  function showView(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    $(id).classList.add('active');
  }

  function setMessage(el, text, isError) {
    el.textContent = text;
    el.classList.toggle('hidden', !text);
    el.style.color = isError ? 'var(--danger)' : '';
  }

  // ============================================================
  // Navigazione
  // ============================================================
  const openBtn = $('openCommunityBtn');
  if (openBtn) openBtn.addEventListener('click', async () => { showView('view-community'); await refreshCommunityState(); });
  const backBtn = $('communityBackBtn');
  if (backBtn) backBtn.addEventListener('click', () => showView('view-setup'));

  async function refreshCommunityState() {
    if (!isConfigured()) {
      $('communityNotConfigured').classList.remove('hidden');
      $('communityAuth').classList.add('hidden');
      $('communityMain').classList.add('hidden');
      return;
    }
    $('communityNotConfigured').classList.add('hidden');
    const client = getClient();
    const { data } = await client.auth.getSession();
    session = data.session;
    if (session) {
      $('communityAuth').classList.add('hidden');
      $('communityMain').classList.remove('hidden');
      await loadProfile();
      await loadFriends();
      await loadEvents();
    } else {
      $('communityAuth').classList.remove('hidden');
      $('communityMain').classList.add('hidden');
    }
  }

  // ============================================================
  // Autenticazione
  // ============================================================
  const signupBtn = $('authSignupBtn');
  if (signupBtn) signupBtn.addEventListener('click', async () => {
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    if (!email || password.length < 6) { setMessage($('authMessage'), 'Email valida e password di almeno 6 caratteri.', true); return; }
    const client = getClient();
    const { error } = await client.auth.signUp({ email, password });
    if (error) { setMessage($('authMessage'), error.message, true); return; }
    setMessage($('authMessage'), 'Registrazione fatta! Controlla la mail per confermare, poi accedi.', false);
  });

  const loginBtn = $('authLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', async () => {
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    if (!email || !password) { setMessage($('authMessage'), 'Inserisci email e password.', true); return; }
    const client = getClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) { setMessage($('authMessage'), error.message, true); return; }
    setMessage($('authMessage'), '', false);
    await refreshCommunityState();
  });

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    const client = getClient();
    await client.auth.signOut();
    session = null; profile = null;
    await refreshCommunityState();
  });

  // ============================================================
  // Profilo / avatar
  // ============================================================
  function renderAvatarPicker() {
    const container = $('avatarColorPicker');
    container.innerHTML = '';
    AVATAR_COLORS.forEach((c) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'swatch' + (profile && profile.avatar_color === c.id ? ' selected' : '');
      dot.style.background = `linear-gradient(160deg, ${c.top}, ${c.bot})`;
      dot.style.color = c.bot;
      dot.addEventListener('click', () => {
        if (!profile) return;
        profile.avatar_color = c.id;
        renderAvatarPicker();
      });
      container.appendChild(dot);
    });
  }

  async function loadProfile() {
    const client = getClient();
    const { data, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
    if (error || !data) return;
    profile = data;
    $('profileDisplayName').value = profile.display_name || '';
    $('profileUsername').value = profile.username || '';
    renderAvatarPicker();
  }

  const saveProfileBtn = $('saveProfileBtn');
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', async () => {
    const client = getClient();
    const display_name = $('profileDisplayName').value.trim();
    const username = $('profileUsername').value.trim();
    if (username.length < 3) { setMessage($('profileMessage'), 'Username: almeno 3 caratteri.', true); return; }
    const { error } = await client.from('profiles').update({
      display_name: display_name || 'Giocatore',
      username,
      avatar_color: profile.avatar_color,
    }).eq('id', session.user.id);
    if (error) { setMessage($('profileMessage'), 'Errore: ' + error.message, true); return; }
    setMessage($('profileMessage'), 'Profilo salvato ✓', false);
    await loadProfile();
  });

  // ============================================================
  // Tab Amici / Partite
  // ============================================================
  const tabsEl = $('communityTabs');
  if (tabsEl) tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    [...tabsEl.children].forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    const isFriends = btn.dataset.value === 'friends';
    $('communityFriendsTab').classList.toggle('hidden', !isFriends);
    $('communityEventsTab').classList.toggle('hidden', isFriends);
  });

  function renderPersonRow(p, actions) {
    const row = document.createElement('div');
    row.className = 'person-row';
    const c = colorOf(p.avatar_color);
    const initials = (p.display_name || p.username || '?').trim().slice(0, 2).toUpperCase();
    row.innerHTML = `
      <div class="avatar-circle" style="background:linear-gradient(160deg, ${c.top}, ${c.bot})">${escapeHtml(initials)}</div>
      <div class="person-info">
        <div class="person-name">${escapeHtml(p.display_name || p.username)}</div>
        <div class="person-username">@${escapeHtml(p.username)}</div>
      </div>`;
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'person-actions';
    actions.forEach((a) => {
      const btn = document.createElement('button');
      btn.className = 'person-btn' + (a.danger ? ' danger' : '');
      btn.textContent = a.label;
      btn.addEventListener('click', a.onClick);
      actionsWrap.appendChild(btn);
    });
    row.appendChild(actionsWrap);
    return row;
  }

  const friendSearchBtn = $('friendSearchBtn');
  if (friendSearchBtn) friendSearchBtn.addEventListener('click', async () => {
    const client = getClient();
    const q = $('friendSearchInput').value.trim();
    const results = $('friendSearchResults');
    results.innerHTML = '';
    if (!q) return;
    const { data, error } = await client.from('profiles').select('id, username, display_name, avatar_color')
      .ilike('username', `%${q}%`).neq('id', session.user.id).limit(10);
    if (error || !data || data.length === 0) {
      results.innerHTML = '<div class="hint-text">Nessun giocatore trovato.</div>';
      return;
    }
    data.forEach((p) => results.appendChild(renderPersonRow(p, [{
      label: 'Aggiungi',
      onClick: async () => {
        const { error: reqError } = await client.from('friendships').insert({ requester_id: session.user.id, addressee_id: p.id });
        if (!reqError) { results.innerHTML = ''; $('friendSearchInput').value = ''; await loadFriends(); }
      },
    }])));
  });

  async function loadFriends() {
    const client = getClient();
    const { data, error } = await client.from('friendships')
      .select(`id, status, requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar_color),
        addressee:profiles!friendships_addressee_id_fkey(id,username,display_name,avatar_color)`)
      .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);
    if (error || !data) return;

    const pending = data.filter((f) => f.status === 'pending' && f.addressee_id === session.user.id);
    const accepted = data.filter((f) => f.status === 'accepted');
    friendsCache = accepted.map((f) => (f.requester_id === session.user.id ? f.addressee : f.requester));

    const reqEl = $('friendRequestsList');
    reqEl.innerHTML = '';
    if (pending.length === 0) reqEl.innerHTML = '<div class="hint-text">Nessuna richiesta al momento.</div>';
    pending.forEach((f) => reqEl.appendChild(renderPersonRow(f.requester, [
      { label: 'Accetta', onClick: async () => { await client.from('friendships').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', f.id); await loadFriends(); } },
      { label: 'Rifiuta', danger: true, onClick: async () => { await client.from('friendships').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', f.id); await loadFriends(); } },
    ])));

    const listEl = $('friendsList');
    listEl.innerHTML = '';
    if (friendsCache.length === 0) listEl.innerHTML = '<div class="hint-text">Non hai ancora amici in lista.</div>';
    friendsCache.forEach((p) => listEl.appendChild(renderPersonRow(p, [])));

    renderInviteCheckboxes();
  }

  // ============================================================
  // Eventi (partite proposte + conferma disponibilità)
  // ============================================================
  function renderInviteCheckboxes() {
    const el = $('eventInviteFriends');
    el.innerHTML = '';
    if (friendsCache.length === 0) { el.innerHTML = '<div class="hint-text">Aggiungi prima qualche amico per poterlo invitare.</div>'; return; }
    friendsCache.forEach((p) => {
      const label = document.createElement('label');
      label.className = 'invite-check';
      const checked = selectedInvitees.has(p.id) ? 'checked' : '';
      label.innerHTML = `<input type="checkbox" data-id="${p.id}" ${checked}> ${escapeHtml(p.display_name || p.username)}`;
      label.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) selectedInvitees.add(p.id); else selectedInvitees.delete(p.id);
      });
      el.appendChild(label);
    });
  }

  const createEventBtn = $('createEventBtn');
  if (createEventBtn) createEventBtn.addEventListener('click', async () => {
    const client = getClient();
    const title = $('eventTitle').value.trim() || 'Partita';
    const event_date = $('eventDate').value;
    const event_time = $('eventTime').value || null;
    const location = $('eventLocation').value.trim() || null;
    if (!event_date) { setMessage($('eventMessage'), 'Scegli una data.', true); return; }
    const { data, error } = await client.from('events')
      .insert({ creator_id: session.user.id, title, event_date, event_time, location })
      .select().single();
    if (error) { setMessage($('eventMessage'), 'Errore: ' + error.message, true); return; }
    if (selectedInvitees.size > 0) {
      const rows = [...selectedInvitees].map((uid) => ({ event_id: data.id, user_id: uid }));
      await client.from('event_invites').insert(rows);
    }
    setMessage($('eventMessage'), 'Partita proposta ✓', false);
    $('eventTitle').value = ''; $('eventDate').value = ''; $('eventTime').value = ''; $('eventLocation').value = '';
    selectedInvitees.clear();
    await loadEvents();
  });

  async function loadEvents() {
    const client = getClient();
    const { data: myEvents } = await client.from('events')
      .select('*, event_invites(id, user_id, status, profiles(display_name, username))')
      .order('event_date', { ascending: true });
    const { data: myInvites } = await client.from('event_invites')
      .select('id, status, event:events(*)').eq('user_id', session.user.id);

    const el = $('eventsList');
    el.innerHTML = '';
    const rows = [];
    (myEvents || []).forEach((ev) => rows.push({ event: ev, mine: true }));
    (myInvites || []).filter((inv) => inv.event && inv.event.creator_id !== session.user.id)
      .forEach((inv) => rows.push({ event: inv.event, invite: inv, mine: false }));

    if (rows.length === 0) { el.innerHTML = '<div class="hint-text">Nessuna partita in programma.</div>'; return; }

    rows.forEach(({ event, invite, mine }) => {
      const card = document.createElement('div');
      card.className = 'event-row';
      const dateLabel = event.event_date + (event.event_time ? ' · ' + String(event.event_time).slice(0, 5) : '');
      let inviteesHtml = '';
      if (mine && event.event_invites) {
        inviteesHtml = event.event_invites.map((iv) => {
          const name = iv.profiles ? (iv.profiles.display_name || iv.profiles.username) : '?';
          const badge = iv.status === 'yes' ? '✅' : iv.status === 'no' ? '❌' : '⏳';
          return `<span class="invite-badge">${badge} ${escapeHtml(name)}</span>`;
        }).join(' ');
      }
      card.innerHTML = `
        <div class="event-title">${escapeHtml(event.title)}</div>
        <div class="event-meta">${escapeHtml(dateLabel)}${event.location ? ' · ' + escapeHtml(event.location) : ''}</div>
        ${inviteesHtml ? `<div class="event-invitees">${inviteesHtml}</div>` : ''}
      `;
      if (!mine && invite) {
        const actions = document.createElement('div');
        actions.className = 'person-actions';
        const yesBtn = document.createElement('button');
        yesBtn.className = 'person-btn';
        yesBtn.textContent = invite.status === 'yes' ? '✅ Ci sono' : 'Ci sono';
        yesBtn.addEventListener('click', async () => { await client.from('event_invites').update({ status: 'yes', responded_at: new Date().toISOString() }).eq('id', invite.id); await loadEvents(); });
        const noBtn = document.createElement('button');
        noBtn.className = 'person-btn danger';
        noBtn.textContent = invite.status === 'no' ? '❌ Non posso' : 'Non posso';
        noBtn.addEventListener('click', async () => { await client.from('event_invites').update({ status: 'no', responded_at: new Date().toISOString() }).eq('id', invite.id); await loadEvents(); });
        actions.appendChild(yesBtn); actions.appendChild(noBtn);
        card.appendChild(actions);
      }
      el.appendChild(card);
    });
  }
})();
