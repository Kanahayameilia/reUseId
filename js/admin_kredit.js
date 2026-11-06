// =========================================================
// Re:Use.ID - HALAMAN ADMIN: Pembayaran Kredit (QRIS manual)
// =========================================================
// Dimuat SETELAH admin-pages.js (pakai esc, fmtDate, fmtNum dari admin.js).
// Data dari fungsi database admin_credit_orders() dan
// admin_review_credit_order() ( ). Dua-duanya menolak
// non-admin, jadi yang menjaga data tetap database, bukan halaman ini.

(function () {
  const $ = (id) => document.getElementById(id);
  const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
  const STATUS_TEXT = {
    menunggu: "Menunggu dicek",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  };

  let orders = [];

  function updateBadge() {
    const n = orders.filter((o) => o.status === "menunggu").length;
    const el = $("kreditNavBadge");
    el.textContent = n > 99 ? "99+" : String(n);
    el.hidden = n === 0;
  }

  function render() {
    const f = $("kreditStatusFilter").value;
    const rows = orders.filter((o) => f === "Semua" || o.status === f);

    $("kreditTableBody").innerHTML = rows.length
      ? rows
          .map(
            (o) => `
      <tr>
        <td>${fmtDate(o.created_at)}</td>
        <td>${esc(o.full_name || "Tanpa nama")}<span class="rp-sub-cell">${esc(o.email || "")}</span></td>
        <td>${fmtNum(o.qty)} kredit</td>
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

  async function load() {
    $("kreditTableBody").innerHTML =
      `<tr><td colspan="7" style="padding:24px;color:#7a8b85">Memuat…</td></tr>`;
    const { data, error } = await supabaseClient.rpc("admin_credit_orders");
    if (error) {
      $("kreditTableBody").innerHTML =
        `<tr><td colspan="7" style="padding:24px;color:#7a8b85">Gagal memuat pesanan: ${esc(error.message)}<br>Pastikan <b> </b> sudah dijalankan.</td></tr>`;
      return;
    }
    orders = data || [];
    updateBadge();
    render();
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
          `Setujui ${o.qty} kredit untuk ${o.full_name || o.email}?\n` +
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

  $("kreditStatusFilter").addEventListener("change", render);
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
