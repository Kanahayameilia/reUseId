// =========================================================
// reUseId - Syarat & Ketentuan (popup, tanpa pindah halaman)
// Cara pakai: tambahkan  <script src="js/terms.js"></script>
// di signup.html, SEBELUM </body>. Selesai, tidak perlu ubah HTML lain.
// =========================================================
(function () {
  const TERMS = [
    {
      h: "1. Tentang Re:Use.ID",
      p: [
        "Re:Use.ID adalah platform untuk barter dan donasi barang bekas layak pakai. Kami hanya mempertemukan pengguna. Kami tidak menjual barang dan bukan pihak dalam transaksi antar pengguna.",
      ],
    },
    {
      h: "2. Akun",
      l: [
        "Kamu wajib memberi data yang benar saat mendaftar, dan menjaga kerahasiaan kata sandi akunmu.",
        "Satu orang cukup satu akun. Semua aktivitas dari akunmu menjadi tanggung jawabmu.",
        "Foto profil diperlukan sebelum kamu bisa mengajukan barter atau pengambilan barang.",
      ],
    },
    {
      h: "3. Barang yang boleh diunggah",
      l: [
        "Barang harus milikmu sendiri, layak pakai, dan kondisinya dijelaskan dengan jujur lewat foto dan deskripsi.",
        "Dilarang mengunggah barang ilegal, berbahaya, curian, palsu, atau yang melanggar hukum. Contohnya senjata, narkoba, obat resep, dan minuman keras.",
        "Re:Use.ID hanya untuk barter dan donasi. Dilarang menjual barang atau meminta uang sebagai bayaran.",
      ],
    },
    {
      h: "4. Barter dan donasi",
      l: [
        "Pengajuan barter harus menyertakan satu barang aktif milikmu. Barang itu dikunci jika pemilik menerima pengajuan.",
        "Setelah pengajuan diterima, atur waktu dan tempat serah terima lewat chat. Disarankan bertemu di tempat umum.",
        "Pemilik barang mengonfirmasi \"sudah menyerahkan\" terlebih dahulu. Setelah itu penerima mengonfirmasi \"sudah menerima\". Transaksi selesai jika keduanya sudah konfirmasi.",
        "Transaksi bisa dibatalkan hanya sebelum barang diserahkan. Setelah diserahkan, transaksi tidak bisa dibatalkan.",
        "Jangan mengonfirmasi serah terima sebelum barangnya benar-benar berpindah tangan.",
      ],
    },
    {
      h: "5. Chat dan data pribadi",
      l: [
        "Gunakan chat hanya untuk membahas barang, barter, donasi, dan serah terima.",
        "Jangan membagikan NIK/KTP, nomor rekening, nomor kartu, OTP, PIN, atau kata sandi. Sistem akan menolak pesan yang berisi data semacam itu.",
        "Dilarang melecehkan, mengancam, menipu, atau mengirim spam kepada pengguna lain.",
        "Re:Use.ID tidak pernah meminta kata sandi atau OTP-mu lewat chat. Abaikan dan laporkan pihak yang melakukannya.",
      ],
    },
    {
      h: "6. Ulasan",
      l: [
        "Ulasan hanya bisa diberikan setelah transaksi selesai, satu kali per transaksi, dan tidak bisa diubah atau dihapus.",
        "Tulis ulasan yang jujur dan sopan. Ulasan yang mengandung ujaran kebencian atau data pribadi dapat dihapus.",
      ],
    },
    {
      h: "7. Data yang kami simpan",
      p: [
        "Kami menyimpan data akun (nama, email, foto profil, kampus), barang yang kamu unggah, lokasi barang, isi chat, serta riwayat transaksi dan ulasan. Data ini dipakai untuk menjalankan layanan, bukan dijual kepada pihak lain.",
        "Lokasi barang digunakan untuk menampilkan jarak ke pengguna lain. Lokasi perangkatmu hanya dipakai jika kamu mengizinkannya di browser.",
      ],
    },
    {
      h: "8. Tanggung jawab",
      l: [
        "Pengguna bertanggung jawab atas barang dan kesepakatan yang dibuat. Periksa barang sebelum menerimanya.",
        "Re:Use.ID tidak menjamin kualitas barang atau perilaku pengguna, dan tidak bertanggung jawab atas kerugian dari transaksi antar pengguna. Meski begitu, kami berusaha menjaga platform tetap aman dan nyaman.",
      ],
    },
    {
      h: "9. Pelanggaran",
      p: [
        "Akun yang melanggar ketentuan ini dapat diperingatkan, dibatasi, atau dihapus, dan barang yang melanggar dapat diturunkan tanpa pemberitahuan terlebih dahulu.",
      ],
    },
    {
      h: "10. Perubahan",
      p: [
        "Ketentuan ini dapat diperbarui sewaktu-waktu. Dengan terus memakai Re:Use.ID setelah perubahan, kamu dianggap menyetujui versi terbaru.",
      ],
    },
  ];

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function buildBody() {
    return TERMS.map((s) => {
      let html = `<h4>${esc(s.h)}</h4>`;
      if (s.p) html += s.p.map((t) => `<p>${esc(t)}</p>`).join("");
      if (s.l) html += `<ul>${s.l.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
      return html;
    }).join("");
  }

  function injectStyles() {
    if (document.getElementById("termsStyle")) return;
    const s = document.createElement("style");
    s.id = "termsStyle";
    s.textContent = `
      .terms-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:10000;}
      .terms-overlay[hidden]{display:none;}
      .terms-card{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;font-family:'DM Sans',sans-serif;color:#1f2a26;box-shadow:0 20px 50px rgba(0,0,0,.25);}
      .terms-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #e3e8e5;}
      .terms-head h3{margin:0;font-size:1.1rem;}
      .terms-x{border:0;background:none;font-size:1.5rem;line-height:1;cursor:pointer;color:#66756f;}
      .terms-body{overflow-y:auto;padding:6px 22px 14px;font-size:.9rem;line-height:1.6;}
      .terms-body h4{margin:16px 0 4px;font-size:.95rem;color:#3a9265;}
      .terms-body p{margin:0 0 6px;}
      .terms-body ul{margin:0 0 6px;padding-left:20px;}
      .terms-body li{margin-bottom:4px;}
      .terms-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid #e3e8e5;}
      .terms-btn{padding:9px 18px;border-radius:999px;border:1px solid #d5ddd9;background:#fff;font:inherit;font-weight:700;cursor:pointer;}
      .terms-btn.primary{background:#4caf7d;border-color:#4caf7d;color:#fff;}
    `;
    document.head.appendChild(s);
  }

  function init() {
    // cari link "Syarat & Ketentuan" di dekat checkbox setuju
    const link = Array.from(document.querySelectorAll("a")).find((a) =>
      /syarat/i.test(a.textContent),
    );
    if (!link) return;

    injectStyles();

    const overlay = document.createElement("div");
    overlay.className = "terms-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="terms-card" role="dialog" aria-modal="true" aria-labelledby="termsTitle">
        <div class="terms-head">
          <h3 id="termsTitle">Syarat &amp; Ketentuan</h3>
          <button type="button" class="terms-x" data-close aria-label="Tutup">&times;</button>
        </div>
        <div class="terms-body">${buildBody()}</div>
        <div class="terms-foot">
          <button type="button" class="terms-btn" data-close>Tutup</button>
          <button type="button" class="terms-btn primary" data-agree>Saya setuju</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const open = () => {
      overlay.hidden = false;
      overlay.querySelector(".terms-body").scrollTop = 0;
    };
    const close = () => {
      overlay.hidden = true;
    };

    // link ada di dalam <label>, jadi cegah klik ikut mencentang kotak
    link.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      open();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-close]")) close();
      if (e.target.closest("[data-agree]")) {
        const box = document.getElementById("agree");
        if (box) {
          box.checked = true;
          box.dispatchEvent(new Event("change", { bubbles: true }));
        }
        close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.hidden) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();