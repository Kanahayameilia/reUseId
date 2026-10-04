// =========================================================
// Re:Use.ID - LAPORAN SAYA (profile.html, tab "Laporan Saya")
// =========================================================
// Pengguna melihat laporan yang pernah dia kirim, statusnya, dan balasan admin.
// Aturan RLS "reports_select_own" (bagian4_laporan.sql) memastikan
// hanya laporan miliknya sendiri yang bisa terbaca.
// Dimuat setelah auth.js dan report.js.

(function () {
  const TYPE = { item: "Barang", chat: "Chat", bug: "Bug / saran" };
  const STATUS = {
    baru: ["Menunggu ditinjau", "baru"],
    diproses: ["Sedang ditangani", "diproses"],
    selesai: ["Selesai", "selesai"],
    ditolak: ["Tidak ditindaklanjuti", "ditolak"],
  };

  const list = document.getElementById("myReports");
  if (!list) return;

  function fmt(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  }

  async function load() {
    list.innerHTML = `<p class="mr-empty">Memuat laporanmu…</p>`;
    const { data, error } = await supabaseClient
      .from("reports")
      .select(
        "id,type,reason,details,target_label,status,admin_note,created_at,resolved_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Gagal memuat laporan saya:", error);
      list.innerHTML = `<p class="mr-empty">Gagal memuat laporan: ${escHtml(error.message)}</p>`;
      return;
    }
    if (!data.length) {
      list.innerHTML = `<p class="mr-empty">Kamu belum pernah mengirim laporan.</p>`;
      return;
    }

    list.innerHTML = data
      .map((r) => {
        const [label, cls] = STATUS[r.status] || [r.status, ""];
        return `
      <article class="mr-card">
        <div class="mr-top">
          <span class="mr-type">${escHtml(TYPE[r.type] || r.type)}</span>
          <span class="mr-status ${escHtml(cls)}">${escHtml(label)}</span>
          <span class="mr-date">${escHtml(fmt(r.created_at))}</span>
        </div>
        ${r.target_label ? `<div class="mr-target">${escHtml(r.target_label)}</div>` : ""}
        <div class="mr-reason">${escHtml(r.reason)}</div>
        ${r.details ? `<div class="mr-details">${escHtml(r.details)}</div>` : ""}
        ${
          r.admin_note
            ? `<div class="mr-reply"><b>Balasan tim Re:Use.ID</b>${escHtml(r.admin_note)}</div>`
            : `<div class="mr-wait">Belum ada balasan dari tim.</div>`
        }
      </article>`;
      })
      .join("");
  }

  // muat saat tab dibuka (bukan saat halaman dibuka), biar halaman profil tetap ringan
  document
    .querySelector('.tab-btn[data-tab="laporan"]')
    ?.addEventListener("click", () => onAuthReady(load));
})();
