// =========================================================
// Re:Use.ID - HALAMAN ADMIN: Kredit & Pembayaran (QRIS manual)
// =========================================================
// Dimuat SETELAH admin-pages.js (pakai esc, fmtDate, fmtNum dari admin.js).
// Data dari fungsi database (migrasi SQL bagian 6, 7, 8):
//   admin_credit_orders(), admin_review_credit_order(), admin_user_plans().
// Semuanya menolak non-admin, jadi yang menjaga data tetap database,
// bukan halaman ini.

(function () {
  const $ = (id) => document.getElementById(id);
  const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
  const norm = (s) => String(s ?? "").toLowerCase();
  const STATUS_TEXT = {
    menunggu: "Menunggu dicek",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  };

  let orders = [];
  let plans = [];
  let plansOk = false;

  // 'kind' baru ada setelah migrasi langganan; pesanan lama dianggap kredit
  const paket = (o) =>
    o.kind === "langganan"
      ? `Langganan ${fmtNum(o.qty)} bulan`
      : `${fmtNum(o.qty)} kredit`;

  // "2026-11" untuk zona WIB, dipakai menghitung pendapatan bulan ini
  const bulanWIB = (d) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date(d));
    const get = (t) => parts.find((p) => p.type === t).value;
    return `${get("year")}-${get("month")}`;
  };

  function updateBadge() {
    const n = orders.filter((o) => o.status === "menunggu").length;
    const el = $("kreditNavBadge");
    el.textContent = n > 99 ? "99+" : String(n);
    el.hidden = n === 0;
  }

  // ---------- ringkasan ----------
  function renderKpi() {
    const count = (p) => plans.filter((u) => u.plan === p).length;
    $("kpiGratis").textContent = plansOk ? fmtNum(count("gratis")) : "-";
    $("kpiKredit").textContent = plansOk ? fmtNum(count("kredit")) : "-";
    $("kpiLangganan").textContent = plansOk ? fmtNum(count("langganan")) : "-";

    const now = bulanWIB(Date.now());
    const bulanIni = orders.filter(
      (o) =>
        o.status === "disetujui" &&
        o.reviewed_at &&
        bulanWIB(o.reviewed_at) === now,
    );
    const total = bulanIni.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    $("kpiPendapatan").textContent = rupiah(total);
    $("kpiPendapatanNote").textContent = `${bulanIni.length} pesanan disetujui`;
  }

  // ---------- pesanan ----------
  function renderOrders() {
    const f = $("kreditStatusFilter").value;
    const rows = orders.filter((o) => f === "Semua" || o.status === f);

    $("kreditTableBody").innerHTML = rows.length
      ? rows
          .map(
            (o) => `
      <tr>
        <td>${fmtDate(o.created_at)}</td>
        <td>${esc(o.full_name || "Tanpa nama")}<span class="rp-sub-cell">${esc(o.email || "")}</span></td>
        <td>${esc(paket(o))}</td>
        <td><b>${rupiah(o.amount)}</b></td>
        <td><button type="button" class="pg-btn" data-proof="${esc(o.proof_path)}">Lihat bukti</button></td>
        <td>
          <span class="tx-status ${esc(o.status)}">${esc(STATUS_TEXT[o.status] || o.status)}</span>
          ${o.note ? `<span class="rp-sub-cell">${esc(o.note)}</span>` : ""}
        </td>
        <td>
          ${
            o.status === "menunggu"
              ? `<button type="button" class="pg-btn primary" data-ok="${esc(o.id)}">Setujui</button>
                 <button type="button" class="pg-btn" data-no="${esc(o.id)}">Tolak</button>`
              : "-"
          }
        </td>
      </tr>`,
          )
          .join("")
      : `<tr><td colspan="7" style="padding:24px;color:#7a8b85">${
          orders.length
            ? "Tidak ada pesanan dengan filter ini"
            : "Belum ada pesanan"
        }</td></tr>`;

    $("kreditInfo").textContent =
      `${rows.length} dari ${orders.length} pesanan`;
  }

  // ---------- pengguna & paket ----------
  function planLabel(u) {
    if (u.plan === "langganan")
      return `Langganan · s.d. ${fmtDate(u.langganan_sampai)}`;
    if (u.plan === "kredit") return `Kredit · ${fmtNum(u.kredit)}`;
    return "Gratis";
  }

  function renderPlans() {
    const body = $("planTableBody");
    if (!plansOk) {
      body.innerHTML = `<tr><td colspan="5" style="padding:24px;color:#7a8b85">Gagal memuat data paket. Pastikan migrasi SQL bagian 8 sudah dijalankan.</td></tr>`;
      $("planInfo").textContent = "";
      return;
    }
    const f = $("planFilter").value;
    const q = norm($("planSearch").value.trim());
    const rows = plans.filter(
      (u) =>
        (f === "Semua" || u.plan === f) &&
        (!q || [u.full_name, u.email].some((v) => norm(v).includes(q))),
    );
    body.innerHTML = rows.length
      ? rows
          .map(
            (u) => `
      <tr>
        <td>${esc(u.full_name || "Tanpa nama")}<span class="rp-sub-cell">${esc(u.email || "")}</span></td>
        <td><span class="tx-status ${esc(u.plan)}">${esc(planLabel(u))}</span></td>
        <td>${fmtNum(u.terpakai_bulan_ini)}</td>
        <td>${Number(u.total_bayar) ? rupiah(u.total_bayar) : "-"}</td>
        <td>${u.terakhir_bayar ? fmtDate(u.terakhir_bayar) : "-"}</td>
      </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="padding:24px;color:#7a8b85">Tidak ada pengguna yang cocok</td></tr>`;
    $("planInfo").textContent = `${rows.length} dari ${plans.length} pengguna`;
  }

  async function load() {
    $("kreditTableBody").innerHTML =
      `<tr><td colspan="7" style="padding:24px;color:#7a8b85">Memuat…</td></tr>`;
    $("planTableBody").innerHTML =
      `<tr><td colspan="5" style="padding:24px;color:#7a8b85">Memuat…</td></tr>`;

    const [o, p] = await Promise.all([
      supabaseClient.rpc("admin_credit_orders"),
      supabaseClient.rpc("admin_user_plans"),
    ]);

    if (o.error) {
      $("kreditTableBody").innerHTML =
        `<tr><td colspan="7" style="padding:24px;color:#7a8b85">Gagal memuat pesanan: ${esc(o.error.message)}<br>Pastikan migrasi SQL kredit &amp; langganan sudah dijalankan.</td></tr>`;
    } else {
      orders = o.data || [];
      updateBadge();
      renderOrders();
    }

    plansOk = !p.error;
    plans = p.data || [];
    if (p.error) console.warn("admin_user_plans:", p.error.message);
    renderPlans();
    renderKpi();
  }

  // ---------- lihat bukti (bucket privat -> link bertanda tangan 5 menit) ----------
  async function showProof(path, btn) {
    btn.disabled = true;
    const { data, error } = await supabaseClient.storage
      .from("payment-proofs")
      .createSignedUrl(path, 300);
    btn.disabled = false;
    if (error) {
      alert("Gagal membuka bukti: " + error.message);
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "kr-lightbox";
    overlay.innerHTML = `<img src="${esc(data.signedUrl)}" alt="Bukti pembayaran">`;
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  // ---------- setujui / tolak ----------
  async function review(id, approve, btn) {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    let note = null;
    if (approve) {
      if (
        !confirm(
          `Setujui ${paket(o)} untuk ${o.full_name || o.email}?\n` +
            `Pastikan uang ${rupiah(o.amount)} sudah masuk.`,
        )
      )
        return;
    } else {
      note = prompt("Alasan penolakan (boleh dikosongkan):");
      if (note === null) return; // dibatalkan
    }
    btn.disabled = true;
    const { error } = await supabaseClient.rpc("admin_review_credit_order", {
      p_order_id: id,
      p_approve: approve,
      p_note: note,
    });
    if (error) {
      btn.disabled = false;
      alert(error.message);
      return;
    }
    load();
  }

  $("kreditStatusFilter").addEventListener("change", renderOrders);
  $("planFilter").addEventListener("change", renderPlans);
  $("planSearch").addEventListener("input", renderPlans);
  $("kreditTableBody").addEventListener("click", (e) => {
    const proof = e.target.closest("[data-proof]");
    if (proof) return showProof(proof.dataset.proof, proof);
    const ok = e.target.closest("[data-ok]");
    if (ok) return review(ok.dataset.ok, true, ok);
    const no = e.target.closest("[data-no]");
    if (no) return review(no.dataset.no, false, no);
  });

  // sambungkan ke pemanggil menu di admin-pages.js
  const prevLoader = window.loadAdminPage;
  window.loadAdminPage = function (page) {
    if (page === "kredit") load();
    else if (typeof prevLoader === "function") prevLoader(page);
  };

  // badge jumlah pesanan baru (hanya kalau yang login memang admin)
  onAuthReady(async () => {
    if (!isLoggedIn()) return;
    const { data: ok } = await supabaseClient.rpc("is_admin");
    if (!ok) return;
    const { data } = await supabaseClient.rpc("admin_credit_orders");
    if (data) {
      orders = data;
      updateBadge();
    }
  });
})();
