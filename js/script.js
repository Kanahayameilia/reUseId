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

  // Ubah nav "Mulai Sekarang" jadi "Profil Saya" kalau user sudah login.
  // isLoggedIn() datang dari auth.js (dimuat sebelum file ini).
  if(typeof isLoggedIn === 'function' && isLoggedIn()){
    const navAuthCta = document.getElementById('navAuthCta');
    if(navAuthCta){
      navAuthCta.textContent = 'Profil Saya';
      navAuthCta.href = 'profile.html';
    }
  }