// =========================================================
// reUseId - PICKER LOKASI DI PETA (Leaflet + OpenStreetMap)
// =========================================================
// Dipakai upload.js dan edit.js. Leaflet (variabel global "L") harus
// dimuat SEBELUM file ini. Peta & pencarian gratis, tanpa API key.
// =========================================================

const MAP_DEFAULT_CENTER = { lat: -7.4706, lng: 110.2177 }; // pusat Kota Magelang

// ---------- AREA LAYANAN: baru Kota & Kabupaten Magelang ----------
const MAP_AREA_NAME = "Kota & Kabupaten Magelang";
// kotak kasar yang membungkus Kota + Kab. Magelang (cek cepat tanpa internet)
const MAP_AREA_BOUNDS = {
  south: -7.72,
  north: -7.15,
  west: 110.02,
  east: 110.5,
};
// titik yang SELALU boleh walau dekat batas wilayah (Pucuk Gunung Andong, Ngablak)
// kalau titik puncaknya masih ditolak, geser lat/lng atau perbesar radiusKm
const MAP_AREA_EXCEPTIONS = [{ lat: -7.385, lng: 110.43, radiusKm: 4 }];

function mapDistKm(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapInExceptionZone(lat, lng) {
  return MAP_AREA_EXCEPTIONS.some(
    (z) => mapDistKm(lat, lng, z.lat, z.lng) <= z.radiusKm,
  );
}

// cek cepat: di dalam kotak Magelang (atau zona pengecualian)?
function mapInAreaBounds(lat, lng) {
  const b = MAP_AREA_BOUNDS;
  const inBox =
    lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
  return inBox || mapInExceptionZone(lat, lng);
}

// KETAT: kalau data wilayah tidak ada / gagal diambil, titik TIDAK lolos
function mapAddressInArea(address, lat, lng) {
  if (mapInExceptionZone(lat, lng)) return true;
  if (!mapInAreaBounds(lat, lng)) return false;
  if (!address) return false;
  const names = [
    address.county,
    address.city,
    address.municipality,
    address.state_district,
    address.town,
  ].filter(Boolean);
  return names.some((n) => /magelang/i.test(n));
}

// 1 request Nominatim -> alamat lengkap (dipakai buat label DAN cek wilayah)
async function mapReverseAddress(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=id&lat=${lat}&lon=${lng}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[map-picker] gagal reverse geocode:", err);
    return null;
  }
}

// alamat -> nama tempat singkat, misal "Kramat Selatan, Magelang"
function mapLabelFromData(data) {
  if (!data) return null;
  const a = data.address || {};
  const parts = [
    a.neighbourhood || a.suburb || a.village || a.city_district || a.hamlet,
    a.city || a.town || a.county,
  ].filter(Boolean);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  if (unique.length) return unique.join(", ");
  return data.display_name
    ? data.display_name.split(",").slice(0, 2).join(",").trim()
    : null;
}

function createLocationPicker(opts) {
  const { mapEl, searchInput, searchBtn, gpsBtn, labelInput, statusEl, errEl } =
    opts;
  const initial =
    opts.initial && opts.initial.lat != null && opts.initial.lng != null
      ? { lat: Number(opts.initial.lat), lng: Number(opts.initial.lng) }
      : null;

  const setStatus = (text, isError) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = isError ? "#D9534F" : "";
  };

  // Kalau Leaflet gagal dimuat (offline / diblokir), form tetap bisa dipakai tanpa koordinat.
  if (typeof L === "undefined" || !mapEl) {
    console.error(
      "[map-picker] Leaflet belum dimuat atau elemen peta tidak ditemukan.",
    );
    setStatus("Peta gagal dimuat. Isi kolom lokasi secara manual.", true);
    return {
      isConfirmed: () => true,
      getValue: () => ({ lat: null, lng: null }),
    };
  }

  const initialOk = !!initial && mapInAreaBounds(initial.lat, initial.lng);
  let lastValid = initialOk ? initial : null; // titik terakhir yang sah (di dalam area)
  let confirmed = initialOk; // sudah ada titik sah yang dipilih user / data lama
  let autoFilled = !labelInput.value.trim(); // boleh menimpa teks lokasi otomatis?
  let geoSeq = 0; // buang hasil reverse geocode yang sudah basi
  const round = (n) => Number(n.toFixed(6));

  // kalau user sudah pernah izinkan GPS di halaman lain, pakai itu buat memusatkan peta (tanpa nanya izin)
  let start = initialOk ? initial : null;
  if (!start) {
    try {
      const c = JSON.parse(sessionStorage.getItem("reuseid_user_geo"));
      if (
        c &&
        c.lat != null &&
        c.lng != null &&
        mapInAreaBounds(c.lat, c.lng)
      ) {
        start = { lat: c.lat, lng: c.lng };
      }
    } catch (e) {
      /* abaikan */
    }
  }
  const center = start || MAP_DEFAULT_CENTER;

  const map = L.map(mapEl).setView([center.lat, center.lng], start ? 16 : 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const marker = L.marker([center.lat, center.lng], { draggable: true }).addTo(
    map,
  );

  function showCoords() {
    const p = marker.getLatLng();
    setStatus(
      `📍 Titik terpilih: ${round(p.lat)}, ${round(p.lng)} — geser pin untuk memindahkan.`,
    );
  }

  function rejectPoint(msgText) {
    const back = lastValid || center;
    marker.setLatLng([back.lat, back.lng]);
    map.setView([back.lat, back.lng], map.getZoom());
    confirmed = !!lastValid;
    const msg =
      msgText ||
      `Lokasi di luar area layanan. Saat ini baru bisa untuk ${MAP_AREA_NAME}.`;
    setStatus("📍 " + msg, true);
    if (errEl) errEl.textContent = msg;
  }

  async function setPoint(lat, lng, o = {}) {
    const seq = ++geoSeq;

    // 1) cek cepat tanpa internet: jelas di luar Magelang -> tolak, pin tidak pindah
    if (!mapInAreaBounds(lat, lng)) {
      rejectPoint();
      return;
    }

    marker.setLatLng([lat, lng]);
    if (o.zoom) map.setView([lat, lng], o.zoom);
    confirmed = false; // belum sah sampai pengecekan wilayah selesai
    setStatus("Memeriksa lokasi…");

    // 2) cek teliti: nama wilayah dari Nominatim (sekalian dipakai buat label tempat)
    const data = await mapReverseAddress(lat, lng);
    if (seq !== geoSeq) return; // sudah ada klik/geser yang lebih baru

    if (!data && !mapInExceptionZone(lat, lng)) {
      rejectPoint(
        "Wilayah lokasi belum bisa diperiksa (koneksi / server peta sibuk). Coba klik lagi sebentar lagi.",
      );
      return;
    }
    if (!mapAddressInArea(data && data.address, lat, lng)) {
      rejectPoint();
      return;
    }

    lastValid = { lat, lng };
    confirmed = true;
    if (errEl) errEl.textContent = "";
    showCoords();

    const label = mapLabelFromData(data);
    if (label && autoFilled) {
      labelInput.value = label;
      labelInput.classList.remove("invalid");
    }
  }

  // user mengetik sendiri di kolom lokasi -> jangan ditimpa lagi
  labelInput.addEventListener("input", () => {
    autoFilled = !labelInput.value.trim();
  });

  marker.on("dragend", () => {
    const p = marker.getLatLng();
    setPoint(p.lat, p.lng);
  });
  map.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));

  // ---------- tombol "Lokasi saya" (GPS) ----------
  if (gpsBtn) {
    gpsBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setStatus(
          "Browser kamu tidak mendukung lokasi. Geser pin secara manual.",
          true,
        );
        return;
      }
      setStatus("Mencari lokasimu…");
      gpsBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsBtn.disabled = false;
          setPoint(pos.coords.latitude, pos.coords.longitude, { zoom: 17 });
        },
        () => {
          gpsBtn.disabled = false;
          setStatus(
            "Lokasi tidak bisa diambil (izin ditolak atau GPS mati). Geser pin secara manual saja.",
            true,
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }

  // ---------- cari tempat / alamat ----------
  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    setStatus("Mencari…");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!data.length) {
        setStatus(
          "Tempat tidak ditemukan. Coba kata kunci lain atau geser pin secara manual.",
          true,
        );
        return;
      }
      setPoint(parseFloat(data[0].lat), parseFloat(data[0].lon), { zoom: 17 });
    } catch (err) {
      setStatus("Gagal mencari tempat. Cek koneksi internet.", true);
    }
  }
  if (searchBtn) searchBtn.addEventListener("click", doSearch);
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      } // cegah form ikut ter-submit
    });
  }

  if (initialOk) showCoords();
  else if (initial) {
    setStatus(
      `📍 Titik lama di luar ${MAP_AREA_NAME}. Pilih titik baru di dalam area.`,
      true,
    );
  }

  // titik lama (halaman edit) juga dicek nama wilayahnya, bukan cuma kotak kasar
  if (initialOk) {
    mapReverseAddress(initial.lat, initial.lng).then((data) => {
      if (geoSeq !== 0) return; // user sudah pilih titik baru, jangan ditimpa
      if (!data || mapAddressInArea(data.address, initial.lat, initial.lng))
        return;
      lastValid = null;
      confirmed = false;
      setStatus(
        `📍 Titik lama di luar ${MAP_AREA_NAME}. Pilih titik baru di dalam area.`,
        true,
      );
    });
  }

  setTimeout(() => map.invalidateSize(), 250); // jaga-jaga ukuran kontainer berubah setelah render

  return {
    map,
    marker,
    isConfirmed: () => confirmed,
    getValue: () => {
      const p = lastValid || marker.getLatLng();
      return { lat: round(p.lat), lng: round(p.lng) };
    },
  };
}
