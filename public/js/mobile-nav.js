(()=>{
  const btn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const closeBtn = document.getElementById('mobileDrawerClose');
  const overlay = drawer ? drawer.firstElementChild : null;
  const sheet = drawer ? drawer.querySelector('[role="dialog"]') : null;
   const mobileLogout = document.getElementById('mobileLogout');

  function open(){
    if(!drawer) return;
    drawer.classList.remove('hidden');
    if(sheet){ sheet.classList.remove('translate-x-[-100%]'); sheet.classList.add('translate-x-0'); }
    if(overlay){ overlay.classList.add('opacity-100'); }
    btn?.setAttribute('aria-expanded','true');
  }
  function close(){
    if(!drawer) return;
    if(sheet){ sheet.classList.add('translate-x-[-100%]'); sheet.classList.remove('translate-x-0'); }
    if(overlay){ overlay.classList.remove('opacity-100'); }
    btn?.setAttribute('aria-expanded','false');
    setTimeout(()=> drawer.classList.add('hidden'), 200);
  }

  btn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  drawer?.addEventListener('click', (e)=>{ if(e.target === drawer) close(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });

  // Close when clicking any link inside drawer
  drawer?.querySelectorAll('a, button[data-tab]')?.forEach(el=> el.addEventListener('click', ()=> setTimeout(close, 50)));
   mobileLogout?.addEventListener('click', ()=> {
     try { document.getElementById('logoutBtn')?.click(); } catch {}
   });

  // Expose minimal API
  window.MobileNav = { open, close };
})();
