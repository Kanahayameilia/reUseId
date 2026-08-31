// ---------- sidebar nav (visual only — cuma Dashboard yang punya konten di demo ini) ----------
document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click', (e)=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// ---------- LINE CHART: Pertumbuhan Pengguna Aktif ----------
const lineCtx = document.getElementById('lineChart').getContext('2d');
new Chart(lineCtx, {
  type: 'line',
  data: {
    labels: ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'],
    datasets: [
      {
        label: 'Pengguna Baru',
        data: [180, 240, 290, 310, 380, 420],
        borderColor: '#4CAF7D',
        backgroundColor: 'rgba(76,175,125,0.1)',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#4CAF7D',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Pengguna Aktif',
        data: [420, 510, 640, 710, 890, 1040],
        borderColor: '#3B7DDB',
        backgroundColor: 'rgba(59,125,219,0.06)',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#3B7DDB',
        tension: 0.35,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#EEF1EF' }, ticks: { color: '#66756F', font: { family: 'DM Sans', size: 11 } } },
      x: { grid: { display: false }, ticks: { color: '#66756F', font: { family: 'DM Sans', size: 11 } } },
    },
    interaction: { mode: 'index', intersect: false },
  },
});

// ---------- DONUT CHART: Distribusi Kategori Barang ----------
const categoryData = [
  { label: 'Pakaian', value: 38, color: '#4CAF7D' },
  { label: 'Buku', value: 27, color: '#3B7DDB' },
  { label: 'Elektronik', value: 20, color: '#D9A441' },
  { label: 'Perabot', value: 15, color: '#1A3C34' },
];

const donutCtx = document.getElementById('donutChart').getContext('2d');
new Chart(donutCtx, {
  type: 'doughnut',
  data: {
    labels: categoryData.map(c => c.label),
    datasets: [{
      data: categoryData.map(c => c.value),
      backgroundColor: categoryData.map(c => c.color),
      borderWidth: 0,
    }],
  },
  options: {
    responsive: true,
    cutout: '68%',
    plugins: { legend: { display: false } },
  },
});

const donutLegend = document.getElementById('donutLegend');
donutLegend.innerHTML = categoryData.map(c => `
  <div class="donut-legend-item">
    <span class="dot" style="background:${c.color}"></span>
    ${c.label}
    <span class="donut-legend-pct">${c.value}%</span>
  </div>
`).join('');

// ---------- TABEL TRANSAKSI ----------
const transactions = [
  { user:"Rani A.", avatar:"https://i.pravatar.cc/40?img=32", item:"Jaket Denim Oversize", jenis:"Barter", date:"29 Agu 2026", status:"Selesai" },
  { user:"Dimas P.", avatar:"https://i.pravatar.cc/40?img=12", item:"Buku Kalkulus II", jenis:"Donasi", date:"29 Agu 2026", status:"Selesai" },
  { user:"Sari W.", avatar:"https://i.pravatar.cc/40?img=45", item:"Lampu Meja LED", jenis:"Barter", date:"28 Agu 2026", status:"Diproses" },
  { user:"Fajar N.", avatar:"https://i.pravatar.cc/40?img=8", item:"Meja Belajar Lipat", jenis:"Donasi", date:"28 Agu 2026", status:"Selesai" },
  { user:"Bagas T.", avatar:"https://i.pravatar.cc/40?img=15", item:"Kemeja Flanel Kotak", jenis:"Barter", date:"27 Agu 2026", status:"Dibatalkan" },
  { user:"Intan R.", avatar:"https://i.pravatar.cc/40?img=25", item:"Novel Fiksi Bekas", jenis:"Donasi", date:"27 Agu 2026", status:"Selesai" },
  { user:"Yoga S.", avatar:"https://i.pravatar.cc/40?img=51", item:"Kabel & Charger Laptop", jenis:"Barter", date:"26 Agu 2026", status:"Diproses" },
  { user:"Citra D.", avatar:"https://i.pravatar.cc/40?img=38", item:"Rak Buku Kayu Kecil", jenis:"Barter", date:"26 Agu 2026", status:"Selesai" },
  { user:"Reza M.", avatar:"https://i.pravatar.cc/40?img=60", item:"Tas Ransel Kampus", jenis:"Donasi", date:"25 Agu 2026", status:"Selesai" },
  { user:"Putri L.", avatar:"https://i.pravatar.cc/40?img=44", item:"Sepatu Sneakers", jenis:"Barter", date:"25 Agu 2026", status:"Selesai" },
  { user:"Andi K.", avatar:"https://i.pravatar.cc/40?img=53", item:"Kipas Angin Kecil", jenis:"Donasi", date:"24 Agu 2026", status:"Dibatalkan" },
  { user:"Nadia F.", avatar:"https://i.pravatar.cc/40?img=47", item:"Setrika Portable", jenis:"Barter", date:"24 Agu 2026", status:"Diproses" },
  { user:"Rian S.", avatar:"https://i.pravatar.cc/40?img=14", item:"Buku Fisika Dasar", jenis:"Donasi", date:"23 Agu 2026", status:"Selesai" },
  { user:"Wahyu P.", avatar:"https://i.pravatar.cc/40?img=17", item:"Jam Weker Analog", jenis:"Barter", date:"23 Agu 2026", status:"Selesai" },
  { user:"Melati S.", avatar:"https://i.pravatar.cc/40?img=29", item:"Dompet Kulit", jenis:"Donasi", date:"22 Agu 2026", status:"Selesai" },
  { user:"Doni H.", avatar:"https://i.pravatar.cc/40?img=52", item:"Kaos Olahraga", jenis:"Barter", date:"22 Agu 2026", status:"Diproses" },
  { user:"Fitri A.", avatar:"https://i.pravatar.cc/40?img=31", item:"Tumbler Stainless", jenis:"Donasi", date:"21 Agu 2026", status:"Selesai" },
  { user:"Agus W.", avatar:"https://i.pravatar.cc/40?img=59", item:"Headphone Bekas", jenis:"Barter", date:"21 Agu 2026", status:"Dibatalkan" },
];

const ROWS_PER_PAGE = 8;
let currentPage = 1;
let activeStatus = 'Semua';

const txTableBody = document.getElementById('txTableBody');
const paginationEl = document.getElementById('pagination');
const paginationInfo = document.getElementById('paginationInfo');
const statusFilter = document.getElementById('statusFilter');

function getFilteredTransactions(){
  if(activeStatus === 'Semua') return transactions;
  return transactions.filter(tx => tx.status === activeStatus);
}

function renderTable(){
  const filtered = getFilteredTransactions();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(start, start + ROWS_PER_PAGE);

  txTableBody.innerHTML = pageRows.map((tx, i) => {
    const jenisClass = tx.jenis === 'Barter' ? 'barter' : 'donasi';
    const statusClass = tx.status.toLowerCase();
    return `
      <tr>
        <td>${start + i + 1}</td>
        <td>
          <div class="tx-user">
            <img src="${tx.avatar}" alt="${tx.user}">
            ${tx.user}
          </div>
        </td>
        <td>${tx.item}</td>
        <td><span class="tx-badge ${jenisClass}">${tx.jenis}</span></td>
        <td>${tx.date}</td>
        <td><span class="tx-status ${statusClass}">${tx.status}</span></td>
      </tr>
    `;
  }).join('');

  paginationInfo.textContent = filtered.length === 0
    ? 'Nggak ada transaksi dengan status ini'
    : `Menampilkan ${start + 1}–${Math.min(start + ROWS_PER_PAGE, filtered.length)} dari ${filtered.length} transaksi`;

  renderPagination(totalPages);
}

function renderPagination(totalPages){
  let html = `<button class="page-btn" id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

  for(let p = 1; p <= totalPages; p++){
    html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }

  html += `<button class="page-btn" id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  paginationEl.innerHTML = html;

  document.getElementById('prevPage').addEventListener('click', ()=>{
    if(currentPage > 1){ currentPage--; renderTable(); }
  });
  document.getElementById('nextPage').addEventListener('click', ()=>{
    if(currentPage < totalPages){ currentPage++; renderTable(); }
  });
  paginationEl.querySelectorAll('[data-page]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentPage = parseInt(btn.dataset.page, 10);
      renderTable();
    });
  });
}

statusFilter.addEventListener('change', ()=>{
  activeStatus = statusFilter.value;
  currentPage = 1;
  renderTable();
});

renderTable();