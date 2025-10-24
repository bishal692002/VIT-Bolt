// Admin Dashboard JavaScript
const adminToken = localStorage.getItem('adminToken');
if (!adminToken) {
  window.location.href = '/admin-login';
}

const API_BASE = '/vitato/admin-api';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${adminToken}`
};

// Socket.IO for real-time notifications
let socket;
try {
  socket = io({
    auth: { token: adminToken }
  });

  socket.on('connect', () => console.log('Admin socket connected'));
  
  socket.on('new_vendor_application', (data) => {
    showNotification(`New vendor application: ${data.businessName}`);
    loadApplications();
    loadStats();
  });

  socket.on('vendor_approved', (data) => {
    showNotification(`Vendor approved: ${data.businessName}`);
  });

  socket.on('new_order', () => {
    loadStats();
  });
} catch (e) {
  console.warn('Socket.IO not available:', e);
}

// Tab switching
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    // Load data for the tab
    if (tabName === 'applications') loadApplications();
    else if (tabName === 'vendors') loadVendors();
    else if (tabName === 'analytics') loadAnalytics();
  });
});

// Load initial data
loadStats();
loadApplications();

// Regenerate Credentials for approved application
async function regenerateCredentials(id, appNumber) {
  const confirmed = await confirmModal.show({
    title: 'Regenerate Credentials',
    message: `This will generate new login credentials for application ${appNumber}. The vendor can view them when checking their application status.`,
    confirmText: 'Regenerate',
    type: 'warning'
  });
  
  if (!confirmed) return;
  
  try {
    const res = await fetch(`${API_BASE}/applications/${id}/regenerate-credentials`, {
      method: 'POST',
      headers
    });
    
    const result = await res.json();
    
    if (res.ok) {
      toast.success('Credentials regenerated successfully! Vendor can now view them.');
      loadApplications();
    } else {
      toast.error(result.error || 'Failed to regenerate credentials');
    }
  } catch (error) {
    toast.error('Network error. Please try again.');
  }
}

// Make functions globally available for onclick handlers
window.approveApplication = approveApplication;
window.rejectApplication = rejectApplication;
window.regenerateCredentials = regenerateCredentials;
window.toggleVendorStatus = toggleVendorStatus;
window.loadOrdersTimeline = loadOrdersTimeline;
window.browseCollection = browseCollection;
window.exportCollection = exportCollection;
window.loadApplications = loadApplications;
window.loadVendors = loadVendors;
window.logout = logout;

// ----- Database Table State -----
const dbState = { collection: null, page: 1, limit: 10, total: 0, sortKey: null, sortDir: 'asc' };

function renderTable(container, items){
  if(!Array.isArray(items) || items.length === 0){
    container.innerHTML = '<div class="p-6 text-sm text-gray-500 text-center">No data</div>';
    return;
  }
  // Determine columns from first item
  const first = items[0];
  const keys = Object.keys(first);
  const orderPreferred = ['_id','id','name','email','role','status','createdAt','updatedAt'];
  keys.sort((a,b)=>{
    const ia = orderPreferred.indexOf(a), ib = orderPreferred.indexOf(b);
    if(ia !== -1 || ib !== -1){ return (ia === -1? 999: ia) - (ib === -1? 999: ib); }
    return a.localeCompare(b);
  });
  // Client-side sort for current page if requested
  if(dbState.sortKey){
    const dir = dbState.sortDir === 'desc' ? -1 : 1;
    items.sort((x,y)=>{
      const a = x[dbState.sortKey];
      const b = y[dbState.sortKey];
      if(a==null && b==null) return 0; if(a==null) return -1*dir; if(b==null) return 1*dir;
      if(typeof a === 'number' && typeof b === 'number') return (a-b)*dir;
      return String(a).localeCompare(String(b)) * dir;
    });
  }
  // Build table
  const thead = `<thead><tr>${keys.map(k=> `<th data-sort="${k}" class="px-3 py-2 text-[11px] uppercase text-gray-500 cursor-pointer hover:text-gray-900">${k}${dbState.sortKey===k? (dbState.sortDir==='asc'?' ▲':' ▼'):''}</th>`).join('')}</tr></thead>`;
  const rows = items.map(row => `<tr class="odd:bg-gray-50">
    ${keys.map(k=> `<td class="px-3 py-2 text-xs text-gray-800">${formatCell(row[k])}</td>`).join('')}
  </tr>`).join('');
  container.innerHTML = `
    <div class="overflow-auto">
      <table class="w-full text-left border-collapse">${thead}<tbody class="divide-y">${rows}</tbody></table>
    </div>`;
  // Bind sorting
  container.querySelectorAll('th[data-sort]')?.forEach(th => th.addEventListener('click', ()=>{
    const key = th.getAttribute('data-sort');
    if(dbState.sortKey === key){ dbState.sortDir = dbState.sortDir === 'asc' ? 'desc' : 'asc'; }
    else { dbState.sortKey = key; dbState.sortDir = 'asc'; }
    renderTable(container, items.slice());
  }));
}

function formatCell(val){
  if(val == null) return '';
  if(typeof val === 'object'){
    // Mongoose id or populated refs
    if(val._id && Object.keys(val).length === 1) return val._id;
    try { return JSON.stringify(val).slice(0,120).replace(/[\"{}]/g,'').replace(/:,/g,': ').replace(/,/g,', '); } catch { return String(val); }
  }
  if(typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

// Stats Cards
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/analytics/stats`, { headers });
    const stats = await res.json();
    
    const statsCards = document.getElementById('statsCards');
    statsCards.innerHTML = `
      <sl-card class="p-0"><div class="p-4"><p class="text-xs text-gray-500 uppercase tracking-wide">Total Orders</p><p class="text-2xl font-bold text-gray-900 mt-1">${stats.totalOrders || 0}</p></div></sl-card>
      <sl-card class="p-0"><div class="p-4"><p class="text-xs text-gray-500 uppercase tracking-wide">Total Sales</p><p class="text-2xl font-bold text-gray-900 mt-1">₹${(stats.totalRevenue || 0).toFixed(2)}</p></div></sl-card>
      <sl-card class="p-0"><div class="p-4"><p class="text-xs text-gray-500 uppercase tracking-wide">Our Earnings</p><p class="text-2xl font-bold text-emerald-600 mt-1">₹${(stats.platformEarnings || 0).toFixed(2)}</p></div></sl-card>
      <sl-card class="p-0"><div class="p-4"><p class="text-xs text-gray-500 uppercase tracking-wide">Total Vendors</p><p class="text-2xl font-bold text-gray-900 mt-1">${stats.totalVendors || 0}</p></div></sl-card>
      <sl-card class="p-0"><div class="p-4"><p class="text-xs text-gray-500 uppercase tracking-wide">Active Vendors</p><p class="text-2xl font-bold text-green-600 mt-1">${stats.activeVendors || 0}</p></div></sl-card>
      <sl-card class="p-0"><div class="p-4"><p class="text-xs text-gray-500 uppercase tracking-wide">Total Users</p><p class="text-2xl font-bold text-gray-900 mt-1">${stats.totalUsers || 0}</p></div></sl-card>
    `;
    
    // Update pending badge
    const pendingEl = document.getElementById('pendingBadge');
    if (pendingEl?.tagName === 'SL-BADGE') {
      pendingEl.textContent = String(stats.pendingApplications || 0);
    } else if (pendingEl) {
      pendingEl.textContent = stats.pendingApplications || 0;
    }
    const notifCount = document.getElementById('notificationCount');
    if (stats.pendingApplications > 0) {
      notifCount.textContent = stats.pendingApplications;
      notifCount.classList.remove('hidden');
    } else {
      notifCount.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load Applications
async function loadApplications() {
  try {
    const res = await fetch(`${API_BASE}/applications`, { headers });
    const applications = await res.json();
    
    const list = document.getElementById('applicationsList');
    
    if (applications.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-center py-8">No pending applications</p>';
      return;
    }
    
    console.log('Rendering applications:', applications.length);
    console.log('First application:', applications[0]);
    
    list.innerHTML = applications.map(app => `
      <div class="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-gray-900 text-lg">${app.businessName}</h3>
            <p class="text-sm text-gray-500 font-mono">Application #${app.applicationNumber}</p>
          </div>
          <span class="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">PENDING</span>
        </div>
        
        <div class="grid md:grid-cols-2 gap-3 text-sm mb-5 bg-gray-50 p-4 rounded-lg">
          <div>
            <span class="text-gray-500">Owner:</span>
            <span class="font-medium ml-1">${app.ownerName}</span>
          </div>
          <div>
            <span class="text-gray-500">Contact:</span>
            <span class="font-medium ml-1">${app.contactNumber}</span>
          </div>
          <div>
            <span class="text-gray-500">Email:</span>
            <span class="font-medium ml-1">${app.email}</span>
          </div>
          <div>
            <span class="text-gray-500">Cuisine:</span>
            <span class="font-medium ml-1">${app.cuisineType}</span>
          </div>
          <div class="md:col-span-2">
            <span class="text-gray-500">Address:</span>
            <span class="font-medium ml-1">${app.address}</span>
          </div>
          ${app.licenseId ? `
          <div class="md:col-span-2">
            <span class="text-gray-500">License/ID:</span>
            <span class="font-medium ml-1">${app.licenseId}</span>
          </div>` : ''}
          <div class="md:col-span-2">
            <span class="text-gray-500">Submitted:</span>
            <span class="font-medium ml-1">${new Date(app.submittedAt).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="flex gap-3 pt-3 border-t-2 border-gray-100">
          <button onclick="window.approveApplication('${app._id}')" style="flex: 1; background-color: #16a34a; color: white; padding: 12px 20px; border-radius: 8px; font-weight: bold; font-size: 14px; border: none; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onmouseover="this.style.backgroundColor='#15803d'" onmouseout="this.style.backgroundColor='#16a34a'">
            ✓ APPROVE
          </button>
          <button onclick="window.rejectApplication('${app._id}')" style="flex: 1; background-color: #dc2626; color: white; padding: 12px 20px; border-radius: 8px; font-weight: bold; font-size: 14px; border: none; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onmouseover="this.style.backgroundColor='#b91c1c'" onmouseout="this.style.backgroundColor='#dc2626'">
            ✗ REJECT
          </button>
        </div>
      </div>
    `).join('');
    
    console.log('Applications rendered. HTML length:', list.innerHTML.length);
  } catch (error) {
    console.error('Failed to load applications:', error);
  }
}

// Approve Application
async function approveApplication(id) {
  const confirmed = await confirmModal.show({
    title: 'Approve Vendor Application',
    message: 'This will create a vendor account and generate login credentials. The vendor will be able to view their credentials when checking their application status.',
    confirmText: 'Approve',
    cancelText: 'Cancel',
    type: 'success',
    icon: '✓'
  });
  
  if (!confirmed) return;
  
  try {
    const res = await fetch(`${API_BASE}/applications/${id}/approve`, {
      method: 'POST',
      headers
    });
    
    const result = await res.json();
    
    if (res.ok) {
      toast.success('Vendor approved successfully! The vendor can now check their application status to view credentials.');
      loadApplications();
      loadStats();
      loadVendors();
    } else {
      toast.error(result.error || 'Failed to approve application');
    }
  } catch (error) {
    toast.error('Network error. Please try again.');
  }
}

// Reject Application
async function rejectApplication(id) {
  const reason = await inputModal.show({
    title: 'Reject Application',
    message: 'Please provide a reason for rejecting this vendor application (optional):',
    placeholder: 'e.g., Incomplete documentation, Invalid license, etc.',
    confirmText: 'Reject',
    cancelText: 'Cancel'
  });
  
  if (reason === null) return; // cancelled
  
  try {
    const res = await fetch(`${API_BASE}/applications/${id}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: reason || 'No reason provided' })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      toast.warning('Application rejected');
      loadApplications();
      loadStats();
    } else {
      toast.error(result.error || 'Failed to reject application');
    }
  } catch (error) {
    toast.error('Network error. Please try again.');
  }
}

// Load Vendors
async function loadVendors() {
  try {
    const res = await fetch(`${API_BASE}/vendors`, { headers });
    const vendors = await res.json();
    
    const list = document.getElementById('vendorsList');
    
    if (vendors.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-center py-8">No vendors yet</p>';
      return;
    }
    
    list.innerHTML = vendors.map(vendor => `
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-gray-900">${vendor.name}</h3>
              <span class="px-2 py-1 ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} text-xs rounded-full">
                ${vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div class="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
              ${vendor.userName ? `<div>Owner: <span class="font-medium">${vendor.userName}</span></div>` : ''}
              ${vendor.userEmail ? `<div>Email: <span class="font-medium">${vendor.userEmail}</span></div>` : ''}
              ${vendor.contactPhone ? `<div>Phone: <span class="font-medium">${vendor.contactPhone}</span></div>` : ''}
              ${vendor.categories?.length ? `<div>Categories: <span class="font-medium">${vendor.categories.join(', ')}</span></div>` : ''}
            </div>
          </div>
          
          <button onclick="toggleVendorStatus('${vendor._id}', ${vendor.isActive})" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">
            ${vendor.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load vendors:', error);
  }
}

// Toggle Vendor Status
async function toggleVendorStatus(id, currentStatus) {
  const action = currentStatus ? 'deactivate' : 'activate';
  const confirmed = await confirmModal.show({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Vendor`,
    message: `Are you sure you want to ${action} this vendor? ${currentStatus ? 'They will not be able to receive new orders.' : 'They will be able to receive orders again.'}`,
    confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    type: currentStatus ? 'warning' : 'success'
  });
  
  if (!confirmed) return;
  
  try {
    const res = await fetch(`${API_BASE}/vendors/${id}/toggle`, {
      method: 'PATCH',
      headers
    });
    
    if (res.ok) {
      toast.success(`Vendor ${action}d successfully`);
      loadVendors();
      loadStats();
    } else {
      toast.error('Failed to update vendor status');
    }
  } catch (error) {
    toast.error('Network error. Please try again.');
  }
}

async function loadAnalytics() {
  loadOrdersTimeline('week');
  loadTopVendors();
  loadPopularItems();
}

async function loadOrdersTimeline(period = 'week') {
  try {
    const res = await fetch(`${API_BASE}/analytics/orders-timeline?period=${period}`, { headers });
    const data = await res.json();
    const list = document.getElementById('ordersTimelineList');
    if (!list) return;
    const rows = data.map(d => `<tr>
        <td class="px-3 py-2 text-xs text-gray-600">${d._id}</td>
        <td class="px-3 py-2 text-xs font-semibold text-gray-900">${d.count}</td>
        <td class="px-3 py-2 text-xs text-gray-500">₹${(d.revenue || 0).toFixed(2)}</td>
      </tr>`).join('');
    list.innerHTML = `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-[11px] uppercase text-gray-500">
            <th class="px-3 py-2">Period</th>
            <th class="px-3 py-2">Orders</th>
            <th class="px-3 py-2">Revenue</th>
          </tr>
        </thead>
        <tbody class="divide-y">${rows}</tbody>
      </table>`;

    // Toggle active button styles
    try {
      const container = list.closest('.bg-white');
      const buttons = container.querySelectorAll('[data-period]');
      buttons.forEach(btn => {
        const isActive = btn.getAttribute('data-period') === period;
        if (btn.tagName === 'SL-BUTTON') {
          btn.variant = isActive ? 'primary' : 'neutral';
        } else {
          btn.classList.toggle('bg-blue-100', isActive);
          btn.classList.toggle('text-blue-700', isActive);
          btn.classList.toggle('bg-gray-100', !isActive);
          btn.classList.toggle('text-gray-700', !isActive);
        }
      });
    } catch {}
  } catch (error) {
    console.error('Failed to load orders timeline:', error);
  }
}

async function loadTopVendors() {
  try {
    const res = await fetch(`${API_BASE}/analytics/top-vendors`, { headers });
    const data = await res.json();
    const list = document.getElementById('vendorsListSimple');
    if (!list) return;
    list.innerHTML = data.map((v, i) => `
      <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 bg-green-100 text-green-700 rounded-full text-[10px] flex items-center justify-center">${i+1}</span>
          <span class="text-xs font-medium text-gray-900">${v.vendorName || 'Vendor'}</span>
        </div>
        <span class="text-xs font-semibold text-green-700">₹${(v.revenue || 0).toFixed(2)}</span>
      </div>
    `).join('') || '<p class="text-xs text-gray-500">No data</p>';
  } catch (error) {
    console.error('Failed to load top vendors:', error);
  }
}

async function loadPopularItems() {
  try {
    const res = await fetch(`${API_BASE}/analytics/popular-items`, { headers });
    const data = await res.json();
    
    const list = document.getElementById('popularItemsList');
    
    if (data.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No data available</p>';
      return;
    }
    
    list.innerHTML = data.map((item, idx) => `
      <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
            ${idx + 1}
          </span>
          <div>
            <p class="font-medium text-gray-900">${item.itemName}</p>
            <p class="text-xs text-gray-500">${item.totalQuantity} orders</p>
          </div>
        </div>
        <span class="font-semibold text-green-600">₹${item.revenue.toFixed(2)}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load popular items:', error);
  }
}

// Database Browser
async function browseCollection(collection, page=1, limit=10) {
  try {
    dbState.collection = collection; dbState.page = page; dbState.limit = limit;
    const skip = (page-1) * limit;
    const res = await fetch(`${API_BASE}/database/${collection}?limit=${limit}&skip=${skip}`, { headers });
    const result = await res.json();
    dbState.total = result.total || 0;
    const content = document.getElementById('databaseContent');
    const pag = document.getElementById('dbPagination');
    // Header with export
    content.innerHTML = `
      <div class="flex justify-between items-center p-3 border-b">
        <div>
          <h3 class="font-semibold text-gray-900 capitalize">${collection}</h3>
          <p class="text-xs text-gray-500">${dbState.total} total records</p>
        </div>
        <sl-button size="small" variant="primary" onclick="exportCollection('${collection}')">Export JSON</sl-button>
      </div>
      <div id="dbTableWrap" class="max-h-[480px] overflow-auto"></div>
    `;
    const tableWrap = document.getElementById('dbTableWrap');
    renderTable(tableWrap, Array.isArray(result.data)? result.data : []);
    // Pagination
    const totalPages = Math.max(1, Math.ceil(dbState.total / dbState.limit));
    pag.innerHTML = `<sl-pagination size="small" total="${dbState.total}" per-page="${dbState.limit}" current-page="${dbState.page}"></sl-pagination>`;
    const pager = pag.querySelector('sl-pagination');
    pager?.addEventListener('sl-change', (e)=>{
      const nextPage = e.target.currentPage || 1;
      browseCollection(collection, nextPage, dbState.limit);
    });
  } catch (error) {
    console.error('Failed to browse collection:', error);
  }
}

async function exportCollection(collection) {
  try {
    toast.info('Preparing export...');
    window.open(`${API_BASE}/export/${collection}?adminToken=${adminToken}`, '_blank');
    setTimeout(() => toast.success('Export started successfully'), 500);
  } catch (error) {
    toast.error('Failed to export collection');
  }
}

// Notifications
function showNotification(message) {
  try {
    // Prefer Shoelace alert if available
    const alert = document.createElement('sl-alert');
    alert.variant = 'primary';
    alert.closable = true;
    alert.duration = 4000;
    alert.innerHTML = `<sl-icon slot="icon" name="bell"></sl-icon>${message}`;
    document.body.appendChild(alert);
    alert.toast();
  } catch {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.transition = 'all 0.3s ease';
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
  }
}

// Logout
async function logout() {
  try {
    let confirmed = false;
    if (window.confirmModal && typeof window.confirmModal.show === 'function') {
      confirmed = await window.confirmModal.show({
        title: 'Logout',
        message: 'Are you sure you want to logout from the admin dashboard?',
        confirmText: 'Logout',
        type: 'warning'
      });
    } else {
      confirmed = window.confirm('Are you sure you want to logout?');
    }
    if (!confirmed) return;
    try {
      await fetch('/admin-logout', { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
    } catch {}
    try { localStorage.removeItem('adminToken'); } catch {}
    try { toast && toast.info && toast.info('Logging out...'); } catch {}
    window.location.replace('/admin-login');
  } catch (e) {
    // Fallback: force client-side logout
    try { localStorage.removeItem('adminToken'); } catch {}
    window.location.replace('/admin-login');
  }
}
