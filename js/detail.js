// ITEMS ada di item_data.js, supabaseClient ada di supabase-client.js, isLoggedIn() ada di auth.js
// (semua dimuat sebelum file ini).

(async function () {

  // ---------- ambil barang berdasarkan ?id= di URL ----------
  // ID barang dummy berupa angka (1, 2, 3, ...), ID barang asli dari Supabase berupa uuid (teks).
  // Makanya dicocokkan sebagai string biar dua-duanya kebaca benar.
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');

  let item = ITEMS.find(i => String(i.id) === requestedId);

  if (!item) {
    try {
      const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .eq('id', requestedId)
        .single();

      if (!error && data) {
        item = {
          ...data,
          photos: data.photos?.length ? data.photos : [data.photo || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=900&fit=crop'],
          tags: data.tags || [],
          owner: data.owner || 'Pengguna Re:Use.ID',
          avatar: data.avatar || 'https://i.pravatar.cc/80?img=47',
          rating: data.rating || 5,
          memberSince: data.member_since || new Date(data.created_at).getFullYear().toString(),
        };
      }
    } catch (err) {
      console.error('Gagal memuat barang dari Supabase:', err);
    }
  }

  if (!item) item = ITEMS[0]; // fallback terakhir: barang pertama

  // ---------- render info utama ----------
  document.title = `${item.name} | Re:Use.ID`;

  const badgeEl = document.getElementById('itemBadge');
  badgeEl.textContent = item.jenis.toUpperCase();
  badgeEl.classList.add(item.jenis === 'Barter' ? 'barter' : 'donasi');

  document.getElementById('itemName').textContent = item.name;

  const starCount = { "Layak": 3, "Baik": 4, "Sangat Baik": 5 }[item.kondisi] || 4;
  document.getElementById('itemCondition').innerHTML =
    `Kondisi: ${item.kondisi} <span class="stars">${'⭐'.repeat(starCount)}</span>`;

  document.getElementById('itemDescription').textContent = item.description;

  document.getElementById('itemTags').innerHTML =
    (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

  document.getElementById('ownerAvatar').src = item.avatar;
  document.getElementById('ownerAvatar').alt = item.owner;
  document.getElementById('ownerName').textContent = item.owner;
  document.getElementById('ownerRating').innerHTML =
    `⭐ ${item.rating}/5 &nbsp;·&nbsp; Member sejak ${item.memberSince}`;

  const jarak = item.jarak || 0;
  document.getElementById('itemLocation').textContent =
    `📍 ${jarak * 1000 < 1000 ? Math.round(jarak * 1000) + 'm' : jarak + 'km'} dari lokasi Anda — ${item.lokasi}`;

  // ---------- gallery ----------
  const mainPhoto = document.getElementById('mainPhoto');
  const thumbRow = document.getElementById('thumbRow');

  mainPhoto.src = item.photos[0];
  mainPhoto.alt = item.name;

  thumbRow.innerHTML = item.photos.map((src, i) => `
    <button class="thumb ${i === 0 ? 'active' : ''}" data-src="${src}">
      <img src="${src}" alt="${item.name} — foto ${i + 1}">
    </button>
  `).join('');

  thumbRow.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      mainPhoto.src = thumb.dataset.src;
      thumbRow.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // ---------- barang serupa: kategori sama, exclude barang ini sendiri (dari data dummy) ----------
  const similarItems = ITEMS
    .filter(i => String(i.id) !== String(item.id) && i.kategori === item.kategori)
    .slice(0, 4);

  // kalau kurang dari 4, tambahin barang lain (selain item ini) sampai 4
  if (similarItems.length < 4) {
    const fillers = ITEMS.filter(i => String(i.id) !== String(item.id) && !similarItems.includes(i));
    similarItems.push(...fillers.slice(0, 4 - similarItems.length));
  }

  const similarScroll = document.getElementById('similarScroll');

  similarScroll.innerHTML = similarItems.map(sim => {
    const badgeClass = sim.jenis === 'Barter' ? 'barter' : 'donasi';
    return `
      <article class="sim-card">
        <a href="detail.html?id=${sim.id}" class="sim-photo">
          <span class="sim-badge ${badgeClass}">${sim.jenis.toUpperCase()}</span>
          <img src="${sim.photo}" alt="${sim.name}" loading="lazy">
        </a>
        <div class="sim-body">
          <div class="sim-title">${sim.name}</div>
          <div class="sim-distance">📍 ${sim.jarak} km — ${sim.lokasi}</div>
          <a href="detail.html?id=${sim.id}" class="sim-btn">Lihat Detail</a>
        </div>
      </article>
    `;
  }).join('');

  // ---------- CTA butuh login ----------
  // isLoggedIn() ada di auth.js (dimuat sebelum file ini).
  function requireLogin(action) {
    if (isLoggedIn()) {
      action();
    } else {
      window.location.href = `login.html?redirect=detail.html?id=${item.id}`;
    }
  }

  document.getElementById('btnAjukanBarter').addEventListener('click', () => {
    requireLogin(() => alert('Fitur ajukan barter akan segera hadir.'));
  });
  document.getElementById('btnHubungiPemilik').addEventListener('click', () => {
    requireLogin(() => alert('Fitur chat pemilik akan segera hadir.'));
  });

})();
