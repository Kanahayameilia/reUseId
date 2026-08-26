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

  // Smooth nav CTA scroll (placeholder actions)
  document.querySelectorAll('.btn-primary').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    document.getElementById('how')?.scrollIntoView({
      behavior: 'smooth'
    });
  });
});

document.querySelector('.btn-secondary')?.addEventListener('click', ()=>{
  document.getElementById('why')?.scrollIntoView({
    behavior: 'smooth'
  });
});