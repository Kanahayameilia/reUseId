// ---------- status login bersama (demo) ----------
// Catatan: ini simulasi sederhana pakai localStorage supaya status login
// "nempel" antar halaman tanpa backend beneran. Di app produksi, ganti
// dengan session/token asli dari server.

const AUTH_KEY = 'reuseid_loggedIn';
const NAME_KEY = 'reuseid_userName';

function isLoggedIn(){
  return localStorage.getItem(AUTH_KEY) === 'true';
}
function getUserName(){
  return localStorage.getItem(NAME_KEY) || 'Pengguna';
}
function setLoggedIn(name){
  localStorage.setItem(AUTH_KEY, 'true');
  if(name) localStorage.setItem(NAME_KEY, name);
}
function logout(){
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(NAME_KEY);
  window.location.href = 'index.html';
}