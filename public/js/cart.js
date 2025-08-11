(function(){
  const container = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('subtotalAmt');
  const deliveryFeeEl = document.getElementById('deliveryFeeAmt');
  const totalEl = document.getElementById('totalAmt');
  const summaryBox = document.getElementById('cartSummary');
  const checkoutBtn = document.getElementById('checkoutBtn');

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

  checkoutBtn.addEventListener('click', async ()=>{
    const cart = getCart();
  const token = localStorage.getItem('vitato_token');
  const res = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json', ...(token? { Authorization: 'Bearer '+token }: {})}, body: JSON.stringify({ items: cart }) });
    const data = await res.json();
    if(data._id){ localStorage.removeItem('vitato_cart'); window.location.href = '/track.html?order='+data._id; }
    else alert(data.error||'Error');
  });

  loadDetails();
})();
