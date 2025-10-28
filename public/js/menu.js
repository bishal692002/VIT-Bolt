(function(){
  const socket = io({ auth: { token: localStorage.getItem('vitato_token') }});
  socket.on('menu_updated', ()=> loadMenu());
  const grid = document.getElementById('menuGrid');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cartCount = document.getElementById('cartCount');

  function getCart(){ 
    const cart = JSON.parse(localStorage.getItem('vitato_cart')||'[]'); 
    console.log('Current cart:', cart); // Debug log
    return cart;
  }
  
  function setCart(c){ 
    localStorage.setItem('vitato_cart', JSON.stringify(c)); 
    const totalItems = c.reduce((s,i)=> s + i.quantity,0);
    cartCount.textContent = totalItems;
    console.log('Cart updated, total items:', totalItems); // Debug log
  }
  setCart(getCart());

  async function loadMenu(){
    const q = searchInput.value.trim();
    const category = categoryFilter.value;
    const params = new URLSearchParams();
    if(q) params.append('q', q);
    if(category) params.append('category', category);
  const token = localStorage.getItem('vitato_token');
  const res = await fetch('/api/menu?'+params.toString(), { headers: token? { Authorization: 'Bearer '+token } : {} });
    const items = await res.json();
    grid.innerHTML = items.map((item, index) => {
      const inStockBadge = item.inStock 
        ? '<div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>In Stock</div>' 
        : '<div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>Out of Stock</div>';

      const isVendorOffline = !item.vendorOnline;
      const cardClasses = `menu-card rounded-3xl shadow-xl overflow-hidden animate-fade-in-up relative ${isVendorOffline ? 'opacity-60' : ''}`;

      return `
      <div class="${cardClasses}" style="animation-delay: ${index * 0.1}s;">
        ${isVendorOffline ? `
          <div class="absolute inset-0 bg-black bg-opacity-30 z-10 flex items-center justify-center rounded-3xl">
            <div class="bg-red-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
              </svg>
              Vendor Offline
            </div>
          </div>
        ` : ''}
        ${item.image 
          ? `<div class="relative w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
               <img src="${item.image}" alt="${item.name || 'food'}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" loading="lazy"/>
               <div class="absolute top-4 right-4">${inStockBadge}</div>
             </div>`
          : `<div class="relative w-full h-56 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
               <div class="text-center">
                 <div class="text-6xl mb-2">🍽️</div>
                 <p class="text-gray-600 font-medium">No Image</p>
               </div>
               <div class="absolute top-4 right-4">${inStockBadge}</div>
             </div>`}
        
        <div class="p-6">
          <div class="mb-3">
            <h3 class="text-xl font-bold text-gray-900 mb-1">${item.name}</h3>
            <p class="text-sm font-medium text-gray-500 flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              ${item.vendor?.name || 'Campus Vendor'}
            </p>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-2xl font-bold text-brand-dark">₹${item.price}</span>
            </div>
            <button 
              data-id="${item._id}" 
              class="addBtn btn-add px-6 py-3 rounded-xl text-white font-semibold text-sm flex items-center space-x-2 ${(!item.inStock || isVendorOffline) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}" 
              ${(!item.inStock || isVendorOffline) ? 'disabled' : ''}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>${!item.inStock ? 'Out of Stock' : isVendorOffline ? 'Vendor Offline' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </div>`; 
    }).join('');
    
    // Add event listeners to add buttons
    const addButtons = grid.querySelectorAll('.addBtn');
    console.log('Found add buttons:', addButtons.length); // Debug log
    
    addButtons.forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        console.log('Add button clicked!'); // Debug log
        
        const id = btn.getAttribute('data-id');
        console.log('Item ID:', id); // Debug log
        
        const cart = getCart();
        const existing = cart.find(c=>c.foodId===id);
        
        // Add item to cart
        if(existing) {
          existing.quantity += 1;
          console.log('Updated existing item quantity:', existing.quantity);
        } else {
          cart.push({ foodId: id, quantity: 1 });
          console.log('Added new item to cart');
        }
        setCart(cart);
        
        // Show success feedback
        const originalText = btn.innerHTML;
        btn.innerHTML = `
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>Added!</span>
        `;
        btn.classList.remove('btn-add');
        btn.classList.add('bg-green-500', 'hover:bg-green-600');
        btn.disabled = true;
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('bg-green-500', 'hover:bg-green-600');
          btn.classList.add('btn-add');
          btn.disabled = false;
        }, 1500);

        // Show toast notification (if available)
        if (window.showToast) {
          const itemName = btn.closest('.menu-card').querySelector('h3').textContent;
          window.showToast(`${itemName} added to cart!`, 'success');
        }
      });
    });
  }

  // Load categories dynamically so student view shows vendor-added categories
  (async function loadCategories(){
    try{
      const res = await fetch('/api/categories');
      if(!res.ok) return;
      const cats = await res.json();
      if(!categoryFilter) return;
      const existing = Array.from(categoryFilter.options).map(o=>o.value);
      cats.forEach(c=>{ if(!existing.includes(c)){ const opt = document.createElement('option'); opt.value = c; opt.textContent = c; categoryFilter.appendChild(opt); }});
    } catch {}
  })();

  searchInput.addEventListener('input', ()=> { loadMenu(); });
  categoryFilter.addEventListener('change', ()=> { loadMenu(); });
  loadMenu();
})();
