(function(){
  const container = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('subtotalAmt');
  const deliveryFeeEl = document.getElementById('deliveryFeeAmt');
  const totalEl = document.getElementById('totalAmt');
  const summaryBox = document.getElementById('cartSummary');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const payBtn = document.getElementById('payBtn');

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
    const deliveryFee = subtotal < 200 ? 15 : 10;
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
    checkoutBtn.disabled = true; checkoutBtn.textContent='Processing...';
    try {
      const res = await fetch('/api/payments/create-order', { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+token}, body: JSON.stringify({ items: cart }) });
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

  loadDetails();
})();
