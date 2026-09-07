// isLoggedIn() ada di auth.js, ITEMS (kosong) ada di item_data.js, keduanya dimuat sebelum file ini.

// ---------- tampilkan UI sesuai status login ----------
const uploadBtn = document.getElementById('uploadBtn');
const loginBtn = document.getElementById('loginBtn');
const avatarBtn = document.getElementById('avatarBtn');

onAuthReady(() => {
  if(isLoggedIn()){
    if(uploadBtn) uploadBtn.hidden = false;
    if(loginBtn) loginBtn.hidden = true;
    if(avatarBtn) avatarBtn.hidden = false;

    // isi foto avatar sesuai profil user yang lagi login (bukan avatar random bawaan HTML)
    const user = getCurrentUser();
    const userAvatar = user?.user_metadata?.avatar_url;
    if (avatarBtn && userAvatar) avatarBtn.querySelector('img').src = userAvatar;
  } else {
    if(uploadBtn) uploadBtn.hidden = true;
    if(loginBtn) loginBtn.hidden = false;
    if(avatarBtn) avatarBtn.hidden = true;
  }
});

// ---------- geolokasi user: ambil lokasi asli, dipakai buat hitung jarak & label chip ----------
let userLoc = null; // { lat, lng, label } — null berarti izin lokasi ditolak/gagal, jarak fallback ke data statis

const locationChipLabel = document.querySelector('.location-chip span');

getUserLocation().then(loc => {
  userLoc = loc;
  if (locationChipLabel) {
    locationChipLabel.textContent = loc?.label || 'Lokasi tidak diketahui';
  }
  applyFilters(); // render ulang pakai jarak asli begitu lokasi didapat
});

// ---------- gabungkan data barang dummy dengan barang asli dari Supabase ----------
let ALL_ITEMS = ITEMS;

async function loadSupabaseItems(){
  try {
    const { data, error } = await supabaseClient
      .from('items')
      .select('*')
      .eq('status', 'Aktif')
      .order('created_at', { ascending: false });

    if(error){ console.error('Gagal memuat barang dari Supabase:', error.message); return []; }

    return (data || []).map(row => ({
      ...row,
      photo: row.photo || row.photos?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    }));
  } catch(err){
    console.error('Gagal memuat barang dari Supabase:', err);
    return [];
  }
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
  const jarak = computeItemDistance(item, userLoc);
  const jarakLabel = jarak * 1000 < 1000 ? `${Math.round(jarak * 1000)} m` : `${jarak} km`;
  return `
    <article class="card">
      <a href="detail.html?id=${item.id}" class="card-photo">
        <span class="badge ${badgeClass}">${item.jenis.toUpperCase()}</span>
        <img src="${item.photo}" alt="${item.name}" loading="lazy">
      </a>
      <div class="card-body">
        <h3 class="card-title">${item.name}</h3>
        <span class="condition-tag">Kondisi: ${item.kondisi}</span>
        <span class="card-distance">📍 ${jarakLabel} — ${item.lokasi}</span>
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

  const filtered = ALL_ITEMS.filter(item => {
    if(!kategori.includes(item.kategori)) return false;
    if(jenis !== 'Semua' && item.jenis !== jenis) return false;
    if(!kondisi.includes(item.kondisi)) return false;
    if(computeItemDistance(item, userLoc) > jarakMax) return false;
    if(query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  });

  // barang terdekat (jarak asli) ditampilkan duluan
  filtered.sort((a, b) => computeItemDistance(a, userLoc) - computeItemDistance(b, userLoc));

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

// initial render (langsung applyFilters, ALL_ITEMS masih kosong sampai fetch selesai)
applyFilters();
loadSupabaseItems().then(dbItems => {
  ALL_ITEMS = dbItems;
  applyFilters();
});