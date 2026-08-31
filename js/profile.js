// ITEMS ada di items-data.js, logout()/isLoggedIn()/getUserName() ada di auth.js
// (keduanya dimuat sebelum file ini).
//
// PENTING: isLoggedIn() baru akurat setelah 'auth-ready' terpicu (lihat auth.js),
// jadi semua kode di bawah dibungkus supaya nggak sempat baca status "belum login"
// yang keliru sebelum sesi selesai dicek.
document.addEventListener('auth-ready', async () => {

  // Halaman ini butuh login — kalau belum, tendang ke login dulu.
  if(!isLoggedIn()){
    window.location.href = 'login.html?redirect=profile.html';
    return;
  }

  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  // ---------- ISI DATA PROFIL DARI AKUN YANG LOGIN ----------
  const { data: { user } } = await supabaseClient.auth.getUser();
  const userName = user?.user_metadata?.full_name || getUserName();
  const userCampus = user?.user_metadata?.campus || '';
  const userEmail = user?.email || '';

  document.getElementById('phName').textContent = userName;
  if(userCampus) document.getElementById('phCampus').textContent = `🎓 Mahasiswa — ${userCampus}`;
  document.getElementById('settingsName').value = userName;
  document.getElementById('settingsEmail').value = userEmail;

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

  // ---------- BARANG AKTIF (dari tabel items di Supabase, milik akun ini) ----------
  const activeGrid = document.getElementById('activeGrid');
  const { data: myItems, error: itemsError } = await supabaseClient
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if(itemsError){
    activeGrid.innerHTML = `<p>Gagal memuat barang: ${itemsError.message}</p>`;
  } else if(!myItems || myItems.length === 0){
    activeGrid.innerHTML = `<p>Kamu belum punya barang yang diunggah.</p>`;
  } else {
    activeGrid.innerHTML = myItems.map(item => {
      const badgeClass = item.jenis === 'Barter' ? 'barter' : 'donasi';
      const cover = item.photos?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop';
      return `
        <article class="item-card" data-item-id="${item.id}">
          <div class="ic-photo">
            <span class="ic-badge ${badgeClass}">${item.jenis.toUpperCase()}</span>
            <img src="${cover}" alt="${item.name}" loading="lazy">
            <div class="ic-hover-actions">
              <button class="ic-action-btn edit">Edit</button>
              <button class="ic-action-btn deactivate">${item.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
            </div>
          </div>
          <div class="ic-body">
            <div class="ic-title">${item.name}</div>
            <span class="ic-status">${item.status}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  // toggle Aktif/Nonaktif — update beneran ke Supabase, bukan cuma tampilan
  activeGrid.querySelectorAll('.ic-action-btn.deactivate').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const card = btn.closest('.item-card');
      const itemId = card.dataset.itemId;
      const status = card.querySelector('.ic-status');
      const isActive = status.textContent === 'Aktif';
      const newStatus = isActive ? 'Nonaktif' : 'Aktif';

      const { error } = await supabaseClient
        .from('items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if(error){
        alert('Gagal mengubah status: ' + error.message);
        return;
      }

      status.textContent = newStatus;
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

  // ---------- PENGATURAN: simpan nama & lokasi beneran ke Supabase ----------
  document.querySelector('.btn-save-settings')?.addEventListener('click', async ()=>{
    const btn = document.querySelector('.btn-save-settings');
    const original = btn.textContent;
    const newName = document.getElementById('settingsName').value.trim();
    const newLocation = document.getElementById('settingsLocation').value.trim();

    btn.disabled = true;
    btn.textContent = 'Menyimpan…';

    const { error } = await supabaseClient.auth.updateUser({
      data: { full_name: newName, location: newLocation }
    });

    btn.disabled = false;

    if(error){
      btn.textContent = 'Gagal, coba lagi';
      setTimeout(()=>{ btn.textContent = original; }, 1800);
      return;
    }

    // refresh cache sesi biar getUserName() ikut update, terus perbarui tampilan nama
    await setLoggedIn();
    document.getElementById('phName').textContent = getUserName();

    btn.textContent = 'Tersimpan ✓';
    setTimeout(()=>{ btn.textContent = original; }, 1800);
  });

});