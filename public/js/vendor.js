(()=>{
  const token = localStorage.getItem('vitato_token');
  const socket = io({ auth:{ token }});
  const itemsContainer = document.getElementById('vendorItems');
  const ordersContainer = document.getElementById('vendorOrders');
  const addBtn = document.getElementById('addItemBtn');
  const modal = document.getElementById('itemModal');
  const closeModal = document.getElementById('closeModal');
  const itemForm = document.getElementById('itemForm');
  const modalTitle = document.getElementById('modalTitle');
  const deleteBtn = document.getElementById('deleteItemBtn');
  const itemFormMsg = document.getElementById('itemFormMsg');

  async function fetchMenu(){
    const res = await fetch('/api/vendor/items', { headers:{ Authorization: 'Bearer '+token }});
    if(!res.ok){ itemsContainer.innerHTML = '<p class="text-xs text-red-500">Unable to load items</p>'; return; }
    const items = await res.json();
    itemsContainer.innerHTML = items.map(i=> `<div class='card text-sm group' data-id='${i._id}'>
      <div class='font-medium mb-1 flex justify-between'>
        <span>${i.name}</span><span>₹${i.price}</span>
      </div>
      <div class='text-xs mb-2'>${i.category||''}</div>
      <div class='flex items-center justify-between text-xs'>
        <span class='${i.inStock? 'text-green-600':'text-red-500'}'>${i.inStock? '✔ In Stock':'✖ Out'}</span>
        <button class='editItem text-yellow-700 hover:underline'>Edit</button>
      </div>
    </div>`).join('');
  }

  let prevStatuses = {}; // orderId -> status
  async function fetchOrders(){
    const res = await fetch('/api/vendor/orders', { headers:{ Authorization: 'Bearer '+token }});
    if(!res.ok){ ordersContainer.innerHTML = '<p class="text-xs text-gray-500">No orders yet</p>'; return; }
    const orders = await res.json();
    const nextStatuses = {};
    ordersContainer.innerHTML = orders.map(o=> {
      nextStatuses[o._id] = o.status;
      const changed = !prevStatuses[o._id] || prevStatuses[o._id] !== o.status;
      const itemsCount = o.items?.length || 0;
      const totalQty = o.items?.reduce((s,it)=> s + (it.quantity||0),0) || 0;
      const badgeColor = o.status === 'ready' ? 'bg-green-100 text-green-700' : o.status === 'cooking' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100';
      return `<div class='orderCard border p-2 rounded-md bg-white space-y-1 transition-all ${changed? 'ring-2 ring-yellow-400':''}' data-oid='${o._id}'>
        <div class='flex justify-between items-center'>
          <span class='font-medium'>#${o._id.substring(0,6)}</span>
          <span class='statusBadge text-xs px-2 py-0.5 rounded-full ${badgeColor}'>${o.status}</span>
        </div>
        <div class='text-[10px] text-gray-600'>Items: ${itemsCount} • Qty: ${totalQty}</div>
        <div class='actions flex flex-wrap gap-2 text-[10px]'>
          ${o.status==='placed'? '<button class=\"orderAction bg-yellow-400 text-gray-900 px-2 py-1 rounded\" data-next=\"cooking\">Start Cooking</button>':''}
          ${o.status==='cooking'? '<button class=\"orderAction bg-green-500 text-white px-2 py-1 rounded\" data-next=\"ready\">Mark Ready</button>':''}
        </div>
      </div>`;
    }).join('');
    // Remove highlight after delay
    setTimeout(()=>{
      ordersContainer.querySelectorAll('.orderCard.ring-2').forEach(c=> c.classList.remove('ring-2','ring-yellow-400'));
    }, 1600);
    prevStatuses = nextStatuses;
  }

  function openModal(edit=false, data=null){
    if(!modal) return;
    itemForm.reset(); itemFormMsg.textContent='';
    deleteBtn.classList.add('hidden');
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
    const card = btn.closest('[data-oid]');
    if(card.classList.contains('pending')) return; // prevent double
    const oid = card.getAttribute('data-oid');
    const next = btn.getAttribute('data-next');
    const statusBadge = card.querySelector('.statusBadge');
    const actions = card.querySelector('.actions');
    const prevStatus = statusBadge?.textContent;
    // Optimistic UI
    statusBadge.textContent = next;
    statusBadge.className = 'statusBadge text-xs px-2 py-0.5 rounded-full ' + (next==='ready'? 'bg-green-100 text-green-700': next==='cooking'? 'bg-yellow-100 text-yellow-700':'bg-gray-100');
    actions.innerHTML = next==='cooking' ? '<button class="orderAction bg-green-500 text-white px-2 py-1 rounded" data-next="ready">Mark Ready</button>' : '';
    card.classList.add('opacity-60','pending');
    try {
      const res = await fetch(`/api/vendor/orders/${oid}/status`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ status: next }) });
      if(!res.ok){
        // revert
        statusBadge.textContent = prevStatus;
        statusBadge.className = 'statusBadge text-xs px-2 py-0.5 rounded-full bg-gray-100';
        if(prevStatus==='placed') actions.innerHTML = '<button class="orderAction bg-yellow-400 text-gray-900 px-2 py-1 rounded" data-next="cooking">Start Cooking</button>';
        else if(prevStatus==='cooking') actions.innerHTML = '<button class="orderAction bg-green-500 text-white px-2 py-1 rounded" data-next="ready">Mark Ready</button>';
        try { const d = await res.json(); alert(d.error||'Update failed'); } catch { alert('Update failed'); }
      } else {
        card.classList.add('ring-2','ring-yellow-400');
        setTimeout(()=>{ card.classList.remove('ring-2','ring-yellow-400'); }, 1500);
      }
    } catch {
      statusBadge.textContent = prevStatus; actions.innerHTML = prevStatus==='placed'? '<button class="orderAction bg-yellow-400 text-gray-900 px-2 py-1 rounded" data-next="cooking">Start Cooking</button>': prevStatus==='cooking'? '<button class="orderAction bg-green-500 text-white px-2 py-1 rounded" data-next="ready">Mark Ready</button>':''; alert('Network error');
    } finally {
      card.classList.remove('opacity-60','pending');
    }
  });

  socket.on('menu_updated', fetchMenu);
  socket.on('orders_updated', fetchOrders); // real-time refresh
  fetchMenu();
  fetchOrders();
})();
