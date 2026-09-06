// isLoggedIn()/onAuthReady()/getCurrentUser()/getUserName() ada di auth.js (dimuat sebelum file ini).

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

let selectedFiles = [];

onAuthReady(() => {

  // Halaman ini butuh login — kalau belum, tendang ke login dulu.
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=upload.html';
    return;
  }

  const form = document.getElementById('uploadForm');
  const dropzone = document.getElementById('dropzone');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const errPhotos = document.getElementById('err-photos');
  const submitBtn = document.getElementById('submitBtn');
  const formMsg = document.getElementById('formMsg');

  const avatarBtn = document.getElementById('avatarBtn');
  const user = getCurrentUser();
  const userAvatar = user?.user_metadata?.avatar_url;
  if (avatarBtn && userAvatar) avatarBtn.querySelector('img').src = userAvatar;

  // ---------- pilih foto (klik dropzone atau drag & drop) ----------
  dropzone.addEventListener('click', () => photoInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
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
      if (selectedFiles.length >= MAX_PHOTOS) {
        errPhotos.textContent = `Maksimal ${MAX_PHOTOS} foto.`;
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
      selectedFiles.push(file);
    }
    renderPreview();
  }

  function renderPreview() {
    photoPreview.innerHTML = selectedFiles.map((file, i) => `
      <div class="photo-thumb" data-index="${i}">
        <img src="${URL.createObjectURL(file)}" alt="Foto ${i + 1}">
        <button type="button" class="remove-photo" data-index="${i}" aria-label="Hapus foto">✕</button>
      </div>
    `).join('');

    photoPreview.querySelectorAll('.remove-photo').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles.splice(parseInt(btn.dataset.index, 10), 1);
        renderPreview();
      });
    });
  }

  // ---------- validasi field teks ----------
  function setError(id, message) {
    const errEl = document.getElementById(`err-${id}`);
    const inputEl = document.getElementById(id);
    if (errEl) errEl.textContent = message || '';
    if (inputEl) inputEl.classList.toggle('invalid', !!message);
  }

  function validate() {
    let ok = true;

    const name = document.getElementById('itemName').value.trim();
    if (!name) { setError('itemName', 'Nama barang wajib diisi.'); ok = false; }
    else setError('itemName', '');

    const kategori = document.getElementById('itemKategori').value;
    if (!kategori) { setError('itemKategori', 'Pilih kategori.'); ok = false; }
    else setError('itemKategori', '');

    const kondisi = document.getElementById('itemKondisi').value;
    if (!kondisi) { setError('itemKondisi', 'Pilih kondisi.'); ok = false; }
    else setError('itemKondisi', '');

    const lokasi = document.getElementById('itemLokasi').value.trim();
    if (!lokasi) { setError('itemLokasi', 'Lokasi wajib diisi.'); ok = false; }
    else setError('itemLokasi', '');

    const deskripsi = document.getElementById('itemDeskripsi').value.trim();
    if (!deskripsi) { setError('itemDeskripsi', 'Deskripsi wajib diisi.'); ok = false; }
    else setError('itemDeskripsi', '');

    if (selectedFiles.length === 0) {
      errPhotos.textContent = 'Upload minimal 1 foto barang.';
      ok = false;
    }

    return ok;
  }

  // ---------- submit: upload foto ke Storage, lalu insert ke tabel items ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    formMsg.className = 'form-msg';

    if (!validate()) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      formMsg.textContent = 'Sesi login bermasalah, coba muat ulang halaman.';
      formMsg.classList.add('error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengupload…';

    try {
      // 1) upload semua foto ke bucket "items", folder per user
      const photoUrls = [];
      for (const file of selectedFiles) {
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

        photoUrls.push(publicUrlData.publicUrl);
      }

      // 2) susun data barang & insert ke tabel "items"
      const tags = document.getElementById('itemTags').value
        .split(',').map(t => t.trim()).filter(Boolean);

      const memberSince = currentUser.created_at
        ? new Date(currentUser.created_at).getFullYear().toString()
        : new Date().getFullYear().toString();

      const newItem = {
        user_id: currentUser.id,
        name: document.getElementById('itemName').value.trim(),
        kategori: document.getElementById('itemKategori').value,
        jenis: document.querySelector('.f-jenis:checked').value,
        kondisi: document.getElementById('itemKondisi').value,
        lokasi: document.getElementById('itemLokasi').value.trim(),
        jarak: 0,
        description: document.getElementById('itemDeskripsi').value.trim(),
        tags,
        photos: photoUrls,
        photo: photoUrls[0],
        owner: currentUser.user_metadata?.full_name || getUserName(),
        avatar: currentUser.user_metadata?.avatar_url || 'https://i.pravatar.cc/80?img=47',
        rating: 5,
        member_since: memberSince,
        status: 'Aktif',
      };

      const { data: inserted, error: insertError } = await supabaseClient
        .from('items')
        .insert(newItem)
        .select()
        .single();

      if (insertError) throw new Error('Gagal menyimpan barang: ' + insertError.message);

      formMsg.textContent = 'Barang berhasil diupload! Mengalihkan…';
      formMsg.classList.add('success');

      setTimeout(() => {
        window.location.href = `detail.html?id=${inserted.id}`;
      }, 900);

    } catch (err) {
      formMsg.textContent = err.message || 'Terjadi kesalahan, coba lagi.';
      formMsg.classList.add('error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Barang';
    }
  });

});
