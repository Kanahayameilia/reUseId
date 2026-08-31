// ---------- status login (Supabase Auth) ----------
// Menggantikan versi lama yang pakai localStorage.
// Nama fungsi sengaja DIPERTAHANKAN sama (isLoggedIn, setLoggedIn, logout, getUserName)
// supaya browse.js / detail.js / profile.js / signup.js / login.js / script.js
// yang sudah manggil fungsi-fungsi ini TIDAK PERLU diubah strukturnya.
//
// PENTING: getSession() itu async, jadi status login di-cache di variabel dan
// baru akurat SETELAH event 'auth-ready' terpicu. Halaman yang langsung manggil
// isLoggedIn() saat script pertama jalan (browse.js, profile.js) perlu dibungkus
// dengan document.addEventListener('auth-ready', () => { ...kode lama... })
// biar nggak sempat baca status "belum login" yang keliru sebelum sesi kecek.

let _cachedSession = null;

async function initAuth(){
  const { data } = await supabaseClient.auth.getSession();
  _cachedSession = data.session;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    _cachedSession = session;
  });

  document.dispatchEvent(new CustomEvent('auth-ready'));
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
