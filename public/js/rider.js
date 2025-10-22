(()=>{
  const token = localStorage.getItem('vitato_token');
  const socket = io({ auth:{ token }});
  const available = document.getElementById('availableOrders');
  const myDeliveries = document.getElementById('myDeliveries');
  const historyEl = document.getElementById('riderHistory');
  const modal = document.getElementById('riderOrderModal');
  const modalClose = document.getElementById('riderOrderModalClose');
  const modalDetail = document.getElementById('riderOrderDetail');
  const rtabButtons = document.querySelectorAll('.rtabBtn');
  const rpanels = document.querySelectorAll('.rpanel');
  const statsEl = document.getElementById('riderStats');

  function switchRiderTab(name){
    rtabButtons.forEach(b=>{ const on = b.getAttribute('data-rtab')===name; b.classList.toggle('bg-yellow-400', on); b.classList.toggle('text-gray-900', on); b.classList.toggle('border', !on); });
    rpanels.forEach(p=> p.classList.toggle('hidden', p.getAttribute('data-rpanel')!==name));
  }
  rtabButtons.forEach(b=> b.addEventListener('click', ()=> switchRiderTab(b.getAttribute('data-rtab'))));

  async function loadAvailable(){
    const res = await fetch('/api/rider/orders/available', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const orders = await res.json();
    available.innerHTML = orders.map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 flex justify-between items-center'>
      <span class='text-xs font-medium'>#${o._id.substring(0,6)} – ₹${o.total}</span>
      <span class='flex gap-2'>
        <button data-claim='${o._id}' class='text-xs px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-300'>Claim</button>
        <button data-decline='${o._id}' class='text-xs px-2 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50'>Skip</button>
      </span>
    </div>`).join('') || '<p class="text-xs text-gray-500">None</p>';
    available.querySelectorAll('[data-claim]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-claim');
        const r = await fetch(`/api/rider/orders/${id}/claim`, { method:'POST', headers:{ Authorization:'Bearer '+token }});
        if(r.ok){ loadAvailable(); loadMine(); loadHistory(); loadStats(); }
      };
    });
    available.querySelectorAll('[data-decline]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-decline');
        const r = await fetch(`/api/rider/orders/${id}/decline`, { method:'POST', headers:{ Authorization:'Bearer '+token }});
        if(r.ok){ btn.closest('div')?.classList.add('opacity-40'); setTimeout(loadAvailable, 150); }
      };
    });
  }

  async function loadMine(){
    const res = await fetch('/api/rider/orders/assigned', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const all = await res.json();
    myDeliveries.innerHTML = all.filter(o=> o.status!=='delivered').map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 flex justify-between items-center'>
      <span class='text-xs cursor-pointer underline' data-detail='${o._id}'>#${o._id.substring(0,6)} – ${o.status}</span>
      <button data-del='${o._id}' class='text-xs px-3 py-1.5 rounded-md bg-gray-800 text-white hover:bg-gray-700'>Delivered</button>
    </div>`).join('') || '<p class="text-xs text-gray-500">No active deliveries</p>';
    myDeliveries.querySelectorAll('[data-del]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-del');
        const r = await fetch(`/api/rider/orders/${id}/delivered`, { method:'POST', headers:{ Authorization:'Bearer '+token }});
        if(r.ok){ loadMine(); loadHistory(); loadStats(); }
      };
    });
    myDeliveries.querySelectorAll('[data-detail]').forEach(span=> span.onclick = ()=> openDetail(span.getAttribute('data-detail')));
  }

  async function loadHistory(){
    if(!historyEl) return;
    const res = await fetch('/api/rider/orders/history', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const orders = await res.json();
    historyEl.innerHTML = orders.map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 flex justify-between items-center'>
      <span class='text-xs cursor-pointer underline' data-detail='${o._id}'>#${o._id.substring(0,6)} – ₹${o.total}</span>
      <span class='text-[10px] text-green-600'>Delivered</span>
    </div>`).join('') || '<p class="text-xs text-gray-500">None</p>';
    historyEl.querySelectorAll('[data-detail]').forEach(span=> span.onclick = ()=> openDetail(span.getAttribute('data-detail')));
  }

  async function loadStats(){
    if(!statsEl) return;
    const [assignedRes, historyRes] = await Promise.all([
      fetch('/api/rider/orders/assigned', { headers:{ Authorization:'Bearer '+token }}),
      fetch('/api/rider/orders/history', { headers:{ Authorization:'Bearer '+token }})
    ]);
    if(!assignedRes.ok || !historyRes.ok) return;
    const assigned = await assignedRes.json();
    const history = await historyRes.json();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const deliveredToday = history.filter(o=> new Date(o.updatedAt)>=todayStart);
    const count = deliveredToday.length;
  // Rider earnings policy: ₹10 per delivered order
  const earnings = deliveredToday.reduce((s,o)=> s + 10, 0);
    const active = assigned.filter(o=> o.status==='out_for_delivery').length;
    statsEl.innerHTML = [
      { label:'Delivered Today', value: count },
      { label:'Active', value: active },
      { label:'Earnings (₹)', value: earnings },
  { label:'Per Delivery (₹)', value: 10 }
    ].map(c=> `<div class='bg-white border border-gray-100 rounded-md p-4 text-center'>
      <div class='text-xl font-semibold'>${c.value}</div>
      <div class='text-xs text-gray-500 mt-1 uppercase tracking-wide'>${c.label}</div>
    </div>`).join('');
  }

  async function openDetail(id){
    try {
      const res = await fetch('/api/order/'+id, { headers:{ Authorization:'Bearer '+token }});
      if(!res.ok) return;
      const o = await res.json();
      const items = (o.items||[]).map(i=> `<li class='flex justify-between'><span>${i.food?.name||'Item'}</span><span class='text-xs'>x${i.quantity}</span></li>`).join('');
      modalDetail.innerHTML = `
        <div class='flex justify-between text-xs'><span>ID</span><span>#${o._id.substring(0,8)}</span></div>
        <div class='text-xs'><span class='font-medium'>Status:</span> ${o.status}</div>
        <div class='text-xs'><span class='font-medium'>Student:</span> ${o.user?.name||''} ${o.user?.phone? '• '+o.user.phone:''}</div>
        <div class='text-xs'><span class='font-medium'>Address:</span> ${(o.deliveryAddress?.line1||'') + (o.deliveryAddress?.line2? ', '+o.deliveryAddress.line2:'')}</div>
        <div class='text-xs'><span class='font-medium'>Items:</span></div>
        <ul class='divide-y text-xs'>${items}</ul>
        <div class='flex justify-between text-xs font-medium pt-2'><span>Total</span><span>₹${o.total}</span></div>
      `;
      modal.classList.remove('hidden'); modal.classList.add('flex');
    } catch {}
  }
  modalClose?.addEventListener('click', ()=>{ modal.classList.add('hidden'); modal.classList.remove('flex'); });
  modal?.addEventListener('click', e=>{ if(e.target===modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }});

  socket.on('orders_updated', ()=>{ 
    console.log('Rider: orders_updated');
    // Selective update - preserve scroll position and highlight changes
    const currentAvailable = Array.from(available.querySelectorAll('[data-claim]')).map(btn => btn.getAttribute('data-claim'));
    loadAvailable().then(() => {
      // Highlight new available orders
      const newAvailable = Array.from(available.querySelectorAll('[data-claim]')).map(btn => btn.getAttribute('data-claim'));
      const addedOrders = newAvailable.filter(id => !currentAvailable.includes(id));
      addedOrders.forEach(id => {
        const card = available.querySelector(`[data-claim='${id}']`)?.closest('div');
        if(card) {
          card.classList.add('ring-2', 'ring-yellow-400');
          setTimeout(() => card.classList.remove('ring-2', 'ring-yellow-400'), 2000);
        }
      });
    });
    loadMine(); loadHistory(); loadStats(); 
  });
  socket.on('new_order', ()=>{ 
    console.log('Rider: new_order');
    loadAvailable();
    showRiderNotification('New delivery available!');
  });
  socket.on('order_claimed', ({ orderId })=>{ 
    console.log('Rider: order_claimed', orderId);
    // Smoothly remove claimed order from available list
    const card = available.querySelector(`[data-claim='${orderId}']`)?.closest('div');
    if(card){ 
      card.style.transition = 'all 0.3s ease';
      card.style.transform = 'translateX(-100%)';
      card.style.opacity = '0';
      setTimeout(() => loadAvailable(), 300); 
    }
  });
  
  function showRiderNotification(message) {
    if (window.toast && typeof window.toast.info === 'function') {
      window.toast.info(message, 3500);
      return;
    }
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50 transform transition-all duration-300';
    notification.textContent = message;
    notification.style.transform = 'translateX(100%)';
    document.body.appendChild(notification);
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }
  loadAvailable();
  loadMine();
  loadHistory();
  loadStats();
  switchRiderTab('orders');
})();
