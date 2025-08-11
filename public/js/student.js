(()=>{
  const token = localStorage.getItem('vitato_token');
  const tabButtons = document.querySelectorAll('#studentTabs .tabBtn');
  const panels = document.querySelectorAll('.panel');
  const recentOrdersEl = document.getElementById('recentOrders');
  const activeOrderEl = document.getElementById('activeOrder');
  const orderHistoryEl = document.getElementById('orderHistory');
  const addressList = document.getElementById('addressList');
  const addressEmpty = document.getElementById('addressEmpty');
  const addAddressBtn = document.getElementById('addAddressBtn');
  let addresses = JSON.parse(localStorage.getItem('vitato_addresses')||'[]');

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
    // Active
    const active = orders.find(o=> !['delivered','out_for_delivery'].includes(o.status));
    if(active){
      activeOrderEl.innerHTML = `<div class='bg-white border border-gray-100 rounded-md p-4 text-xs'>
        <div class='font-semibold mb-1'>Order #${active._id.substring(0,6)}</div>
        <div class='mb-2 text-gray-500'>Total ₹${active.total}</div>
        <a class='text-yellow-600 underline' href='/track.html?order=${active._id}'>View full tracking</a>
      </div>`;
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
      <div class='flex justify-end'><button data-del='${i}' class='text-red-500 text-[11px]'>Delete</button></div>
    </div>`).join('');
    addressEmpty.classList.toggle('hidden', addresses.length>0);
    addressList.querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.getAttribute('data-del')); addresses.splice(idx,1); persistAddresses(); renderAddresses();
    }));
  }
  function persistAddresses(){ localStorage.setItem('vitato_addresses', JSON.stringify(addresses)); }
  addAddressBtn?.addEventListener('click', ()=>{
    const label = prompt('Label (Hostel / Block)?'); if(label===null) return;
    const line1 = prompt('Line 1 (Required)'); if(!line1) return;
    const line2 = prompt('Line 2 (Optional)')||'';
    const landmark = prompt('Landmark (Optional)')||'';
    addresses.push({ label, line1, line2, landmark });
    persistAddresses(); renderAddresses();
  });

  loadOrders();
  renderAddresses();
  switchTab('overview');
})();
