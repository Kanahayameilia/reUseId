// =========================================================
// Re:Use.ID - HALAMAN ADMIN: Pengguna, Listing Barang, Transaksi, Pengaturan
// =========================================================
// Dimuat SETELAH admin.js (pakai esc, fmtDate, fmtNum, FALLBACK_AVATAR, STATUS_LABEL,
// STATUS_CLASS dari sana). admin.js memanggil window.loadAdminPage(page)
// setiap menu di sidebar diklik.
//
// Pengguna  -> fungsi database admin_users()   (bagian5_admin_pages.sql)
// Listing   -> tabel items (hapus butuh policy items_admin_delete, bagian5)
// Transaksi -> fungsi database admin_transactions() (sudah ada di bagian3)

(function () {
  const $ = (id) => document.getElementById(id);
  const FALLBACK_PHOTO = "assets/item-default.svg";

  function emptyRow(cols, msg) {
    return `<tr><td colspan="${cols}" style="padding:24px;color:#7a8b85">${msg}</td></tr>`;
  }
  function errRow(cols, what, err) {
    console.error(what, err);
    return emptyRow(cols, `Gagal memuat ${what}: ${esc(err.message)}`);
  }
  const norm = (s) => String(s ?? "").toLowerCase();

  // ---------------- PENGGUNA ----------------
  let users = [];

  function renderUsers() {
    const q = norm($("userSearch").value.trim());
    const rows = users.filter(
      (u) =>
        !q || [u.full_name, u.email, u.campus].some((v) => norm(v).includes(q)),
    );
    $("userTableBody").innerHTML = rows.length
      ? rows
          .map(
            (u) => `
      <tr>
        <td><div class="pg-cell">
          <img class="av" src="${esc(u.avatar_url || FALLBACK_AVATAR)}" alt="">
          <span>${esc(u.full_name || "Tanpa nama")}<span class="pg-sub">${esc(u.email || "")}</span></span>
        </div></td>
        <td>${esc(u.campus || "-")}</td>
        <td>${fmtNum(u.item_count)}</td>
        <td>${fmtDate(u.created_at)}</td>
        <td>${u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "-"}</td>
        <td><a class="pg-link" href="user.html?id=${encodeURIComponent(u.id)}" target="_blank" rel="noopener">Lihat profil ↗</a></td>
      </tr>`,
          )
          .join("")
      : emptyRow(6, "Tidak ada pengguna yang cocok");
    $("userInfo").textContent = `${rows.length} dari ${users.length} pengguna`;
  }

  async function loadUsers() {
    $("userTableBody").innerHTML = emptyRow(6, "Memuat…");
    const { data, error } = await supabaseClient.rpc("admin_users");
    if (error) {
      $("userTableBody").innerHTML =
        errRow(6, "pengguna", error) +
        emptyRow(
          6,
          "Pastikan <b>bagian5_admin_pages.sql</b> sudah dijalankan.",
        );
      return;
    }
    users = data || [];
    renderUsers();
  }

  // ---------------- LISTING BARANG ----------------
  let items = [];

  function renderItems() {
    const q = norm($("itemSearch").value.trim());
    const st = $("itemStatusFilter").value;
    const rows = items.filter(
      (it) =>
        (st === "Semua" || it.status === st) &&
        (!q ||
          [it.name, it.owner, it.kategori, it.lokasi].some((v) =>
            norm(v).includes(q),
          )),
    );
    $("itemTableBody").innerHTML = rows.length
      ? rows
          .map((it) => {
            const cover = it.photo || it.photos?.[0] || FALLBACK_PHOTO;
            const jenisClass = it.jenis === "Barter" ? "barter" : "donasi";
            const st = norm(it.status) === "aktif" ? "aktif" : "diproses";
            return `
      <tr>
        <td><div class="pg-cell">
          <img class="pg-thumb" src="${esc(cover)}" alt="">
          <span>${esc(it.name)}<span class="pg-sub">${esc(it.kategori || "-")} · ${esc(it.lokasi || "-")}</span></span>
        </div></td>
        <td>${esc(it.owner || "-")}</td>
        <td><span class="tx-badge ${jenisClass}">${esc(it.jenis || "-")}</span></td>
        <td><span class="tx-status ${st}">${esc(it.status || "-")}</span></td>
        <td>${fmtDate(it.created_at)}</td>
        <td>
          <a class="pg-link" href="detail.html?id=${encodeURIComponent(it.id)}" target="_blank" rel="noopener">Buka ↗</a>
          &nbsp;<button type="button" class="pg-del" data-del="${esc(it.id)}">Hapus</button>
        </td>
      </tr>`;
          })
          .join("")
      : emptyRow(6, "Tidak ada barang yang cocok");
    $("itemInfo").textContent = `${rows.length} dari ${items.length} barang`;
  }

  async function loadItems() {
    $("itemTableBody").innerHTML = emptyRow(6, "Memuat…");
    const { data, error } = await supabaseClient
      .from("items")
      .select(
        "id,name,jenis,kategori,status,owner,user_id,lokasi,created_at,photo,photos",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      $("itemTableBody").innerHTML = errRow(6, "listing barang", error);
      return;
    }
    items = data || [];
    // isi pilihan status dari data yang ada, jadi nggak perlu nebak nilai statusnya
    const sel = $("itemStatusFilter");
    const cur = sel.value;
    sel.innerHTML =
      `<option value="Semua">Semua Status</option>` +
      [...new Set(items.map((i) => i.status).filter(Boolean))]
        .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
        .join("");
    sel.value = [...sel.options].some((o) => o.value === cur) ? cur : "Semua";
    renderItems();
  }

  async function deleteItem(id, btn) {
    const it = items.find((x) => String(x.id) === String(id));
    if (!it) return;
    if (
      !confirm(
        `Hapus listing "${it.name}"?\nIni permanen dan tidak bisa dibatalkan.`,
      )
    )
      return;
    btn.disabled = true;
    const { data, error } = await supabaseClient
      .from("items")
      .delete()
      .eq("id", it.id)
      .select("id");
    if (error || !data || !data.length) {
      btn.disabled = false;
      alert(
        "Gagal menghapus: " +
          (error
            ? error.message
            : "tidak ada baris yang terhapus (cek policy items_admin_delete di bagian5_admin_pages.sql)"),
      );
      return;
    }
    items = items.filter((x) => String(x.id) !== String(id));
    renderItems();
  }

  // ---------------- TRANSAKSI ----------------
  let txAll = [];

  function renderTx() {
    const q = norm($("txSearch").value.trim());
    const st = $("txPageStatus").value;
    const rows = txAll.filter(
      (t) =>
        (st === "Semua" || t.status === st) &&
        (!q ||
          [t.buyer_name, t.seller_name, t.item_name].some((v) =>
            norm(v).includes(q),
          )),
    );
    $("txPageBody").innerHTML = rows.length
      ? rows
          .map((t) => {
            const jenisClass = t.jenis === "Barter" ? "barter" : "donasi";
            const cls = STATUS_CLASS[t.status] || t.status;
            return `
      <tr>
        <td>${fmtDate(t.created_at)}</td>
        <td><div class="pg-cell">
          <img class="av" src="${esc(t.buyer_avatar || FALLBACK_AVATAR)}" alt="">
          <span>${esc(t.buyer_name)}<span class="pg-sub">ke ${esc(t.seller_name)}</span></span>
        </div></td>
        <td>${esc(t.item_name || "Barang sudah dihapus")}</td>
        <td><span class="tx-badge ${jenisClass}">${esc(t.jenis)}</span></td>
        <td><span class="tx-status ${esc(cls)}">${esc(STATUS_LABEL[t.status] || t.status)}</span></td>
      </tr>`;
          })
          .join("")
      : emptyRow(5, "Tidak ada transaksi yang cocok");
    $("txPageInfo").textContent =
      `${rows.length} dari ${txAll.length} transaksi`;
  }

  async function loadTx() {
    $("txPageBody").innerHTML = emptyRow(5, "Memuat…");
    const { data, error } = await supabaseClient.rpc("admin_transactions");
    if (error) {
      $("txPageBody").innerHTML = errRow(5, "transaksi", error);
      return;
    }
    txAll = data || [];
    renderTx();
  }

  // ---------------- PENGATURAN ----------------
  function renderSettings() {
    const u = getCurrentUser();
    const m = u?.user_metadata || {};
    $("setName").textContent = m.full_name || m.name || "-";
    $("setEmail").textContent = u?.email || "-";
    $("setCampus").textContent = m.campus || "-";
    $("setId").textContent = u?.id || "-";
    loadAdmins();
  }

  // ---------------- KELOLA ADMIN ----------------
  // fungsi database: admin_list_admins / admin_add_admin / admin_remove_admin (bagian6)
  function adminMsg(text, ok) {
    const el = $("adminMsg");
    el.textContent = text || "";
    el.classList.toggle("ok", !!ok);
  }

  async function loadAdmins() {
    const box = $("adminList");
    box.innerHTML = `<p class="pg-sub">Memuat…</p>`;
    const { data, error } = await supabaseClient.rpc("admin_list_admins");
    if (error) {
      console.error("admin_list_admins gagal:", error);
      box.innerHTML = `<p class="pg-msg">Gagal memuat admin: ${esc(error.message)}<br>Pastikan <b>bagian6_kelola_admin.sql</b> sudah dijalankan.</p>`;
      return;
    }
    const me = getUserId();
    box.innerHTML = (data || [])
      .map(
        (a) => `
      <div class="pg-admin">
        <img src="${esc(a.avatar_url || FALLBACK_AVATAR)}" alt="">
        <div class="who">${esc(a.full_name || "Tanpa nama")}<small>${esc(a.email || a.user_id)}</small></div>
        ${
          a.user_id === me
            ? `<span class="pg-you">Kamu</span>`
            : `<button type="button" class="pg-del" data-rm="${esc(a.user_id)}" data-name="${esc(a.email || a.full_name || "")}">Cabut</button>`
        }
      </div>`,
      )
      .join("");
  }

  async function addAdmin() {
    const email = $("newAdminEmail").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      adminMsg("Masukkan email yang valid.");
      return;
    }
    const btn = $("btnAddAdmin");
    btn.disabled = true;
    adminMsg("");
    const { error } = await supabaseClient.rpc("admin_add_admin", {
      p_email: email,
    });
    btn.disabled = false;
    if (error) {
      adminMsg(error.message);
      return;
    }
    $("newAdminEmail").value = "";
    adminMsg(email + " sekarang admin.", true);
    loadAdmins();
  }

  async function removeAdmin(userId, name, btn) {
    if (!confirm(`Cabut akses admin dari ${name || "pengguna ini"}?`)) return;
    btn.disabled = true;
    adminMsg("");
    const { error } = await supabaseClient.rpc("admin_remove_admin", {
      p_user_id: userId,
    });
    if (error) {
      btn.disabled = false;
      adminMsg(error.message);
      return;
    }
    adminMsg("Akses admin dicabut.", true);
    loadAdmins();
  }

  // ---------------- pasang listener ----------------
  $("userSearch").addEventListener("input", renderUsers);
  $("itemSearch").addEventListener("input", renderItems);
  $("itemStatusFilter").addEventListener("change", renderItems);
  $("itemTableBody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (b) deleteItem(b.dataset.del, b);
  });
  $("txSearch").addEventListener("input", renderTx);
  $("txPageStatus").addEventListener("change", renderTx);
  $("setLogout").addEventListener("click", logout);
  $("btnAddAdmin").addEventListener("click", addAdmin);
  $("newAdminEmail").addEventListener(
    "keydown",
    (e) => e.key === "Enter" && addAdmin(),
  );
  $("adminList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (b) removeAdmin(b.dataset.rm, b.dataset.name, b);
  });
  $("setReload").addEventListener("click", () => window.location.reload());

  // dipanggil admin.js tiap pindah menu
  window.loadAdminPage = function (page) {
    if (page === "pengguna") loadUsers();
    else if (page === "listing") loadItems();
    else if (page === "transaksi") loadTx();
    else if (page === "pengaturan") renderSettings();
  };
})();
