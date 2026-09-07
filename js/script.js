// Mark JS as running — CSS only hides .reveal elements when this class is present
  document.body.classList.add('js-ready');

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.15});
  revealEls.forEach(el=>io.observe(el));

  // Smooth nav CTA scroll — only for placeholder anchor links (href="#").
  // Real navigation links (e.g. href="browse.html") are left alone so they work normally.
  document.querySelectorAll('.btn-primary, .nav-cta').forEach(btn=>{
    const href = btn.getAttribute('href');
    if(href === '#' || href === null){
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        document.getElementById('how')?.scrollIntoView({behavior:'smooth'});
      });
    }
  });
  document.querySelector('.btn-secondary')?.addEventListener('click', ()=>{
    document.getElementById('why')?.scrollIntoView({behavior:'smooth'});
  });

  // Ubah semua tombol "Mulai Sekarang" / "Gabung Sekarang" (navbar, hero, CTA band)
  // jadi "Profil Saya" kalau user sudah login — biar konsisten, nggak cuma navbar.
  // isLoggedIn() datang dari auth.js (dimuat sebelum file ini).
  if(typeof isLoggedIn === 'function' && isLoggedIn()){
    const authCtas = [
      document.getElementById('navAuthCta'),
      ...document.querySelectorAll('.hero-auth-cta')
    ].filter(Boolean);

    authCtas.forEach(cta => {
      cta.textContent = 'Profil Saya';
      cta.href = 'profile.html';
    });
  }