// landing.js - load Lottie animation with graceful fallback
(function(){
  if(!window.lottie){
    console.warn('Lottie library not loaded');
    return; 
  }
  const container = document.getElementById('lottieContainer');
  if(!container) return;
  const fallback = document.getElementById('lottieFallback');
  const logoOverlay = document.getElementById('heroLogoOverlay');

  // You can place your animation JSON at /animations/food-delivery.json
  // For now attempt to load; if 404 we'll keep fallback visible.
  fetch('/animations/food-delivery.json')
    .then(r => { if(!r.ok) throw new Error('Animation JSON missing'); return r.json(); })
    .then(data => {
      if(fallback) fallback.style.display='none';
      const anim = lottie.loadAnimation({
        container,
        animationData: data,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
      });
      anim.addEventListener('DOMLoaded', ()=>{
        if(logoOverlay) logoOverlay.classList.remove('hidden');
      });
    })
    .catch(err => {
      console.info('Using fallback illustration:', err.message);
      // Minimal pulse effect to hint interactivity
      container.classList.add('animate-pulse');
      setTimeout(()=>container.classList.remove('animate-pulse'), 1500);
    });
})();
