(async function(){
  function getToken(){ return localStorage.getItem('vitato_token'); }
  function setToken(t){ if(t) localStorage.setItem('vitato_token', t); else localStorage.removeItem('vitato_token'); }
  async function fetchSessionUser(){
    const token = getToken();
    if(!token) return null;
    try { const r = await fetch('/api/me', { headers:{ Authorization: 'Bearer '+token } }); if(!r.ok) return null; return await r.json(); } catch { return null; }
  }
  const authForm = document.getElementById('authForm');
  const toggleMode = document.getElementById('toggleMode');
  const nameField = document.getElementById('nameField');
  const submitBtn = document.getElementById('submitBtn');
  const authMsg = document.getElementById('authMsg');
  const navAuth = document.getElementById('nav-auth');
  const navUser = document.getElementById('navUser');
  const logoutBtn = document.getElementById('logoutBtn');
  let mode = 'login';

  async function refreshNav(){
    const user = await fetchSessionUser();
    if(user){
      if(navAuth){ navAuth.classList.remove('hidden'); navUser.textContent = user.name || user.email; }
      if(authForm) authForm.parentElement.innerHTML = '<p class="text-sm text-gray-600">Logged in as '+(user.name||user.email)+'. <a href="/menu.html" class="text-yellow-600 underline">Go to menu</a></p>';
    }
  }

  if(toggleMode){
    toggleMode.addEventListener('click', ()=>{
      mode = mode === 'login' ? 'signup' : 'login';
      if(mode==='signup'){ nameField.classList.remove('hidden'); submitBtn.textContent='Sign Up'; toggleMode.textContent='Have an account? Login'; }
      else { nameField.classList.add('hidden'); submitBtn.textContent='Login'; toggleMode.textContent='Need an account? Sign up'; }
      authMsg.textContent='';
    });
  }

  if(authForm){
    authForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); authMsg.textContent='';
      const formData = new FormData(authForm);
  const payload = Object.fromEntries(formData.entries());
  if(mode==='login') delete payload.role; // role only matters on signup
      try {
        const res = await fetch(mode==='login'? '/auth/login':'/auth/signup', {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(!res.ok){ authMsg.textContent = data.error || 'Error'; return; }
  if(data.token){ setToken(data.token); }
  let target = data.redirect || '/menu.html';
  try {
    const last = localStorage.getItem('vitato_lastPage');
    if(last && !['/','/index.html','/auth','/login','/signup'].includes(last)) target = last;
  } catch {}
  window.location.href = target;
      } catch { authMsg.textContent='Network error'; }
    });
  }

  if(logoutBtn){
  logoutBtn.addEventListener('click', async ()=>{ setToken(null); window.location.href='/'; });
  }

  const protectedPages = ['/menu.html','/cart.html','/track.html'];
  if (protectedPages.includes(location.pathname)) {
  const user = await fetchSessionUser();
  if(!user){ window.location.href = '/'; return; }
    if(navAuth){ navAuth.classList.remove('hidden'); navUser.textContent = user.name || user.email; }
  }

  refreshNav();
})();
