// ITEMS ada di items-data.js, isLoggedIn() ada di auth.js (keduanya dimuat sebelum file ini).

// ---------- tampilkan UI sesuai status login ----------
const uploadBtn = document.getElementById('uploadBtn');
const loginBtn = document.getElementById('loginBtn');
const avatarBtn = document.getElementById('avatarBtn');

if(isLoggedIn()){
  if(uploadBtn) uploadBtn.hidden = false;
  if(loginBtn) loginBtn.hidden = true;
  if(avatarBtn) avatarBtn.hidden = false;
} else {
  if(uploadBtn) uploadBtn.hidden = true;
  if(loginBtn) loginBtn.hidden = false;
  if(avatarBtn) avatarBtn.hidden = true;
}

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
      <a href="detail.html?id=${item.id}" class="card-photo">
        <span class="badge ${badgeClass}">${item.jenis.toUpperCase()}</span>
        <img src="${item.photo}" alt="${item.name}" loading="lazy">
      </a>
      <div class="card-body">
        <h3 class="card-title">${item.name}</h3>
        <span class="condition-tag">Kondisi: ${item.kondisi}</span>
        <span class="card-distance">📍 ${item.jarak} km — ${item.lokasi}</span>
        <div class="card-owner">
          <img src="${item.avatar}" alt="${item.owner}">
          <span>${item.owner}</span>
        </div>
        <a href="detail.html?id=${item.id}" class="btn-detail">Lihat Detail</a>
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

  const filtered = ITEMS.filter(item => {
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