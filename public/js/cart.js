(function(){
  const container = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('subtotalAmt');
  const deliveryFeeEl = document.getElementById('deliveryFeeAmt');
  const totalEl = document.getElementById('totalAmt');
  const summaryBox = document.getElementById('cartSummary');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const payBtn = document.getElementById('payBtn');
  const addAddrBtn = document.getElementById('addAddrBtn');
  const addressListCart = document.getElementById('addressListCart');
  const noAddressMsg = document.getElementById('noAddressMsg');
  let addresses = [];
  let selectedAddressIndex = 0;

  async function loadAddresses(){
    const token = localStorage.getItem('vitato_token');
    if(!token) return;
    const res = await fetch('/api/addresses', { headers:{ Authorization:'Bearer '+token }});
    if(res.ok){ addresses = await res.json(); if(selectedAddressIndex >= addresses.length) selectedAddressIndex = 0; renderAddresses(); }
  }
  function renderAddresses(){
    if(!addressListCart) return;
  addressListCart.innerHTML = addresses.map((a,i)=> `<label class='border rounded-md p-2 cursor-pointer flex justify-between gap-3 ${i===selectedAddressIndex? 'border-yellow-400 bg-yellow-50':'border-gray-200 bg-gray-50'}'>
      <span class='flex-1 text-[11px] leading-relaxed'>
        <span class='font-medium block mb-0.5'>${a.label||'Address '+(i+1)}</span>
        <span>${a.line1}${a.line2? ', '+a.line2:''}</span>
        ${a.landmark? `<span class='block text-gray-500'>${a.landmark}</span>`:''}
      </span>
      <span class='flex flex-col items-end gap-1'>
        <input type='radio' name='addrSel' value='${i}' ${i===selectedAddressIndex?'checked':''} class='mt-1'>
        <button data-edit='${a._id}' class='text-[10px] text-yellow-700'>Edit</button>
        <button data-del='${a._id}' class='text-[10px] text-red-500'>Del</button>
      </span>
    </label>`).join('');
    noAddressMsg.classList.toggle('hidden', addresses.length>0);
    addressListCart.querySelectorAll('input[name="addrSel"]').forEach(r=> r.addEventListener('change', ()=>{ selectedAddressIndex = parseInt(r.value); }));
    addressListCart.querySelectorAll('[data-edit]').forEach(btn=> btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-edit'); const a = addresses.find(x=> x._id===id); if(!a) return;
      const label = prompt('Label', a.label||'')||'';
      const line1 = prompt('Line 1', a.line1)||a.line1; if(!line1) return;
      const line2 = prompt('Line 2', a.line2||'')||'';
      const landmark = prompt('Landmark', a.landmark||'')||'';
      const token = localStorage.getItem('vitato_token');
      await fetch('/api/addresses/'+id, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ label, line1, line2, landmark }) });
      loadAddresses();
    }));
    addressListCart.querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', async ()=>{
      if(!confirm('Delete address?')) return;
      const id = btn.getAttribute('data-del');
      const token = localStorage.getItem('vitato_token');
      await fetch('/api/addresses/'+id, { method:'DELETE', headers:{ Authorization:'Bearer '+token }});
      loadAddresses();
    }));
    // Disable checkout if no addresses
    checkoutBtn.disabled = addresses.length === 0;
    checkoutBtn.classList.toggle('opacity-50', checkoutBtn.disabled);
  }
  addAddrBtn?.addEventListener('click', async ()=>{
    const label = prompt('Label (Hostel / Block)?'); if(label===null) return;
    const line1 = prompt('Line 1 (Required)'); if(!line1) return;
    const line2 = prompt('Line 2 (Optional)')||'';
    const landmark = prompt('Landmark (Optional)')||'';
    const token = localStorage.getItem('vitato_token');
    await fetch('/api/addresses', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ label, line1, line2, landmark }) });
    await loadAddresses(); selectedAddressIndex = addresses.length - 1; renderAddresses();
  });

  function getCart(){ return JSON.parse(localStorage.getItem('vitato_cart')||'[]'); }
  function setCart(c){ localStorage.setItem('vitato_cart', JSON.stringify(c)); }

  async function loadDetails(){
    const cart = getCart();
    if(!cart.length){ container.innerHTML='<p class="text-gray-600">Cart is empty.</p>'; summaryBox.classList.add('hidden'); return; }
    const ids = cart.map(c=>c.foodId);
  const token = localStorage.getItem('vitato_token');
  const res = await fetch('/api/menu', { headers: token? { Authorization: 'Bearer '+token } : {} });
    const items = await res.json();
    const map = Object.fromEntries(items.map(i=>[i._id,i]));
    let subtotal=0;
    container.innerHTML = cart.map(line=> {
      const item = map[line.foodId];
      if(!item) return '';
      const lineTotal = item.price * line.quantity; subtotal+= lineTotal;
      return `<div class='flex items-center justify-between bg-white border border-gray-100 rounded-md p-4'>
        <div>
          <div class='font-medium'>${item.name}</div>
          <div class='text-xs text-gray-500'>₹${item.price} x <input data-id='${item._id}' type='number' min='1' value='${line.quantity}' class='w-14 quantityInput border-gray-300 rounded-md text-sm' /> = ₹${lineTotal}</div>
        </div>
        <button data-remove='${item._id}' class='text-xs text-red-500'>Remove</button>
      </div>`;
    }).join('');
  // Flat delivery fee policy: ₹15 per order
  const deliveryFee = 15;
    subtotalEl.textContent = '₹'+subtotal;
    deliveryFeeEl.textContent = '₹'+deliveryFee;
    totalEl.textContent = '₹'+(subtotal+deliveryFee);
    summaryBox.classList.remove('hidden');

    container.querySelectorAll('.quantityInput').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        const id = inp.getAttribute('data-id');
        const cart = getCart();
        const entry = cart.find(c=>c.foodId===id); if(entry){ entry.quantity = parseInt(inp.value)||1; }
        setCart(cart); loadDetails();
      });
    });
    container.querySelectorAll('[data-remove]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-remove');
        let cart = getCart(); cart = cart.filter(c=>c.foodId!==id); setCart(cart); loadDetails();
      });
    });
  }

  async function loadRazorpayKey(){
    const r = await fetch('/api/payments/config');
    return (await r.json()).key;
  }

  function showTempMessage(msg, cls){
    let el = document.getElementById('cartMsg');
    if(!el){
      el = document.createElement('div');
      el.id='cartMsg';
      el.className='mt-4 text-sm';
      summaryBox.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'mt-4 text-sm '+(cls||'text-gray-600');
  }

  checkoutBtn.addEventListener('click', async ()=>{
    const cart = getCart();
    if(!cart.length) return;
    const token = localStorage.getItem('vitato_token');
    if(!token){ alert('Login required'); return; }
    if(!addresses.length){ if(!confirm('No delivery address saved. Add one?')) return; }
    checkoutBtn.disabled = true; checkoutBtn.textContent='Processing...';
    try {
  const address = addresses[selectedAddressIndex] || null;
      const res = await fetch('/api/payments/create-order', { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+token}, body: JSON.stringify({ items: cart, address }) });
      const data = await res.json();
      if(!res.ok){ alert(data.error||'Failed'); return; }
      const key = await loadRazorpayKey();
      if(!key){ alert('Payment config missing'); return; }
      // Prepare Razorpay options
      const options = {
        key,
        amount: data.amount,
        currency: data.currency,
        name: 'VITato',
        description: 'Order Payment',
        order_id: data.razorpayOrderId,
        handler: async function (response){
          try {
            const vr = await fetch('/api/payments/verify', { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+token}, body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.orderId
            }) });
            const vj = await vr.json();
            if(vr.ok){
              localStorage.removeItem('vitato_cart');
              window.location.href = '/track.html?order='+data.orderId;
            } else {
              alert(vj.error||'Verification failed');
            }
          } catch { alert('Verification error'); }
        },
        theme:{ color: '#FFD54F' }
      };
      if(typeof Razorpay === 'undefined'){ alert('Razorpay SDK not loaded'); return; }
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (resp){
        showTempMessage('Payment failed or cancelled. You can retry.', 'text-red-600');
      });
      rzp.open();
      // Listen for async success via socket if user closes popup after paying
      try {
        const socket = io();
        socket.on('order_paid', payload => { if(payload.orderId === data.orderId){ localStorage.removeItem('vitato_cart'); window.location.href='/track.html?order='+data.orderId; }});
        socket.on('order_payment_failed', payload => { if(payload.orderId === data.orderId){ showTempMessage('Payment failed. Please retry.', 'text-red-600'); }});
      } catch {}
    } catch { alert('Network error'); }
    finally { checkoutBtn.disabled=false; checkoutBtn.textContent='Checkout'; }
  });

  loadAddresses();
  loadDetails();
})();
