// =========================================================
// Re:Use.ID - LENCANA PAKET
// =========================================================
// Menampilkan status pengguna dan menautkannya ke kredit.html:
//   Gratis · sisa 1/2        (masih punya jatah gratis)
//   Gratis habis             (jatah habis, belum punya kredit / langganan)
//   Kredit · 3               (punya saldo kredit)
//   Langganan · s.d. 5 Des   (langganan aktif, unlimited)
//
// Layar lebar : chip di header (di samping lonceng notifikasi).
// Layar <=560px: strip tipis di bawah header (header di HP sudah padat).
//
// Dipasang di halaman yang punya header + auth.js (browse, detail, profile).
// Data dari my_tx_quota() (migrasi SQL bagian 6 & 7). Kalau fungsi itu belum
// ada, lencana tidak ditampilkan.

(function () {
  const CSS = `
    .plan-chip{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;
      padding:6px 13px;border-radius:999px;font-size:.8rem;font-weight:700;
      text-decoration:none;border:1.5px solid transparent;line-height:1.2;
      font-family:inherit;transition:filter .15s}
    .plan-chip:hover{filter:brightness(.96)}
    .plan-chip small{font-size:inherit;font-weight:600;opacity:.85}
    .plan-strip{display:none;text-align:center;text-decoration:none;
      padding:7px 16px;font-size:.78rem;font-weight:700;font-family:inherit}
    .plan-gratis{background:#eef4f0;color:#3f6354;border-color:#d7e5dc}
    .plan-habis{background:#fdeceb;color:#c24a43;border-color:#f6cfcc}
    .plan-kredit{background:#fff4dd;color:#9a6a00;border-color:#f3dfae}
    .plan-langganan{background:#3a9265;color:#fff}
    @media (max-width:560px){
      .plan-chip{display:none}
      .plan-strip{display:block}
    }`;

  const fmtShort = (iso) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });

  function describe(row) {
    const limit = row.batas_gratis;
    const used = Math.min(row.terpakai, limit);
    const sisa = Math.max(0, limit - row.terpakai);
    const detailGratis = `Gratis bulan ini: ${used}/${limit} terpakai`;

    if (row.langganan_sampai) {
      return {
        cls: "plan-langganan",
        name: "Langganan",
        detail: `s.d. ${fmtShort(row.langganan_sampai)}`,
        title: `Langganan aktif sampai ${new Date(row.langganan_sampai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}. Pengajuan tidak terbatas.`,
      };
    }
    if (row.kredit > 0) {
      return {
        cls: "plan-kredit",
        name: "Kredit",
        detail: String(row.kredit),
        title: `Kredit tambahan: ${row.kredit}. ${detailGratis}.`,
      };
    }
    if (sisa === 0) {
      return {
        cls: "plan-habis",
        name: "Gratis habis",
        detail: "",
        hint: "beli kredit atau langganan",
        title: `${detailGratis}. Ketuk untuk beli kredit atau langganan.`,
      };
    }
    return {
      cls: "plan-gratis",
      name: "Gratis",
      detail: `sisa ${sisa}/${limit}`,
      title: `${detailGratis}.`,
    };
  }

  function placeChip(chip) {
    const bell = document.getElementById("notifBell");
    if (bell && bell.parentNode) return bell.after(chip);
    const host =
      document.querySelector(".topbar-actions, .topbar-right") ||
      document.querySelector(".topbar-inner") ||
      document.body;
    host.appendChild(chip);
  }

  async function init() {
    if (!isLoggedIn() || document.getElementById("planChip")) return;
    const { data, error } = await supabaseClient.rpc("my_tx_quota");
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return;

    const d = describe(row);

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    // chip (layar lebar)
    const chip = document.createElement("a");
    chip.id = "planChip";
    chip.href = "kredit.html";
    chip.className = "plan-chip " + d.cls;
    chip.title = d.title;
    chip.innerHTML = d.name + (d.detail ? ` <small>· ${d.detail}</small>` : "");
    placeChip(chip);

    // strip (layar sempit)
    const header = document.querySelector("header");
    if (header) {
      const strip = document.createElement("a");
      strip.id = "planStrip";
      strip.href = "kredit.html";
      strip.className = "plan-strip " + d.cls;
      strip.textContent =
        d.name +
        (d.detail ? ` · ${d.detail}` : "") +
        (d.hint ? ` — ${d.hint}` : "") +
        "  ›";
      header.after(strip);
    }
  }

  onAuthReady(init);
})();
