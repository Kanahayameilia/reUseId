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

let _cachedSession = null;
let _authReady = false;

async function initAuth(){
  const { data } = await supabaseClient.auth.getSession();
  _cachedSession = data.session;
  _authReady = true;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    _cachedSession = session;
  });

  document.dispatchEvent(new CustomEvent('auth-ready'));
}

// Dipakai di halaman-halaman (browse.js, profile.js, dst) sebagai pengganti
// document.addEventListener('auth-ready', cb) secara langsung.
// Ini nutup race condition: kalau event 'auth-ready' sudah kepicu duluan
// SEBELUM listener sempat didaftarkan (misal sesi kebaca cepat dari cache),
// addEventListener biasa nggak akan pernah manggil cb() — halaman jadi diem
// dan tombol-tombol yang listenernya didaftarkan di dalam cb() nggak berfungsi.
// onAuthReady() cek dulu apakah auth udah siap; kalau udah, langsung jalanin cb().
function onAuthReady(cb){
  if(_authReady){
    cb();
  } else {
    document.addEventListener('auth-ready', cb, { once: true });
  }
}

function isLoggedIn(){
  return _cachedSession !== null;
}

function getUserName(){
  return _cachedSession?.user?.user_metadata?.full_name || 'Pengguna';
}

function getUserId(){
  return _cachedSession?.user?.id || null;
}

// Ambil object user lengkap (id, email, user_metadata) dari sesi yang SUDAH
// di-cache — nggak nge-hit server lagi. Dipakai di halaman-halaman yang butuh
// data user (misal profile.js) sebagai pengganti supabaseClient.auth.getUser(),
// karena getUser() manggil server buat validasi ulang dan BISA GAGAL kalau
// token lagi bermasalah — kalau itu terjadi (dan nggak ditangkap try/catch),
// semua kode setelahnya (termasuk pasang listener tombol) ikut nggak jalan.
function getCurrentUser(){
  return _cachedSession?.user || null;
}

// Dulu dipanggil manual setelah signup/login buat "nyimpen" status login (localStorage).
// Sekarang Supabase Auth otomatis ngurus sesi setelah signUp()/signInWithPassword()
// berhasil — fungsi ini tinggal nge-refresh cache session-nya.
async function setLoggedIn(){
  const { data } = await supabaseClient.auth.getSession();
  _cachedSession = data.session;
}

async function logout(){
  await supabaseClient.auth.signOut();
  _cachedSession = null;
  window.location.href = 'index.html';
}

initAuth();