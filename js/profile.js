// ITEMS ada di items-data.js, logout()/isLoggedIn()/getUserName() ada di auth.js
// (keduanya dimuat sebelum file ini).
//
// PENTING: isLoggedIn() baru akurat setelah 'auth-ready' terpicu (lihat auth.js),
// jadi semua kode di bawah dibungkus supaya nggak sempat baca status "belum login"
// yang keliru sebelum sesi selesai dicek.
onAuthReady(async () => {
  // Halaman ini butuh login — kalau belum, tendang ke login dulu.
  if (!isLoggedIn()) {
    window.location.href = "login.html?redirect=profile.html";
    return;
  }

  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  // ---------- PASANG SEMUA LISTENER TOMBOL DULUAN, SEBELUM AMBIL DATA ----------
  // PENTING: bagian ini sengaja diletakkan SEBELUM proses ambil data dari Supabase
  // (yang pakai 'await' dan bisa gagal karena masalah jaringan/token). Kalau listener
  // tombol dipasang SESUDAH sebuah 'await' yang gagal, seluruh kode setelahnya nggak
  // akan pernah jalan — tombol jadi kelihatan "nggak ngapa-ngapain" saat diklik.
  // Dengan urutan begini, tombol tab/edit tetap berfungsi walau proses ambil data
  // di bawah nanti gagal.

  // Tombol "Edit Profil" di header -> lompat ke tab Pengaturan & fokus ke field nama
  document.getElementById("btnEditProfile")?.addEventListener("click", () => {
    document.querySelector('.tab-btn[data-tab="pengaturan"]')?.click();
    document.getElementById("settingsName")?.focus();
  });

  // ---------- GANTI FOTO PROFIL (upload ke Supabase Storage, bucket "avatars") ----------
  const avatarBtn = document.getElementById("btnChangeAvatar");
  const avatarInput = document.getElementById("avatarInput");
  const avatarImg = document.getElementById("phAvatar");

  avatarBtn?.addEventListener("click", () => avatarInput?.click());

  avatarInput?.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;

    // validasi dasar di sisi client
    const maxSizeMB = 3;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Format foto harus PNG, JPG, atau WEBP.");
      avatarInput.value = "";
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Ukuran foto maksimal ${maxSizeMB}MB.`);
      avatarInput.value = "";
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("Sesi login bermasalah, coba muat ulang halaman.");
      return;
    }

    avatarBtn.disabled = true;
    const originalAvatarSrc = avatarImg.src;

    // preview instan sebelum upload selesai
    avatarImg.src = URL.createObjectURL(file);

    const ext = file.name.split(".").pop();
    // nama file disertai timestamp biar nggak ke-cache browser/CDN dengan foto lama
    const filePath = `${currentUser.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Gagal upload foto: " + uploadError.message);
      avatarImg.src = originalAvatarSrc;
      avatarBtn.disabled = false;
      avatarInput.value = "";
      return;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const newAvatarUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseClient.auth.updateUser({
      data: { avatar_url: newAvatarUrl },
    });

    avatarBtn.disabled = false;
    avatarInput.value = "";

    if (updateError) {
      alert(
        "Foto ke-upload, tapi gagal menyimpan ke profil: " +
          updateError.message,
      );
      avatarImg.src = originalAvatarSrc;
      return;
    }

    // refresh cache sesi biar getCurrentUser()/getUserName() ikut update
    await setLoggedIn();
    avatarImg.src = newAvatarUrl;
  });

  // ---------- TAB SWITCHING ----------
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document
        .getElementById(`panel-${btn.dataset.tab}`)
        .classList.add("active");
    });
  });

  // ---------- ISI DATA PROFIL DARI AKUN YANG LOGIN ----------
  // Pakai data sesi yang sudah di-cache (getCurrentUser(), lihat auth.js) —
  // BUKAN supabaseClient.auth.getUser() — supaya nggak perlu request lagi ke
  // server yang bisa gagal kalau token lagi bermasalah.
  const user = getCurrentUser();
  const userName = user?.user_metadata?.full_name || getUserName();
  const userCampus = user?.user_metadata?.campus || "";
  const userEmail = user?.email || "";
  const userLocation = user?.user_metadata?.location || "";
  const userAvatar = user?.user_metadata?.avatar_url || "";

  document.getElementById("phName").textContent = userName;
  if (userCampus)
    document.getElementById("phCampus").textContent =
      `🎓 Mahasiswa — ${userCampus}`;
  document.getElementById("phLocation").textContent = userLocation
    ? `📍 ${userLocation}`
    : "";
  if (userAvatar) document.getElementById("phAvatar").src = userAvatar;
  document.getElementById("settingsName").value = userName;
  document.getElementById("settingsEmail").value = userEmail;
  document.getElementById("settingsLocation").value = userLocation;

  // ---------- BARANG AKTIF (dari tabel items di Supabase, milik akun ini) ----------
  const activeGrid = document.getElementById("activeGrid");
  let myItems = null,
    itemsError = null;
  try {
    const res = await supabaseClient
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    myItems = res.data;
    itemsError = res.error;
  } catch (err) {
    itemsError = err;
  }

  const statActiveEl = document.getElementById("statActive");

  if (itemsError) {
    activeGrid.innerHTML = `<p>Gagal memuat barang: ${itemsError.message}</p>`;
  } else if (!myItems || myItems.length === 0) {
    activeGrid.innerHTML = `<p>Kamu belum punya barang yang diunggah.</p>`;
    if (statActiveEl) statActiveEl.textContent = "0";
  } else {
    if (statActiveEl)
      statActiveEl.textContent = myItems.filter(
        (i) => i.status === "Aktif",
      ).length;
    activeGrid.innerHTML = myItems
      .map((item) => {
        const badgeClass = item.jenis === "Barter" ? "barter" : "donasi";
        const cover =
          item.photos?.[0] ||
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop";
        return `
        <article class="item-card" data-item-id="${item.id}">
          <div class="ic-photo">
            <span class="ic-badge ${badgeClass}">${item.jenis.toUpperCase()}</span>
            <img src="${cover}" alt="${item.name}" loading="lazy">
            <div class="ic-hover-actions">
              <button class="ic-action-btn edit">Edit</button>
              <button class="ic-action-btn deactivate">${item.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}</button>
              <button class="ic-action-btn delete">Hapus</button>
            </div>
          </div>
          <div class="ic-body">
            <div class="ic-title">${item.name}</div>
            <span class="ic-status">${item.status}</span>
          </div>
        </article>
      `;
      })
      .join("");
  }

  // navigasi ke halaman edit — item ID diambil dari data-item-id di kartu barang
  activeGrid.querySelectorAll(".ic-action-btn.edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const itemId = btn.closest(".item-card").dataset.itemId;
      window.location.href = `edit.html?id=${itemId}`;
    });
  });

  // toggle Aktif/Nonaktif — update beneran ke Supabase, bukan cuma tampilan
  activeGrid.querySelectorAll(".ic-action-btn.deactivate").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const card = btn.closest(".item-card");
      const itemId = card.dataset.itemId;
      const status = card.querySelector(".ic-status");
      const isActive = status.textContent === "Aktif";
      const newStatus = isActive ? "Nonaktif" : "Aktif";

      const { error } = await supabaseClient
        .from("items")
        .update({ status: newStatus })
        .eq("id", itemId);

      if (error) {
        alert("Gagal mengubah status: " + error.message);
        return;
      }

      status.textContent = newStatus;
      status.style.background = isActive ? "#F2E9DC" : "";
      status.style.color = isActive ? "#8A6D3B" : "";
      btn.textContent = isActive ? "Aktifkan" : "Nonaktifkan";

      const statEl = document.getElementById("statActive");
      if (statEl)
        statEl.textContent = activeGrid.querySelectorAll(".ic-status").length
          ? [...activeGrid.querySelectorAll(".ic-status")].filter(
              (s) => s.textContent === "Aktif",
            ).length
          : "0";
    });
  });

  // hapus barang permanen — konfirmasi dulu, hapus foto di Storage, baru hapus baris di tabel
  activeGrid.querySelectorAll(".ic-action-btn.delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const card = btn.closest(".item-card");
      const itemId = card.dataset.itemId;
      const itemName =
        card.querySelector(".ic-title")?.textContent || "barang ini";

      const confirmed = confirm(
        `Hapus "${itemName}" secara permanen? Tindakan ini tidak bisa dibatalkan.`,
      );
      if (!confirmed) return;

      btn.disabled = true;
      btn.textContent = "Menghapus…";

      // hapus dulu foto-fotonya dari Storage (kalau ada)
      const itemData = myItems?.find((i) => String(i.id) === String(itemId));
      const photoPaths = (itemData?.photos || [])
        .map((url) => {
          const marker = "/items/";
          const idx = url.indexOf(marker);
          return idx === -1 ? null : url.slice(idx + marker.length);
        })
        .filter(Boolean);

      if (photoPaths.length) {
        await supabaseClient.storage.from("items").remove(photoPaths);
      }

      const { error } = await supabaseClient
        .from("items")
        .delete()
        .eq("id", itemId);

      if (error) {
        alert("Gagal menghapus barang: " + error.message);
        btn.disabled = false;
        btn.textContent = "Hapus";
        return;
      }

      card.remove();

      const statEl = document.getElementById("statActive");
      if (statEl)
        statEl.textContent = activeGrid.querySelectorAll(".ic-status").length
          ? [...activeGrid.querySelectorAll(".ic-status")].filter(
              (s) => s.textContent === "Aktif",
            ).length
          : "0";

      if (!activeGrid.querySelector(".item-card")) {
        activeGrid.innerHTML = `<p>Kamu belum punya barang yang diunggah.</p>`;
      }
    });
  });

  // ---------- RIWAYAT TRANSAKSI + ULASAN (data asli dari Supabase) ----------
  const historyTimeline = document.getElementById("historyTimeline");
  const reviewList = document.getElementById("reviewList");
  const statDoneEl = document.getElementById("statDone");
  const statRatingEl = document.getElementById("statRating");

  const HIST_PHOTO =
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop";
  const HIST_AVATAR = "https://i.pravatar.cc/80?img=47";

  const TX_LABEL = {
    menunggu: "Menunggu",
    diterima: "Diproses",
    selesai: "Selesai",
    ditolak: "Ditolak",
    dibatalkan: "Dibatalkan",
  };

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML.replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  (function injectHistoryStyles() {
    const s = document.createElement("style");
    s.textContent = `
      .ti-status.menunggu{background:#fff4dd;color:#9a6a00;}
      .ti-status.diterima{background:#e3eefb;color:#245a9a;}
      .ti-status.ditolak{background:#f1eeea;color:#6f6a65;}
      .ti-review-btn{display:block;margin:6px 0 0 auto;padding:5px 12px;border-radius:999px;border:1px solid var(--sage,#4E8C6B);background:#fff;color:var(--sage-dark,#2f6b4a);font:inherit;font-size:.76rem;font-weight:700;cursor:pointer;}
      .ti-review-btn:hover{background:var(--sage-tint,#eaf3ee);}
      .ti-done-note{margin-top:6px;font-size:.74rem;color:var(--ink-soft,#7A8B85);}
      .rv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999;}
      .rv-card{background:#fff;border-radius:16px;width:100%;max-width:420px;padding:20px;font-family:'DM Sans',sans-serif;}
      .rv-card h3{margin:0 0 4px;font-size:1.05rem;}
      .rv-card p{margin:0 0 12px;font-size:.82rem;color:#6b7a73;}
      .rv-stars{display:flex;gap:4px;margin-bottom:12px;}
      .rv-star{background:none;border:none;font-size:1.9rem;line-height:1;cursor:pointer;color:#cfd6d2;padding:0;}
      .rv-star.on{color:#e0a100;}
      .rv-card textarea{width:100%;min-height:90px;box-sizing:border-box;border:1px solid #d5ddd9;border-radius:10px;padding:10px;font:inherit;font-size:.88rem;resize:vertical;}
      .rv-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;}
      .rv-btn{padding:9px 18px;border-radius:999px;border:1px solid #d5ddd9;background:#fff;font:inherit;font-weight:700;cursor:pointer;}
      .rv-btn.primary{background:var(--sage,#4E8C6B);border-color:var(--sage,#4E8C6B);color:#fff;}
      .rv-btn:disabled{opacity:.5;cursor:not-allowed;}
    `;
    document.head.appendChild(s);
  })();

  // popup beri ulasan -> mengembalikan true kalau berhasil dikirim
  function openReviewModal(tx, otherName) {
    return new Promise((resolve) => {
      let rating = 0;

      const overlay = document.createElement("div");
      overlay.className = "rv-overlay";
      overlay.innerHTML = `
        <div class="rv-card" role="dialog" aria-modal="true">
          <h3>Beri ulasan untuk ${esc(otherName)}</h3>
          <p>Ceritakan pengalaman transaksimu. Ulasan tidak bisa diubah setelah dikirim.</p>
          <div class="rv-stars">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="rv-star" data-n="${n}" aria-label="${n} bintang">★</button>`,
              )
              .join("")}
          </div>
          <textarea maxlength="500" placeholder="Opsional, maksimal 500 karakter"></textarea>
          <div class="rv-actions">
            <button type="button" class="rv-btn" data-close>Batal</button>
            <button type="button" class="rv-btn primary" data-send disabled>Kirim</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      const sendBtn = overlay.querySelector("[data-send]");
      const textarea = overlay.querySelector("textarea");

      const paint = () =>
        overlay.querySelectorAll(".rv-star").forEach((b) => {
          b.classList.toggle("on", Number(b.dataset.n) <= rating);
        });

      const close = (ok) => {
        overlay.remove();
        resolve(ok);
      };

      overlay.addEventListener("click", async (e) => {
        if (e.target === overlay || e.target.closest("[data-close]")) {
          close(false);
          return;
        }

        const star = e.target.closest(".rv-star");
        if (star) {
          rating = Number(star.dataset.n);
          paint();
          sendBtn.disabled = false;
          return;
        }

        if (e.target.closest("[data-send]") && rating) {
          sendBtn.disabled = true;
          sendBtn.textContent = "Mengirim…";

          const { error } = await supabaseClient.from("reviews").insert({
            transaction_id: tx.id,
            rating,
            comment: textarea.value.trim() || null,
          });

          if (error) {
            // 23505 = sudah pernah mengulas transaksi ini
            alert(
              error.code === "23505"
                ? "Kamu sudah memberi ulasan untuk transaksi ini."
                : "Gagal mengirim ulasan: " + error.message,
            );
            sendBtn.disabled = false;
            sendBtn.textContent = "Kirim";
            if (error.code === "23505") close(true);
            return;
          }

          close(true);
        }
      });
    });
  }

  async function loadHistoryAndReviews() {
    const myId = user.id;

    // transaksi di mana aku jadi pengaju atau pemilik
    const { data: txs, error: txError } = await supabaseClient
      .from("transactions")
      .select("*")
      .or(`buyer_id.eq.${myId},seller_id.eq.${myId}`)
      .order("created_at", { ascending: false });

    if (txError) {
      historyTimeline.innerHTML = `<p>Gagal memuat riwayat: ${esc(txError.message)}</p>`;
    }

    const txList = txError ? [] : txs || [];

    // ulasan yang sudah kuberikan & yang kuterima
    const [{ data: givenRows }, { data: receivedRows, error: recError }] =
      await Promise.all([
        supabaseClient
          .from("reviews")
          .select("transaction_id")
          .eq("reviewer_id", myId),
        supabaseClient
          .from("reviews")
          .select("*")
          .eq("reviewee_id", myId)
          .order("created_at", { ascending: false }),
      ]);

    const reviewedTx = new Set(
      (givenRows || []).map((r) => String(r.transaction_id)),
    );
    const received = recError ? [] : receivedRows || [];

    // ---------- statistik ----------
    if (statDoneEl)
      statDoneEl.textContent = String(
        txList.filter((t) => t.status === "selesai").length,
      );

    if (statRatingEl) {
      statRatingEl.textContent = received.length
        ? (
            received.reduce((a, r) => a + r.rating, 0) / received.length
          ).toFixed(1)
        : "–";
    }

    // ---------- tab ulasan ----------
    if (recError) {
      reviewList.innerHTML = `<p>Gagal memuat ulasan: ${esc(recError.message)}</p>`;
    } else if (!received.length) {
      reviewList.innerHTML = `<p>Belum ada ulasan.</p>`;
    } else {
      reviewList.innerHTML = received
        .map(
          (r) => `
        <article class="review-card">
          <div class="review-top">
            <img class="review-avatar" src="${esc(r.reviewer_avatar || HIST_AVATAR)}" alt="">
            <div>
              <div class="review-name">${esc(r.reviewer_name || "Pengguna Re:Use.ID")}</div>
              <div class="review-stars">${stars(r.rating)}</div>
            </div>
            <div class="review-date">${fmtDate(r.created_at)}</div>
          </div>
          ${r.comment ? `<div class="review-text">${esc(r.comment)}</div>` : ""}
        </article>`,
        )
        .join("");
    }

    // ---------- tab riwayat ----------
    if (txError) return;

    if (!txList.length) {
      historyTimeline.innerHTML = `<p>Belum ada riwayat transaksi.</p>`;
      return;
    }

    // nama barang + foto
    const itemIds = [
      ...new Set(
        txList.flatMap((t) => [t.item_id, t.offered_item_id]).filter(Boolean),
      ),
    ];
    const { data: itemRows } = await supabaseClient
      .from("items")
      .select("*")
      .in("id", itemIds);
    const itemMap = new Map((itemRows || []).map((i) => [String(i.id), i]));

    // nama lawan transaksi, diambil dari tabel conversations
    const { data: convRows } = await supabaseClient
      .from("conversations")
      .select("item_id, buyer_id, seller_id, buyer_name, seller_name")
      .in("item_id", [...new Set(txList.map((t) => t.item_id))]);
    const convMap = new Map(
      (convRows || []).map((c) => [
        `${c.item_id}|${c.buyer_id}|${c.seller_id}`,
        c,
      ]),
    );

    historyTimeline.innerHTML = txList
      .map((t) => {
        const iAmBuyer = t.buyer_id === myId;
        const item = itemMap.get(String(t.item_id));
        const offered = t.offered_item_id
          ? itemMap.get(String(t.offered_item_id))
          : null;
        const conv = convMap.get(`${t.item_id}|${t.buyer_id}|${t.seller_id}`);
        const otherName =
          (iAmBuyer ? conv?.seller_name : conv?.buyer_name) ||
          "Pengguna Re:Use.ID";

        const cover = item?.photo || item?.photos?.[0] || HIST_PHOTO;
        const isDonasi = t.jenis === "Donasi";

        let sub = iAmBuyer
          ? `Kamu mengajukan ke ${esc(otherName)}`
          : `${esc(otherName)} mengajukan ke barangmu`;
        if (offered) sub += ` · Ditawarkan: ${esc(offered.name)}`;

        const canReview =
          t.status === "selesai" && !reviewedTx.has(String(t.id));
        const reviewedNote =
          t.status === "selesai" && !canReview
            ? `<div class="ti-done-note">Ulasan terkirim</div>`
            : "";

        return `
        <div class="timeline-item">
          <img class="ti-thumb" src="${esc(cover)}" alt="">
          <div class="ti-main">
            <div class="ti-top">
              <span class="ti-badge ${isDonasi ? "donasi" : "barter"}">${isDonasi ? "DONASI" : "BARTER"}</span>
              <span class="ti-item-name">${esc(item?.name || "Barang sudah dihapus")}</span>
            </div>
            <div class="ti-sub">${sub}</div>
          </div>
          <div class="ti-right">
            <div class="ti-date">${fmtDate(t.created_at)}</div>
            <span class="ti-status ${esc(t.status)}">${TX_LABEL[t.status] || esc(t.status)}</span>
            ${canReview ? `<button type="button" class="ti-review-btn" data-review="${esc(t.id)}" data-other="${esc(otherName)}">Beri ulasan</button>` : reviewedNote}
          </div>
        </div>`;
      })
      .join("");

    historyTimeline.querySelectorAll("[data-review]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tx = txList.find((x) => String(x.id) === btn.dataset.review);
        if (!tx) return;
        const ok = await openReviewModal(tx, btn.dataset.other);
        if (ok) loadHistoryAndReviews();
      });
    });
  }

  loadHistoryAndReviews().catch((err) => {
    console.error("Gagal memuat riwayat/ulasan:", err);
    historyTimeline.innerHTML = `<p>Gagal memuat riwayat transaksi.</p>`;
  });

  // ---------- PENGATURAN: simpan nama & lokasi beneran ke Supabase ----------
  document
    .querySelector(".btn-save-settings")
    ?.addEventListener("click", async () => {
      const btn = document.querySelector(".btn-save-settings");
      const original = btn.textContent;
      const newName = document.getElementById("settingsName").value.trim();
      const newLocation = document
        .getElementById("settingsLocation")
        .value.trim();

      btn.disabled = true;
      btn.textContent = "Menyimpan…";

      const { error } = await supabaseClient.auth.updateUser({
        data: { full_name: newName, location: newLocation },
      });

      btn.disabled = false;

      if (error) {
        btn.textContent = "Gagal, coba lagi";
        setTimeout(() => {
          btn.textContent = original;
        }, 1800);
        return;
      }

      // refresh cache sesi biar getUserName() ikut update, terus perbarui tampilan nama & lokasi
      await setLoggedIn();
      document.getElementById("phName").textContent = getUserName();
      document.getElementById("phLocation").textContent = newLocation
        ? `📍 ${newLocation}`
        : "";

      btn.textContent = "Tersimpan ✓";
      setTimeout(() => {
        btn.textContent = original;
      }, 1800);
    });
});
