(function(){
  const params = new URLSearchParams(location.search);
  const orderId = params.get('order');
  const info = document.getElementById('orderInfo');
  const statusTimeline = document.getElementById('statusTimeline');
  const deliveryPartner = document.getElementById('deliveryPartner');

  const stages = ['placed','cooking','ready','out_for_delivery','delivered'];

  function renderStatus(current){
  statusTimeline.innerHTML = stages.map(s=>{
      const activeIndex = stages.indexOf(current);
      const idx = stages.indexOf(s);
      const active = idx <= activeIndex;
      return `<div class='flex flex-col items-center text-xs font-medium ${active? 'text-yellow-600':'text-gray-400'}'>
    <div class='w-8 h-8 mb-1 rounded-full flex items-center justify-center border-2 ${active? 'border-yellow-500 bg-yellow-400 text-gray-900 animate-pulse':'border-gray-300'}'>${idx+1}</div>
        <span>${s.replace(/_/g,' ')}</span>
      </div>`;
    }).join('<div class="flex-1 h-0.5 bg-gray-300"></div>');
  }

  async function load(){
    if(!orderId){ info.innerHTML = '<p class="text-gray-600">Missing order id.</p>'; return; }
  const token = localStorage.getItem('vitato_token');
  const res = await fetch('/api/orders/'+orderId, { headers: token? { Authorization: 'Bearer '+token } : {} }); const data = await res.json();
    if(!data._id){ info.innerHTML='<p class="text-red-500 text-sm">Order not found.</p>'; return; }
    info.innerHTML = `<div class='p-4 bg-white border border-gray-100 rounded-md'>
      <div class='font-semibold mb-1'>Order #${data._id.substring(0,6)}</div>
      <div class='text-xs text-gray-500 mb-2'>Placed ${(new Date(data.createdAt)).toLocaleTimeString()}</div>
      <ul class='text-sm list-disc ml-4'>${data.items.map(i=> `<li>${i.quantity} x ${i.food.name} (₹${i.price})</li>`).join('')}</ul>
      <div class='mt-3 font-medium'>Total: ₹${data.total}</div>
    </div>`;
    renderStatus(data.status);
    if(data.deliveryPartner){
      deliveryPartner.classList.remove('hidden');
      deliveryPartner.innerHTML = `<div class='text-sm'><span class='font-medium'>Delivery Partner:</span> ${data.deliveryPartner.name} – <a href='tel:${data.deliveryPartner.phone}' class='text-yellow-600 underline'>${data.deliveryPartner.phone}</a></div>`;
    }
  }

  load();

  const socket = io();
  socket.emit('subscribe_order', orderId);
  socket.on('order_status', payload => { if(payload.orderId===orderId){ renderStatus(payload.status); }});
})();
