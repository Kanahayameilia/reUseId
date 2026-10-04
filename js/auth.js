// ---------- status login (Supabase Auth) ----------
// Menggantikan versi lama yang pakai localStorage.
// Nama fungsi sengaja DIPERTAHANKAN sama (isLoggedIn, setLoggedIn, logout, getUserName)
// supaya browse.js / detail.js / profile.js / signup.js / login.js / script.js
// yang sudah manggil fungsi-fungsi ini TIDAK PERLU diubah strukturnya.
//
// PENTING: getSession() itu async, jadi status login di-cache di variabel dan
// baru akurat SETELAH event 'auth-ready' terpicu. Halaman yang langsung manggil
// isLoggedIn() saat script pertama jalan (browse.js, profile.js) perlu dibungkus
// dengan onAuthReady(() => { ...kode lama... }) biar nggak sempat baca status
// "belum login" yang keliru sebelum sesi kecek.

// ---------- daftar kampus yang boleh daftar (Kota & Kabupaten Magelang) ----------
// Dipakai signup.js (validasi + autocomplete) dan gate pilih-kampus di bawah.
// Mau nambah/hapus kampus? Cukup edit daftar ini.
const MAGELANG_CAMPUSES = [
  "Universitas Tidar",
  "Universitas Muhammadiyah Magelang",
  "STMIK Bina Patria",
  "Politeknik Muhammadiyah Magelang",
  "Politeknik Pembangunan Pertanian Magelang",
  "STAI Syubbanul Wathon",
  "Akademi Teknik Tirta Wiyata",
  "Akademi Keperawatan Karya Bhakti Nusantara",
];

function isMagelangCampus(name) {
  const n = String(name ?? "")
    .trim()
    .toLowerCase();
  return MAGELANG_CAMPUSES.some((c) => c.toLowerCase() === n);
}

let _cachedSession = null;
let _authReady = false;

async function initAuth() {
  const { data } = await supabaseClient.auth.getSession();
  _cachedSession = data.session;
  _authReady = true;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    _cachedSession = session;
  });

  document.dispatchEvent(new CustomEvent("auth-ready"));
  enforceCampusGate();
}

// ---------- gate pilih kampus ----------
// Daftar lewat form sudah divalidasi di signup.js. Tapi daftar lewat Google nggak
// lewat form itu, jadi akunnya belum punya kampus. Selama kampus belum diisi,
// tampilkan popup wajib pilih kampus (cuma dari daftar Magelang).
// Akun lama yang sudah punya kampus (walau di luar Magelang) nggak diganggu.
function enforceCampusGate() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const skip = [
    "index.html",
    "login.html",
    "signup.html",
    "forgot-password.html",
    "reset-password.html",
  ];
  if (skip.includes(page)) return;

  const user = getCurrentUser();
  if (!user) return;
  if (String(user.user_metadata?.campus ?? "").trim()) return;
  if (document.getElementById("campusGate")) return;

  const overlay = document.createElement("div");
  overlay.id = "campusGate";
  overlay.setAttribute(
    "style",
    "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:'DM Sans',sans-serif;",
  );
  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:24px;">
      <h3 style="margin:0 0 6px;font-size:1.1rem;color:#1a3c34;">Pilih asal kampusmu</h3>
      <p style="margin:0 0 16px;font-size:.88rem;line-height:1.5;color:#66756f;">
        Re:Use.ID saat ini baru untuk mahasiswa perguruan tinggi di Magelang.
        Pilih kampusmu untuk melanjutkan.
      </p>
      <select id="campusGateSelect" style="width:100%;padding:12px;border:1.5px solid #e6e9e7;border-radius:10px;font:inherit;margin-bottom:8px;">
        <option value="">— Pilih kampus —</option>
        ${MAGELANG_CAMPUSES.map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join("")}
      </select>
      <div id="campusGateErr" style="min-height:18px;font-size:.8rem;color:#c0392b;margin-bottom:8px;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" id="campusGateLogout" style="padding:10px 16px;border:1px solid #d5ddd9;background:#fff;border-radius:999px;font:inherit;font-weight:700;cursor:pointer;">Keluar</button>
        <button type="button" id="campusGateSave" style="padding:10px 18px;border:none;background:#4caf7d;color:#fff;border-radius:999px;font:inherit;font-weight:700;cursor:pointer;">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const select = overlay.querySelector("#campusGateSelect");
  const err = overlay.querySelector("#campusGateErr");
  const saveBtn = overlay.querySelector("#campusGateSave");

  overlay.querySelector("#campusGateLogout").addEventListener("click", logout);
  saveBtn.addEventListener("click", async () => {
    const campus = select.value;
    if (!isMagelangCampus(campus)) {
      err.textContent = "Pilih kampus dari daftar yang tersedia.";
      return;
    }
    saveBtn.disabled = true;
    const { error } = await supabaseClient.auth.updateUser({
      data: { campus },
    });
    if (error) {
      saveBtn.disabled = false;
      err.textContent = "Gagal menyimpan: " + error.message;
      return;
    }
    window.location.reload();
  });
}

// Dipakai di halaman-halaman (browse.js, profile.js, dst) sebagai pengganti
// document.addEventListener('auth-ready', cb) secara langsung.
// Ini nutup race condition: kalau event 'auth-ready' sudah kepicu duluan
// SEBELUM listener sempat didaftarkan (misal sesi kebaca cepat dari cache),
// addEventListener biasa nggak akan pernah manggil cb() — halaman jadi diem
// dan tombol-tombol yang listenernya didaftarkan di dalam cb() nggak berfungsi.
// onAuthReady() cek dulu apakah auth udah siap; kalau udah, langsung jalanin cb().
function onAuthReady(cb) {
  if (_authReady) {
    cb();
  } else {
    document.addEventListener("auth-ready", cb, { once: true });
  }
}

function isLoggedIn() {
  return _cachedSession !== null;
}

function getUserName() {
  return _cachedSession?.user?.user_metadata?.full_name || "Pengguna";
}

// ---------- wajib punya foto profil ----------
// Dipakai sebelum aksi yang butuh kepercayaan: upload barang, ajukan barter,
// hubungi pemilik. Return true kalau boleh lanjut. Kalau belum punya foto,
// pengguna diarahkan ke profil, lalu otomatis balik ke halaman ini setelah upload.
function hasAvatar() {
  const meta = getCurrentUser()?.user_metadata;
  return !!(meta?.avatar_url || meta?.picture);
}

function requireAvatar() {
  if (hasAvatar()) return true;
  const back =
    window.location.pathname.split("/").pop() + window.location.search;
  window.location.href =
    "profile.html?need=photo&back=" + encodeURIComponent(back);
  return false;
}

function getUserId() {
  return _cachedSession?.user?.id || null;
}

// Ambil object user lengkap (id, email, user_metadata) dari sesi yang SUDAH
// di-cache — nggak nge-hit server lagi. Dipakai di halaman-halaman yang butuh
// data user (misal profile.js) sebagai pengganti supabaseClient.auth.getUser(),
// karena getUser() manggil server buat validasi ulang dan BISA GAGAL kalau
// token lagi bermasalah — kalau itu terjadi (dan nggak ditangkap try/catch),
// semua kode setelahnya (termasuk pasang listener tombol) ikut nggak jalan.
function getCurrentUser() {
  return _cachedSession?.user || null;
}

// Dulu dipanggil manual setelah signup/login buat "nyimpen" status login (localStorage).
// Sekarang Supabase Auth otomatis ngurus sesi setelah signUp()/signInWithPassword()
// berhasil — fungsi ini tinggal nge-refresh cache session-nya.
async function setLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();
  _cachedSession = data.session;
}

async function logout() {
  await supabaseClient.auth.signOut();
  _cachedSession = null;
  window.location.href = "index.html";
}

// ---------- login / daftar pakai Google ----------
// Dipakai login.html & signup.html (auth.js dimuat di keduanya).
// Kalau datang dari halaman lain (?redirect=...), balik ke sana setelah login.
async function signInWithGoogle(btn) {
  let target = new URL("browse.html", window.location.href);
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect) {
    try {
      const u = new URL(redirect, window.location.href);
      if (u.origin === window.location.origin) target = u; // cuma boleh balik ke situs sendiri
    } catch {}
  }

  if (btn) btn.disabled = true;

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: target.href,
      queryParams: { prompt: "select_account" }, // biar bisa pilih akun kalau punya banyak
    },
  });

  if (error) {
    if (btn) btn.disabled = false;
    alert("Gagal masuk dengan Google: " + error.message);
  }
}

function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

initAuth();
