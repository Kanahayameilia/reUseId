// supabaseClient ada di supabase-client.js, isLoggedIn() ada di auth.js,
// getUserLocation()/computeItemDistance() ada di geo.js (semuanya dimuat sebelum file ini).
// item_data.js masih dimuat buat kompatibilitas lama, tapi ITEMS sudah dikosongkan —
// halaman ini sekarang murni ambil data dari tabel "items" di Supabase.

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=900&fit=crop";
const FALLBACK_AVATAR = "https://i.pravatar.cc/80?img=47";

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
  document.getElementById("ownerRating").innerHTML =
    `⭐ ${item.rating}/5 &nbsp;·&nbsp; Member sejak ${item.memberSince}`;

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
    btnPrimary.hidden = true;
    btnSecondary.classList.remove("btn-outline");
    btnSecondary.classList.add("btn-filled");
  }

  // ---------- gallery ----------
  const mainPhoto = document.getElementById("mainPhoto");
  const thumbRow = document.getElementById("thumbRow");

  mainPhoto.src = item.photos[0];
  mainPhoto.alt = item.name;

  thumbRow.innerHTML = item.photos
    .map(
      (src, i) => `
    <button class="thumb ${i === 0 ? "active" : ""}" data-src="${src}">
      <img src="${src}" alt="${item.name} — foto ${i + 1}">
    </button>
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
              <img src="${cover}" alt="${sim.name}" loading="lazy">
            </a>
            <div class="sim-body">
              <div class="sim-title">${sim.name}</div>
              <div class="sim-distance">📍 ${sim.jarak || 0} km — ${sim.lokasi || "-"}</div>
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

  document.getElementById("btnAjukanBarter").addEventListener("click", () => {
    requireLogin(() =>
      openConversation(
        `Halo, saya tertarik untuk barter barang "${item.name}".`,
      ),
    );
  });
  document.getElementById("btnHubungiPemilik").addEventListener("click", () => {
    requireLogin(() => openConversation());
  });
})();
