// ---------- Fitur Geolokasi (asli, bukan dummy) ----------
// Modul bersama dipakai di browse.js, detail.js, upload.js, edit.js.
// - haversineDistance()  : hitung jarak lurus antar 2 koordinat (km)
// - reverseGeocode()     : ubah koordinat jadi nama lokasi (OpenStreetMap Nominatim, gratis, no API key)
// - getUserLocation()    : minta izin lokasi browser, di-cache di sessionStorage biar nggak nanya berulang
// - computeItemDistance(): jarak asli user -> barang, fallback ke field "jarak" lama kalau barang belum punya koordinat

const GEO_CACHE_KEY = 'reuseid_user_geo';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius bumi, km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { 'Accept-Language': 'id' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return addr.suburb || addr.village || addr.city_district || addr.town || addr.city
      || data.display_name?.split(',')[0] || null;
  } catch (err) {
    console.error('Gagal reverse geocode:', err);
    return null;
  }
}

// Minta lokasi user via browser Geolocation API.
// Di-cache di sessionStorage supaya user cuma di-prompt izin sekali per sesi tab.
function getUserLocation() {
  return new Promise((resolve) => {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      try { return resolve(JSON.parse(cached)); } catch (e) { /* cache rusak, lanjut minta ulang */ }
    }

    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        loc.label = await reverseGeocode(loc.lat, loc.lng);
        sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(loc));
        resolve(loc);
      },
      (err) => {
        console.warn('Izin lokasi ditolak/gagal:', err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  });
}

// Hapus cache lokasi (dipakai kalau user mau ambil ulang lokasinya, misal di form upload/edit).
function clearUserLocationCache() {
  sessionStorage.removeItem(GEO_CACHE_KEY);
}

// Jarak asli user -> item, dalam km, dibulatkan 1 desimal.
// Kalau item belum punya latitude/longitude (barang lama) atau lokasi user nggak diketahui,
// fallback ke field "jarak" statis yang sudah ada biar UI nggak error.
function computeItemDistance(item, userLoc) {
  if (!userLoc || item.latitude == null || item.longitude == null) {
    return item.jarak ?? 0;
  }
  const km = haversineDistance(userLoc.lat, userLoc.lng, item.latitude, item.longitude);
  return Math.round(km * 10) / 10;
}