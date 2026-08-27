// ITEMS ada di items-data.js, logout()/isLoggedIn() ada di auth.js (keduanya dimuat sebelum file ini).

// Halaman ini butuh login — kalau belum, tendang ke login dulu.
if(!isLoggedIn()){
  window.location.href = 'login.html?redirect=profile.html';
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);

// ---------- TAB SWITCHING ----------
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    tabBtns.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------- BARANG AKTIF (barang milik "Rani A.") ----------
const myItems = ITEMS.filter(item => item.owner === "Rani A.");
const activeGrid = document.getElementById('activeGrid');

activeGrid.innerHTML = myItems.map(item => {
  const badgeClass = item.jenis === 'Barter' ? 'barter' : 'donasi';
  return `
    <article class="item-card">
      <div class="ic-photo">
        <span class="ic-badge ${badgeClass}">${item.jenis.toUpperCase()}</span>
        <img src="${item.photo}" alt="${item.name}" loading="lazy">
        <div class="ic-hover-actions">
          <button class="ic-action-btn edit">Edit</button>
          <button class="ic-action-btn deactivate">Nonaktifkan</button>
        </div>
      </div>
      <div class="ic-body">
        <div class="ic-title">${item.name}</div>
        <span class="ic-status">Aktif</span>
      </div>
    </article>
  `;
}).join('');

// hover-action buttons are placeholders — wire up simple feedback
activeGrid.querySelectorAll('.ic-action-btn.deactivate').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    const card = btn.closest('.item-card');
    const status = card.querySelector('.ic-status');
    const isActive = status.textContent === 'Aktif';
    status.textContent = isActive ? 'Nonaktif' : 'Aktif';
    status.style.background = isActive ? '#F2E9DC' : '';
    status.style.color = isActive ? '#8A6D3B' : '';
    btn.textContent = isActive ? 'Aktifkan' : 'Nonaktifkan';
  });
});

// ---------- RIWAYAT TRANSAKSI (data contoh) ----------
const history = [
  { itemName:"Kemeja Flanel Kotak", photo:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=200&h=200&fit=crop", jenis:"Barter", partner:"Bagas T.", date:"12 Agu 2026", status:"Selesai" },
  { itemName:"Novel Fiksi Bekas (5 buku)", photo:"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=200&fit=crop", jenis:"Donasi", partner:"Intan R.", date:"3 Agu 2026", status:"Selesai" },
  { itemName:"Lampu Meja LED", photo:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop", jenis:"Barter", partner:"Sari W.", date:"28 Jul 2026", status:"Dibatalkan" },
  { itemName:"Tas Ransel Kampus", photo:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop", jenis:"Donasi", partner:"Reza M.", date:"15 Jul 2026", status:"Selesai" },
  { itemName:"Rak Buku Kayu Kecil", photo:"https://images.unsplash.com/photo-1594620302200-9a762244a156?w=200&h=200&fit=crop", jenis:"Barter", partner:"Citra D.", date:"2 Jul 2026", status:"Selesai" },
];

const historyTimeline = document.getElementById('historyTimeline');

historyTimeline.innerHTML = history.map(h => {
  const badgeClass = h.jenis === 'Barter' ? 'barter' : 'donasi';
  const statusClass = h.status === 'Selesai' ? 'selesai' : 'dibatalkan';
  return `
    <article class="timeline-item">
      <img class="ti-thumb" src="${h.photo}" alt="${h.itemName}">
      <div class="ti-main">
        <div class="ti-top">
          <span class="ti-badge ${badgeClass}">${h.jenis.toUpperCase()}</span>
          <span class="ti-item-name">${h.itemName}</span>
        </div>
        <div class="ti-sub">dengan ${h.partner}</div>
      </div>
      <div class="ti-right">
        <div class="ti-date">${h.date}</div>
        <span class="ti-status ${statusClass}">${h.status}</span>
      </div>
    </article>
  `;
}).join('');

// ---------- ULASAN (data contoh) ----------
const reviews = [
  { name:"Dimas P.", avatar:"https://i.pravatar.cc/60?img=12", stars:5, date:"5 Agu 2026", text:"Barangnya sesuai deskripsi, komunikasinya juga cepat dan ramah. Recommended!" },
  { name:"Bagas T.", avatar:"https://i.pravatar.cc/60?img=15", stars:5, date:"14 Jul 2026", text:"Proses barter lancar, ketemuan tepat waktu. Terima kasih ya!" },
  { name:"Intan R.", avatar:"https://i.pravatar.cc/60?img=25", stars:4, date:"20 Jun 2026", text:"Bukunya bagus, cuma agak lama balesnya. Overall oke kok." },
];

const reviewList = document.getElementById('reviewList');

reviewList.innerHTML = reviews.map(r => `
  <article class="review-card">
    <div class="review-top">
      <img class="review-avatar" src="${r.avatar}" alt="${r.name}">
      <div>
        <div class="review-name">${r.name}</div>
        <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
      </div>
      <span class="review-date">${r.date}</span>
    </div>
    <p class="review-text">${r.text}</p>
  </article>
`).join('');

// ---------- PENGATURAN (placeholder feedback) ----------
document.querySelector('.btn-save-settings')?.addEventListener('click', ()=>{
  const btn = document.querySelector('.btn-save-settings');
  const original = btn.textContent;
  btn.textContent = 'Tersimpan ✓';
  setTimeout(()=>{ btn.textContent = original; }, 1800);
});