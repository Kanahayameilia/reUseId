// =========================================================
// reUseId - PICKER LOKASI DI PETA (Leaflet + OpenStreetMap)
// =========================================================
// Dipakai upload.js dan edit.js. Leaflet (variabel global "L") harus
// dimuat SEBELUM file ini. Peta & pencarian gratis, tanpa API key.
// =========================================================

const MAP_DEFAULT_CENTER = { lat: -7.4706, lng: 110.2177 }; // pusat Kota Magelang

// koordinat -> nama tempat singkat, misal "Kramat Selatan, Magelang"
async function mapReverseLabel(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=id&lat=${lat}&lon=${lng}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.neighbourhood || a.suburb || a.village || a.city_district || a.hamlet,
      a.city || a.town || a.county,
    ].filter(Boolean);
    const unique = parts.filter((p, i) => parts.indexOf(p) === i);
    if (unique.length) return unique.join(', ');
    return data.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : null;
  } catch (err) {
    console.error('[map-picker] gagal reverse geocode:', err);
    return null;
  }
}

function createLocationPicker(opts) {
  const { mapEl, searchInput, searchBtn, gpsBtn, labelInput, statusEl, errEl } = opts;
  const initial = opts.initial && opts.initial.lat != null && opts.initial.lng != null
    ? { lat: Number(opts.initial.lat), lng: Number(opts.initial.lng) }
    : null;

  const setStatus = (text, isError) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#D9534F' : '';
  };

  // Kalau Leaflet gagal dimuat (offline / diblokir), form tetap bisa dipakai tanpa koordinat.
  if (typeof L === 'undefined' || !mapEl) {
    console.error('[map-picker] Leaflet belum dimuat atau elemen peta tidak ditemukan.');
    setStatus('Peta gagal dimuat. Isi kolom lokasi secara manual.', true);
    return { isConfirmed: () => true, getValue: () => ({ lat: null, lng: null }) };
  }

  let confirmed = !!initial;                       // sudah ada titik yang dipilih user / data lama
  let autoFilled = !labelInput.value.trim();       // boleh menimpa teks lokasi otomatis?
  let geoSeq = 0;                                  // buang hasil reverse geocode yang sudah basi
  const round = (n) => Number(n.toFixed(6));

  // kalau user sudah pernah izinkan GPS di halaman lain, pakai itu buat memusatkan peta (tanpa nanya izin)
  let start = initial;
  if (!start) {
    try {
      const c = JSON.parse(sessionStorage.getItem('reuseid_user_geo'));
      if (c && c.lat != null && c.lng != null) start = { lat: c.lat, lng: c.lng };
    } catch (e) { /* abaikan */ }
  }
  const center = start || MAP_DEFAULT_CENTER;

  const map = L.map(mapEl).setView([center.lat, center.lng], start ? 16 : 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const marker = L.marker([center.lat, center.lng], { draggable: true }).addTo(map);

  function showCoords() {
    const p = marker.getLatLng();
    setStatus(`📍 Titik terpilih: ${round(p.lat)}, ${round(p.lng)} — geser pin untuk memindahkan.`);
  }

  async function fillLabel(lat, lng) {
    const seq = ++geoSeq;
    const label = await mapReverseLabel(lat, lng);
    if (seq !== geoSeq || !label) return;
    if (autoFilled) {
      labelInput.value = label;
      labelInput.classList.remove('invalid');
    }
  }

  function setPoint(lat, lng, o = {}) {
    marker.setLatLng([lat, lng]);
    if (o.zoom) map.setView([lat, lng], o.zoom);
    confirmed = true;
    if (errEl) errEl.textContent = '';
    showCoords();
    fillLabel(lat, lng);
  }

  // user mengetik sendiri di kolom lokasi -> jangan ditimpa lagi
  labelInput.addEventListener('input', () => { autoFilled = !labelInput.value.trim(); });

  marker.on('dragend', () => { const p = marker.getLatLng(); setPoint(p.lat, p.lng); });
  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng));

  // ---------- tombol "Lokasi saya" (GPS) ----------
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        setStatus('Browser kamu tidak mendukung lokasi. Geser pin secara manual.', true);
        return;
      }
      setStatus('Mencari lokasimu…');
      gpsBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsBtn.disabled = false;
          setPoint(pos.coords.latitude, pos.coords.longitude, { zoom: 17 });
        },
        () => {
          gpsBtn.disabled = false;
          setStatus('Lokasi tidak bisa diambil (izin ditolak atau GPS mati). Geser pin secara manual saja.', true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // ---------- cari tempat / alamat ----------
  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    setStatus('Mencari…');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!data.length) {
        setStatus('Tempat tidak ditemukan. Coba kata kunci lain atau geser pin secara manual.', true);
        return;
      }
      setPoint(parseFloat(data[0].lat), parseFloat(data[0].lon), { zoom: 17 });
    } catch (err) {
      setStatus('Gagal mencari tempat. Cek koneksi internet.', true);
    }
  }
  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }   // cegah form ikut ter-submit
    });
  }

  if (initial) showCoords();
  setTimeout(() => map.invalidateSize(), 250);     // jaga-jaga ukuran kontainer berubah setelah render

  return {
    map,
    marker,
    isConfirmed: () => confirmed,
    getValue: () => { const p = marker.getLatLng(); return { lat: round(p.lat), lng: round(p.lng) }; },
  };
}