(()=>{
  const token = localStorage.getItem('vitato_token');
  if (!token) {
    try { localStorage.setItem('vitato_lastPage', location.pathname + location.search + location.hash); } catch {}
    window.location.replace('/');
    return;
  }
  // Live updates via socket.io
  let socket;
  try {
    socket = io({ auth: token ? { token } : {} });
    if(token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      socket.emit('join_user', payload.id);
    }
  } catch {}
  // Support tab buttons both in sidebar and mobile drawer
  const tabButtons = document.querySelectorAll('.tabBtn');
  const panels = document.querySelectorAll('.panel');
  const recentOrdersEl = document.getElementById('recentOrders');
  const activeOrderEl = document.getElementById('activeOrder');
  const orderHistoryEl = document.getElementById('orderHistory');
  const studentStatsEl = document.getElementById('studentStats');
  const addressList = document.getElementById('addressList');
  const addressEmpty = document.getElementById('addressEmpty');
  const addAddressBtn = document.getElementById('addAddressBtn');
  // Address modal elements
  const addressModal = document.getElementById('addressModal');
  const addressModalTitle = document.getElementById('addressModalTitle');
  const addressModalClose = document.getElementById('addressModalClose');
  const addressCancelBtn = document.getElementById('addressCancel');
  const addressForm = document.getElementById('addressForm');
  const addressFormMsg = document.getElementById('addressFormMsg');
  let addresses = [];
  let ordersCache = [];

  function switchTab(name){
    tabButtons.forEach(btn=>{
      const active = btn.getAttribute('data-tab')===name;
      btn.classList.toggle('bg-yellow-400', active);
      btn.classList.toggle('text-gray-900', active);
      btn.classList.toggle('border', !active);
    });
    panels.forEach(p=>{
      p.classList.toggle('hidden', p.getAttribute('data-panel')!==name);
    });
  }
  tabButtons.forEach(btn=> btn.addEventListener('click', ()=> {
    const name = btn.getAttribute('data-tab');
    if(name) switchTab(name);
    // Close mobile drawer if open
    try { closeMobileDrawer(); } catch {}
    try { if (typeof window.closeMobileDropdown === 'function') window.closeMobileDropdown(); } catch {}
  }));

  // -------- Mobile Drawer toggle --------
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileDropdown = document.getElementById('mobileDropdown');
  const mobileDrawerClose = document.getElementById('mobileDrawerClose');
  const mobileLogout = document.getElementById('mobileLogout');

  function openMobileDrawer(){
    if(!mobileDrawer) return;
    mobileDrawer.classList.remove('hidden');
    try { mobileDrawer.style.display = 'block'; mobileDrawer.setAttribute('aria-hidden','false'); } catch {}
    const sheet = mobileDrawer.querySelector('[role="dialog"]');
    const overlay = mobileDrawer.firstElementChild;
    if(sheet){
      sheet.classList.remove('translate-x-[-100%]');
      sheet.classList.add('translate-x-0');
      // Inline style fallback for older mobile browsers
      try { sheet.style.transform = 'translateX(0)'; } catch {}
    }
    if(overlay){
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
      try { overlay.style.opacity = '1'; } catch {}
    }
    if(mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded','true');
  }
  function closeMobileDrawer(){
    if(!mobileDrawer) return;
    const sheet = mobileDrawer.querySelector('[role="dialog"]');
    const overlay = mobileDrawer.firstElementChild;
    if(sheet){
      sheet.classList.add('translate-x-[-100%]');
      sheet.classList.remove('translate-x-0');
      try { sheet.style.transform = 'translateX(-100%)'; } catch {}
    }
    if(overlay){
      overlay.classList.add('opacity-0');
      overlay.classList.remove('opacity-100');
      try { overlay.style.opacity = '0'; } catch {}
    }
    if(mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded','false');
    // hide after animation
    setTimeout(()=> { 
      mobileDrawer.classList.add('hidden'); 
      try { mobileDrawer.style.display = 'none'; mobileDrawer.setAttribute('aria-hidden','true'); } catch {}
    }, 200);
  }
  if (mobileDrawer) {
    mobileMenuBtn?.addEventListener('click', openMobileDrawer);
    // Also bind touchstart for some mobile browsers
    mobileMenuBtn?.addEventListener('touchstart', (e)=> { e.preventDefault(); openMobileDrawer(); }, { passive: false });
    mobileDrawerClose?.addEventListener('click', closeMobileDrawer);
    // Close when clicking overlay explicitly
    const overlayEl = mobileDrawer?.firstElementChild;
    overlayEl?.addEventListener('click', closeMobileDrawer);
    overlayEl?.addEventListener('touchstart', (e)=> { e.preventDefault(); closeMobileDrawer(); }, { passive: false });
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeMobileDrawer(); });
  } else if (mobileDropdown && mobileMenuBtn) {
    function openMobileDropdown(){ mobileDropdown.classList.remove('hidden'); mobileMenuBtn.setAttribute('aria-expanded','true'); }
    function closeMobileDropdown(){ mobileDropdown.classList.add('hidden'); mobileMenuBtn.setAttribute('aria-expanded','false'); }
    function toggleMobileDropdown(){ if(mobileDropdown.classList.contains('hidden')) openMobileDropdown(); else closeMobileDropdown(); }
    mobileMenuBtn.addEventListener('click', toggleMobileDropdown);
    mobileMenuBtn.addEventListener('touchstart', (e)=> { e.preventDefault(); toggleMobileDropdown(); }, { passive: false });
    document.addEventListener('click', (e)=>{
      if (mobileDropdown.classList.contains('hidden')) return;
      const t = e.target;
      if(!mobileDropdown.contains(t) && !mobileMenuBtn.contains(t)) closeMobileDropdown();
    });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMobileDropdown(); });
    // Ensure tab button click closes dropdown
    mobileDropdown.querySelectorAll('.tabBtn').forEach(btn=> btn.addEventListener('click', ()=> setTimeout(closeMobileDropdown, 50)));
    // Make close function available for other handlers
    window.closeMobileDropdown = closeMobileDropdown;
  }
  // Mobile logout forwards to same handler as desktop logout
  mobileLogout?.addEventListener('click', ()=> {
    try { document.getElementById('logoutBtn')?.click(); } catch {}
  });

  async function loadOrders(){
    if(!token) return;
    const res = await fetch('/api/orders', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const orders = await res.json();
    ordersCache = Array.isArray(orders) ? orders : [];
    // Helpers for rendering
    const firstItem = (o)=> (o.items && o.items[0]) ? o.items[0] : null;
    const vendorName = (o)=> firstItem(o)?.food?.vendor?.name || 'VIT-Bolt Outlet';
    const vendorAddr = (o)=> firstItem(o)?.food?.vendor?.address || '';
    const thumbUrl = (o)=> firstItem(o)?.food?.image || firstItem(o)?.food?.vendor?.image || '';
    const itemsSummary = (o)=> {
      try {
        const parts = (o.items||[]).slice(0,2).map(i=> `${i.quantity||1}× ${i.food?.name||'Item'}`);
        const more = (o.items||[]).length - 2;
        return parts.join(', ') + (more>0 ? `, +${more} more` : '');
      } catch { return ''; }
    };
    const statusInfo = (o)=>{
      const payFail = o?.payment?.status === 'failed';
      const s = o.status;
      if (payFail || s === 'cancelled') return { label: payFail? 'Payment Failed' : 'Cancelled', cls: 'bg-red-100 text-red-700' };
      if (s === 'delivered') return { label: 'Delivered', cls: 'bg-green-100 text-green-700' };
      if (s === 'out_for_delivery') return { label: 'Out for delivery', cls: 'bg-blue-100 text-blue-700' };
      return { label: 'Preparing', cls: 'bg-yellow-100 text-yellow-700' };
    };
    const dateTime = (o)=> {
      try { return new Date(o.createdAt).toLocaleString(); } catch { return ''; }
    };
    const thumb = (o, size='w-12 h-12')=> thumbUrl(o)
      ? `<img src='${thumbUrl(o)}' alt='' class='${size} rounded-md object-cover bg-gray-100'/>`
      : `<div class='${size} rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center'>🍔</div>`;

    // Recent limited (3-4 mini cards)
    const recent = orders.slice(0,4).map(o=> {
      const st = statusInfo(o);
      return `
      <div class="card p-3 fade-in">
        <div class="flex items-start gap-3">
          ${thumb(o,'w-12 h-12')}
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-semibold text-sm truncate">${vendorName(o)}</div>
                <a href="/menu.html" class="text-[11px] text-yellow-700">View menu</a>
              </div>
              <span class="status-chip ${st.cls} uppercase">${st.label}</span>
            </div>
            <div class="text-[11px] text-gray-500 truncate">${itemsSummary(o)}</div>
            <div class="flex items-center justify-between mt-1">
              <div class="text-[11px] text-gray-500 truncate">₹${o.total}</div>
              <a href="/track.html?order=${o._id}" class="text-[11px] text-yellow-700">Track</a>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
    recentOrdersEl.innerHTML = recent || '<div class="empty-state">You haven’t placed any orders yet 🍽️</div>';
    // Active: include out_for_delivery as active until delivered
    const active = orders.find(o=> o.status !== 'delivered');
    if(active){
      const statusInfo = {
        'pending': { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', text: 'PENDING' },
        'confirmed': { color: 'bg-blue-100 text-blue-800', icon: '✅', text: 'CONFIRMED' },
        'preparing': { color: 'bg-orange-100 text-orange-800', icon: '👨‍🍳', text: 'PREPARING' },
        'out_for_delivery': { color: 'bg-purple-100 text-purple-800', icon: '🚚', text: 'OUT FOR DELIVERY' },
        'delivered': { color: 'bg-green-100 text-green-800', icon: '✅', text: 'DELIVERED' }
      };
      
      const status = statusInfo[active.status] || statusInfo['pending'];
      
      activeOrderEl.innerHTML = `
        <div class='bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300' data-oid='${active._id}'>
          <div class='flex items-center justify-between mb-4'>
            <div class='flex items-center space-x-3'>
              <div class='w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center text-white font-bold'>
                ${status.icon}
              </div>
              <div>
                <div class='font-bold text-lg text-gray-900'>Order #${active._id.substring(0,6)}</div>
                <div class='text-sm text-gray-500'>Total ₹${active.total}</div>
              </div>
            </div>
            <span class='px-3 py-2 rounded-full text-xs font-semibold ${status.color}'>${status.text}</span>
          </div>
          
          <div class='border-t border-gray-100 pt-4'>
            <a href='/track.html?order=${active._id}' class='inline-flex items-center text-sm font-medium text-yellow-600 hover:text-yellow-700 transition-colors group'>
              <span>View full tracking</span>
              <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      `;
    } else {
      activeOrderEl.innerHTML = `
        <div class='text-center py-8'>
          <div class='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <span class='text-2xl'>🍽️</span>
          </div>
          <h4 class='font-semibold text-gray-900 mb-2'>No active orders</h4>
          <p class='text-gray-500 text-sm mb-4'>You don't have any orders in progress</p>
          <a href='/menu.html' class='inline-flex items-center text-sm font-medium text-yellow-600 hover:text-yellow-700 transition-colors'>
            <span>Browse Menu</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      `;
    }
    // History full cards
    orderHistoryEl.innerHTML = orders.map(o=> {
      const st = statusInfo(o);
      return `
      <div class="card p-4 fade-in">
        <div class="flex items-start gap-3">
          ${thumb(o,'w-14 h-14')}
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-base font-semibold truncate">${vendorName(o)}</div>
                <div class="text-[11px] text-gray-500 truncate">${vendorAddr(o)}</div>
                <a href="/menu.html" class="text-[11px] text-yellow-700">View menu</a>
              </div>
              <span class="status-chip ${st.cls} uppercase">${st.label}</span>
            </div>
            <div class="text-xs text-gray-600 truncate mt-1">${itemsSummary(o)}</div>
            <div class="flex items-center justify-between mt-2 text-xs">
              <div class="text-gray-500">${dateTime(o)}</div>
              <div class="font-semibold">₹${o.total}</div>
            </div>
            <div class="mt-2 text-right">
              <a href="/track.html?order=${o._id}" class="inline-flex items-center text-[12px] text-yellow-700">Track</a>
            </div>
          </div>
        </div>
      </div>`;
    }).join('') || '<div class="empty-state">You haven’t placed any orders yet 🍽️</div>';
    updateStats();
  }
  
  function updateStats(){
    if(!studentStatsEl) return;
    try {
      const total = ordersCache.length;
      const active = ordersCache.filter(o => o.status !== 'delivered').length;
      const today = ordersCache.filter(o => {
        try {
          const d = new Date(o.createdAt);
          const now = new Date();
          return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
        } catch { return false; }
      }).length;
      const addr = addresses.length;
      const card = (label, value) => `
        <div class="card p-4">
          <div class="text-xs text-gray-500">${label}</div>
          <div class="text-2xl font-bold">${value}</div>
        </div>`;
      studentStatsEl.innerHTML = [
        card('Active orders', active),
        card('Saved addresses', addr),
        card('Total orders', total),
        card('Orders today', today)
      ].join('');
    } catch {}
  }

  function renderAddresses(){
    addressList.innerHTML = addresses.map((a,i)=> `<div class='bg-white border border-gray-100 rounded-md p-4 text-xs space-y-1'>
      <div class='font-medium'>${a.label||'Address '+(i+1)}</div>
      <div>${a.line1}</div>
      ${a.line2? `<div>${a.line2}</div>`:''}
      ${a.landmark? `<div class='text-gray-500'>${a.landmark}</div>`:''}
      <div class='flex justify-end gap-3'>
        <button data-edit='${a._id}' class='text-yellow-700 text-[11px]'>Edit</button>
        <button data-del='${a._id}' class='text-red-500 text-[11px]'>Delete</button>
      </div>
    </div>`).join('');
    addressEmpty.classList.toggle('hidden', addresses.length>0);
    addressList.querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-del');
      if(!confirm('Delete this address?')) return;
      await fetch('/api/addresses/'+id, { method:'DELETE', headers:{ Authorization:'Bearer '+token }});
      await loadAddresses();
    }));
    addressList.querySelectorAll('[data-edit]').forEach(btn=> btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-edit');
      const a = addresses.find(x=> x._id===id); if(!a) return;
      openAddressModal('edit', a);
    }));
  }
  async function loadAddresses(){
    if(!token) return;
    const res = await fetch('/api/addresses', { headers:{ Authorization:'Bearer '+token }});
    if(res.ok){ addresses = await res.json(); renderAddresses(); updateStats(); }
  }
  // Address modal helpers
  function openAddressModal(mode, data){
    if(!addressModal || !addressForm) return;
    addressForm.reset();
    addressFormMsg.textContent = '';
    addressForm.dataset.mode = mode;
    if(mode==='edit' && data){
      addressModalTitle.textContent = 'Edit Address';
      addressForm.querySelector('[name=id]').value = data._id || '';
      addressForm.querySelector('[name=label]').value = data.label || '';
      addressForm.querySelector('[name=line1]').value = data.line1 || '';
      addressForm.querySelector('[name=line2]').value = data.line2 || '';
      addressForm.querySelector('[name=landmark]').value = data.landmark || '';
    } else {
      addressModalTitle.textContent = 'Add Address';
    }
    addressModal.classList.remove('hidden');
    addressModal.classList.add('flex');
  }
  function closeAddressModal(){
    if(!addressModal) return;
    addressModal.classList.add('hidden');
    addressModal.classList.remove('flex');
    addressFormMsg.textContent = '';
  }
  addAddressBtn?.addEventListener('click', ()=> openAddressModal('add'));
  addressModalClose?.addEventListener('click', closeAddressModal);
  addressCancelBtn?.addEventListener('click', closeAddressModal);
  addressModal?.addEventListener('click', (e)=>{ if(e.target===addressModal) closeAddressModal(); });
  addressForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!token) return;
    addressFormMsg.textContent = '';
    const formData = new FormData(addressForm);
    const id = formData.get('id');
    const body = {
      label: (formData.get('label')||'').toString().trim(),
      line1: (formData.get('line1')||'').toString().trim(),
      line2: (formData.get('line2')||'').toString().trim(),
      landmark: (formData.get('landmark')||'').toString().trim()
    };
    if(!body.line1){
      addressFormMsg.textContent = 'Line 1 is required';
      return;
    }
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? '/api/addresses/'+id : '/api/addresses';
      const resp = await fetch(url, { method, headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(body) });
      if(!resp.ok){
        const txt = await resp.text();
        addressFormMsg.textContent = txt || 'Failed to save address';
        return;
      }
      closeAddressModal();
      await loadAddresses();
      if(window.toast && typeof window.toast.success==='function') window.toast.success('Address saved');
      // If redirected here from checkout, send user back seamlessly
      try {
        const rt = localStorage.getItem('vitato_return_to');
        if(rt){
          localStorage.removeItem('vitato_return_to');
          localStorage.setItem('vitato_toast', 'Address saved. Continue checkout.');
          window.location.href = rt;
          return;
        }
      } catch {}
    } catch(err){
      addressFormMsg.textContent = 'Error saving address';
    }
  });

  // Determine initial tab from query or hash
  function getQueryParam(key){ try{ return new URLSearchParams(location.search).get(key); } catch { return null; } }
  const initialTab = getQueryParam('tab') || (location.hash ? location.hash.replace('#','') : '') || 'overview';
  loadOrders();
  loadAddresses();
  switchTab(initialTab);

  // Handle cross-page notices from cart (add/edit address)
  (function(){
    try {
      const params = new URLSearchParams(location.search);
      const notice = localStorage.getItem('vitato_notice') || params.get('notice');
      if(notice === 'addAddress'){
        if(window.toast && typeof window.toast.info==='function') window.toast.info('Please add a delivery address before proceeding');
        // Auto open Add Address for convenience
        setTimeout(()=> { try { document.getElementById('addAddressBtn')?.click(); } catch {} }, 150);
      } else if (notice === 'editAddress'){
        if(window.toast && typeof window.toast.info==='function') window.toast.info('Edit your address here');
      }
      localStorage.removeItem('vitato_notice');
    } catch {}
  })();

  // Refresh orders automatically on server events
  if(socket){
    // Join user room explicitly for personalized events
    if(token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        socket.emit('join_user', payload.id);
        console.log('Student joined room:', payload.id);
      } catch {}
    }
    
    // Selective update functions for better UX
    const updateOrderStatus = (orderId, newStatus) => {
      // Update in recent orders
      const recentCard = recentOrdersEl.querySelector(`[href='/track.html?order=${orderId}']`)?.closest('div');
      if(recentCard) {
        const statusEl = recentCard.querySelector('.uppercase');
        if(statusEl) {
          statusEl.textContent = newStatus;
          statusEl.className = `uppercase tracking-wide ${newStatus==='delivered'?'text-green-600':'text-yellow-600'}`;
        }
      }
      
      // Update in order history
      const historyCard = orderHistoryEl.querySelector(`[href='/track.html?order=${orderId}']`)?.closest('div');
      if(historyCard) {
        const chip = historyCard.querySelector('.status-chip');
        if (chip) {
          chip.textContent = newStatus;
          const color = newStatus === 'delivered' ? 'bg-green-100 text-green-700' : newStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' : (newStatus === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700');
          chip.className = `status-chip ${color} uppercase`;
        }
      }
      
      // Update active order if it matches
      const activeCard = activeOrderEl.querySelector(`[data-oid='${orderId}']`);
      if (activeCard) {
        const chip = activeCard.querySelector('.status-chip');
        if (chip) {
          chip.textContent = newStatus;
          const color = newStatus === 'delivered' ? 'text-green-600' : newStatus === 'out_for_delivery' ? 'text-blue-600' : 'text-yellow-600';
          chip.className = `status-chip uppercase tracking-wide ${color}`;
        }
        if(newStatus === 'delivered') {
          // No longer active
          setTimeout(() => loadOrders(), 100);
        }
      }
      
      // Show toast notification
      showToast(`Order #${orderId.substring(0,6)} is now ${newStatus}`);
    };
    
    const showToast = (message) => {
      if (window.toast && typeof window.toast.info === 'function') {
        window.toast.info(message, 3500);
        return;
      }
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 transform transition-all duration-300';
      toast.textContent = message;
      toast.style.transform = 'translateX(100%)';
      document.body.appendChild(toast);
      setTimeout(() => toast.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    };
    
    const fullRefresh = () => { 
      console.log('Full refresh due to socket event');
      try { loadOrders(); } catch {} 
    };
    
    socket.on('order_status', (data) => {
      console.log('Received order_status:', data);
      if(data.orderId && data.status) {
        updateOrderStatus(data.orderId, data.status);
      } else {
        fullRefresh();
      }
    });
    
    socket.on('orders_updated', () => {
      console.log('Received orders_updated - doing full refresh');
      fullRefresh();
    });
    // Backup: rider claim event -> set out_for_delivery
    socket.on('order_claimed', (data) => {
      try {
        if (data?.orderId) updateOrderStatus(data.orderId, 'out_for_delivery');
      } catch {}
    });
    
    socket.on('new_order', () => {
      console.log('Received new_order');
      // This is for vendors/riders, student doesn't need to refresh
    });
    
    socket.on('order_paid', (data) => {
      console.log('Received order_paid:', data);
      if(data.orderId) {
        updateOrderStatus(data.orderId, 'placed');
        showToast('Payment successful! Your order is being prepared.');
      } else {
        fullRefresh();
      }
    });
    
    socket.on('order_payment_failed', (data) => {
      console.log('Received order_payment_failed:', data);
      showToast('Payment failed. Please try again.');
    });
    
    socket.on('connect', () => console.log('Student socket connected'));
    socket.on('disconnect', () => console.log('Student socket disconnected'));
  }
})();
