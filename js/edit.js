// isLoggedIn()/onAuthReady()/getCurrentUser()/getUserName() ada di auth.js (dimuat sebelum file ini).

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

let existingPhotoUrls = []; // foto lama yang masih dipertahankan
let newFiles = [];          // foto baru yang mau ditambahkan
let itemId = null;

onAuthReady(async () => {

  // Halaman ini butuh login — kalau belum, tendang ke login dulu.
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  itemId = params.get('id');

  const pageSub = document.getElementById('pageSub');
  const form = document.getElementById('editForm');
  const formMsg = document.getElementById('formMsg');

  if (!itemId) {
    pageSub.textContent = 'Barang tidak ditemukan.';
    return;
  }

  const currentUser = getCurrentUser();
  const avatarBtn = document.getElementById('avatarBtn');
  const userAvatar = currentUser?.user_metadata?.avatar_url;
  if (avatarBtn && userAvatar) avatarBtn.querySelector('img').src = userAvatar;

  // ---------- render foto lama (bisa dihapus) — didefinisikan duluan karena dipakai sebelum data barang selesai diambil ----------
  const existingPhotosEl = document.getElementById('existingPhotos');

  function renderExistingPhotos() {
    existingPhotosEl.innerHTML = existingPhotoUrls.map((url, i) => `
      <div class="photo-thumb" data-index="${i}">
        <img src="${url}" alt="Foto ${i + 1}">
        <button type="button" class="remove-photo" data-index="${i}" aria-label="Hapus foto">✕</button>
      </div>
    `).join('');

    existingPhotosEl.querySelectorAll('.remove-photo').forEach(btn => {
      btn.addEventListener('click', () => {
        if (existingPhotoUrls.length + newFiles.length <= 1) {
          document.getElementById('err-photos').textContent = 'Minimal harus ada 1 foto.';
          return;
        }
        existingPhotoUrls.splice(parseInt(btn.dataset.index, 10), 1);
        renderExistingPhotos();
      });
    });
  }

  // ---------- ambil data barang, pastikan miliknya sendiri ----------
  let item;
  try {
    const res = await supabaseClient
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (res.error || !res.data) {
      pageSub.textContent = 'Barang tidak ditemukan atau sudah dihapus.';
      return;
    }
    item = res.data;
  } catch (err) {
    pageSub.textContent = 'Gagal memuat barang: ' + (err.message || err);
    return;
  }

  if (item.user_id !== currentUser.id) {
    pageSub.textContent = 'Kamu tidak punya akses buat mengedit barang ini.';
    return;
  }

  try {
    // ---------- isi form dengan data lama ----------
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemKategori').value = item.kategori || '';
    document.getElementById('itemKondisi').value = item.kondisi || '';
    document.getElementById('itemLokasi').value = item.lokasi || '';
    document.getElementById('itemDeskripsi').value = item.description || '';
    document.getElementById('itemTags').value = (item.tags || []).join(', ');

    const jenisRadio = document.querySelector(`.f-jenis[value="${item.jenis}"]`);
    if (jenisRadio) jenisRadio.checked = true;

    existingPhotoUrls = [...(item.photos || [])];
    renderExistingPhotos();

    pageSub.textContent = 'Ubah detail barangmu. Perubahan langsung tersimpan ke Re:Use.ID.';
    form.hidden = false;
  } catch (err) {
    pageSub.textContent = 'Gagal menampilkan form edit: ' + (err.message || err);
    return;
  }

  // ---------- pilih foto baru (klik dropzone atau drag & drop) ----------
  const dropzone = document.getElementById('dropzone');
  const photoInput = document.getElementById('photoInput');
  const newPhotoPreview = document.getElementById('newPhotoPreview');
  const errPhotos = document.getElementById('err-photos');

  dropzone.addEventListener('click', () => photoInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });
  photoInput.addEventListener('change', () => {
    addFiles(photoInput.files);
    photoInput.value = '';
  });

  function addFiles(fileList) {
    errPhotos.textContent = '';
    for (const file of fileList) {
      if (existingPhotoUrls.length + newFiles.length >= MAX_PHOTOS) {
        errPhotos.textContent = `Maksimal ${MAX_PHOTOS} foto total.`;
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errPhotos.textContent = 'Format foto harus PNG, JPG, atau WEBP.';
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errPhotos.textContent = `Ukuran tiap foto maksimal ${MAX_SIZE_MB}MB.`;
        continue;
      }
      newFiles.push(file);
    }
    renderNewPreview();
  }

  function renderNewPreview() {
    newPhotoPreview.innerHTML = newFiles.map((file, i) => `
      <div class="photo-thumb" data-index="${i}">
        <img src="${URL.createObjectURL(file)}" alt="Foto baru ${i + 1}">
        <button type="button" class="remove-photo" data-index="${i}" aria-label="Hapus foto">✕</button>
      </div>
    `).join('');

    newPhotoPreview.querySelectorAll('.remove-photo').forEach(btn => {
      btn.addEventListener('click', () => {
        newFiles.splice(parseInt(btn.dataset.index, 10), 1);
        renderNewPreview();
      });
    });
  }

  // ---------- validasi ----------
  function setError(id, message) {
    const errEl = document.getElementById(`err-${id}`);
    const inputEl = document.getElementById(id);
    if (errEl) errEl.textContent = message || '';
    if (inputEl) inputEl.classList.toggle('invalid', !!message);
  }

  function validate() {
    let ok = true;

    if (!document.getElementById('itemName').value.trim()) { setError('itemName', 'Nama barang wajib diisi.'); ok = false; }
    else setError('itemName', '');

    if (!document.getElementById('itemKategori').value) { setError('itemKategori', 'Pilih kategori.'); ok = false; }
    else setError('itemKategori', '');

    if (!document.getElementById('itemKondisi').value) { setError('itemKondisi', 'Pilih kondisi.'); ok = false; }
    else setError('itemKondisi', '');

    if (!document.getElementById('itemLokasi').value.trim()) { setError('itemLokasi', 'Lokasi wajib diisi.'); ok = false; }
    else setError('itemLokasi', '');

    if (!document.getElementById('itemDeskripsi').value.trim()) { setError('itemDeskripsi', 'Deskripsi wajib diisi.'); ok = false; }
    else setError('itemDeskripsi', '');

    if (existingPhotoUrls.length + newFiles.length === 0) {
      errPhotos.textContent = 'Minimal harus ada 1 foto barang.';
      ok = false;
    }

    return ok;
  }

  // ---------- submit: upload foto baru (kalau ada), lalu update tabel items ----------
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    formMsg.className = 'form-msg';

    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan…';

    try {
      const uploadedUrls = [];
      for (const file of newFiles) {
        const ext = file.name.split('.').pop();
        const filePath = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabaseClient
          .storage
          .from('items')
          .upload(filePath, file);

        if (uploadError) throw new Error('Gagal upload foto: ' + uploadError.message);

        const { data: publicUrlData } = supabaseClient
          .storage
          .from('items')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const finalPhotos = [...existingPhotoUrls, ...uploadedUrls];
      const tags = document.getElementById('itemTags').value
        .split(',').map(t => t.trim()).filter(Boolean);

      const { error: updateError } = await supabaseClient
        .from('items')
        .update({
          name: document.getElementById('itemName').value.trim(),
          kategori: document.getElementById('itemKategori').value,
          jenis: document.querySelector('.f-jenis:checked').value,
          kondisi: document.getElementById('itemKondisi').value,
          lokasi: document.getElementById('itemLokasi').value.trim(),
          description: document.getElementById('itemDeskripsi').value.trim(),
          tags,
          photos: finalPhotos,
          photo: finalPhotos[0],
        })
        .eq('id', itemId);

      if (updateError) throw new Error('Gagal menyimpan perubahan: ' + updateError.message);

      formMsg.textContent = 'Perubahan tersimpan! Mengalihkan…';
      formMsg.classList.add('success');

      setTimeout(() => {
        window.location.href = `detail.html?id=${itemId}`;
      }, 900);

    } catch (err) {
      formMsg.textContent = err.message || 'Terjadi kesalahan, coba lagi.';
      formMsg.classList.add('error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan Perubahan';
    }
  });

});
