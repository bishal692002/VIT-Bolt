(()=>{
  const token = localStorage.getItem('vitato_token');
  const socket = io({ auth:{ token }});
  const available = document.getElementById('availableOrders');
  const myDeliveries = document.getElementById('myDeliveries');

  async function loadAvailable(){
    const res = await fetch('/api/rider/orders/available', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const orders = await res.json();
    available.innerHTML = orders.map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 flex justify-between items-center'>
      <span class='text-xs font-medium'>#${o._id.substring(0,6)} – ₹${o.total}</span>
      <button data-claim='${o._id}' class='text-xs px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-300'>Claim</button>
    </div>`).join('') || '<p class="text-xs text-gray-500">None</p>';
    available.querySelectorAll('[data-claim]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-claim');
        const r = await fetch(`/api/rider/orders/${id}/claim`, { method:'POST', headers:{ Authorization:'Bearer '+token }});
        if(r.ok){ loadAvailable(); loadMine(); }
      };
    });
  }

  async function loadMine(){
    const res = await fetch('/api/orders', { headers:{ Authorization:'Bearer '+token }});
    if(!res.ok) return;
    const all = await res.json();
    myDeliveries.innerHTML = all.filter(o=> o.status!=='delivered').map(o=> `<div class='bg-white border border-gray-100 rounded-md p-3 flex justify-between items-center'>
      <span class='text-xs'>#${o._id.substring(0,6)} – ${o.status}</span>
      <button data-del='${o._id}' class='text-xs px-3 py-1.5 rounded-md bg-gray-800 text-white hover:bg-gray-700'>Delivered</button>
    </div>`).join('') || '<p class="text-xs text-gray-500">No active deliveries</p>';
    myDeliveries.querySelectorAll('[data-del]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-del');
        const r = await fetch(`/api/rider/orders/${id}/delivered`, { method:'POST', headers:{ Authorization:'Bearer '+token }});
        if(r.ok){ loadMine(); }
      };
    });
  }

  socket.on('orders_updated', ()=>{ loadAvailable(); loadMine(); });
  loadAvailable();
  loadMine();
})();
