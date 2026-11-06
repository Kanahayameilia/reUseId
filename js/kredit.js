// =========================================================
// Re:Use.ID - KUOTA & KREDIT TRANSAKSI (kredit.html)
// =========================================================
// supabaseClient: supabase-client.js. onAuthReady/isLoggedIn/getUserId/logout/
// escHtml: auth.js. Fungsi & tabel database:  .
//
// Harga dan nominal dihitung di DATABASE (fungsi credit_price() + trigger),
// halaman ini cuma menampilkannya. Ganti harga di SQL, bukan di sini.

(function () {
  const $ = (id) => document.getElementById(id);
  const PACKS = [1, 3, 5]; // pilihan jumlah kredit yang ditampilkan
  const MAX_PROOF = 3 * 1024 * 1024; // 3 MB, sama dengan batas bucket

  let price = 0;
  let qty = PACKS[0];
  let proofFile = null;

  const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

  function setMsg(text, kind) {
    const el = $("submitMsg");
    el.textContent = text || "";
    el.className = "kr-msg" + (kind ? " " + kind : "");
  }

  // tombol "Kembali" balik ke halaman asal (?redirect=...) kalau ada & satu situs
  function setupBackLink() {
    const redirect = new URLSearchParams(location.search).get("redirect");
    if (!redirect) return;
    try {
      const u = new URL(redirect, location.href);
      if (u.origin === location.origin) $("backLink").href = u.href;
    } catch {}
  }

  // ---------- kuota ----------
  async function loadQuota() {
    const { data, error } = await supabaseClient.rpc("my_tx_quota");
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      console.warn("Gagal memuat kuota:", error && error.message);
      $("quotaUsed").textContent = "?";
      $("creditBalance").textContent = "?";
      return;
    }
    const limit = row.batas_gratis;
    $("quotaUsed").textContent = `${Math.min(row.terpakai, limit)} / ${limit}`;
    $("creditBalance").textContent = row.kredit;
    const pct = Math.min(100, (row.terpakai / limit) * 100);
    const fill = $("meterFill");
    fill.style.width = pct + "%";
    fill.classList.toggle("full", row.terpakai >= limit);
  }

  // ---------- paket ----------
  function renderPacks() {
    $("packs").innerHTML = PACKS.map(
      (n) => `
      <label class="kr-pack">
        <input type="radio" name="pack" value="${n}" ${n === qty ? "checked" : ""}>
        <b>${n} kredit</b>
        <span>${rupiah(n * price)}</span>
      </label>`,
    ).join("");
    $("packs").addEventListener("change", (e) => {
      if (e.target.name !== "pack") return;
      qty = Number(e.target.value);
      updateTotal();
    });
    updateTotal();
  }

  function updateTotal() {
    $("totalText").textContent = rupiah(qty * price);
  }

  // ---------- bukti ----------
  function onProofPicked(file) {
    proofFile = null;
    $("proofPreview").hidden = true;
    $("proofHint").hidden = false;
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setMsg("Format harus JPG, PNG, atau WebP.", "err");
      return;
    }
    if (file.size > MAX_PROOF) {
      setMsg("Ukuran file maksimal 3 MB.", "err");
      return;
    }
    setMsg("");
    proofFile = file;
    const img = $("proofPreview");
    img.src = URL.createObjectURL(file);
    img.hidden = false;
    $("proofHint").hidden = true;
  }

  async function submitOrder() {
    setMsg("");
    if (!proofFile) {
      setMsg("Upload dulu screenshot bukti pembayarannya.", "err");
      return;
    }
    const uid = getUserId();
    const btn = $("btnSubmit");
    btn.disabled = true;
    btn.textContent = "Mengirim…";

    const ext =
      proofFile.type === "image/png"
        ? "png"
        : proofFile.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabaseClient.storage
      .from("payment-proofs")
      .upload(path, proofFile);
    if (upErr) {
      setMsg("Gagal upload bukti: " + upErr.message, "err");
      btn.disabled = false;
      btn.textContent = "Kirim bukti pembayaran";
      return;
    }

    // amount diisi ulang oleh trigger di database (qty x harga)
    const { error } = await supabaseClient
      .from("credit_orders")
      .insert({ qty, amount: qty * price, proof_path: path });

    if (error) {
      // bukti yang sudah terlanjur ke-upload dibersihkan lagi
      await supabaseClient.storage.from("payment-proofs").remove([path]);
      setMsg("Gagal mengirim pesanan: " + error.message, "err");
      btn.disabled = false;
      btn.textContent = "Kirim bukti pembayaran";
      return;
    }

    proofFile = null;
    $("proofInput").value = "";
    $("proofPreview").hidden = true;
    $("proofHint").hidden = false;
    setMsg(
      "Bukti terkirim. Admin akan mengecek dan menambahkan kreditmu.",
      "ok",
    );
    btn.disabled = false;
    btn.textContent = "Kirim bukti pembayaran";
    loadOrders();
  }

  // ---------- riwayat ----------
  const STATUS_TEXT = {
    menunggu: "Menunggu dicek",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  };

  function fmtDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function loadOrders() {
    const { data, error } = await supabaseClient
      .from("credit_orders")
      .select("id, qty, amount, status, note, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const box = $("orderList");
    if (error) {
      box.innerHTML = `<div class="kr-small">Gagal memuat pesanan: ${escHtml(error.message)}</div>`;
      return;
    }
    if (!data.length) {
      box.innerHTML = `<div class="kr-small">Belum ada pesanan.</div>`;
      return;
    }
    box.innerHTML = data
      .map(
        (o) => `
      <div class="kr-order">
        <div>
          <b>${o.qty} kredit · ${rupiah(o.amount)}</b>
          <div class="kr-small">${fmtDateTime(o.created_at)}</div>
          ${o.note ? `<div class="kr-small">Catatan admin: ${escHtml(o.note)}</div>` : ""}
        </div>
        <span class="kr-chip ${escHtml(o.status)}">${escHtml(STATUS_TEXT[o.status] || o.status)}</span>
      </div>`,
      )
      .join("");
  }

  // ---------- mulai ----------
  onAuthReady(async () => {
    if (!isLoggedIn()) {
      window.location.href = "login.html?redirect=kredit.html";
      return;
    }

    setupBackLink();
    $("logoutBtn").addEventListener("click", logout);
    $("proofInput").addEventListener("change", (e) =>
      onProofPicked(e.target.files[0]),
    );
    $("btnSubmit").addEventListener("click", submitOrder);

    const { data: p, error } = await supabaseClient.rpc("credit_price");
    if (error || !p) {
      setMsg(
        "Fitur kredit belum aktif. Jalankan   dulu.",
        "err",
      );
      $("btnSubmit").disabled = true;
      return;
    }
    price = Number(p);
    renderPacks();
    loadQuota();
    loadOrders();
  });
})();
