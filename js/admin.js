// =========================================================
// Re:Use.ID - DASHBOARD ADMIN (data asli dari Supabase)
// =========================================================
// supabaseClient ada di supabase-client.js; isLoggedIn()/onAuthReady() ada di auth.js
// (keduanya dimuat sebelum file ini).
//
// Data diambil lewat fungsi database admin_stats() dan admin_transactions().
// Kedua fungsi itu menolak non-admin, jadi pengecekan di halaman ini cuma
// untuk tampilan. Yang menjaga data adalah database.
// =========================================================

const FALLBACK_AVATAR = "https://i.pravatar.cc/40?img=47";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const DONUT_COLORS = [
  "#4CAF7D",
  "#3B7DDB",
  "#D9A441",
  "#1A3C34",
  "#8E6BBF",
  "#9AA5A0",
];

const STATUS_LABEL = {
  menunggu: "Menunggu",
  diterima: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};
// kelas CSS lama pakai "diproses" untuk status Diterima
const STATUS_CLASS = { diterima: "diproses" };

// ---------- util ----------
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML.replace(/"/g, "&quot;");
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString("id-ID");
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

function ensureBox(canvasId, boxClass, w, h) {
  const canvas = document.getElementById(canvasId);
  let box = canvas.parentElement;
  if (!box.classList.contains(boxClass)) {
    box = document.createElement("div");
    box.className = boxClass;
    canvas.parentNode.insertBefore(box, canvas);
    box.appendChild(canvas);
  }
  canvas.removeAttribute("width");
  canvas.removeAttribute("height");
  box.style.position = "relative";
  box.style.width = w;
  box.style.height = h;
  box.style.flex = "0 0 auto";
  return canvas;
}

// gaya tambahan untuk status baru (Menunggu, Ditolak)
(function injectStyles() {
  const s = document.createElement("style");
  s.textContent = `
    .tx-status.menunggu{background:#fff4dd;color:#9a6a00;}
    .tx-status.ditolak{background:#f1eeea;color:#6f6a65;}
    .tx-owner{display:block;font-size:.72rem;color:#7a8b85;font-weight:400;}
  `;
  document.head.appendChild(s);
})();

// ---------- sidebar nav (visual only — cuma Dashboard yang punya konten) ----------
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    document
      .querySelectorAll(".nav-item")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
  });
});

// ---------- profil admin di sidebar (akun yang sedang login) ----------
function fillAdminProfile() {
  const u = getCurrentUser();
  const name =
    u?.user_metadata?.full_name || u?.user_metadata?.name || getUserName();
  document.getElementById("adminName").textContent = name;
  document.getElementById("adminRole").textContent = "Admin";
  document.getElementById("adminAvatar").src =
    u?.user_metadata?.avatar_url || FALLBACK_AVATAR;
}

// ---------- dashboard ----------
async function initDashboard() {
  // rentang tanggal = bulan berjalan
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  document.getElementById("dateRange").textContent =
    `📅 1 – ${lastDay} ${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;

  const [statsRes, txRes] = await Promise.all([
    supabaseClient.rpc("admin_stats"),
    supabaseClient.rpc("admin_transactions"),
  ]);

  if (statsRes.error) {
    console.error("admin_stats gagal:", statsRes.error);
    alert("Gagal memuat statistik: " + statsRes.error.message);
  } else {
    // tiap bagian dibungkus sendiri-sendiri, supaya kalau grafik gagal,
    // KPI dan tabel di bawahnya tetap tampil
    try {
      renderKpis(statsRes.data);
    } catch (err) {
      console.error("Gagal menampilkan KPI:", err);
    }

    if (typeof Chart === "undefined") {
      const msg = `<p style="padding:24px;color:#7a8b85;">Grafik gagal dimuat (library Chart.js tidak terunduh). Cek koneksi internet lalu muat ulang.</p>`;
      document.querySelectorAll(".chart-card canvas").forEach((c) => {
        c.insertAdjacentHTML("afterend", msg);
        c.remove();
      });
    } else {
      try {
        renderLineChart(statsRes.data.series || []);
      } catch (err) {
        console.error("Gagal menggambar grafik pengguna:", err);
      }
      try {
        renderDonut(statsRes.data.categories || []);
      } catch (err) {
        console.error("Gagal menggambar donut kategori:", err);
      }
    }
  }

  if (txRes.error) {
    console.error("admin_transactions gagal:", txRes.error);
    txTableBody.innerHTML = `<tr><td colspan="6">Gagal memuat transaksi: ${esc(txRes.error.message)}</td></tr>`;
    paginationInfo.textContent = "";
  } else {
    transactions = txRes.data || [];
    renderTable();
  }
}

// ---------- KPI ----------
function setTrend(id, text, down) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("down", !!down);
  el.classList.toggle("up", !down);
}

function renderKpis(s) {
  document.getElementById("kpiUsers").textContent = fmtNum(s.total_users);
  document.getElementById("kpiItems").textContent = fmtNum(s.active_items);
  document.getElementById("kpiTx").textContent = fmtNum(s.tx_month);
  document.getElementById("kpiDonated").textContent = fmtNum(s.donated_total);

  setTrend("kpiUsersTrend", `▲ +${fmtNum(s.new_users)} baru bulan ini`, false);
  setTrend(
    "kpiItemsTrend",
    `▲ +${fmtNum(s.items_month)} diunggah bulan ini`,
    false,
  );
  setTrend(
    "kpiDonatedTrend",
    `▲ +${fmtNum(s.donated_month)} selesai bulan ini`,
    false,
  );

  if (s.tx_prev > 0) {
    const pct = Math.round(((s.tx_month - s.tx_prev) / s.tx_prev) * 100);
    setTrend(
      "kpiTxTrend",
      `${pct >= 0 ? "▲ +" : "▼ "}${pct}% vs bulan lalu`,
      pct < 0,
    );
  } else {
    setTrend("kpiTxTrend", "Belum ada data bulan lalu", false);
  }
}

// ---------- LINE CHART: Pertumbuhan Pengguna ----------
function renderLineChart(series) {
  const labels = series.map(
    (p) => MONTHS_SHORT[Number(p.month.slice(5, 7)) - 1],
  );

  const lineCanvas = ensureBox("lineChart", "line-box", "100%", "180px");
  new Chart(lineCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Pengguna Baru",
          data: series.map((p) => p.new_users),
          borderColor: "#4CAF7D",
          backgroundColor: "rgba(76,175,125,0.1)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: "#4CAF7D",
          tension: 0.35,
          fill: true,
        },
        {
          label: "Pengguna Aktif",
          data: series.map((p) => p.active_users),
          borderColor: "#3B7DDB",
          backgroundColor: "rgba(59,125,219,0.06)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: "#3B7DDB",
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#EEF1EF" },
          ticks: {
            color: "#66756F",
            precision: 0,
            font: { family: "DM Sans", size: 11 },
          },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#66756F", font: { family: "DM Sans", size: 11 } },
        },
      },
      interaction: { mode: "index", intersect: false },
    },
  });
}

// ---------- DONUT CHART: Distribusi Kategori ----------
function renderDonut(categories) {
  const donutLegend = document.getElementById("donutLegend");
  const ctx = ensureBox("donutChart", "donut-box", "130px", "130px").getContext(
    "2d",
  );
  if (!categories.length) {
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Kosong"],
        datasets: [{ data: [1], backgroundColor: ["#E3E8E5"], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
    donutLegend.innerHTML = `<div class="donut-legend-item">Belum ada barang</div>`;
    return;
  }

  // 5 kategori terbesar, sisanya digabung jadi "Lainnya"
  const sorted = [...categories].sort((a, b) => b.total - a.total);
  let top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((a, c) => a + c.total, 0);
  if (rest > 0) top.push({ kategori: "Lainnya", total: rest });

  const sum = top.reduce((a, c) => a + c.total, 0);
  const data = top.map((c, i) => ({
    label: c.kategori,
    value: c.total,
    pct: Math.round((c.total / sum) * 100),
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map((c) => c.label),
      datasets: [
        {
          data: data.map((c) => c.value),
          backgroundColor: data.map((c) => c.color),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: { legend: { display: false } },
    },
  });

  donutLegend.innerHTML = data
    .map(
      (c) => `
    <div class="donut-legend-item">
      <span class="dot" style="background:${c.color}"></span>
      ${esc(c.label)}
      <span class="donut-legend-pct">${c.pct}%</span>
    </div>`,
    )
    .join("");
}

// ---------- TABEL TRANSAKSI ----------
let transactions = [];

const ROWS_PER_PAGE = 8;
let currentPage = 1;
let activeStatus = "Semua";

const txTableBody = document.getElementById("txTableBody");
const paginationEl = document.getElementById("pagination");
const paginationInfo = document.getElementById("paginationInfo");
const statusFilter = document.getElementById("statusFilter");

function statusLabel(tx) {
  return STATUS_LABEL[tx.status] || tx.status;
}

function getFilteredTransactions() {
  if (activeStatus === "Semua") return transactions;
  return transactions.filter((tx) => statusLabel(tx) === activeStatus);
}

function renderTable() {
  const filtered = getFilteredTransactions();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(start, start + ROWS_PER_PAGE);

  txTableBody.innerHTML = pageRows
    .map((tx, i) => {
      const jenisClass = tx.jenis === "Barter" ? "barter" : "donasi";
      const statusClass = STATUS_CLASS[tx.status] || tx.status;
      return `
      <tr>
        <td>${start + i + 1}</td>
        <td>
          <div class="tx-user">
            <img src="${esc(tx.buyer_avatar || FALLBACK_AVATAR)}" alt="">
            <span>${esc(tx.buyer_name)}<span class="tx-owner">ke ${esc(tx.seller_name)}</span></span>
          </div>
        </td>
        <td>${esc(tx.item_name || "Barang sudah dihapus")}</td>
        <td><span class="tx-badge ${jenisClass}">${esc(tx.jenis)}</span></td>
        <td>${fmtDate(tx.created_at)}</td>
        <td><span class="tx-status ${esc(statusClass)}">${esc(statusLabel(tx))}</span></td>
      </tr>`;
    })
    .join("");

  paginationInfo.textContent =
    filtered.length === 0
      ? transactions.length === 0
        ? "Belum ada transaksi"
        : "Nggak ada transaksi dengan status ini"
      : `Menampilkan ${start + 1}–${Math.min(start + ROWS_PER_PAGE, filtered.length)} dari ${filtered.length} transaksi`;

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  let html = `<button class="page-btn" id="prevPage" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;

  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
  }

  html += `<button class="page-btn" id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  paginationEl.innerHTML = html;

  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  paginationEl.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page, 10);
      renderTable();
    });
  });
}

statusFilter.addEventListener("change", () => {
  activeStatus = statusFilter.value;
  currentPage = 1;
  renderTable();
});

// ---------- gerbang akses ----------
const gateEl = document.getElementById("adminGate");
const gateTextEl = document.getElementById("adminGateText");

function showGateMessage(html) {
  gateTextEl.innerHTML = html;
}

onAuthReady(async () => {
  if (!isLoggedIn()) {
    window.location.href = "login.html?redirect=admin.html";
    return;
  }

  const { data: ok, error } = await supabaseClient.rpc("is_admin");

  if (error) {
    showGateMessage(
      `Gagal memeriksa akses.<br><span style="font-weight:400;font-size:.85rem;">${esc(error.message)}</span><br>` +
        `<span style="font-weight:400;font-size:.85rem;">Pastikan <b>bagian3_admin.sql</b> sudah dijalankan.</span>`,
    );
    return;
  }

  if (!ok) {
    showGateMessage(
      `Halaman ini khusus admin.<br><a href="index.html" style="color:#4E8C6B;font-weight:700;">← Kembali ke beranda</a>`,
    );
    return;
  }

  gateEl.remove();
  fillAdminProfile();
  initDashboard();
});
