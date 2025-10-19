(()=>{
  const token = localStorage.getItem('vitato_token');
  // Live updates via socket.io
  let socket;
  try {
    socket = io({ auth: token ? { token } : {} });
    if(token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      socket.emit('join_user', payload.id);
    }
  } catch {}
  const tabButtons = document.querySelectorAll('#studentTabs .tabBtn');
  const panels = document.querySelectorAll('.panel');
  const recentOrdersEl = document.getElementById('recentOrders');
  const activeOrderEl = document.getElementById('activeOrder');
  const orderHistoryEl = document.getElementById('orderHistory');
  const addressList = document.getElementById('addressList');
  const addressEmpty = document.getElementById('addressEmpty');
  const addAddressBtn = document.getElementById('addAddressBtn');
  let addresses = [];

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
  tabButtons.forEach(btn=> btn.addEventListener('click', ()=> switchTab(btn.getAttribute('data-tab'))));

  async function loadOrders(){
    if(!token) return;
    const res = await fetch('/api/orders', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const orders = await res.json();
    // Recent limited
    recentOrdersEl.innerHTML = orders.slice(0,6).map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 text-xs space-y-1'>
      <div class='font-medium flex justify-between'><span>#${o._id.substring(0,6)}</span><span>₹${o.total}</span></div>
      <div class='flex justify-between'><span class='uppercase tracking-wide ${o.status==='delivered'?'text-green-600':'text-yellow-600'}'>${o.status}</span><a href='/track.html?order=${o._id}' class='text-yellow-600 underline'>Track</a></div>
    </div>`).join('') || '<p class="text-xs text-gray-500">No orders yet</p>';
    // Active: include out_for_delivery as active until delivered
    const active = orders.find(o=> o.status !== 'delivered');
    if(active){
      const statusClass = active.status === 'delivered' ? 'text-green-600' : active.status === 'out_for_delivery' ? 'text-blue-600' : 'text-yellow-600';
      activeOrderEl.innerHTML = `<div class='bg-white border border-gray-100 rounded-md p-4 text-xs' data-oid='${active._id}'>
        <div class='flex items-center justify-between mb-1'>
          <div class='font-semibold'>Order #${active._id.substring(0,6)}</div>
          <span class='status-chip uppercase tracking-wide ${statusClass}'>${active.status}</span>
        </div>
        <div class='mb-2 text-gray-500'>Total ₹${active.total}</div>
        <a class='text-yellow-600 underline' href='/track.html?order=${active._id}'>View full tracking</a>
      </div>`;
    } else {
      activeOrderEl.innerHTML = 'No active order.';
    }
    // History full
    orderHistoryEl.innerHTML = orders.map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 text-xs flex justify-between items-center'>
      <div>
        <div class='font-medium'>#${o._id.substring(0,6)} – ₹${o.total}</div>
        <div class='text-[10px] text-gray-500'>${new Date(o.createdAt).toLocaleString()}</div>
      </div>
      <div class='text-right'>
        <div class='text-[11px] ${o.status==='delivered'?'text-green-600':'text-yellow-600'}'>${o.status}</div>
        <a href='/track.html?order=${o._id}' class='text-yellow-600 underline text-[11px]'>Track</a>
      </div>
    </div>`).join('');
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
      const label = prompt('Label', a.label||'')||'';
      const line1 = prompt('Line 1', a.line1)||a.line1; if(!line1) return;
      const line2 = prompt('Line 2', a.line2||'')||'';
      const landmark = prompt('Landmark', a.landmark||'')||'';
      await fetch('/api/addresses/'+id, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ label, line1, line2, landmark }) });
      await loadAddresses();
    }));
  }
  async function loadAddresses(){
    if(!token) return;
    const res = await fetch('/api/addresses', { headers:{ Authorization:'Bearer '+token }});
    if(res.ok){ addresses = await res.json(); renderAddresses(); }
  }
  addAddressBtn?.addEventListener('click', async ()=>{
    const label = prompt('Label (Hostel / Block)?'); if(label===null) return;
    const line1 = prompt('Line 1 (Required)'); if(!line1) return;
    const line2 = prompt('Line 2 (Optional)')||'';
    const landmark = prompt('Landmark (Optional)')||'';
    await fetch('/api/addresses', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ label, line1, line2, landmark }) });
    await loadAddresses();
  });

  loadOrders();
  loadAddresses();
  switchTab('overview');

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
        const statusEl = historyCard.querySelector('.text-right .text-\\[11px\\]');
        if(statusEl) {
          statusEl.textContent = newStatus;
          statusEl.className = `text-[11px] ${newStatus==='delivered'?'text-green-600':'text-yellow-600'}`;
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
