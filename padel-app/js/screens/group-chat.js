import { currentUser } from '../firebase.js';
import { getState } from '../store.js';
import { sendCircleMessage, listenCircleMessages } from '../cloud.js';
import { escapeHtml, BACK_ICON } from '../utils.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';

export async function renderGroupChat(el, params = {}) {
  const circleId = params.id;
  const circleName = params.name || 'Gruppo';
  const me = currentUser()?.uid;

  if (!circleId || !me) {
    el.innerHTML = `<div class="topbar"><h1>Chat di gruppo</h1></div><div class="card center"><p>Gruppo non trovato.</p><button class="btn secondary block mt" id="back">Torna alla Community</button></div>`;
    el.querySelector('#back').addEventListener('click', () => navigate('community'));
    return;
  }

  let messages = [];
  let unsub = null;

  el.innerHTML = `
    <div class="topbar">
      <div class="row"><button class="icon-btn" id="chat-back" aria-label="Indietro">${BACK_ICON}</button><h1>👥 ${escapeHtml(circleName)}</h1></div>
    </div>
    <div class="chat-thread" id="chat-thread"></div>
    <div class="chat-input-row">
      <input id="chat-input" placeholder="Scrivi al gruppo…" maxlength="500">
      <button class="btn primary" id="chat-send">➤</button>
    </div>
  `;
  el.querySelector('#chat-back').addEventListener('click', () => navigate('community'));

  function senderName(senderUid) {
    if (senderUid === me) return 'Tu';
    const { friends } = getState();
    const f = friends.find((fr) => fr.id === senderUid);
    return f ? (f.name || f.friendCode || 'Amico') : 'Membro';
  }

  function paintMessages() {
    const thread = el.querySelector('#chat-thread');
    if (!thread) return;
    thread.innerHTML = messages.length
      ? [...messages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map(bubble).join('')
      : '<div class="empty-state"><span class="icon">💬</span>Nessun messaggio ancora, scrivi il primo!</div>';
    thread.scrollTop = thread.scrollHeight;
  }

  function bubble(m) {
    const mine = m.senderId === me;
    return `<div class="chat-bubble ${mine ? 'mine' : ''}">${mine ? '' : `<div class="chat-sender">${escapeHtml(senderName(m.senderId))}</div>`}${escapeHtml(m.text)}</div>`;
  }

  async function send() {
    const input = el.querySelector('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await sendCircleMessage(circleId, text);
    } catch (err) {
      toast('Errore invio: ' + (err.message || err));
    }
  }

  el.querySelector('#chat-send').addEventListener('click', send);
  el.querySelector('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });

  unsub = listenCircleMessages(circleId, (list) => { messages = list; paintMessages(); });

  return () => unsub?.();
}
