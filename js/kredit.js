// =========================================================
// Re:Use.ID - KUOTA, KREDIT & LANGGANAN TRANSAKSI (kredit.html)
// =========================================================
// supabaseClient: supabase-client.js. onAuthReady/isLoggedIn/getUserId/logout/
// escHtml: auth.js. Fungsi & tabel database: migrasi SQL bagian 6 dan 7.
//
// Harga dan nominal dihitung di DATABASE (credit_price(), sub_price() + trigger),
// halaman ini cuma menampilkannya. Ganti harga di SQL, bukan di sini.

(function () {
  const $ = (id) => document.getElementById(id);

  // pilihan yang ditampilkan: kind 'kredit' (qty = jumlah kredit)
  // atau 'langganan' (qty = jumlah bulan)
  const PACKS = [
    { kind: "kredit", qty: 1 },
    { kind: "kredit", qty: 3 },
    { kind: "kredit", qty: 5 },
    { kind: "langganan", qty: 1 },
    { kind: "langganan", qty: 3 },
  ];
  const MAX_PROOF = 3 * 1024 * 1024; // 3 MB, sama dengan batas bucket

  const price = { kredit: 0, langganan: 0 }; // harga satuan dari database
  let selected = { kind: "kredit", qty: 1 };
  let proofFile = null;

  const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
  const packKey = (p) => `${p.kind}:${p.qty}`;
  const packTotal = (p) => p.qty * price[p.kind];
  const packLabel = (p) =>
    p.kind === "langganan" ? `Langganan ${p.qty} bulan` : `${p.qty} kredit`;

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

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

    // pil status: Langganan / Kredit / Gratis
    const pill = $("planPill");
    const sisa = Math.max(0, limit - row.terpakai);
    let tier, text;
    if (row.langganan_sampai) [tier, text] = ["langganan", "Langganan"];
    else if (row.kredit > 0) [tier, text] = ["kredit", "Pengguna kredit"];
    else if (sisa === 0) [tier, text] = ["habis", "Gratis · habis"];
    else [tier, text] = ["gratis", "Pengguna gratis"];
    pill.textContent = text;
    pill.className = "kr-chip " + tier;
    pill.hidden = false;

    // langganan aktif -> pengajuan unlimited sampai tanggal ini
    const sub = $("subInfo");
    if (row.langganan_sampai) {
      sub.textContent = `Langganan aktif sampai ${fmtDate(row.langganan_sampai)}. Pengajuan tidak terbatas selama masa aktif.`;
      sub.hidden = false;
      fill.classList.remove("full");
    } else {
      sub.hidden = true;
    }
  }

  // ---------- paket ----------
  function packHtml(p) {
    const sub =
      p.kind === "langganan"
        ? `${rupiah(packTotal(p))} · unlimited`
        : rupiah(packTotal(p));
    return `
      <label class="kr-pack">
        <input type="radio" name="pack" value="${packKey(p)}" ${packKey(p) === packKey(selected) ? "checked" : ""}>
        <b>${packLabel(p)}</b>
        <span>${sub}</span>
      </label>`;
  }

  function renderPacks() {
    const kredit = PACKS.filter((p) => p.kind === "kredit");
    const langganan = price.langganan
      ? PACKS.filter((p) => p.kind === "langganan")
      : []; // migrasi langganan belum dijalankan -> sembunyikan
    $("packs").innerHTML =
      `<div class="kr-group">Kredit <small>(Rp ${price.kredit.toLocaleString("id-ID")} per pengajuan, tidak hangus)</small></div>
       <div class="kr-packs">${kredit.map(packHtml).join("")}</div>` +
      (langganan.length
        ? `<div class="kr-group">Langganan <small>(pengajuan tidak terbatas selama aktif)</small></div>
           <div class="kr-packs">${langganan.map(packHtml).join("")}</div>`
        : "");
    $("packs").onchange = (e) => {
      if (e.target.name !== "pack") return;
      const [kind, qty] = e.target.value.split(":");
      selected = { kind, qty: Number(qty) };
      updateTotal();
    };
    updateTotal();
  }

  function updateTotal() {
    $("totalText").textContent = rupiah(packTotal(selected));
    $("totalFor").textContent = packLabel(selected);
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

    // amount diisi ulang oleh trigger di database (jumlah x harga satuan)
    const { error } = await supabaseClient.from("credit_orders").insert({
      kind: selected.kind,
      qty: selected.qty,
      amount: packTotal(selected),
      proof_path: path,
    });

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
      "Bukti terkirim. Admin akan mengecek dan mengaktifkan pesananmu.",
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
    // kolom kind baru ada setelah migrasi langganan; kalau belum, ambil tanpa kind
    let res = await supabaseClient
      .from("credit_orders")
      .select("id, kind, qty, amount, status, note, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (res.error) {
      res = await supabaseClient
        .from("credit_orders")
        .select("id, qty, amount, status, note, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
    }
    const { data, error } = res;

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
          <b>${escHtml(packLabel({ kind: o.kind || "kredit", qty: o.qty }))} · ${rupiah(o.amount)}</b>
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
        "Fitur kredit belum aktif. Jalankan dulu SQL kredit di Supabase.",
        "err",
      );
      $("btnSubmit").disabled = true;
      return;
    }
    price.kredit = Number(p);

    // harga langganan ada setelah migrasi langganan; kalau belum, paketnya disembunyikan
    const { data: sp, error: spErr } = await supabaseClient.rpc("sub_price");
    price.langganan = !spErr && sp ? Number(sp) : 0;

    renderPacks();
    loadQuota();
    loadOrders();
  });
})();
