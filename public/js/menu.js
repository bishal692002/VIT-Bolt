(function(){
  const socket = io({ auth: { token: localStorage.getItem('vitato_token') }});
  socket.on('menu_updated', ()=> loadMenu());
  const grid = document.getElementById('menuGrid');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cartCount = document.getElementById('cartCount');

  function getCart(){ return JSON.parse(localStorage.getItem('vitato_cart')||'[]'); }
  function setCart(c){ localStorage.setItem('vitato_cart', JSON.stringify(c)); cartCount.textContent = c.reduce((s,i)=> s + i.quantity,0); }
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
    grid.innerHTML = items.map(item => {
      const badge = item.inStock ? '<span class="text-green-600 text-xs font-medium flex items-center">✔ In stock</span>' : '<span class="text-red-500 text-xs font-medium flex items-center">✖ Out</span>';
      return `
      <div class="bg-white border border-gray-100 rounded-lg shadow-sm flex flex-col overflow-hidden transition transform hover:scale-[1.02]">
        ${item.image ? `<img src="${item.image}" alt="${item.name||'food'}" class="w-full h-40 object-cover bg-gray-100" loading="lazy"/>` : `<div class="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No image</div>`}
        <div class="p-4 flex flex-col flex-1">
          <h3 class="font-semibold mb-1">${item.name}</h3>
          <p class="text-sm text-gray-500 mb-1">${item.vendor?.name||''}</p>
          <div class="mb-2">${badge}</div>
          <div class="mt-auto flex items-center justify-between">
            <span class="font-medium">₹${item.price}</span>
            <button data-id="${item._id}" class="addBtn text-sm bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 px-3 py-1.5 rounded-md" ${item.inStock? '' : 'disabled'}>Add</button>
          </div>
        </div>
      </div>`; }).join('');
    grid.querySelectorAll('.addBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        const cart = getCart();
        const existing = cart.find(c=>c.foodId===id);
        if(existing) existing.quantity +=1; else cart.push({ foodId:id, quantity:1 });
        setCart(cart);
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
