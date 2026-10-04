// =========================================================
// Re:Use.ID - LAPORAN (barang, chat, bug)
// =========================================================
// Dimuat setelah supabase-client.js dan auth.js (butuh supabaseClient,
// isLoggedIn, getCurrentUser, getUserName, escHtml).
//
// Cara pakai dari halaman mana pun:
//   openReport({ type: "item", itemId, itemName, userId })
//   openReport({ type: "chat", conversationId, userId, userName, messageId?, messageText?, getEvidence? })
//   openReport({ type: "bug" })
//
// Tabel & aturan keamanannya ada di bagian4_laporan.sql.
// =========================================================

(function () {
  const REASONS = {
    item: [
      "Penipuan / tidak sesuai deskripsi",
      "Barang terlarang atau berbahaya",
      "Foto tidak pantas / bukan milik sendiri",
      "Spam atau barang dobel",
      "Lainnya",
    ],
    chat: [
      "Penipuan / minta transfer uang",
      "Kata kasar atau pelecehan",
      "Minta data pribadi / sensitif",
      "Spam atau iklan",
      "Lainnya",
    ],
    bug: [
      "Fitur tidak berfungsi",
      "Tampilan rusak / berantakan",
      "Error atau halaman lambat",
      "Saran perbaikan",
      "Lainnya",
    ],
  };

  const COPY = {
    item: {
      title: "Laporkan barang",
      sub: "Laporanmu dibaca admin dan tidak diberitahukan ke pemilik barang.",
    },
    chat: {
      title: "Laporkan percakapan",
      sub: "Laporanmu dibaca admin dan tidak diberitahukan ke lawan bicara.",
    },
    bug: {
      title: "Laporkan bug",
      sub: "Ceritakan apa yang rusak supaya kami bisa memperbaikinya.",
    },
  };

  const BUG_AREAS = [
    "Beranda / Jelajahi",
    "Detail barang",
    "Upload / edit barang",
    "Chat & transaksi",
    "Profil & pengaturan",
    "Login / daftar",
    "Lainnya",
  ];

  // muat css sekali
  if (!document.getElementById("reportCss")) {
    const l = document.createElement("link");
    l.id = "reportCss";
    l.rel = "stylesheet";
    l.href = "css/report.css";
    document.head.appendChild(l);
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "rp-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function goLogin() {
    const back =
      window.location.pathname.split("/").pop() + window.location.search;
    window.location.href = "login.html?redirect=" + encodeURIComponent(back);
  }

  window.openReport = function (opts) {
    const type = opts?.type;
    if (!REASONS[type]) return;

    if (!isLoggedIn()) {
      goLogin();
      return;
    }

    document.getElementById("reportOverlay")?.remove();

    const me = getCurrentUser();
    const isBug = type === "bug";
    const targetLabel =
      type === "item"
        ? opts.itemName
        : type === "chat"
          ? opts.messageText
            ? `Pesan: "${String(opts.messageText).slice(0, 120)}"`
            : `Percakapan dengan ${opts.userName || "pengguna"}`
          : null;

    const overlay = document.createElement("div");
    overlay.id = "reportOverlay";
    overlay.className = "rp-overlay";
    overlay.innerHTML = `
      <div class="rp-card" role="dialog" aria-modal="true" aria-labelledby="rpTitle">
        <h3 id="rpTitle">${COPY[type].title}</h3>
        <p class="rp-sub">${COPY[type].sub}</p>
        ${targetLabel ? `<div class="rp-target">${escHtml(targetLabel)}</div>` : ""}

        ${
          isBug
            ? `<label class="rp-label" for="rpArea">Bagian yang bermasalah</label>
               <select id="rpArea">${BUG_AREAS.map((a) => `<option>${escHtml(a)}</option>`).join("")}</select>`
            : ""
        }

        <span class="rp-label">${isBug ? "Jenis masalah" : "Alasan"}</span>
        <div class="rp-reasons">
          ${REASONS[type]
            .map(
              (r, i) => `
            <label class="rp-reason">
              <input type="radio" name="rpReason" value="${escHtml(r)}" ${i === 0 ? "checked" : ""}>
              <span>${escHtml(r)}</span>
            </label>`,
            )
            .join("")}
        </div>

        <label class="rp-label" for="rpDetails">${isBug ? "Ceritakan masalahnya" : "Keterangan tambahan (opsional)"}</label>
        <textarea id="rpDetails" maxlength="2000" placeholder="${isBug ? "Apa yang kamu lakukan, apa yang terjadi, dan apa yang seharusnya terjadi?" : "Jelaskan singkat apa yang bermasalah…"}"></textarea>

        <p class="rp-note">${
          isBug
            ? "Halaman, jenis browser, dan ukuran layar ikut terkirim otomatis."
            : type === "chat"
              ? "Beberapa pesan terakhir di percakapan ini ikut dikirim ke admin sebagai bukti."
              : "Laporan palsu atau berulang bisa membuat akunmu dibatasi."
        }</p>
        <div class="rp-err" id="rpErr"></div>
        <div class="rp-actions">
          <button type="button" class="rp-btn" id="rpCancel">Batal</button>
          <button type="button" class="rp-btn primary" id="rpSend">Kirim laporan</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const card = overlay.querySelector(".rp-card");
    const errEl = overlay.querySelector("#rpErr");
    const sendBtn = overlay.querySelector("#rpSend");
    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (e) => e.target === overlay && close());
    overlay.querySelector("#rpCancel").addEventListener("click", close);

    sendBtn.addEventListener("click", async () => {
      const reason = overlay.querySelector(
        'input[name="rpReason"]:checked',
      )?.value;
      const details = overlay.querySelector("#rpDetails").value.trim();
      errEl.textContent = "";

      if (isBug && details.length < 10) {
        errEl.textContent = "Ceritakan masalahnya minimal 10 karakter ya.";
        return;
      }
      if (!isBug && reason === "Lainnya" && details.length < 5) {
        errEl.textContent =
          'Pilih "Lainnya"? Tolong jelaskan sedikit di keterangan.';
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Mengirim…";

      const payload = {
        type,
        reporter_name:
          me.user_metadata?.full_name ||
          me.user_metadata?.name ||
          getUserName(),
        reporter_avatar: me.user_metadata?.avatar_url || null,
        reason,
        details: details || null,
        target_label: targetLabel,
      };

      if (type === "item") {
        payload.target_item_id = String(opts.itemId);
        payload.target_user_id = opts.userId || null;
      } else if (type === "chat") {
        payload.conversation_id = String(opts.conversationId);
        payload.target_user_id = opts.userId || null;
        payload.message_id = opts.messageId ? String(opts.messageId) : null;
        try {
          payload.evidence = opts.getEvidence ? await opts.getEvidence() : null;
        } catch (err) {
          console.warn("Gagal mengambil bukti chat:", err);
        }
      } else {
        payload.meta = {
          area: overlay.querySelector("#rpArea")?.value || null,
          page:
            window.location.pathname.split("/").pop() + window.location.search,
          ua: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        };
      }

      const { error } = await supabaseClient.from("reports").insert(payload);

      if (error) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Kirim laporan";
        if (error.code === "23505") {
          errEl.textContent = "Kamu sudah melaporkan ini, sedang kami tinjau.";
        } else if (error.code === "P0001") {
          errEl.textContent = error.message;
        } else {
          console.error("Gagal kirim laporan:", error);
          errEl.textContent =
            "Gagal mengirim laporan. Pastikan bagian4_laporan.sql sudah dijalankan.";
        }
        return;
      }

      card.innerHTML = `
        <div class="rp-done">
          <div class="rp-ico">✅</div>
          <h3>Laporan terkirim</h3>
          <p class="rp-sub">Terima kasih, admin akan meninjaunya secepatnya.</p>
          <div class="rp-actions" style="justify-content:center"><button type="button" class="rp-btn primary" id="rpOk">Tutup</button></div>
        </div>`;
      card.querySelector("#rpOk").addEventListener("click", close);
    });
  };

  // Elemen apa pun dengan data-report-bug otomatis membuka form bug.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-report-bug]");
    if (!el) return;
    e.preventDefault();
    // auth belum siap? tunggu dulu, jangan salah anggap "belum login"
    onAuthReady(() => openReport({ type: "bug" }));
  });
})();
