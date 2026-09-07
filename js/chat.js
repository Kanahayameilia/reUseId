// =========================================================
// reUseId - CHAT
// =========================================================
// isLoggedIn()/onAuthReady()/getCurrentUser() ada di auth.js
// (dimuat sebelum file ini).
//
// Membutuhkan tabel:
// - conversations
// - messages
//
// Fitur:
// - Realtime chat
// - Keamanan data pribadi/sensitif
// - Optimistic message
// - Preview pesan terakhir
// =========================================================


let currentUser = null;
let activeConversationId = null;
let activeConversation = null;
let messagesChannel = null;


// =========================================================
// ELEMENT CHAT
// =========================================================

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


// =========================================================
// KEAMANAN CHAT
// =========================================================
//
// Chat reUseId tidak boleh digunakan untuk membagikan:
// - NIK
// - KTP
// - nomor rekening
// - nomor kartu
// - CVV
// - OTP
// - PIN
// - password
// - nomor HP
// - email pribadi
// - data identitas pribadi
//
// Filter ini adalah perlindungan tambahan di sisi browser.
// =========================================================

function containsSensitiveData(message) {
  if (!message) return false;

  const text = String(message).toLowerCase().trim();

  const sensitivePatterns = [

    // -------------------------
    // NIK / KTP
    // -------------------------

    /\b\d{16}\b/,
    /\bnik\b/,
    /\bno[\s.-]*nik\b/,
    /\bktp\b/,
    /\be[-\s]*ktp\b/,
    /\bno[\s.-]*ktp\b/,

    // -------------------------
    // Nomor HP Indonesia
    // -------------------------

    /\b08\d{8,12}\b/,
    /\b628\d{8,12}\b/,
    /\+628\d{8,12}\b/,
    /\b0\d{2,4}[\s-]\d{3,4}[\s-]\d{3,5}\b/,

    // -------------------------
    // Email
    // -------------------------

    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,

    // -------------------------
    // Rekening
    // -------------------------

    /\brekening\b/,
    /\bno[\s.-]*rekening\b/,
    /\bnomor[\s-]+rekening\b/,
    /\btransfer[\s-]+ke\b/,

    // -------------------------
    // Kartu pembayaran
    // -------------------------

    /\bnomor[\s-]+kartu\b/,
    /\bno[\s.-]*kartu\b/,
    /\bcvv\b/,
    /\bcvc\b/,
    /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/,

    // -------------------------
    // Password / PIN / OTP
    // -------------------------

    /\bpassword\b/,
    /\bpasswd\b/,
    /\bpasscode\b/,
    /\bkata[\s-]+sandi\b/,
    /\bpin\b/,
    /\botp\b/,
    /\bkode[\s-]+otp\b/,

    // -------------------------
    // Kontak pribadi
    // -------------------------

    /\bwhatsapp\b/,
    /\bwhats[\s-]*app\b/,
    /\btelegram\b/,
    /\bnomor[\s-]+telepon\b/,
    /\bno[\s.-]*telepon\b/,

  ];

  return sensitivePatterns.some(pattern => pattern.test(text));
}


// =========================================================
// PERINGATAN KEAMANAN
// =========================================================

function showSecurityWarning() {

  // Jangan membuat warning lebih dari satu
  if (document.getElementById('chatSecurityWarning')) {
    return;
  }

  const warning = document.createElement('div');

  warning.id = 'chatSecurityWarning';
  warning.className = 'chat-security-warning';

  warning.innerHTML = `
    <div class="chat-security-title">
      ⚠️ Jaga keamanan saat berkomunikasi
    </div>

    <div class="chat-security-text">
      Jangan membagikan data pribadi atau sensitif melalui chat,
      seperti NIK/KTP, nomor rekening, OTP, PIN, password,
      nomor kartu, nomor telepon, email pribadi, atau alamat
      rumah lengkap.
    </div>

    <div class="chat-security-note">
      Gunakan chat reUseId hanya untuk membahas barang,
      barter, donasi, dan proses serah terima.
    </div>
  `;

  // Masukkan warning sebelum form composer
  if (composerForm && composerForm.parentNode) {
    composerForm.parentNode.insertBefore(warning, composerForm);
  }
}


// =========================================================
// ALERT KEAMANAN
// =========================================================

function showSensitiveDataWarning() {

  alert(
    '⚠️ Pesan tidak dapat dikirim.\\n\\n' +
    'Demi keamanan pengguna reUseId, jangan membagikan:\\n\\n' +
    '• NIK / KTP\\n' +
    '• Nomor rekening\\n' +
    '• OTP / PIN / password\\n' +
    '• Nomor kartu / CVV\\n' +
    '• Nomor telepon\\n' +
    '• Email pribadi\\n' +
    '• Data pribadi atau identitas lainnya\\n\\n' +
    'Silakan hapus informasi tersebut lalu kirim kembali pesan.'
  );
}


// =========================================================
// PIHAK LAIN DALAM CONVERSATION
// =========================================================

function otherParty(conv) {

  const isBuyer = conv.buyer_id === currentUser.id;

  return {
    id: isBuyer ? conv.seller_id : conv.buyer_id,
    name: isBuyer ? conv.seller_name : conv.buyer_name,
    avatar: isBuyer ? conv.seller_avatar : conv.buyer_avatar,
  };
}


// =========================================================
// FORMAT WAKTU
// =========================================================

function formatTime(iso) {

  if (!iso) return '';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const now = new Date();

  const sameDay =
    d.toDateString() === now.toDateString();

  return sameDay
    ? d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
      });
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(str) {

  const div = document.createElement('div');

  div.textContent = str ?? '';

  return div.innerHTML;
}


// =========================================================
// DAFTAR PERCAKAPAN
// =========================================================

async function loadConversations() {

  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('conversations')
    .select('*')
    .or(
      `buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`
    )
    .order('last_message_at', {
      ascending: false,
      nullsFirst: false
    });

  if (error) {

    chatListBody.innerHTML = `
      <div class="chat-list-empty">
        Gagal memuat pesan: ${escapeHtml(error.message)}
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    chatListBody.innerHTML = `
      <div class="chat-list-empty">
        Belum ada percakapan.
        Chat akan muncul di sini setelah kamu
        Ajukan Barter/Donasi atau Hubungi Pemilik
        dari halaman barang.
      </div>
    `;

    return;
  }


  chatListBody.innerHTML = data.map(conv => {

    const other = otherParty(conv);

    const active =
      conv.id === activeConversationId
        ? 'active'
        : '';

    const avatar =
      other.avatar ||
      'https://i.pravatar.cc/80?img=47';

    const name =
      other.name ||
      'Pengguna Re:Use.ID';

    const itemName =
      conv.item_name ||
      '';

    const lastMessage =
      conv.last_message ||
      'Belum ada pesan';

    return `
      <div
        class="conv-item ${active}"
        data-id="${escapeHtml(conv.id)}"
      >

        <img
          class="conv-avatar"
          src="${escapeHtml(avatar)}"
          alt="${escapeHtml(name)}"
        >

        <div class="conv-info">

          <div class="conv-name">
            ${escapeHtml(name)}
          </div>

          <div class="conv-item-name">
            ${escapeHtml(itemName)}
          </div>

          <div class="conv-last">
            ${escapeHtml(lastMessage)}
          </div>

        </div>

        <div class="conv-time">
          ${formatTime(conv.last_message_at)}
        </div>

      </div>
    `;

  }).join('');


  chatListBody
    .querySelectorAll('.conv-item')
    .forEach(el => {

      el.addEventListener('click', () => {

        openConversation(el.dataset.id);

      });

    });
}


// =========================================================
// BUKA SATU PERCAKAPAN
// =========================================================

async function openConversation(id) {

  activeConversationId = id;

  history.replaceState(
    null,
    '',
    `chat.html?id=${encodeURIComponent(id)}`
  );

  chatShell.classList.add('has-active');


  const { data: conv, error } = await supabaseClient
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();


  if (error || !conv) {

    threadEmpty.textContent =
      'Percakapan tidak ditemukan.';

    threadEmpty.hidden = false;
    threadActive.hidden = true;

    return;
  }


  // Pastikan user memang buyer atau seller
  if (
    conv.buyer_id !== currentUser.id &&
    conv.seller_id !== currentUser.id
  ) {

    threadEmpty.textContent =
      'Kamu tidak memiliki akses ke percakapan ini.';

    threadEmpty.hidden = false;
    threadActive.hidden = true;

    return;
  }


  activeConversation = conv;

  const other = otherParty(conv);


  threadEmpty.hidden = true;
  threadActive.hidden = false;


  threadAvatar.src =
    other.avatar ||
    'https://i.pravatar.cc/80?img=47';

  threadName.textContent =
    other.name ||
    'Pengguna Re:Use.ID';


  threadItemName.innerHTML = conv.item_id

    ? `
      <a href="detail.html?id=${encodeURIComponent(conv.item_id)}">
        ${escapeHtml(conv.item_name || 'Lihat barang')}
      </a>
    `

    : escapeHtml(conv.item_name || '');


  // Warning keamanan
  showSecurityWarning();


  await loadMessages(id);

  subscribeRealtime(id);


  // Tandai aktif di list kiri
  chatListBody
    .querySelectorAll('.conv-item')
    .forEach(el => {

      el.classList.toggle(
        'active',
        el.dataset.id === id
      );

    });
}


// =========================================================
// RENDER MESSAGE
// =========================================================

function renderMessage(msg) {

  const mine =
    msg.sender_id === currentUser.id;

  const div =
    document.createElement('div');

  div.className =
    `msg-bubble ${mine ? 'mine' : 'theirs'}`;

  div.dataset.id = msg.id;


  div.innerHTML = `
    ${escapeHtml(msg.content)}

    <div class="msg-time">
      ${formatTime(msg.created_at)}
    </div>
  `;


  return div;
}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages(conversationId) {

  threadMessages.innerHTML = `
    <div class="chat-list-empty">
      Memuat pesan…
    </div>
  `;


  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', {
      ascending: true
    });


  if (error) {

    threadMessages.innerHTML = `
      <div class="chat-list-empty">
        Gagal memuat pesan:
        ${escapeHtml(error.message)}
      </div>
    `;

    return;
  }


  threadMessages.innerHTML = '';


  if (!data || data.length === 0) {

    threadMessages.innerHTML = `
      <div class="chat-list-empty">
        Belum ada pesan.
        Mulai obrolan di bawah ini 👋
      </div>
    `;

  } else {

    data.forEach(msg => {

      threadMessages.appendChild(
        renderMessage(msg)
      );

    });

  }


  threadMessages.scrollTop =
    threadMessages.scrollHeight;
}


// =========================================================
// REALTIME
// =========================================================

function subscribeRealtime(conversationId) {

  if (messagesChannel) {

    supabaseClient.removeChannel(
      messagesChannel
    );

    messagesChannel = null;
  }


  messagesChannel = supabaseClient

    .channel(`messages-${conversationId}`)

    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter:
          `conversation_id=eq.${conversationId}`,
      },

      (payload) => {

        const msg = payload.new;


        // Hindari pesan dobel
        if (
          threadMessages.querySelector(
            `[data-id="${msg.id}"]`
          )
        ) {

          return;
        }


        const wasEmpty =
          threadMessages.querySelector(
            '.chat-list-empty'
          );


        if (wasEmpty) {
          threadMessages.innerHTML = '';
        }


        threadMessages.appendChild(
          renderMessage(msg)
        );


        threadMessages.scrollTop =
          threadMessages.scrollHeight;


        loadConversations();
      }
    )

    .subscribe();
}


// =========================================================
// KIRIM PESAN
// =========================================================

composerForm.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();


    const content =
      composerInput.value.trim();


    // Tidak ada isi
    if (
      !content ||
      !activeConversationId
    ) {

      return;
    }


    // =====================================================
    // CEK DATA SENSITIF
    // =====================================================

    if (containsSensitiveData(content)) {

      showSensitiveDataWarning();

      // Kembalikan teks agar user bisa mengedit
      composerInput.focus();

      return;
    }


    // =====================================================
    // CEK PANJANG PESAN
    // =====================================================

    if (content.length > 2000) {

      alert(
        'Pesan terlalu panjang. Maksimal 2000 karakter.'
      );

      composerInput.focus();

      return;
    }


    composerSend.disabled = true;

    composerInput.value = '';


    const wasEmpty =
      threadMessages.querySelector(
        '.chat-list-empty'
      );


    if (wasEmpty) {
      threadMessages.innerHTML = '';
    }


    // =====================================================
    // OPTIMISTIC RENDER
    // =====================================================

    const tempId =
      `temp-${Date.now()}`;


    const optimisticMsg = {

      id: tempId,

      sender_id:
        currentUser.id,

      content,

      created_at:
        new Date().toISOString()

    };


    threadMessages.appendChild(
      renderMessage(optimisticMsg)
    );


    threadMessages.scrollTop =
      threadMessages.scrollHeight;


    // =====================================================
    // INSERT MESSAGE
    // =====================================================

    const {
      data: inserted,
      error
    } = await supabaseClient

      .from('messages')

      .insert({
        conversation_id:
          activeConversationId,

        sender_id:
          currentUser.id,

        content
      })

      .select()

      .single();


    composerSend.disabled = false;


    // =====================================================
    // ERROR
    // =====================================================

    if (error) {

      const el =
        threadMessages.querySelector(
          `[data-id="${tempId}"]`
        );


      if (el) {
        el.remove();
      }


      alert(
        'Gagal mengirim pesan: ' +
        error.message
      );


      composerInput.value =
        content;

      return;
    }


    // =====================================================
    // GANTI ID SEMENTARA
    // =====================================================

    const tempEl =
      threadMessages.querySelector(
        `[data-id="${tempId}"]`
      );


    if (tempEl) {

      tempEl.dataset.id =
        inserted.id;

    }


    // =====================================================
    // UPDATE PREVIEW CONVERSATION
    // =====================================================

    const {
      error: updateError
    } = await supabaseClient

      .from('conversations')

      .update({

        last_message:
          content,

        last_message_at:
          new Date().toISOString()

      })

      .eq(
        'id',
        activeConversationId
      );


    if (updateError) {

      console.warn(
        'Gagal memperbarui preview conversation:',
        updateError.message
      );

    }


    // Refresh daftar conversation
    await loadConversations();

  }
);


// =========================================================
// ENTER = KIRIM
// SHIFT + ENTER = BARIS BARU
// =========================================================

composerInput.addEventListener(
  'keydown',
  (e) => {

    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {

      e.preventDefault();

      composerForm.requestSubmit();

    }

  }
);


// =========================================================
// INIT
// =========================================================

onAuthReady(async () => {

  if (!isLoggedIn()) {

    window.location.href =
      `login.html?redirect=${encodeURIComponent(
        window.location.pathname +
        window.location.search
      )}`;

    return;
  }


  currentUser =
    getCurrentUser();


  if (!currentUser) {

    window.location.href =
      'login.html';

    return;
  }


  await loadConversations();


  const params =
    new URLSearchParams(
      window.location.search
    );


  const requestedId =
    params.get('id');


  if (requestedId) {

    await openConversation(
      requestedId
    );

  }

});