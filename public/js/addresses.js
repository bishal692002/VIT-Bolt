(function(){
  const token = localStorage.getItem('vitato_token');
  if (!token) {
    try { localStorage.setItem('vitato_lastPage', location.pathname + location.search + location.hash); } catch {}
    window.location.replace('/');
    return;
  }

  const addressList = document.getElementById('addressList');
  const addressEmpty = document.getElementById('addressEmpty');
  const addAddressBtn = document.getElementById('addAddressBtn');
  
  // Address modal elements
  const addressModal = document.getElementById('addressModal');
  const addressModalTitle = document.getElementById('addressModalTitle');
  const addressModalClose = document.getElementById('addressModalClose');
  const addressCancelBtn = document.getElementById('addressCancel');
  const addressForm = document.getElementById('addressForm');
  const addressFormMsg = document.getElementById('addressFormMsg');
  
  let addresses = [];

  async function loadAddresses(){
    if(!token) return;
    
    try {
      const res = await fetch('/api/addresses', { 
        headers: { Authorization: 'Bearer ' + token }
      });
      
      if(res.ok) { 
        addresses = await res.json(); 
        renderAddresses(); 
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  }

  function renderAddresses(){
    if (!addressList) return;
    
    if (addresses.length === 0) {
      addressList.classList.add('hidden');
      addressEmpty.classList.remove('hidden');
      return;
    }
    
    addressList.classList.remove('hidden');
    addressEmpty.classList.add('hidden');
    
    addressList.innerHTML = addresses.map((address, index) => {
      // Helper function to safely get field value
      const getFieldValue = (field) => {
        return field && field !== 'undefined' && field !== 'null' && field.trim() !== '' ? field : null;
      };
      
      const label = getFieldValue(address.label) || `Address ${index + 1}`;
      const line1 = getFieldValue(address.line1) || 'Address not specified';
      const line2 = getFieldValue(address.line2);
      const landmark = getFieldValue(address.landmark);
      const city = getFieldValue(address.city);
      const pincode = getFieldValue(address.pincode);
      
      // Build city-pincode line only if at least one exists
      let cityPincodeText = '';
      if (city || pincode) {
        cityPincodeText = `<p class="text-xs text-gray-400 mt-1">${city || ''}${city && pincode ? ' - ' : ''}${pincode || ''}</p>`;
      }
      
      return `
        <div class="address-card rounded-3xl p-6 shadow-lg animate-fade-in-up h-64 flex flex-col" style="animation-delay: ${index * 0.1}s;">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gradient-to-br from-brand-yellow to-brand-dark rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-gray-900 truncate">${label}</h3>
                <p class="text-sm text-gray-500">Delivery Location</p>
              </div>
            </div>
          </div>
          
          <div class="flex-1 mb-4 text-gray-700 leading-relaxed overflow-hidden">
            <p class="font-medium text-sm line-clamp-2">${line1}</p>
            ${line2 ? `<p class="text-sm line-clamp-1">${line2}</p>` : ''}
            ${landmark ? `<p class="text-xs text-gray-500 mt-1 line-clamp-1">Near ${landmark}</p>` : ''}
            ${cityPincodeText}
          </div>
          
          <div class="flex space-x-3 mt-auto">
            <button data-edit="${address._id}" class="flex-1 btn-secondary px-4 py-2 rounded-xl font-medium text-sm">
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit
            </button>
            <button data-delete="${address._id}" class="px-4 py-2 rounded-xl font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners
    addressList.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit');
        const address = addresses.find(a => a._id === id);
        if (address) openAddressModal('edit', address);
      });
    });
    
    addressList.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete');
        if (!confirm('Are you sure you want to delete this address?')) return;
        
        try {
          await fetch('/api/addresses/' + id, { 
            method: 'DELETE', 
            headers: { Authorization: 'Bearer ' + token }
          });
          await loadAddresses();
          showToast('Address deleted successfully', 'success');
        } catch (error) {
          showToast('Error deleting address', 'error');
        }
      });
    });
  }

  // Address modal functions
  function openAddressModal(mode, data) {
    if (!addressModal || !addressForm) return;
    
    addressForm.reset();
    addressFormMsg.textContent = '';
    addressForm.dataset.mode = mode;
    
    if (mode === 'edit' && data) {
      addressModalTitle.textContent = 'Edit Address';
      addressForm.querySelector('[name=id]').value = data._id || '';
      addressForm.querySelector('[name=label]').value = data.label || '';
      addressForm.querySelector('[name=line1]').value = data.line1 || '';
      addressForm.querySelector('[name=line2]').value = data.line2 || '';
      addressForm.querySelector('[name=landmark]').value = data.landmark || '';
    } else {
      addressModalTitle.textContent = 'Add New Address';
    }
    
    addressModal.classList.remove('hidden');
    addressModal.classList.add('flex');
  }

  function closeAddressModal() {
    if (!addressModal) return;
    addressModal.classList.add('hidden');
    addressModal.classList.remove('flex');
    addressFormMsg.textContent = '';
  }

  // Toast notification function
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-xl shadow-lg z-50 transform transition-all duration-300`;
    toast.textContent = message;
    toast.style.transform = 'translateX(100%)';
    
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // Event listeners
  addAddressBtn?.addEventListener('click', () => openAddressModal('add'));
  addressModalClose?.addEventListener('click', closeAddressModal);
  addressCancelBtn?.addEventListener('click', closeAddressModal);
  addressModal?.addEventListener('click', (e) => {
    if (e.target === addressModal) closeAddressModal();
  });

  addressForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!token) return;
    
    addressFormMsg.textContent = '';
    const formData = new FormData(addressForm);
    const id = formData.get('id');
    
    const body = {
      label: (formData.get('label') || '').toString().trim(),
      line1: (formData.get('line1') || '').toString().trim(),
      line2: (formData.get('line2') || '').toString().trim(),
      landmark: (formData.get('landmark') || '').toString().trim()
    };
    
    if (!body.line1) {
      addressFormMsg.textContent = 'Address Line 1 is required';
      return;
    }
    
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? '/api/addresses/' + id : '/api/addresses';
      
      const resp = await fetch(url, { 
        method, 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: 'Bearer ' + token 
        }, 
        body: JSON.stringify(body) 
      });
      
      if (!resp.ok) {
        const txt = await resp.text();
        addressFormMsg.textContent = txt || 'Failed to save address';
        return;
      }
      
      closeAddressModal();
      await loadAddresses();
      showToast(id ? 'Address updated successfully' : 'Address added successfully', 'success');
      
      // If redirected here from cart, send user back
      try {
        const returnTo = localStorage.getItem('vitato_return_to');
        if (returnTo) {
          localStorage.removeItem('vitato_return_to');
          localStorage.setItem('vitato_toast', 'Address saved. Continue checkout.');
          window.location.href = returnTo;
          return;
        }
      } catch {}
      
    } catch (err) {
      addressFormMsg.textContent = 'Error saving address';
    }
  });

  // Handle cross-page notices from cart
  (function(){
    try {
      const params = new URLSearchParams(location.search);
      const notice = localStorage.getItem('vitato_notice') || params.get('notice');
      
      if (notice === 'addAddress') {
        showToast('Please add a delivery address before proceeding', 'info');
        // Auto open Add Address modal for convenience
        setTimeout(() => {
          try { 
            addAddressBtn?.click(); 
          } catch {} 
        }, 500);
      }
      
      localStorage.removeItem('vitato_notice');
    } catch {}
  })();

  // Initialize
  loadAddresses();
})();