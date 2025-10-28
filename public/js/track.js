(function(){
  const params = new URLSearchParams(location.search);
  const orderId = params.get('order') || '68f4e7'; // Default to your example order ID
  const info = document.getElementById('orderInfo');
  const statusTimeline = document.getElementById('statusTimeline');
  const deliveryPartner = document.getElementById('deliveryPartner');

  const stages = ['placed','cooking','ready','out_for_delivery','delivered'];
  const stageLabels = ['Placed', 'Cooking', 'Ready', 'Out for Delivery', 'Delivered'];

  function renderStatus(current){
    const activeIndex = stages.indexOf(current);
    const progressPercentage = activeIndex >= 0 ? ((activeIndex + 1) / stages.length) * 100 : 0;
    
    // Update progress bar
    const progressBar = statusTimeline.querySelector('.absolute.h-1.bg-gradient-to-r');
    if (progressBar) {
      progressBar.style.width = `${progressPercentage}%`;
    }
    
    // Update step indicators
    const steps = statusTimeline.querySelectorAll('.flex.flex-col.items-center');
    steps.forEach((step, idx) => {
      const circle = step.querySelector('.w-16.h-16');
      const label = step.querySelector('.text-sm');
      
      if (idx <= activeIndex) {
        circle.className = circle.className.replace(/step-\w+/, 'step-completed');
        label.className = label.className.replace('text-gray-500', 'text-gray-900');
      } else if (idx === activeIndex + 1) {
        circle.className = circle.className.replace(/step-\w+/, 'step-active animate-pulse-custom');
        label.className = label.className.replace('text-gray-500', 'text-brand-dark');
      } else {
        circle.className = circle.className.replace(/step-\w+/, 'step-inactive');
        label.className = label.className.replace('text-gray-900', 'text-gray-500').replace('text-brand-dark', 'text-gray-500');
      }
    });
  }

  async function load(){
    const token = localStorage.getItem('vitato_token');
    
    // Use example data if no order ID or for demo purposes
    if(!orderId || orderId === '68f4e7') {
      // Display your example data
      info.innerHTML = `
        <div class="text-center mb-6">
          <h3 class="text-3xl font-bold text-gray-900 mb-2">Order #68f4e7</h3>
          <p class="text-lg text-gray-600 font-medium">Placed 6:58:59 PM</p>
        </div>
        
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6">
          <h4 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span class="text-2xl mr-3">🍽️</span>
            Order Items
          </h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center bg-white rounded-xl p-4 shadow-sm">
              <div>
                <span class="font-semibold text-gray-900">1 x Masala Dosa</span>
              </div>
              <span class="font-bold text-brand-dark">₹120</span>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex justify-between items-center text-xl font-bold">
              <span class="text-gray-900">Total:</span>
              <span class="text-brand-dark">₹135</span>
            </div>
          </div>
        </div>
      `;
      renderStatus('placed'); // Show as placed status
      return;
    }

    // Try to fetch real order data
    try {
      const res = await fetch('/api/orders/'+orderId, { 
        headers: token ? { Authorization: 'Bearer '+token } : {} 
      });
      const data = await res.json();
      
      if(!data._id){ 
        info.innerHTML='<div class="text-center p-8"><p class="text-red-500 text-lg font-medium">Order not found.</p></div>'; 
        return; 
      }
      
      info.innerHTML = `
        <div class="text-center mb-6">
          <h3 class="text-3xl font-bold text-gray-900 mb-2">Order #${data._id.substring(0,6)}</h3>
          <p class="text-lg text-gray-600 font-medium">Placed ${(new Date(data.createdAt)).toLocaleTimeString()}</p>
        </div>
        
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6">
          <h4 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span class="text-2xl mr-3">🍽️</span>
            Order Items
          </h4>
          <div class="space-y-3">
            ${data.items.map(i => `
              <div class="flex justify-between items-center bg-white rounded-xl p-4 shadow-sm">
                <div>
                  <span class="font-semibold text-gray-900">${i.quantity} x ${i.food.name}</span>
                </div>
                <span class="font-bold text-brand-dark">₹${i.price}</span>
              </div>
            `).join('')}
          </div>
          <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex justify-between items-center text-xl font-bold">
              <span class="text-gray-900">Total:</span>
              <span class="text-brand-dark">₹${data.total}</span>
            </div>
          </div>
        </div>
      `;
      
      renderStatus(data.status);
      
      if(data.deliveryPartner){
        deliveryPartner.classList.remove('hidden');
        deliveryPartner.innerHTML = `
          <h4 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span class="text-2xl mr-3">🚴‍♂️</span>
            Delivery Partner
          </h4>
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-gray-900">${data.deliveryPartner.name}</p>
                <p class="text-sm text-gray-600">Your delivery partner</p>
              </div>
              <a href="tel:${data.deliveryPartner.phone}" 
                 class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                📞 ${data.deliveryPartner.phone}
              </a>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading order:', error);
      info.innerHTML='<div class="text-center p-8"><p class="text-red-500 text-lg font-medium">Error loading order details.</p></div>';
    }
  }

  load();

  // Socket connection for real-time updates
  const socket = io();
  socket.emit('subscribe_order', orderId);
  socket.on('order_status', payload => { 
    if(payload.orderId === orderId){ 
      renderStatus(payload.status); 
    }
  });
})();
