// isLoggedIn/setLoggedIn ada di auth.js (dimuat sebelum file ini).

document.querySelectorAll('.toggle-eye').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target = document.getElementById(btn.dataset.target);
    target.type = target.type === 'password' ? 'text' : 'password';
  });
});

const form = document.getElementById('loginForm');

function showError(field, message){
  document.getElementById(`err-${field}`).textContent = message;
  document.getElementById(field)?.classList.add('invalid');
}
function clearError(field){
  document.getElementById(`err-${field}`).textContent = '';
  document.getElementById(field)?.classList.remove('invalid');
}

form.querySelectorAll('input').forEach(input=>{
  input.addEventListener('input', ()=> clearError(input.id));
});

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  clearError('email');
  clearError('password');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  let hasError = false;

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    showError('email', 'Format email nggak valid.');
    hasError = true;
  }
  if(password.length === 0){
    showError('password', 'Password wajib diisi.');
    hasError = true;
  }

  if(hasError) return;

  // ---------- demo login: langsung dianggap berhasil ----------
  // Di app nyata, ini akan verifikasi ke server dulu.
  const submitBtn = form.querySelector('.btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Masuk…';

  setTimeout(()=>{
    setLoggedIn(email.split('@')[0]);

    // kalau tadi diarahkan ke sini dari halaman lain (misal detail.html),
    // balik ke halaman itu setelah login. Kalau nggak ada, ke browse.html.
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || 'browse.html';
    window.location.href = redirect;
  }, 700);
});