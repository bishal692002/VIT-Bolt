(function(){
  const container = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('subtotalAmt');
  const deliveryFeeEl = document.getElementById('deliveryFeeAmt');
  const totalEl = document.getElementById('totalAmt');
  const summaryBox = document.getElementById('cartSummary');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const payBtn = document.getElementById('payBtn');
  const addAddrBtn = document.getElementById('addAddrBtn');
  const selectAddrBtn = document.getElementById('selectAddrBtn');
  const changeAddressBtn = document.getElementById('changeAddressBtn');
  const noAddressMsg = document.getElementById('noAddressMsg');
  const selectedAddressDisplay = document.getElementById('selectedAddressDisplay');
  const selectedAddressLabel = document.getElementById('selectedAddressLabel');
  const selectedAddressDetails = document.getElementById('selectedAddressDetails');
  
  // Modal elements
  const addressModal = document.getElementById('addressModal');
  const closeAddressModal = document.getElementById('closeAddressModal');
  const addressSearch = document.getElementById('addressSearch');
  const modalAddressList = document.getElementById('modalAddressList');
  const modalNoAddresses = document.getElementById('modalNoAddresses');
  const addNewAddressFromModal = document.getElementById('addNewAddressFromModal');
  
  let addresses = [];
  let selectedAddressIndex = -1;
  let filteredAddresses = [];

  // Show any pending toast message passed via redirect
  (function(){
    try {
      const msg = localStorage.getItem('vitato_toast');
      if(msg){
        if (window.toast && typeof window.toast.info === 'function') {
          window.toast.info(msg);
        } else {
          // Fallback inline message
          const box = document.getElementById('cartSummary');
          if (box) {
            const m = document.createElement('div');
            m.className = 'mb-3 text-sm text-yellow-700';
            m.textContent = msg;
            box.prepend(m);
          }
        }
        localStorage.removeItem('vitato_toast');
      }
    } catch {}
  })();

  async function loadAddresses(){
    const token = localStorage.getItem('vitato_token');
    if(!token) return;
    const res = await fetch('/api/addresses', { headers:{ Authorization:'Bearer '+token }});
    if(res.ok){ 
      addresses = await res.json(); 
      // Sort addresses - recently used first (you can implement usage tracking later)
      if(selectedAddressIndex >= addresses.length) selectedAddressIndex = -1; 
      updateAddressDisplay();
    }
  }

  function updateAddressDisplay(){
    const hasAddress = selectedAddressIndex >= 0 && addresses[selectedAddressIndex];
    
    selectedAddressDisplay.classList.toggle('hidden', !hasAddress);
    noAddressMsg.classList.toggle('hidden', hasAddress);
    
    if(hasAddress){
      const addr = addresses[selectedAddressIndex];
      
      // Helper function to safely get field value
      const getFieldValue = (field) => {
        return field && field !== 'undefined' && field !== 'null' && field.trim() !== '' ? field : null;
      };
      
      const label = getFieldValue(addr.label) || `Address ${selectedAddressIndex + 1}`;
      const line1 = getFieldValue(addr.line1) || 'Address not specified';
      const line2 = getFieldValue(addr.line2);
      const landmark = getFieldValue(addr.landmark);
      const city = getFieldValue(addr.city);
      const pincode = getFieldValue(addr.pincode);
      
      // Build city-pincode line only if at least one exists
      let cityPincodeText = '';
      if (city || pincode) {
        cityPincodeText = `<br>${city || ''}${city && pincode ? ' - ' : ''}${pincode || ''}`;
      }
      
      selectedAddressLabel.textContent = label;
      selectedAddressDetails.innerHTML = `
        ${line1}${line2 ? ', ' + line2 : ''}${cityPincodeText}
        ${landmark ? '<br>' + landmark : ''}
      `;
    }
    
    // Disable checkout if no address selected
    checkoutBtn.disabled = !hasAddress;
    checkoutBtn.classList.toggle('opacity-50', !hasAddress);
  }

  function filterAddresses(searchTerm = ''){
    const term = searchTerm.toLowerCase().trim();
    if(!term){
      filteredAddresses = [...addresses];
    } else {
      filteredAddresses = addresses.filter(addr => 
        (addr.label || '').toLowerCase().includes(term) ||
        (addr.line1 || '').toLowerCase().includes(term) ||
        (addr.line2 || '').toLowerCase().includes(term) ||
        (addr.landmark || '').toLowerCase().includes(term) ||
        (addr.city || '').toLowerCase().includes(term) ||
        (addr.pincode || '').toLowerCase().includes(term)
      );
    }
    renderModalAddresses();
  }

  function renderModalAddresses(){
    if(filteredAddresses.length === 0){
      modalAddressList.innerHTML = '';
      modalNoAddresses.classList.remove('hidden');
      return;
    }
    
    modalNoAddresses.classList.add('hidden');
    modalAddressList.innerHTML = filteredAddresses.map((addr, index) => {
      const actualIndex = addresses.findIndex(a => a._id === addr._id);
      const isSelected = actualIndex === selectedAddressIndex;
      
      // Helper function to safely get field value
      const getFieldValue = (field) => {
        return field && field !== 'undefined' && field !== 'null' && field.trim() !== '' ? field : null;
      };
      
      const label = getFieldValue(addr.label) || `Address ${actualIndex + 1}`;
      const line1 = getFieldValue(addr.line1) || 'Address not specified';
      const line2 = getFieldValue(addr.line2);
      const landmark = getFieldValue(addr.landmark);
      const city = getFieldValue(addr.city);
      const pincode = getFieldValue(addr.pincode);
      
      // Build city-pincode line only if at least one exists
      let cityPincodeText = '';
      if (city || pincode) {
        cityPincodeText = `${city || ''}${city && pincode ? ' - ' : ''}${pincode || ''}`;
      }
      
      return `
        <div class="address-option border rounded-lg p-4 cursor-pointer transition-all hover:border-yellow-400 hover:bg-yellow-50 ${isSelected ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}" 
             data-index="${actualIndex}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="font-medium text-sm mb-1">${label}</div>
              <div class="text-xs text-gray-600 leading-relaxed">
                ${line1}${line2 ? ', ' + line2 : ''}<br>
                ${landmark ? landmark + ', ' : ''}${cityPincodeText}
              </div>
            </div>
            <div class="flex items-center gap-2 ml-3">
              ${isSelected ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Selected</span>' : ''}
              <button class="text-xs text-yellow-700 hover:text-yellow-800" onclick="editAddress('${addr._id}')">Edit</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click listeners to address options
    modalAddressList.querySelectorAll('.address-option').forEach(option => {
      option.addEventListener('click', () => {
        selectedAddressIndex = parseInt(option.dataset.index);
        updateAddressDisplay();
        closeModal();
      });
    });
  }

  function openModal(){
    filteredAddresses = [...addresses];
    renderModalAddresses();
    addressSearch.value = '';
    addressModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    addressModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Event listeners
  selectAddrBtn?.addEventListener('click', openModal);
  changeAddressBtn?.addEventListener('click', openModal);
  closeAddressModal?.addEventListener('click', closeModal);
  
  // Close modal when clicking outside
  addressModal?.addEventListener('click', (e) => {
    if(e.target === addressModal) closeModal();
  });

  // Search functionality
  addressSearch?.addEventListener('input', (e) => {
    filterAddresses(e.target.value);
  });

  // Add address buttons
  addAddrBtn?.addEventListener('click', () => {
    try {
      localStorage.setItem('vitato_return_to', location.pathname + location.search + location.hash);
      localStorage.setItem('vitato_notice', 'addAddress');
    } catch {}
    window.location.href = '/addresses.html';
  });

  addNewAddressFromModal?.addEventListener('click', () => {
    try {
      localStorage.setItem('vitato_return_to', location.pathname + location.search + location.hash);
      localStorage.setItem('vitato_notice', 'addAddress');
    } catch {}
    window.location.href = '/addresses.html';
  });

  // Edit address function (global)
  window.editAddress = function(addressId){
    try {
      localStorage.setItem('vitato_return_to', location.pathname + location.search + location.hash);
      localStorage.setItem('vitato_notice', 'editAddress');
      localStorage.setItem('vitato_edit_address', addressId);
    } catch {}
    window.location.href = '/addresses.html';
  };

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
    if(selectedAddressIndex < 0 || !addresses.length){
      try {
        localStorage.setItem('vitato_return_to', location.pathname + location.search + location.hash);
        localStorage.setItem('vitato_notice', 'addAddress');
      } catch {}
      // Navigate to dedicated addresses page with a notice to add address
      if (window.toast && typeof window.toast.info === 'function') {
        window.toast.info('Please select a delivery address before proceeding');
      }
      window.location.href = '/addresses.html';
      return;
    }
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
        name: 'VIT-Bolt',
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
