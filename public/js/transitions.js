// transitions.js - simple fade / slide transitions between pages
(function(){
  const root = document.documentElement;
  // Persist last page path
  try { localStorage.setItem('vitato_lastPage', window.location.pathname); } catch {}
  document.body.classList.add('page-enter');
  requestAnimationFrame(()=>{
    document.body.classList.add('page-enter-active');
  });
  // Intercept internal links for fade-out
  function handleClick(e){
    const a = e.target.closest('a');
    if(!a) return; if(a.target==='_blank' || a.hasAttribute('data-no-transition')) return;
    const url = a.getAttribute('href');
    if(!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return;
    if(new URL(url, location.href).origin !== location.origin) return;
    e.preventDefault();
    document.body.classList.add('page-exit');
    document.body.classList.remove('page-enter','page-enter-active');
  setTimeout(()=>{ window.location.href = url; }, 160); // match CSS duration
  }
  document.addEventListener('click', handleClick);
})();
