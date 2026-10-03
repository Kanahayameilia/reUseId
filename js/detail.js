// supabaseClient ada di supabase-client.js, isLoggedIn() ada di auth.js,
// getUserLocation()/computeItemDistance() ada di geo.js (semuanya dimuat sebelum file ini).
// item_data.js masih dimuat buat kompatibilitas lama, tapi ITEMS sudah dikosongkan —
// halaman ini sekarang murni ambil data dari tabel "items" di Supabase.

const FALLBACK_PHOTO =
  "assets/item-default.svg";
const FALLBACK_AVATAR = "assets/avatar-default.svg";

(async function () {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id");

  const mainEl = document.querySelector("main.wrap");

  function showNotFound(message) {
    if (mainEl) {
      mainEl.innerHTML = `
        <div style="max-width:480px; margin:80px auto; text-align:center; font-family:'DM Sans',sans-serif;">
          <h2 style="margin-bottom:10px;">${message}</h2>
          <a href="browse.html" style="color:var(--sage, #4E8C6B); font-weight:700;">← Kembali ke Jelajahi Barang</a>
        </div>
      `;
    }
  }

  if (!requestedId) {
    showNotFound("Barang tidak ditemukan.");
    return;
  }

  // ---------- ambil barang dari Supabase ----------
  let item = null;
  try {
    const { data, error } = await supabaseClient
      .from("items")
      .select("*")
      .eq("id", requestedId)
      .single();

    if (!error && data) {
      item = {
        ...data,
        photos: data.photos?.length
          ? data.photos
          : [data.photo || FALLBACK_PHOTO],
        tags: data.tags || [],
        owner: data.owner || "Pengguna Re:Use.ID",
        avatar: data.avatar || FALLBACK_AVATAR,
        rating: data.rating || 5,
        memberSince:
          data.member_since ||
          (data.created_at
            ? new Date(data.created_at).getFullYear().toString()
            : "-"),
        jarak: data.jarak || 0,
      };
    }
  } catch (err) {
    console.error("Gagal memuat barang dari Supabase:", err);
  }

  if (!item) {
    showNotFound("Barang tidak ditemukan atau sudah dihapus.");
    return;
  }

  // ---------- render info utama ----------
  document.title = `${item.name} | Re:Use.ID`;

  const badgeEl = document.getElementById("itemBadge");
  badgeEl.textContent = item.jenis.toUpperCase();
  badgeEl.classList.add(item.jenis === "Barter" ? "barter" : "donasi");

  document.getElementById("itemName").textContent = item.name;

  const starCount = { Layak: 3, Baik: 4, "Sangat Baik": 5 }[item.kondisi] || 4;
  document.getElementById("itemCondition").innerHTML =
    `Kondisi: ${item.kondisi} <span class="stars">${"⭐".repeat(starCount)}</span>`;

  document.getElementById("itemDescription").textContent = item.description;

  document.getElementById("itemTags").innerHTML = (item.tags || [])
    .map((t) => `<span class="tag">#${t}</span>`)
    .join("");

  document.getElementById("ownerAvatar").src = item.avatar;
  document.getElementById("ownerAvatar").alt = item.owner;
  document.getElementById("ownerName").textContent = item.owner;

  const profileLink = document.querySelector(".profile-link");
  if (profileLink && item.user_id) {
    profileLink.href = `user.html?id=${encodeURIComponent(item.user_id)}`;
  }

  const ownerRatingEl = document.getElementById("ownerRating");
  ownerRatingEl.innerHTML = `Belum ada ulasan &nbsp;·&nbsp; Member sejak ${item.memberSince}`;

  // rating asli: rata-rata ulasan yang diterima pemilik barang
  supabaseClient
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", item.user_id)
    .then(({ data: revs }) => {
      if (!revs || !revs.length) return;
      const avg = (
        revs.reduce((a, r) => a + r.rating, 0) / revs.length
      ).toFixed(1);
      ownerRatingEl.innerHTML = `⭐ ${avg}/5 (${revs.length} ulasan) &nbsp;·&nbsp; Member sejak ${item.memberSince}`;
    });

  // ---------- jarak asli: pakai lokasi GPS user kalau ada, fallback ke field "jarak" statis ----------
  const itemLocationEl = document.getElementById("itemLocation");

  function renderDistance(userLoc) {
    const jarak = computeItemDistance(item, userLoc);
    itemLocationEl.textContent = `📍 ${jarak * 1000 < 1000 ? Math.round(jarak * 1000) + "m" : jarak + "km"} dari lokasi Anda — ${item.lokasi}`;
  }

  renderDistance(null); // tampil dulu pakai fallback, biar nggak kosong sambil nunggu izin lokasi
  getUserLocation().then(renderDistance);

  // tombol utama nyesuain jenis barang:
  // - Barter: "Ajukan Barter" + "Hubungi Pemilik" (dua-duanya tampil)
  // - Donasi: cuma "Hubungi Pemilik" (nggak ada "ajukan donasi", karena nggak relevan)
  const btnPrimary = document.getElementById("btnAjukanBarter");
  const btnSecondary = document.getElementById("btnHubungiPemilik");
  const isDonasi = item.jenis === "Donasi";

  if (isDonasi) {
    btnPrimary.textContent = "Ajukan Ambil";
  }

  // barang yang sedang diproses / sudah selesai tidak bisa diajukan lagi
  if (item.status && item.status !== "Aktif") {
    btnPrimary.disabled = true;
    btnPrimary.textContent =
      item.status === "Selesai" ? "Sudah selesai" : "Sedang diproses";
  }

  // ---------- gallery ----------
  const mainPhoto = document.getElementById("mainPhoto");
  const thumbRow = document.getElementById("thumbRow");

  mainPhoto.src = item.photos[0];
  mainPhoto.alt = item.name;

  thumbRow.innerHTML = item.photos
    .map(
      (src, i) => `
<button class="thumb ${i === 0 ? "active" : ""}" data-src="${escHtml(src)}">
<img src="${escHtml(src)}" alt="${escHtml(item.name)} — foto ${i + 1}">    </button>
  `,
    )
    .join("");

  thumbRow.querySelectorAll(".thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainPhoto.src = thumb.dataset.src;
      thumbRow
        .querySelectorAll(".thumb")
        .forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });

  // ---------- barang serupa: kategori sama, dari Supabase, kecualikan barang ini sendiri ----------
  const similarScroll = document.getElementById("similarScroll");

  try {
    const { data: similarData, error: similarError } = await supabaseClient
      .from("items")
      .select("*")
      .eq("kategori", item.kategori)
      .eq("status", "Aktif")
      .neq("id", item.id)
      .order("created_at", { ascending: false })
      .limit(4);

    if (similarError || !similarData || similarData.length === 0) {
      similarScroll.innerHTML = `<p style="color:var(--ink-soft,#7A8B85);">Belum ada barang serupa lainnya.</p>`;
    } else {
      similarScroll.innerHTML = similarData
        .map((sim) => {
          const badgeClass = sim.jenis === "Barter" ? "barter" : "donasi";
          const cover = sim.photo || sim.photos?.[0] || FALLBACK_PHOTO;
          return `
          <article class="sim-card">
            <a href="detail.html?id=${sim.id}" class="sim-photo">
              <span class="sim-badge ${badgeClass}">${sim.jenis.toUpperCase()}</span>
<img src="${escHtml(cover)}" alt="${escHtml(sim.name)}" loading="lazy">            </a>
            <div class="sim-body">${escHtml(sim.lokasi || "-")}</div>
<div class="sim-title">${escHtml(sim.name)}</div>              <div class="sim-distance">📍 ${sim.jarak || 0} km — 
              <a href="detail.html?id=${sim.id}" class="sim-btn">Lihat Detail</a>
            </div>
          </article>
        `;
        })
        .join("");
    }
  } catch (err) {
    console.error("Gagal memuat barang serupa:", err);
    similarScroll.innerHTML = `<p style="color:var(--ink-soft,#7A8B85);">Belum ada barang serupa lainnya.</p>`;
  }

  // ---------- CTA butuh login ----------
  // isLoggedIn() ada di auth.js (dimuat sebelum file ini).
  function requireLogin(action) {
    if (isLoggedIn()) {
      action();
    } else {
      window.location.href = `login.html?redirect=detail.html?id=${item.id}`;
    }
  }

  // ---------- buka / buat conversation, lalu pindah ke chat.html ----------
  // Tabel "conversations" & "messages" dipakai bareng sama chat.js.
  async function openConversation(autoMessage = null) {
    const currentUser = getCurrentUser();

    if (item.user_id === currentUser.id) {
      alert("Ini barang sendiri kocak, ga bisa chat sama diri sendiri 🙂");
      return;
    }

    try {
      let conversationId = null;

      // cari conversation yang sudah ada buat kombinasi barang+pembeli+penjual ini
      const { data: existing, error: findError } = await supabaseClient
        .from("conversations")
        .select("id")
        .eq("item_id", item.id)
        .eq("buyer_id", currentUser.id)
        .eq("seller_id", item.user_id)
        .maybeSingle();

      if (findError) throw new Error(findError.message);

      if (existing) {
        conversationId = existing.id;
      } else {
        const { data: created, error: createError } = await supabaseClient
          .from("conversations")
          .insert({
            item_id: item.id,
            item_name: item.name,
            item_photo: item.photos?.[0] || null,
            buyer_id: currentUser.id,
            buyer_name:
              currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              getUserName(),
            buyer_avatar:
              currentUser.user_metadata?.avatar_url || FALLBACK_AVATAR,
            seller_id: item.user_id,
            seller_name: item.owner,
            seller_avatar: item.avatar,
          })
          .select("id")
          .single();

        if (createError) throw new Error(createError.message);
        conversationId = created.id;
      }

      if (autoMessage) {
        const { error: msgError } = await supabaseClient
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: autoMessage,
          });

        if (msgError) throw new Error(msgError.message);

        await supabaseClient
          .from("conversations")
          .update({
            last_message: autoMessage,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }

      window.location.href = `chat.html?id=${encodeURIComponent(conversationId)}`;
    } catch (err) {
      console.error("Gagal membuka chat:", err);
      alert("Gagal membuka chat: " + (err.message || err));
    }
  }

  // ---------- pilih barang yang ditawarkan (khusus Barter) ----------
  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML.replace(/"/g, "&quot;");
  }

  function injectOfferStyles() {
    if (document.getElementById("offerModalStyle")) return;
    const s = document.createElement("style");
    s.id = "offerModalStyle";
    s.textContent = `
      .offer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999;}
      .offer-card{background:#fff;border-radius:16px;width:100%;max-width:460px;max-height:85vh;display:flex;flex-direction:column;font-family:'DM Sans',sans-serif;}
      .offer-head{padding:18px 20px 6px;}
      .offer-head h3{margin:0 0 4px;font-size:1.05rem;}
      .offer-head p{margin:0;font-size:.82rem;color:#6b7a73;}
      .offer-list{overflow-y:auto;padding:10px 20px;display:flex;flex-direction:column;gap:8px;}
      .offer-opt{display:flex;align-items:center;gap:12px;padding:8px;border:2px solid #e3e8e5;border-radius:12px;cursor:pointer;background:#fff;text-align:left;font:inherit;}
      .offer-opt.selected{border-color:var(--sage,#4E8C6B);background:#f3f8f5;}
      .offer-opt img{width:52px;height:52px;object-fit:cover;border-radius:8px;flex:0 0 auto;}
      .offer-opt strong{display:block;font-size:.9rem;}
      .offer-opt span{font-size:.78rem;color:#6b7a73;}
      .offer-empty{margin:6px 0;font-size:.9rem;color:#6b7a73;}
      .offer-empty a{color:var(--sage,#4E8C6B);font-weight:700;}
      .offer-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 18px;}
      .offer-btn{padding:9px 18px;border-radius:999px;border:1px solid #d5ddd9;background:#fff;font:inherit;font-weight:700;cursor:pointer;}
      .offer-btn.primary{background:var(--sage,#4E8C6B);border-color:var(--sage,#4E8C6B);color:#fff;}
      .offer-btn:disabled{opacity:.5;cursor:not-allowed;}
    `;
    document.head.appendChild(s);
  }

  // Mengembalikan { id, name } barang yang dipilih, atau null kalau dibatalkan.
  async function pickOfferedItem(userId) {
    injectOfferStyles();

    const { data, error } = await supabaseClient
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "Aktif")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Gagal memuat barangmu: " + error.message);
      return null;
    }

    const mine = data || [];

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "offer-overlay";

      const listHtml = mine.length
        ? mine
            .map((it) => {
              const cover = it.photo || it.photos?.[0] || FALLBACK_PHOTO;
              return `
          <button type="button" class="offer-opt" data-id="${esc(it.id)}">
            <img src="${esc(cover)}" alt="">
            <div>
              <strong>${esc(it.name)}</strong>
              <span>Kondisi: ${esc(it.kondisi || "-")}</span>
            </div>
          </button>`;
            })
            .join("")
        : `<p class="offer-empty">Kamu belum punya barang aktif untuk ditawarkan.
             <a href="upload.html">Unggah barang dulu</a></p>`;

      overlay.innerHTML = `
        <div class="offer-card" role="dialog" aria-modal="true">
          <div class="offer-head">
            <h3>Pilih barang yang kamu tawarkan</h3>
            <p>Untuk barter "${esc(item.name)}". Barangmu dikunci kalau pemilik menerima.</p>
          </div>
          <div class="offer-list">${listHtml}</div>
          <div class="offer-actions">
            <button type="button" class="offer-btn" data-close>Batal</button>
            ${mine.length ? `<button type="button" class="offer-btn primary" data-submit disabled>Ajukan</button>` : ""}
          </div>
        </div>`;

      document.body.appendChild(overlay);

      let selected = null;
      const submitBtn = overlay.querySelector("[data-submit]");

      const close = (value) => {
        overlay.remove();
        resolve(value);
      };

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay || e.target.closest("[data-close]")) {
          close(null);
          return;
        }

        const opt = e.target.closest(".offer-opt");
        if (opt) {
          overlay
            .querySelectorAll(".offer-opt")
            .forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");
          selected = mine.find((m) => String(m.id) === opt.dataset.id) || null;
          if (submitBtn) submitBtn.disabled = !selected;
          return;
        }

        if (e.target.closest("[data-submit]") && selected) {
          close({ id: selected.id, name: selected.name });
        }
      });
    });
  }

  document.getElementById("btnAjukanBarter").addEventListener("click", () => {
    requireLogin(async () => {

    document.getElementById("btnAjukanBarter").addEventListener("click", () => {
    requireLogin(async () => {
      if (!requireAvatar()) return; // wajib foto profil dulu
      const me = getCurrentUser();

      if (item.user_id === me.id) {
        alert("Ini barang kamu sendiri.");
        return;
      }

      let offered = null;
      if (!isDonasi) {
        offered = await pickOfferedItem(me.id);
        if (!offered) return; // dibatalkan atau belum punya barang
      }

      btnPrimary.disabled = true;

      // Trigger di database yang ngisi buyer_id, seller_id, jenis, dan status.
      const payload = { item_id: item.id };
      if (offered) payload.offered_item_id = offered.id;

      const { error } = await supabaseClient
        .from("transactions")
        .insert(payload);

      btnPrimary.disabled = false;

      // 23505 = sudah punya pengajuan aktif untuk barang ini -> langsung buka chat lama
      if (error && error.code === "23505") {
        openConversation();
        return;
      }

      if (error) {
        alert("Gagal mengajukan: " + error.message);
        return;
      }

      openConversation(
        isDonasi
          ? `Halo, saya mau ambil barang "${item.name}". Boleh?`
          : `Halo, saya tertarik barter barang "${item.name}". Saya tawarkan "${offered.name}".`,
      );
    });
  });

  document.getElementById("btnHubungiPemilik").addEventListener("click", () => {
    requireLogin(() => {
      if (!requireAvatar()) return; // wajib foto profil dulu
      openConversation();
    });  });
})();
