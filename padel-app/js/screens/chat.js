import { currentUser } from '../firebase.js';
import { ensureChat, sendChatMessage, listenChatMessages, deleteChat, chatIdFor } from '../cloud.js';
import { markConversationRead } from '../store.js';
import { escapeHtml, BACK_ICON } from '../utils.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';

export async function renderChat(el, params = {}) {
  const friendUid = params.uid;
  const friendName = params.name || 'Amico';
  const me = currentUser()?.uid;

  if (!friendUid || !me) {
    el.innerHTML = `<div class="topbar"><h1>Chat</h1></div><div class="card center"><p>Amico non trovato.</p><button class="btn secondary block mt" id="back">Torna alla Community</button></div>`;
    el.querySelector('#back').addEventListener('click', () => navigate('community'));
    return;
  }

  let messages = [];
  let unsub = null;

  el.innerHTML = `
    <div class="topbar">
      <div class="row"><button class="icon-btn" id="chat-back" aria-label="Indietro">${BACK_ICON}</button><h1>${escapeHtml(friendName)}</h1></div>
      <button class="icon-btn" id="chat-delete" aria-label="Elimina chat" title="Elimina chat">🗑️</button>
    </div>
    <div class="chat-thread" id="chat-thread"></div>
    <div class="chat-input-row">
      <input id="chat-input" placeholder="Scrivi un messaggio…" maxlength="500">
      <button class="btn primary" id="chat-send">➤</button>
    </div>
  `;
  el.querySelector('#chat-back').addEventListener('click', () => navigate('community'));
  el.querySelector('#chat-delete').addEventListener('click', async () => {
    if (!confirm('Eliminare questa conversazione?')) return;
    try {
      await deleteChat(chatIdFor(me, friendUid));
      toast('Chat eliminata');
      navigate('community');
    } catch (err) {
      toast('Errore: ' + (err.message || err));
    }
  });

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
    return `<div class="chat-bubble ${mine ? 'mine' : ''}">${escapeHtml(m.text)}</div>`;
  }

  async function send() {
    const input = el.querySelector('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      const chatId = await ensureChat(friendUid);
      await sendChatMessage(chatId, text);
    } catch (err) {
      toast('Errore invio: ' + (err.message || err));
    }
  }

  el.querySelector('#chat-send').addEventListener('click', send);
  el.querySelector('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });

  try {
    const chatId = await ensureChat(friendUid);
    markConversationRead(chatId);
    unsub = listenChatMessages(chatId, (list) => { messages = list; paintMessages(); });
  } catch (err) {
    toast('Errore chat: ' + (err.message || err));
  }

  return () => unsub?.();
}
