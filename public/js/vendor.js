(()=>{
  const token = localStorage.getItem('vitato_token');
  if (!token) {
    console.error('No token found, redirecting to login...');
    window.location.href = '/index.html';
    return;
  }
  
  console.log('Initializing vendor dashboard with token:', token.substring(0, 20) + '...');
  console.log('Full token length:', token.length);
  const socket = io({ auth:{ token }});
  
  socket.on('connect', () => {
    console.log('Socket.IO connected:', socket.id);
  });
  
  socket.on('connect_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });
  
  socket.on('disconnect', () => {
    console.log('Socket.IO disconnected');
  });
  const itemsContainer = document.getElementById('vendorItems');
  const ordersContainer = document.getElementById('vendorOrders');
  const historyContainer = document.getElementById('vendorHistory');
  // Track last known statuses to highlight changes between refreshes
  let prevStatuses = {};
  const addBtn = document.getElementById('addItemBtn');
  const modal = document.getElementById('itemModal');
  const closeModal = document.getElementById('closeModal');
  const itemForm = document.getElementById('itemForm');
  const modalTitle = document.getElementById('modalTitle');
  const deleteBtn = document.getElementById('deleteItemBtn');
  const itemFormMsg = document.getElementById('itemFormMsg');
  const vtabButtons = document.querySelectorAll('.vtabBtn');
  const vpanels = document.querySelectorAll('.vpanel');
  const summaryEl = document.getElementById('vendorSummary');

  function switchVendorTab(name){
    vtabButtons.forEach(b=>{ const on = b.getAttribute('data-vtab')===name; b.classList.toggle('active', on); });
    vpanels.forEach(p=> p.classList.toggle('hidden', p.getAttribute('data-vpanel')!==name));
  }
  vtabButtons.forEach(b=> b.addEventListener('click', ()=> { 
    const tabName = b.getAttribute('data-vtab');
    switchVendorTab(tabName);
    if (typeof window.switchVendorTab === 'function') window.switchVendorTab(tabName);
  }));
  window.switchVendorTab = window.switchVendorTab || switchVendorTab;

  async function fetchMenu(){
    const res = await fetch('/api/vendor/items', { headers:{ Authorization: 'Bearer '+token }});
    if(!res.ok){ itemsContainer.innerHTML = '<div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><div>Unable to load menu items</div></div>'; return; }
    const items = await res.json();
    if (items.length === 0) {
      itemsContainer.innerHTML = '<div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><div>No menu items yet. Add your first item!</div></div>';
      return;
    }
    itemsContainer.innerHTML = items.map(i=> `
      <div class='menu-item-card' data-id='${i._id}'>
        <img src='${i.image || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(i.name)}' alt='${i.name}' />
        <div class='p-4'>
          <div class='flex justify-between items-start mb-2'>
            <div class='flex-1'>
              <h3 class='font-bold text-gray-900 text-base mb-1'>${i.name}</h3>
              <p class='text-xs text-gray-500'>${i.category||'Uncategorized'}</p>
            </div>
            <div class='text-xl font-bold text-yellow-600'>₹${i.price}</div>
          </div>
          <div class='flex items-center justify-between mt-4'>
            <div class='flex items-center gap-2'>
              <label class='toggle-switch'>
                <input type='checkbox' ${i.inStock? 'checked':''} onchange='toggleStock("${i._id}", this.checked)' />
                <span class='toggle-slider'></span>
              </label>
              <span class='text-xs font-medium ${i.inStock? 'text-green-600':'text-gray-400'}'>${i.inStock? 'In Stock':'Out of Stock'}</span>
            </div>
            <button class='editItem text-xs font-semibold text-yellow-600 hover:text-yellow-700'>Edit</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  window.toggleStock = async function(itemId, inStock) {
    try {
      const res = await fetch(`/api/vendor/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ inStock })
      });
      if (!res.ok) {
        await fetchMenu(); // revert on error
        alert('Failed to update stock status');
      } else {
        showVendorNotification(inStock ? 'Item marked as in stock' : 'Item marked as out of stock');
      }
    } catch {
      await fetchMenu();
      alert('Network error');
    }
  };

  async function fetchOrders(){
    console.log('=== FETCH ORDERS CALLED ===');
    console.log('Token being used:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
    console.log('Fetching from: /api/vendor/orders');
    
    const res = await fetch('/api/vendor/orders', { headers:{ Authorization: 'Bearer '+token }});
    console.log('Response status:', res.status, res.statusText);
    
    if(!res.ok){ 
      console.error('❌ Failed to fetch orders:', res.status, res.statusText);
      const errorText = await res.text();
      console.error('Error response body:', errorText);
      ordersContainer.innerHTML = '<div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg><div>Unable to load orders</div></div>'; 
      return; 
    }
    const orders = await res.json();
    console.log('✅ Successfully fetched orders:', orders.length);
    console.log('Orders data:', JSON.stringify(orders, null, 2));
    
    if(summaryEl){
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const today = orders.filter(o=> new Date(o.createdAt) >= todayStart);
      const totalOrders = today.length;
      const revenue = today.reduce((s,o)=> s + (o.payment?.status==='paid'? o.total:0),0);
      const preparing = today.filter(o=> o.status==='cooking').length;
      const ready = today.filter(o=> o.status==='ready').length;
      
      summaryEl.innerHTML = [
        { label:'Total Orders', value: totalOrders, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        { label:'Revenue', value: '₹' + revenue, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label:'Cooking', value: preparing, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label:'Ready for Pickup', value: ready, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
      ].map(c=> `
        <div class='stat-card'>
          <div class='flex items-center justify-between mb-2'>
            <div class='stat-label'>${c.label}</div>
            <svg class='w-8 h-8 text-yellow-400 opacity-20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='${c.icon}'></path>
            </svg>
          </div>
          <div class='stat-value'>${c.value}</div>
        </div>
      `).join('');
    }
    
    const nextStatuses = {};
    const activeOrders = orders.filter(o=> o.status !== 'delivered');
    const delivered = orders.filter(o=> o.status === 'delivered');
    
    console.log('📊 Order filtering results:');
    console.log('  Total orders:', orders.length);
    console.log('  Active orders:', activeOrders.length);
    console.log('  Delivered orders:', delivered.length);
    console.log('  Active order statuses:', activeOrders.map(o => o.status));
    console.log('  Active order IDs:', activeOrders.map(o => o._id));
    
    if (activeOrders.length === 0) {
      console.log('⚠️ No active orders - showing empty state');
      ordersContainer.innerHTML = '<div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg><div>No active orders</div></div>';
    } else {
      console.log('✅ Rendering', activeOrders.length, 'active orders');
      ordersContainer.innerHTML = activeOrders.map(o=> {
        console.log('  🍔 Rendering order:', o._id, '| status:', o.status, '| payment:', o.payment?.status, '| total:', o.total);
        nextStatuses[o._id] = o.status;
        const changed = !prevStatuses[o._id] || prevStatuses[o._id] !== o.status;
        const itemsCount = o.items?.length || 0;
        const totalQty = o.items?.reduce((s,it)=> s + (it.quantity||0),0) || 0;
        const paid = o.payment?.status === 'paid';
        
        let statusClass = 'status-placed';
        let statusText = 'Placed';
        if (o.status === 'cooking') { statusClass = 'status-cooking'; statusText = 'Cooking'; }
        if (o.status === 'ready') { statusClass = 'status-ready'; statusText = 'Ready'; }
        
        return `
          <div class='order-card ${changed? 'new-order':''}' data-oid='${o._id}'>
            <div class='flex justify-between items-start mb-3'>
              <div>
                <span class='text-lg font-bold text-gray-900 cursor-pointer hover:text-yellow-600' data-detail='${o._id}'>#${o._id.substring(0,8)}</span>
                <div class='text-xs text-gray-500 mt-1'>
                  <span class='${paid? 'text-green-600':'text-red-600'} font-medium'>${paid? '● Paid':'● Payment Pending'}</span>
                  <span class='mx-2'>•</span>
                  <span>${itemsCount} items (${totalQty} qty)</span>
                </div>
              </div>
              <span class='status-badge ${statusClass}'>${statusText}</span>
            </div>
            
            <div class='flex items-center justify-between'>
              <div class='text-sm'>
                <div class='text-gray-900 font-medium'>${o.user?.name || 'Customer'}</div>
                <div class='text-xs text-gray-500'>${new Date(o.createdAt).toLocaleTimeString()}</div>
              </div>
              <div class='text-xl font-bold text-gray-900'>₹${o.total}</div>
            </div>
            
            <div class='mt-4 flex gap-2'>
              ${o.status==='placed'? `<button class="orderAction btn ${paid ? 'btn-primary' : 'btn-secondary'} btn-sm" data-next="cooking" ${!paid ? 'disabled title="Waiting for payment"' : ''}>Start Cooking</button>`:''}
              ${o.status==='cooking'? '<button class="orderAction btn btn-success btn-sm" data-next="ready">Mark Ready</button>':''}
              ${o.status==='ready'? '<span class="text-xs text-green-600 font-semibold">✓ Ready for rider pickup</span>':''}
              <button class='ml-auto text-xs font-semibold text-gray-600 hover:text-gray-900' data-detail='${o._id}'>View Details →</button>
            </div>
          </div>
        `;
      }).join('');
      console.log('📝 Orders HTML length:', ordersContainer.innerHTML.length, 'characters');
      console.log('📝 ordersContainer element:', ordersContainer);
    }
    
    prevStatuses = nextStatuses;
    
    console.log('📜 History Tab - Delivered orders:', delivered.length);
    if(historyContainer){
      console.log('  historyContainer exists:', !!historyContainer);
      if (delivered.length === 0) {
        console.log('  Showing empty state');
        historyContainer.innerHTML = '<div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div>No completed orders yet</div></div>';
      } else {
        console.log('  Rendering', delivered.length, 'delivered orders in history');
        historyContainer.innerHTML = delivered.slice(0,50).map(o=> `
          <div class='order-card' data-oid='${o._id}'>
            <div class='flex justify-between items-center'>
              <div class='flex-1'>
                <span class='font-bold text-gray-900 cursor-pointer hover:text-yellow-600' data-detail='${o._id}'>#${o._id.substring(0,8)}</span>
                <div class='text-xs text-gray-500 mt-1'>${new Date(o.createdAt).toLocaleDateString()} • ₹${o.total}</div>
              </div>
              <span class='status-badge status-delivered'>Delivered</span>
            </div>
          </div>
        `).join('');
      }
    }
    
    console.log('=== FETCH ORDERS COMPLETE ===\n');
    
    setTimeout(()=>{
      ordersContainer.querySelectorAll('.order-card.new-order').forEach(c=> c.classList.remove('new-order'));
    }, 2000);
    prevStatuses = nextStatuses;
    ordersContainer.querySelectorAll('[data-detail]')?.forEach(el=> el.onclick = ()=> openOrderDetail(el.getAttribute('data-detail')));
    historyContainer?.querySelectorAll('[data-detail]')?.forEach(el=> el.onclick = ()=> openOrderDetail(el.getAttribute('data-detail')));
  }

  function openModal(edit=false, data=null){
    if(!modal) return;
    itemForm.reset(); itemFormMsg.textContent='';
    deleteBtn.classList.add('hidden');
    // populate category datalist
    (async function loadCategories(){
      try{
        const res = await fetch('/api/categories');
        if(!res.ok) return;
        const cats = await res.json();
        const dl = document.getElementById('categoryList');
        if(!dl) return;
        dl.innerHTML = cats.map(c=> `<option value="${c}"></option>`).join('');
      } catch {}
    })();
    if(edit && data){
      modalTitle.textContent='Edit Item';
      itemForm.elements.id.value = data._id;
      itemForm.elements.name.value = data.name;
      itemForm.elements.price.value = data.price;
      itemForm.elements.category.value = data.category||'';
      itemForm.elements.image.value = data.image||'';
      itemForm.elements.inStock.checked = !!data.inStock;
      deleteBtn.classList.remove('hidden');
    } else {
      modalTitle.textContent='New Item';
      itemForm.elements.id.value='';
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  function closeModalFn(){ if(!modal) return; modal.classList.add('hidden'); modal.classList.remove('flex'); }

  addBtn?.addEventListener('click', ()=> openModal(false));
  closeModal?.addEventListener('click', closeModalFn);
  modal?.addEventListener('click', e=>{ if(e.target===modal) closeModalFn(); });

  itemsContainer?.addEventListener('click', async e=>{
    const btn = e.target.closest('.editItem');
    if(!btn) return;
    const card = btn.closest('[data-id]');
    const id = card.getAttribute('data-id');
    // Find item via existing list (could re-fetch, but we have markup; simplest re-fetch)
    const res = await fetch('/api/vendor/items', { headers:{ Authorization: 'Bearer '+token }});
    if(!res.ok) return; const items = await res.json();
    const item = items.find(i=>i._id===id);
    if(item) openModal(true, item);
  });

  deleteBtn?.addEventListener('click', async ()=>{
    const id = itemForm.elements.id.value; if(!id) return;
    if(!confirm('Delete this item?')) return;
    const res = await fetch('/api/vendor/items/'+id, { method:'DELETE', headers:{ Authorization:'Bearer '+token }});
    if(!res.ok){ itemFormMsg.textContent='Delete failed'; return; }
    closeModalFn(); fetchMenu();
  });

  itemForm?.addEventListener('submit', async e=>{
    e.preventDefault(); itemFormMsg.textContent='';
    const form = new FormData(itemForm);
    const id = form.get('id');
    const payload = {
      name: form.get('name').trim(),
      price: Number(form.get('price')),
      category: form.get('category').trim(),
      image: form.get('image').trim(),
      inStock: form.get('inStock') === 'on'
    };
    const method = id? 'PUT':'POST';
    const url = id? '/api/vendor/items/'+id : '/api/vendor/items';
    try {
      const res = await fetch(url, { method, headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(payload) });
      if(!res.ok){ const d = await res.json(); itemFormMsg.textContent = d.error||'Save failed'; return; }
      closeModalFn(); fetchMenu();
    } catch { itemFormMsg.textContent='Network error'; }
  });

  ordersContainer?.addEventListener('click', async e=>{
    const btn = e.target.closest('.orderAction');
    if(!btn) return;
    if(btn.disabled) {
      showVendorNotification('Waiting for customer payment');
      return;
    }
    const card = btn.closest('[data-oid]');
    if(card.classList.contains('pending')) return; // prevent double
    const oid = card.getAttribute('data-oid');
    const next = btn.getAttribute('data-next');
    const statusBadge = card.querySelector('.statusBadge') || card.querySelector('.status-badge');
    const actions = card.querySelector('.actions') || card.querySelector('.mt-4');
    const prevStatus = statusBadge?.textContent;
    // Optimistic UI
    if (statusBadge) {
      statusBadge.textContent = next;
      const statusClasses = {
        'cooking': 'status-cooking',
        'ready': 'status-ready'
      };
      statusBadge.className = 'status-badge ' + (statusClasses[next] || 'status-placed');
    }
    if (actions) {
      actions.innerHTML = next==='cooking' ? '<button class="orderAction btn btn-success btn-sm" data-next="ready">Mark Ready</button>' : next==='ready' ? '<span class="text-xs text-green-600 font-semibold">✓ Ready for rider pickup</span>' : '';
    }
    card.classList.add('opacity-60','pending');
    try {
      const res = await fetch(`/api/vendor/orders/${oid}/status`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ status: next }) });
      if(!res.ok){
        // revert
        if (statusBadge) {
          statusBadge.textContent = prevStatus;
          const statusClasses = {
            'placed': 'status-placed',
            'cooking': 'status-cooking',
            'ready': 'status-ready'
          };
          statusBadge.className = 'status-badge ' + (statusClasses[prevStatus.toLowerCase()] || 'status-placed');
        }
        if (actions && prevStatus) {
          if(prevStatus.toLowerCase()==='placed') actions.innerHTML = '<button class="orderAction btn btn-primary btn-sm" data-next="cooking">Start Cooking</button>';
          else if(prevStatus.toLowerCase()==='cooking') actions.innerHTML = '<button class="orderAction btn btn-success btn-sm" data-next="ready">Mark Ready</button>';
        }
        try { const d = await res.json(); showVendorNotification(d.error || 'Update failed'); } catch { showVendorNotification('Update failed'); }
      } else {
        card.classList.add('ring-2','ring-green-400');
        setTimeout(()=>{ card.classList.remove('ring-2','ring-green-400'); }, 1500);
        showVendorNotification('Order status updated successfully');
      }
    } catch {
      if (statusBadge) statusBadge.textContent = prevStatus; 
      if (actions) {
        if(prevStatus.toLowerCase()==='placed') actions.innerHTML = '<button class="orderAction btn btn-primary btn-sm" data-next="cooking">Start Cooking</button>';
        else if(prevStatus.toLowerCase()==='cooking') actions.innerHTML = '<button class="orderAction btn btn-success btn-sm" data-next="ready">Mark Ready</button>';
      }
      showVendorNotification('Network error');
    } finally {
      card.classList.remove('opacity-60','pending');
    }
  });

  socket.on('menu_updated', () => {
    console.log('Vendor: menu_updated event received');
    fetchMenu();
  });
  socket.on('orders_updated', () => {
    console.log('Vendor: orders_updated event received');
    // Instead of full refresh, update existing orders smoothly
    const currentOrderIds = Array.from(ordersContainer.querySelectorAll('[data-oid]')).map(el => el.getAttribute('data-oid'));
    fetchOrders().then(() => {
      // Flash new orders that weren't there before
      const newOrderIds = Array.from(ordersContainer.querySelectorAll('[data-oid]')).map(el => el.getAttribute('data-oid'));
      const addedOrders = newOrderIds.filter(id => !currentOrderIds.includes(id));
      console.log('New orders detected:', addedOrders);
      addedOrders.forEach(id => {
        const card = ordersContainer.querySelector(`[data-oid='${id}']`);
        if(card) {
          card.classList.add('ring-2', 'ring-green-400');
          setTimeout(() => card.classList.remove('ring-2', 'ring-green-400'), 2000);
        }
      });
    });
  });
  socket.on('new_order', (data)=>{
    console.log('Vendor: new_order event received', data);
    // Light alert: fetch and flash overview tab
    fetchOrders();
    const header = document.querySelector('[data-vtab="overview"]');
    if(header){ 
      header.classList.add('ring-2','ring-green-500'); 
      setTimeout(()=> header.classList.remove('ring-2','ring-green-500'), 1800); 
    }
    // Show notification
    showVendorNotification('New order received!');
  });

  // Listen for targeted order status updates and update DOM in-place when possible
  socket.on('order_status', (payload) => {
    try {
      console.log('Vendor: order_status received', payload);
      const { orderId, status } = payload || {};
      if (!orderId) return;
      const card = ordersContainer.querySelector(`[data-oid='${orderId}']`);
      if (!card) {
        // Not currently rendered (maybe moved to history) -> refresh list
        fetchOrders();
        return;
      }
      // Update badge
      const statusBadge = card.querySelector('.status-badge');
      if (statusBadge) {
        let statusText = 'Placed';
        let statusClass = 'status-placed';
        if (status === 'cooking') { statusText = 'Cooking'; statusClass = 'status-cooking'; }
        if (status === 'ready') { statusText = 'Ready'; statusClass = 'status-ready'; }
        if (status === 'delivered') { statusText = 'Delivered'; statusClass = 'status-delivered'; }
        statusBadge.textContent = statusText;
        statusBadge.className = 'status-badge ' + statusClass;
      }
      // Update available actions
      const actions = card.querySelector('.mt-4');
      if (actions) {
        if (status === 'placed') actions.innerHTML = '<button class="orderAction btn btn-primary btn-sm" data-next="cooking">Start Cooking</button>';
        else if (status === 'cooking') actions.innerHTML = '<button class="orderAction btn btn-success btn-sm" data-next="ready">Mark Ready</button>';
        else if (status === 'ready') actions.innerHTML = '<span class="text-xs text-green-600 font-semibold">✓ Ready for rider pickup</span>';
        else actions.innerHTML = '';
      }
      // If moved to delivered, move to history by refreshing
      if (status === 'delivered') fetchOrders();
    } catch (e) { console.error('Error handling order_status:', e); }
  });
  
  function showVendorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 transform transition-all duration-300';
    notification.textContent = message;
    notification.style.transform = 'translateY(-100%)';
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateY(0)', 100);
    setTimeout(() => {
      notification.style.transform = 'translateY(-100%)';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }
  const orderModal = document.getElementById('vendorOrderModal');
  const orderModalClose = document.getElementById('vendorOrderModalClose');
  const orderModalDetail = document.getElementById('vendorOrderDetail');
  function closeOrderModal(){ orderModal.classList.add('hidden'); orderModal.classList.remove('flex'); }
  orderModalClose?.addEventListener('click', closeOrderModal);
  orderModal?.addEventListener('click', e=>{ if(e.target===orderModal) closeOrderModal(); });
  async function openOrderDetail(id){
    try {
      const res = await fetch('/api/orders/'+id, { headers:{ Authorization:'Bearer '+token }});
      if(!res.ok) { 
        console.error('Failed to fetch order details'); 
        return; 
      }
      const o = await res.json();
      const items = (o.items||[]).map(i=> `<li class='flex justify-between py-1'><span>${i.food?.name||'Item'} <span class='text-gray-500'>x${i.quantity}</span></span><span class='font-medium'>₹${(i.food?.price || 0) * i.quantity}</span></li>`).join('');
      orderModalDetail.innerHTML = `
        <div class='space-y-3'>
          <div class='flex justify-between items-center pb-3 border-b'>
            <div>
              <div class='text-sm text-gray-500'>Order ID</div>
              <div class='font-bold text-lg'>#${o._id.substring(0,8)}</div>
            </div>
            <span class='status-badge status-${o.status}'>${o.status}</span>
          </div>
          
          <div>
            <div class='text-sm font-medium text-gray-700 mb-2'>Customer Details</div>
            <div class='text-sm text-gray-900'>${o.user?.name||'Unknown'}</div>
            <div class='text-xs text-gray-500'>${o.user?.phone || 'No phone'}</div>
          </div>
          
          ${o.deliveryPartner ? `
          <div>
            <div class='text-sm font-medium text-gray-700 mb-2'>Delivery Partner</div>
            <div class='text-sm text-gray-900'>${o.deliveryPartner.name}</div>
            <div class='text-xs text-gray-500'>${o.deliveryPartner.phone || ''}</div>
          </div>
          ` : '<div class="text-sm text-gray-500">Delivery partner not assigned yet</div>'}
          
          <div>
            <div class='text-sm font-medium text-gray-700 mb-2'>Delivery Address</div>
            <div class='text-sm text-gray-600'>${o.deliveryAddress?.label || ''}</div>
            <div class='text-xs text-gray-500'>${(o.deliveryAddress?.line1||'') + (o.deliveryAddress?.line2? ', '+o.deliveryAddress.line2:'')}</div>
            ${o.deliveryAddress?.landmark ? `<div class='text-xs text-gray-500'>Near: ${o.deliveryAddress.landmark}</div>` : ''}
          </div>
          
          <div>
            <div class='text-sm font-medium text-gray-700 mb-2'>Order Items</div>
            <ul class='space-y-1 text-sm'>${items}</ul>
          </div>
          
          <div class='pt-3 border-t'>
            <div class='flex justify-between items-center'>
              <span class='font-bold text-gray-900'>Total Amount</span>
              <span class='text-xl font-bold text-yellow-600'>₹${o.total}</span>
            </div>
            <div class='text-xs text-${o.payment?.status === 'paid' ? 'green' : 'red'}-600 mt-1'>
              ${o.payment?.status === 'paid' ? '✓ Payment received' : 'Payment pending'}
            </div>
          </div>
          
          <div class='text-xs text-gray-500'>
            Placed on ${new Date(o.createdAt).toLocaleString()}
          </div>
        </div>
      `;
      orderModal.classList.remove('hidden'); orderModal.classList.add('flex');
    } catch (err) {
      console.error('Error opening order detail:', err);
    }
  }
  console.log('=== VENDOR DASHBOARD INITIALIZATION ===');
  fetchMenu();
  console.log('Called fetchMenu()');
  fetchOrders();
  console.log('Called fetchOrders()');
  switchVendorTab('overview');
  console.log('Switched to overview tab');
  
  // Auto-refresh orders every 30 seconds
  setInterval(() => {
    console.log('Auto-refreshing orders...');
    fetchOrders();
  }, 30000);
  
  // Auto-refresh menu every 60 seconds
  setInterval(() => {
    console.log('Auto-refreshing menu...');
    fetchMenu();
  }, 60000);
})();
