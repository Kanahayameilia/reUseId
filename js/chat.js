// isLoggedIn()/onAuthReady()/getCurrentUser() ada di auth.js (dimuat sebelum file ini).
// Butuh tabel "conversations" & "messages" di Supabase — lihat supabase-setup.sql.

let currentUser = null;
let activeConversationId = null;
let activeConversation = null;
let messagesChannel = null;

const chatShell = document.getElementById('chatShell');
const chatListBody = document.getElementById('chatListBody');
const threadEmpty = document.getElementById('threadEmpty');
const threadActive = document.getElementById('threadActive');
const threadAvatar = document.getElementById('threadAvatar');
const threadName = document.getElementById('threadName');
const threadItemName = document.getElementById('threadItemName');
const threadMessages = document.getElementById('threadMessages');
const composerForm = document.getElementById('composerForm');
const composerInput = document.getElementById('composerInput');
const composerSend = document.getElementById('composerSend');

function otherParty(conv) {
  const isBuyer = conv.buyer_id === currentUser.id;
  return {
    id: isBuyer ? conv.seller_id : conv.buyer_id,
    name: isBuyer ? conv.seller_name : conv.buyer_name,
    avatar: isBuyer ? conv.seller_avatar : conv.buyer_avatar,
  };
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ---------- daftar percakapan (kiri) ----------
async function loadConversations() {
  const { data, error } = await supabaseClient
    .from('conversations')
    .select('*')
    .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    chatListBody.innerHTML = `<div class="chat-list-empty">Gagal memuat pesan: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    chatListBody.innerHTML = `<div class="chat-list-empty">Belum ada percakapan. Chat akan muncul di sini setelah kamu Ajukan Barter/Donasi atau Hubungi Pemilik dari halaman barang.</div>`;
    return;
  }

  chatListBody.innerHTML = data.map(conv => {
    const other = otherParty(conv);
    const active = conv.id === activeConversationId ? 'active' : '';
    return `
      <div class="conv-item ${active}" data-id="${conv.id}">
        <img class="conv-avatar" src="${other.avatar || 'https://i.pravatar.cc/80?img=47'}" alt="${other.name || ''}">
        <div class="conv-info">
          <div class="conv-name">${other.name || 'Pengguna Re:Use.ID'}</div>
          <div class="conv-item-name">${conv.item_name || ''}</div>
          <div class="conv-last">${conv.last_message || 'Belum ada pesan'}</div>
        </div>
        <div class="conv-time">${formatTime(conv.last_message_at)}</div>
      </div>
    `;
  }).join('');

  chatListBody.querySelectorAll('.conv-item').forEach(el => {
    el.addEventListener('click', () => openConversation(el.dataset.id));
  });
}

// ---------- buka satu percakapan (kanan) ----------
async function openConversation(id) {
  activeConversationId = id;
  history.replaceState(null, '', `chat.html?id=${id}`);
  chatShell.classList.add('has-active');

  const { data: conv, error } = await supabaseClient
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !conv) {
    threadEmpty.textContent = 'Percakapan tidak ditemukan.';
    threadEmpty.hidden = false;
    threadActive.hidden = true;
    return;
  }

  activeConversation = conv;
  const other = otherParty(conv);

  threadEmpty.hidden = true;
  threadActive.hidden = false;
  threadAvatar.src = other.avatar || 'https://i.pravatar.cc/80?img=47';
  threadName.textContent = other.name || 'Pengguna Re:Use.ID';
  threadItemName.innerHTML = conv.item_id
    ? `<a href="detail.html?id=${conv.item_id}">${conv.item_name || 'Lihat barang'}</a>`
    : (conv.item_name || '');

  await loadMessages(id);
  subscribeRealtime(id);

  // tandai aktif di list kiri
  chatListBody.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

function renderMessage(msg) {
  const mine = msg.sender_id === currentUser.id;
  const div = document.createElement('div');
  div.className = `msg-bubble ${mine ? 'mine' : 'theirs'}`;
  div.dataset.id = msg.id;
  div.innerHTML = `${escapeHtml(msg.content)}<div class="msg-time">${formatTime(msg.created_at)}</div>`;
  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadMessages(conversationId) {
  threadMessages.innerHTML = '<div class="chat-list-empty">Memuat pesan…</div>';

  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    threadMessages.innerHTML = `<div class="chat-list-empty">Gagal memuat pesan: ${error.message}</div>`;
    return;
  }

  threadMessages.innerHTML = '';
  if (!data || data.length === 0) {
    threadMessages.innerHTML = '<div class="chat-list-empty">Belum ada pesan. Mulai obrolan di bawah ini 👋</div>';
  } else {
    data.forEach(msg => threadMessages.appendChild(renderMessage(msg)));
  }
  threadMessages.scrollTop = threadMessages.scrollHeight;
}

// ---------- realtime: pesan baru langsung muncul tanpa refresh ----------
function subscribeRealtime(conversationId) {
  if (messagesChannel) {
    supabaseClient.removeChannel(messagesChannel);
    messagesChannel = null;
  }

  messagesChannel = supabaseClient
    .channel(`messages-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const msg = payload.new;
      // hindari dobel render kalau pesan ini yang barusan kita kirim sendiri (optimistic render)
      if (threadMessages.querySelector(`[data-id="${msg.id}"]`)) return;

      const wasEmpty = threadMessages.querySelector('.chat-list-empty');
      if (wasEmpty) threadMessages.innerHTML = '';

      threadMessages.appendChild(renderMessage(msg));
      threadMessages.scrollTop = threadMessages.scrollHeight;
      loadConversations(); // refresh preview & urutan list kiri
    })
    .subscribe();
}

// ---------- kirim pesan ----------
composerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = composerInput.value.trim();
  if (!content || !activeConversationId) return;

  composerSend.disabled = true;
  composerInput.value = '';

  const wasEmpty = threadMessages.querySelector('.chat-list-empty');
  if (wasEmpty) threadMessages.innerHTML = '';

  // optimistic render biar berasa instan, ID sementara buat dicocokkan sama event realtime
  const tempId = `temp-${Date.now()}`;
  const optimisticMsg = { id: tempId, sender_id: currentUser.id, content, created_at: new Date().toISOString() };
  threadMessages.appendChild(renderMessage(optimisticMsg));
  threadMessages.scrollTop = threadMessages.scrollHeight;

  const { data: inserted, error } = await supabaseClient
    .from('messages')
    .insert({ conversation_id: activeConversationId, sender_id: currentUser.id, content })
    .select()
    .single();

  composerSend.disabled = false;

  if (error) {
    const el = threadMessages.querySelector(`[data-id="${tempId}"]`);
    if (el) el.remove();
    alert('Gagal mengirim pesan: ' + error.message);
    composerInput.value = content;
    return;
  }

  // ganti bubble sementara dengan yang asli (biar ID-nya cocok, cegah dobel dari realtime)
  const tempEl = threadMessages.querySelector(`[data-id="${tempId}"]`);
  if (tempEl) tempEl.dataset.id = inserted.id;

  await supabaseClient
    .from('conversations')
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq('id', activeConversationId);

  loadConversations();
});

// ---------- init ----------
onAuthReady(async () => {
  if (!isLoggedIn()) {
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }

  currentUser = getCurrentUser();

  await loadConversations();

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');
  if (requestedId) {
    await openConversation(requestedId);
  }
});