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
// - Kirim foto dari gallery
// - Preview foto sebelum dikirim
// =========================================================

let currentUser = null;
let activeConversationId = null;
let activeConversation = null;
let messagesChannel = null;

// =========================================================
// ELEMENT CHAT
// =========================================================

const chatShell = document.getElementById("chatShell");
const chatListBody = document.getElementById("chatListBody");
const threadEmpty = document.getElementById("threadEmpty");
const threadActive = document.getElementById("threadActive");
const threadAvatar = document.getElementById("threadAvatar");
const threadName = document.getElementById("threadName");
const threadItemName = document.getElementById("threadItemName");
const threadProfileLink = document.getElementById("threadProfileLink");
const threadProfileBtn = document.getElementById("threadProfileBtn");
const threadMessages = document.getElementById("threadMessages");

const composerForm = document.getElementById("composerForm");
const composerInput = document.getElementById("composerInput");
const composerSend = document.getElementById("composerSend");

const chatImageInput = document.getElementById("chatImageInput");
const chatImageButton = document.getElementById("chatImageButton");
const chatImagePreview = document.getElementById("chatImagePreview");
const chatImagePreviewImg = document.getElementById("chatImagePreviewImg");
const chatImagePreviewName = document.getElementById("chatImagePreviewName");
const chatImageRemove = document.getElementById("chatImageRemove");

// =========================================================
// KONFIGURASI FOTO
// =========================================================

const CHAT_IMAGE_BUCKET = "chat-images";
const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;

let selectedChatImage = null;
let selectedChatImagePreviewUrl = null;

// =========================================================
// UPLOAD FOTO CHAT
// =========================================================

async function uploadChatImage(file) {
  if (!file) {
    throw new Error("Foto tidak ditemukan.");
  }

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();

  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

  const safeExtension = allowedExtensions.includes(extension)
    ? extension
    : "jpg";

  const filePath =
    `${activeConversationId}/` +
    `${currentUser.id}/` +
    `${Date.now()}-${crypto.randomUUID()}.` +
    safeExtension;

  const { error: uploadError } = await supabaseClient.storage
    .from(CHAT_IMAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage
    .from(CHAT_IMAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("URL foto tidak berhasil dibuat.");
  }

  return data.publicUrl;
}

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
    // NIK / KTP
    /\b\d{16}\b/,
    /\bnik\b/,
    /\bno[\s.-]*nik\b/,
    /\bktp\b/,
    /\be[-\s]*ktp\b/,
    /\bno[\s.-]*ktp\b/,

    // Nomor HP Indonesia
    /\b08\d{8,12}\b/,
    /\b628\d{8,12}\b/,
    /\+628\d{8,12}\b/,
    /\b0\d{2,4}[\s-]\d{3,4}[\s-]\d{3,5}\b/,

    // Email
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,

    // Rekening
    /\brekening\b/,
    /\bno[\s.-]*rekening\b/,
    /\bnomor[\s-]+rekening\b/,
    /\btransfer[\s-]+ke\b/,

    // Kartu pembayaran
    /\bnomor[\s-]+kartu\b/,
    /\bno[\s.-]*kartu\b/,
    /\bcvv\b/,
    /\bcvc\b/,
    /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/,

    // Password / PIN / OTP
    /\bpassword\b/,
    /\bpasswd\b/,
    /\bpasscode\b/,
    /\bkata[\s-]+sandi\b/,
    /\bpin\b/,
    /\botp\b/,
    /\bkode[\s-]+otp\b/,

    // Kontak pribadi
    /\bwhatsapp\b/,
    /\bwhats[\s-]*app\b/,
    /\btelegram\b/,
    /\bnomor[\s-]+telepon\b/,
    /\bno[\s.-]*telepon\b/,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(text));
}

// =========================================================
// PERINGATAN KEAMANAN
// =========================================================

function showSecurityWarning() {
  if (document.getElementById("chatSecurityWarning")) {
    return;
  }

  const warning = document.createElement("div");

  warning.id = "chatSecurityWarning";

  warning.className = "chat-security-warning";

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

  if (composerForm && composerForm.parentNode) {
    composerForm.parentNode.insertBefore(warning, composerForm);
  }
}

// =========================================================
// ALERT KEAMANAN
// =========================================================

function showSensitiveDataWarning() {
  alert(
    "⚠️ Pesan tidak dapat dikirim.\n\n" +
      "Demi keamanan pengguna reUseId, jangan membagikan:\n\n" +
      "• NIK / KTP\n" +
      "• Nomor rekening\n" +
      "• OTP / PIN / password\n" +
      "• Nomor kartu / CVV\n" +
      "• Nomor telepon\n" +
      "• Email pribadi\n" +
      "• Data pribadi atau identitas lainnya\n\n" +
      "Silakan hapus informasi tersebut lalu kirim kembali pesan.",
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
  if (!iso) return "";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const now = new Date();

  const sameDay = d.toDateString() === now.toDateString();

  return sameDay
    ? d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
}

// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(str) {
  const div = document.createElement("div");

  div.textContent = str ?? "";

  return div.innerHTML;
}

// =========================================================
// DAFTAR PERCAKAPAN
// =========================================================

async function loadConversations() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
    .order("last_message_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    chatListBody.innerHTML = `
      <div class="chat-list-empty">
        Gagal memuat pesan:
        ${escapeHtml(error.message)}
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

  const unread = window.ReuseNotif
    ? await ReuseNotif.getUnreadByConv(data.map((c) => c.id))
    : {};

  chatListBody.innerHTML = data
    .map((conv) => {
      const other = otherParty(conv);

      const active = conv.id === activeConversationId ? "active" : "";

      const avatar = other.avatar || "assets/avatar-default.svg";

      const name = other.name || "Pengguna Re:Use.ID";

      const itemName = conv.item_name || "";

      const lastMessage = conv.last_message || "Belum ada pesan";

      const unreadCount =
        conv.id === activeConversationId ? 0 : unread[conv.id] || 0;

      return `
          <div
            class="conv-item ${active} ${unreadCount ? "unread" : ""}"
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

              <div class="conv-last-message">
                ${escapeHtml(lastMessage)}
              </div>
            </div>

            <div class="conv-meta">
              <div class="conv-time">
                ${formatTime(conv.last_message_at)}
              </div>

              ${
                unreadCount
                  ? `
                    <div class="conv-unread">
                      ${unreadCount}
                    </div>
                  `
                  : ""
              }
            </div>
          </div>
        `;
    })
    .join("");

  chatListBody.querySelectorAll(".conv-item").forEach((el) => {
    el.addEventListener("click", () => {
      openConversation(el.dataset.id);
    });
  });
}

// =========================================================
// BUKA CONVERSATION
// =========================================================

async function openConversation(conversationId) {
  if (!conversationId) return;

  activeConversationId = conversationId;

  chatListBody.querySelectorAll(".conv-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === conversationId);
  });

  const { data: conv, error } = await supabaseClient
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conv) {
    console.error("Gagal membuka conversation:", error);

    return;
  }

  activeConversation = conv;

  const other = otherParty(conv);

  threadEmpty.hidden = true;
  threadActive.hidden = false;

  threadName.textContent = other.name || "Pengguna Re:Use.ID";

  threadAvatar.src = other.avatar || "assets/avatar-default.svg";

  threadItemName.textContent = conv.item_name || "";

  threadAvatar.alt = other.name || "Pengguna Re:Use.ID";

  // link ke profil lawan bicara (user.html), bawa info chat biar tombol "kembali" ke chat ini
  const profileHref = other.id
    ? `user.html?id=${encodeURIComponent(other.id)}&from=chat&conv=${encodeURIComponent(conv.id)}`
    : null;

  [threadProfileLink, threadProfileBtn].forEach((a) => {
    if (!a) return;
    if (profileHref) {
      a.href = profileHref;
      a.hidden = false;
    } else {
      a.removeAttribute("href");
      a.hidden = a === threadProfileBtn;
    }
  });

  showSecurityWarning();

  await loadMessages();

  subscribeRealtime();

  await loadTransaction(conv);

  subscribeTransactionRealtime(conv);
}

// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages() {
  if (!activeConversationId) {
    return;
  }

  const conversationId = activeConversationId;

  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", {
      ascending: true,
    });

  if (conversationId !== activeConversationId) {
    return;
  }

  if (error) {
    console.error("Gagal memuat messages:", error);

    threadMessages.innerHTML = `
      <div class="chat-list-empty">
        Gagal memuat pesan.
      </div>
    `;

    return;
  }

  threadMessages.innerHTML = "";

  if (!data || data.length === 0) {
    threadMessages.innerHTML = `
      <div class="chat-list-empty">
        Belum ada pesan.
      </div>
    `;

    return;
  }

  data.forEach((msg) => {
    threadMessages.appendChild(renderMessage(msg));
  });

  threadMessages.scrollTop = threadMessages.scrollHeight;
}

// =========================================================
// RENDER MESSAGE
// =========================================================

function renderMessage(msg) {
  const wrapper = document.createElement("div");

  wrapper.className = "message-wrapper";

  wrapper.dataset.id = msg.id;

  if (msg.sender_id === currentUser.id) {
    wrapper.classList.add("mine");
  } else {
    wrapper.classList.add("theirs");
  }

  const bubble = document.createElement("div");

  bubble.className = "message-bubble";

  // FOTO
  if (msg.image_url) {
    const image = document.createElement("img");

    image.className = "msg-image";

    image.src = msg.image_url;

    image.alt = "Foto yang dikirim";

    image.loading = "lazy";

    image.addEventListener("click", () => {
      window.open(msg.image_url, "_blank");
    });

    bubble.appendChild(image);
  }

  // TEKS
  if (msg.content) {
    const content = document.createElement("div");

    content.className = "msg-content";

    content.textContent = msg.content;

    bubble.appendChild(content);
  }

  // WAKTU
  const time = document.createElement("div");

  time.className = "msg-time";

  time.textContent = formatTime(msg.created_at);

  bubble.appendChild(time);

  wrapper.appendChild(bubble);

  return wrapper;
}

// =========================================================
// REALTIME CHAT
// =========================================================

function subscribeRealtime() {
  if (messagesChannel) {
    supabaseClient.removeChannel(messagesChannel);

    messagesChannel = null;
  }

  if (!activeConversationId) {
    return;
  }

  const conversationId = activeConversationId;

  messagesChannel = supabaseClient
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (activeConversationId !== conversationId) {
          return;
        }

        const msg = payload.new;

        const existing = threadMessages.querySelector(`[data-id="${msg.id}"]`);

        if (existing) {
          return;
        }

        const optimistic = threadMessages.querySelector(`[data-id^="temp-"]`);

        if (optimistic && msg.sender_id === currentUser.id) {
          optimistic.remove();
        }

        const empty = threadMessages.querySelector(".chat-list-empty");

        if (empty) {
          empty.remove();
        }

        threadMessages.appendChild(renderMessage(msg));

        threadMessages.scrollTop = threadMessages.scrollHeight;
      },
    )
    .subscribe();
}

// =========================================================
// KIRIM PESAN + FOTO
// =========================================================

composerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = composerInput.value.trim();

  const imageFile = selectedChatImage;

  // Tidak boleh kosong
  if (!content && !imageFile) {
    return;
  }

  // Harus memilih conversation
  if (!activeConversationId) {
    alert("Pilih percakapan terlebih dahulu.");

    return;
  }

  // Cek data sensitif
  if (containsSensitiveData(content)) {
    showSensitiveDataWarning();

    composerInput.focus();

    return;
  }

  // Maksimal 2000 karakter
  if (content.length > 2000) {
    alert("Pesan terlalu panjang. " + "Maksimal 2000 karakter.");

    composerInput.focus();

    return;
  }

  composerSend.disabled = true;

  if (chatImageButton) {
    chatImageButton.disabled = true;
  }

  let imageUrl = null;

  try {
    // Upload foto
    if (imageFile) {
      imageUrl = await uploadChatImage(imageFile);
    }

    // ID sementara
    const tempId = `temp-${Date.now()}`;

    // Pesan optimistic
    const optimisticMsg = {
      id: tempId,

      conversation_id: activeConversationId,

      sender_id: currentUser.id,

      content: content || "",

      image_url: imageUrl,

      created_at: new Date().toISOString(),
    };

    const emptyMessage = threadMessages.querySelector(".chat-list-empty");

    if (emptyMessage) {
      emptyMessage.remove();
    }

    threadMessages.appendChild(renderMessage(optimisticMsg));

    threadMessages.scrollTop = threadMessages.scrollHeight;

    // =========================================================
    // SIMPAN PESAN KE DATABASE
    // =========================================================

    const { error: insertError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender_id: currentUser.id,
        content: content || "",
        image_url: imageUrl,
      });

    if (insertError) {
      // Hapus pesan optimistic jika database gagal
      const tempElement = threadMessages.querySelector(`[data-id="${tempId}"]`);

      if (tempElement) {
        tempElement.remove();
      }

      throw insertError;
    }

    // =========================================================
    // KOSONGKAN INPUT
    // =========================================================

    composerInput.value = "";
    clearChatImage();

    // Preview conversation
    const previewText = imageUrl
      ? content
        ? `📷 ${content}`
        : "📷 Foto"
      : content;

    const { error: updateError } = await supabaseClient
      .from("conversations")
      .update({
        last_message: previewText,

        last_message_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId);

    if (updateError) {
      console.warn(
        "Gagal memperbarui preview conversation:",
        updateError.message,
      );
    }

    await loadConversations();
  } catch (error) {
    console.error("Gagal mengirim pesan:", error);

    alert("Gagal mengirim pesan: " + error.message);
  } finally {
    composerSend.disabled = false;

    if (chatImageButton) {
      chatImageButton.disabled = false;
    }
  }
});

// =========================================================
// ENTER = KIRIM
// SHIFT + ENTER = BARIS BARU
// =========================================================

composerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    composerForm.requestSubmit();
  }
});

// =========================================================
// PANEL TRANSAKSI
// =========================================================

const transactionPanel = document.getElementById("transactionPanel");

let activeTx = null;
let activeTxOffered = null;
let txChannel = null;

const TX_INFO = {
  menunggu: "Menunggu respons pemilik barang",

  diterima: "Disepakati. Atur waktu dan tempat serah terima lewat chat.",

  selesai: "Transaksi selesai",

  ditolak: "Pengajuan ditolak",

  dibatalkan: "Transaksi dibatalkan",
};

// =========================================================
// LOAD TRANSACTION
// =========================================================

async function loadTransaction(conv) {
  activeTx = null;
  activeTxOffered = null;

  renderTransactionPanel();

  if (!conv.item_id) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("item_id", conv.item_id)
    .eq("buyer_id", conv.buyer_id)
    .eq("seller_id", conv.seller_id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Gagal memuat transaksi:", error.message);

    return;
  }

  if (activeConversationId !== conv.id) {
    return;
  }

  activeTx = data || null;

  await loadOfferedItem(activeTx);

  if (activeConversationId !== conv.id) {
    return;
  }

  renderTransactionPanel();
}

// =========================================================
// LOAD OFFERED ITEM
// =========================================================

async function loadOfferedItem(tx) {
  if (!tx || !tx.offered_item_id) {
    activeTxOffered = null;
    return;
  }

  if (
    activeTxOffered &&
    String(activeTxOffered.id) === String(tx.offered_item_id)
  ) {
    return;
  }

  const { data } = await supabaseClient
    .from("items")
    .select("id, name")
    .eq("id", tx.offered_item_id)
    .maybeSingle();

  activeTxOffered = data || null;
}

// =========================================================
// RENDER TRANSACTION PANEL
// =========================================================

function renderTransactionPanel() {
  if (!activeTx) {
    transactionPanel.hidden = true;
    transactionPanel.innerHTML = "";
    return;
  }

  const tx = activeTx;
  const isSeller = tx.seller_id === currentUser.id;
  const label = tx.jenis === "Donasi" ? "Donasi" : "Barter";

  const offerLine =
    tx.jenis === "Barter" && activeTxOffered
      ? `<div style="font-size:0.78rem;color:#6b7a73;margin-top:4px;">Ditawarkan: ${escapeHtml(activeTxOffered.name)}</div>`
      : "";

  let info = TX_INFO[tx.status] || tx.status;
  let actions = "";

  if (tx.status === "menunggu") {
    if (isSeller) {
      info = "Ada pengajuan untuk barangmu";
      actions = `
        <button class="txp-btn primary" data-act="terima">Terima</button>
        <button class="txp-btn" data-act="tolak">Tolak</button>`;
    } else {
      actions = `<button class="txp-btn" data-act="batal">Batalkan pengajuan</button>`;
    }
  } else if (tx.status === "diterima") {
    // LANGKAH 1: pemilik menyerahkan barang dulu
    if (!tx.seller_confirmed) {
      if (isSeller) {
        info = "Serahkan barang ke penerima, lalu konfirmasi di sini";
        actions = `<button class="txp-btn primary" data-act="konfirmasi">Barang sudah kuserahkan</button>`;
      } else {
        info = "Menunggu pemilik menyerahkan barang";
      }
      // masih boleh batal selama barang belum diserahkan
      actions += `<button class="txp-btn danger" data-act="batal">Batalkan</button>`;
    }
    // LANGKAH 2: penerima konfirmasi setelah barang diserahkan
    else if (!tx.buyer_confirmed) {
      if (isSeller) {
        info = "Barang sudah kamu serahkan. Menunggu penerima mengonfirmasi.";
      } else {
        info =
          "Pemilik sudah menyerahkan barang. Konfirmasi kalau sudah kamu terima.";
        actions = `<button class="txp-btn primary" data-act="konfirmasi">Barang sudah kuterima</button>`;
      }
    }
  }

  transactionPanel.hidden = false;
  transactionPanel.innerHTML = `
    <div class="txp ${tx.status}">
      <div>
        <span class="txp-badge">${label}</span>
        <span class="txp-info">${info}</span>
        ${offerLine}
      </div>
      <div class="txp-actions">${actions}</div>
    </div>`;
}

// =========================================================
// KIRIM CATATAN OTOMATIS KE CHAT
// =========================================================

async function postInfo(text) {
  if (!activeConversationId) {
    return;
  }

  const { data: msg, error } = await supabaseClient
    .from("messages")
    .insert({
      conversation_id: activeConversationId,

      sender_id: currentUser.id,

      content: text,
    })
    .select()
    .single();

  if (error) {
    console.warn("Gagal kirim info transaksi:", error.message);

    return;
  }

  await supabaseClient
    .from("conversations")
    .update({
      last_message: text,

      last_message_at: new Date().toISOString(),
    })
    .eq("id", activeConversationId);

  if (msg && !threadMessages.querySelector(`[data-id="${msg.id}"]`)) {
    threadMessages.appendChild(renderMessage(msg));

    threadMessages.scrollTop = threadMessages.scrollHeight;
  }

  loadConversations();
}

// =========================================================
// UPDATE TRANSACTION
// =========================================================

async function updateTransaction(patch, note) {
  if (!activeTx) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("transactions")
    .update(patch)
    .eq("id", activeTx.id)
    .select()
    .single();

  if (error) {
    alert("Gagal memperbarui transaksi: " + error.message);

    return;
  }

  activeTx = data;

  renderTransactionPanel();

  if (data.status === "selesai") {
    await postInfo(
      "Transaksi selesai. Terima kasih sudah berbagi di Re:Use.ID!",
    );
  } else if (note) {
    await postInfo(note);
  }
}

// =========================================================
// KLIK TOMBOL TRANSAKSI
// =========================================================

if (transactionPanel) {
  transactionPanel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");

    if (!btn || !activeTx) {
      return;
    }

    const isSeller = activeTx.seller_id === currentUser.id;

    switch (btn.dataset.act) {
      case "terima":
        updateTransaction(
          {
            status: "diterima",
          },

          "Pengajuan diterima. Yuk atur waktu dan tempat serah terima.",
        );

        break;

      case "tolak":
        updateTransaction(
          {
            status: "ditolak",
          },

          "Maaf, pengajuan ini ditolak.",
        );

        break;

      case "batal":
        if (confirm("Yakin mau membatalkan?")) {
          updateTransaction(
            {
              status: "dibatalkan",
            },

            "Transaksi dibatalkan.",
          );
        }

        break;

      case "konfirmasi":
        updateTransaction(
          isSeller
            ? {
                seller_confirmed: true,
              }
            : {
                buyer_confirmed: true,
              },

          isSeller
            ? "Pemilik mengonfirmasi barang sudah diserahkan."
            : "Penerima mengonfirmasi barang sudah diterima.",
        );

        break;
    }
  });
}

// =========================================================
// REALTIME TRANSAKSI
// =========================================================

function subscribeTransactionRealtime(conv) {
  if (txChannel) {
    supabaseClient.removeChannel(txChannel);

    txChannel = null;
  }

  if (!conv.item_id) {
    return;
  }

  txChannel = supabaseClient
    .channel(`tx-${conv.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `item_id=eq.${conv.item_id}`,
      },

      async (payload) => {
        const row = payload.new;

        if (
          !row ||
          row.buyer_id !== conv.buyer_id ||
          row.seller_id !== conv.seller_id
        ) {
          return;
        }

        if (activeConversationId !== conv.id) {
          return;
        }

        activeTx = row;

        await loadOfferedItem(row);

        if (activeConversationId !== conv.id) {
          return;
        }

        renderTransactionPanel();
      },
    )
    .subscribe();
}

// =========================================================
// IMAGE PICKER
// =========================================================

function clearChatImage() {
  selectedChatImage = null;

  if (selectedChatImagePreviewUrl) {
    URL.revokeObjectURL(selectedChatImagePreviewUrl);

    selectedChatImagePreviewUrl = null;
  }

  if (chatImageInput) {
    chatImageInput.value = "";
  }

  if (chatImagePreview) {
    chatImagePreview.hidden = true;
  }

  if (chatImagePreviewImg) {
    chatImagePreviewImg.removeAttribute("src");
  }

  if (chatImagePreviewName) {
    chatImagePreviewName.textContent = "";
  }
}

if (chatImageButton && chatImageInput) {
  chatImageButton.addEventListener("click", () => {
    if (!activeConversationId) {
      alert("Pilih percakapan terlebih dahulu.");

      return;
    }

    ImageFilter.preload(); // siapkan model filter foto sambil user milih file

    chatImageInput.click();
  });
}

if (chatImageInput) {
  chatImageInput.addEventListener("change", async () => {
    const file = chatImageInput.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("File yang dipilih harus berupa foto.");

      clearChatImage();

      return;
    }

    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      alert("Ukuran foto maksimal 5 MB.");

      clearChatImage();

      return;
    }

    // Periksa isi foto (format asli, ukuran, polos, konten dewasa) sebelum dipakai.
    // Tombol kirim dikunci dulu biar pesan nggak terkirim tanpa foto yang lagi diperiksa.
    if (chatImageButton) chatImageButton.disabled = true;
    composerSend.disabled = true;
    chatImagePreviewName.textContent = "Memeriksa foto…";
    chatImagePreview.hidden = false;

    let result;
    try {
      result = await ImageFilter.check(file, { context: "chat" });
    } finally {
      if (chatImageButton) chatImageButton.disabled = false;
      composerSend.disabled = false;
    }

    if (!result.ok) {
      alert("⚠️ Foto tidak bisa dikirim.\n\n" + result.reason);

      clearChatImage();

      return;
    }

    selectedChatImage = file;

    selectedChatImagePreviewUrl = URL.createObjectURL(file);

    if (chatImagePreviewImg) {
      chatImagePreviewImg.src = selectedChatImagePreviewUrl;
    }

    if (chatImagePreviewName) {
      chatImagePreviewName.textContent = file.name;
    }

    if (chatImagePreview) {
      chatImagePreview.hidden = false;
    }
  });
}

if (chatImageRemove) {
  chatImageRemove.addEventListener("click", clearChatImage);
}

// =========================================================
// INIT
// =========================================================

document.addEventListener("reuse-unread-changed", () => {
  if (currentUser) {
    loadConversations();
  }
});

onAuthReady(async () => {
  if (!isLoggedIn()) {
    window.location.href = `login.html?redirect=${encodeURIComponent(
      window.location.pathname + window.location.search,
    )}`;

    return;
  }

  currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = "login.html";

    return;
  }

  await loadConversations();

  const params = new URLSearchParams(window.location.search);

  const requestedId = params.get("id");

  if (requestedId) {
    await openConversation(requestedId);
  }
});
