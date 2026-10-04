// supabaseClient ada di supabase-client.js; onAuthReady/isLoggedIn/getUserId/escHtml ada di auth.js.

const FALLBACK_AVATAR = "assets/avatar-default.svg";
const FALLBACK_PHOTO = "assets/item-default.svg";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stars(n) {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return "★".repeat(r) + "☆".repeat(5 - r);
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

(async function () {
  const uid = new URLSearchParams(window.location.search).get("id");
  const nameEl = document.getElementById("phName");
  const activeGrid = document.getElementById("activeGrid");
  const reviewList = document.getElementById("reviewList");

  // ---------- datang dari chat? tombol kembali balik ke percakapan tadi ----------
  const qs = new URLSearchParams(window.location.search);
  const fromConv = qs.get("conv");
  if (qs.get("from") === "chat" && fromConv && UUID_RE.test(fromConv)) {
    const back = document.querySelector(".back-link");
    if (back) {
      back.href = `chat.html?id=${encodeURIComponent(fromConv)}`;
      back.lastChild.textContent = " Kembali ke Pesan";
    }
  }

  // ---------- tab ----------
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

  if (!uid || !UUID_RE.test(uid)) {
    nameEl.textContent = "Profil tidak ditemukan";
    activeGrid.innerHTML = `<p>Link profil tidak valid.</p>`;
    return;
  }

  // kalau ini profil kita sendiri, arahkan ke halaman profil lengkap
  onAuthReady(() => {
    if (isLoggedIn() && getUserId() === uid) {
      window.location.replace("profile.html");
    }
  });

  // ---------- ambil data ----------
  const [profRes, itemsRes, revRes] = await Promise.all([
    supabaseClient.rpc("get_public_profile", { p_user_id: uid }),
    supabaseClient
      .from("items")
      .select("*")
      .eq("user_id", uid)
      .eq("status", "Aktif")
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("reviews")
      .select("*")
      .eq("reviewee_id", uid)
      .order("created_at", { ascending: false }),
  ]);

  const prof = profRes.error ? null : profRes.data;
  const items = itemsRes.error ? [] : itemsRes.data || [];
  const reviews = revRes.error ? [] : revRes.data || [];
  const firstItem = items[0] || null;

  // ---------- header ----------
  const name = prof?.full_name || firstItem?.owner || "Pengguna Re:Use.ID";
  const avatar = prof?.avatar_url || firstItem?.avatar || FALLBACK_AVATAR;
  const campus = prof?.campus || "";
  const sinceYear = prof?.created_at
    ? new Date(prof.created_at).getFullYear()
    : firstItem?.member_since || "";

  document.title = `${name} | Re:Use.ID`;
  nameEl.textContent = name;
  document.getElementById("phAvatar").src = avatar;
  document.getElementById("phCampus").textContent = campus
    ? `🎓 Mahasiswa — ${campus}`
    : "🎓 Mahasiswa";
  document.getElementById("phSince").textContent = sinceYear
    ? `Member sejak ${sinceYear}`
    : "";

  // ---------- statistik ----------
  document.getElementById("statActive").textContent = String(items.length);
  document.getElementById("statReviews").textContent = String(reviews.length);
  document.getElementById("statRating").textContent = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "–";

  // ---------- barang aktif ----------
  if (itemsRes.error) {
    activeGrid.innerHTML = `<p>Gagal memuat barang: ${escHtml(itemsRes.error.message)}</p>`;
  } else if (items.length === 0) {
    activeGrid.innerHTML = `<p>Pengguna ini belum punya barang aktif.</p>`;
  } else {
    activeGrid.innerHTML = items
      .map((item) => {
        const badgeClass = item.jenis === "Barter" ? "barter" : "donasi";
        const cover = item.photo || item.photos?.[0] || FALLBACK_PHOTO;
        const href = `detail.html?id=${encodeURIComponent(item.id)}`;
        return `
        <article class="item-card">
          <a href="${href}" class="ic-photo" style="display:block;">
            <span class="ic-badge ${badgeClass}">${escHtml((item.jenis || "").toUpperCase())}</span>
            <img src="${escHtml(cover)}" alt="${escHtml(item.name)}" loading="lazy">
          </a>
          <div class="ic-body">
            <div class="ic-title">${escHtml(item.name)}</div>
            <span class="ic-status">📍 ${escHtml(item.lokasi || "-")}</span>
          </div>
        </article>`;
      })
      .join("");
  }

  // ---------- ulasan ----------
  if (revRes.error) {
    reviewList.innerHTML = `<p>Gagal memuat ulasan: ${escHtml(revRes.error.message)}</p>`;
  } else if (reviews.length === 0) {
    reviewList.innerHTML = `<p>Belum ada ulasan.</p>`;
  } else {
    reviewList.innerHTML = reviews
      .map(
        (r) => `
      <article class="review-card">
        <div class="review-top">
          <img class="review-avatar" src="${escHtml(r.reviewer_avatar || FALLBACK_AVATAR)}" alt="">
          <div>
            <div class="review-name">${escHtml(r.reviewer_name || "Pengguna Re:Use.ID")}</div>
            <div class="review-stars">${stars(r.rating)}</div>
          </div>
          <div class="review-date">${escHtml(fmtDate(r.created_at))}</div>
        </div>
        ${r.comment ? `<div class="review-text">${escHtml(r.comment)}</div>` : ""}
      </article>`,
      )
      .join("");
  }
})();
