// ---------- data barang ----------
const items = [
  { id:1, name:"Jaket Denim Oversize", kategori:"Pakaian", jenis:"Barter", kondisi:"Baik", jarak:0.5, lokasi:"Kos Tidar", owner:"Rani A.", avatar:"https://i.pravatar.cc/60?img=32", photo:"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop" },
  { id:2, name:"Buku Kalkulus II", kategori:"Buku", jenis:"Donasi", kondisi:"Sangat Baik", jarak:0.4, lokasi:"Perpus Kampus", owner:"Dimas P.", avatar:"https://i.pravatar.cc/60?img=12", photo:"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop" },
  { id:3, name:"Lampu Meja LED", kategori:"Elektronik", jenis:"Barter", kondisi:"Baik", jarak:0.8, lokasi:"Kos Melati", owner:"Sari W.", avatar:"https://i.pravatar.cc/60?img=45", photo:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop" },
  { id:4, name:"Meja Belajar Lipat", kategori:"Perabot", jenis:"Donasi", kondisi:"Layak", jarak:2.1, lokasi:"Sekretariat BEM", owner:"Fajar N.", avatar:"https://i.pravatar.cc/60?img=8", photo:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop" },
  { id:5, name:"Kemeja Flanel Kotak", kategori:"Pakaian", jenis:"Barter", kondisi:"Sangat Baik", jarak:1.2, lokasi:"Kos Anggrek", owner:"Bagas T.", avatar:"https://i.pravatar.cc/60?img=15", photo:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop" },
  { id:6, name:"Novel Fiksi Bekas (5 buku)", kategori:"Buku", jenis:"Donasi", kondisi:"Baik", jarak:0.6, lokasi:"Kos Mawar", owner:"Intan R.", avatar:"https://i.pravatar.cc/60?img=25", photo:"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop" },
  { id:7, name:"Kabel & Charger Laptop", kategori:"Elektronik", jenis:"Barter", kondisi:"Layak", jarak:1.5, lokasi:"Kos Tidar", owner:"Yoga S.", avatar:"https://i.pravatar.cc/60?img=51", photo:"https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop" },
  { id:8, name:"Rak Buku Kayu Kecil", kategori:"Perabot", jenis:"Barter", kondisi:"Baik", jarak:3.4, lokasi:"Kos Melati", owner:"Citra D.", avatar:"https://i.pravatar.cc/60?img=38", photo:"https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=400&fit=crop" },
  { id:9, name:"Tas Ransel Kampus", kategori:"Pakaian", jenis:"Donasi", kondisi:"Sangat Baik", jarak:0.9, lokasi:"Kos Anggrek", owner:"Reza M.", avatar:"https://i.pravatar.cc/60?img=60", photo:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop" },
];

const grid = document.getElementById('itemGrid');
const resultCount = document.getElementById('resultCount');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const jarakSlider = document.getElementById('jarakSlider');
const jarakValue = document.getElementById('jarakValue');
const resetBtn = document.getElementById('resetBtn');

function renderCard(item){
  const badgeClass = item.jenis === 'Barter' ? 'barter' : 'donasi';
  return `
    <article class="card">
      <div class="card-photo">
        <span class="badge ${badgeClass}">${item.jenis.toUpperCase()}</span>
        <img src="${item.photo}" alt="${item.name}" loading="lazy">
      </div>
      <div class="card-body">
        <h3 class="card-title">${item.name}</h3>
        <span class="condition-tag">Kondisi: ${item.kondisi}</span>
        <span class="card-distance">📍 ${item.jarak} km — ${item.lokasi}</span>
        <div class="card-owner">
          <img src="${item.avatar}" alt="${item.owner}">
          <span>${item.owner}</span>
        </div>
        <button class="btn-detail">Lihat Detail</button>
      </div>
    </article>
  `;
}

function getFilters(){
  const kategori = Array.from(document.querySelectorAll('.f-kategori:checked')).map(el => el.value);
  const jenis = document.querySelector('.f-jenis:checked')?.value || 'Semua';
  const kondisi = Array.from(document.querySelectorAll('.f-kondisi:checked')).map(el => el.value);
  const jarakMax = parseFloat(jarakSlider.value);
  const query = searchInput.value.trim().toLowerCase();
  return { kategori, jenis, kondisi, jarakMax, query };
}

function applyFilters(){
  const { kategori, jenis, kondisi, jarakMax, query } = getFilters();

  const filtered = items.filter(item => {
    if(!kategori.includes(item.kategori)) return false;
    if(jenis !== 'Semua' && item.jenis !== jenis) return false;
    if(!kondisi.includes(item.kondisi)) return false;
    if(item.jarak > jarakMax) return false;
    if(query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  });

  grid.innerHTML = filtered.map(renderCard).join('');
  resultCount.textContent = `${filtered.length} barang ditemukan`;
  emptyState.hidden = filtered.length !== 0;
  grid.style.display = filtered.length === 0 ? 'none' : 'grid';
}

// ---------- event bindings ----------
document.querySelectorAll('.f-kategori, .f-jenis, .f-kondisi').forEach(el=>{
  el.addEventListener('change', applyFilters);
});
jarakSlider.addEventListener('input', ()=>{
  jarakValue.textContent = `${jarakSlider.value} km`;
  applyFilters();
});
searchInput.addEventListener('input', applyFilters);

resetBtn.addEventListener('click', ()=>{
  document.querySelectorAll('.f-kategori, .f-kondisi').forEach(el => el.checked = true);
  document.querySelector('.f-jenis[value="Semua"]').checked = true;
  jarakSlider.value = 10;
  jarakValue.textContent = '10 km';
  searchInput.value = '';
  applyFilters();
});

// initial render
applyFilters();