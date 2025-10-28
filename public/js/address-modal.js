// Address Modal (Tailwind-based, vanilla JS)
// Usage: const data = await window.addressModal.open({ initial: { label, line1, line2, landmark } });
// Returns { label, line1, line2, landmark } or null if cancelled
(function(){
  class AddressModal {
    constructor(){ this.el = null; }
    open(opts={}){
      const initial = opts.initial || {};
      return new Promise((resolve)=>{
        this.close();
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/40 z-[10000] flex items-center justify-center p-4';
        const modal = document.createElement('div');
        modal.className = 'w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/5';
        modal.innerHTML = `
          <div class="p-5">
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-lg font-bold text-gray-900">Delivery Address</h3>
              <button type="button" class="text-gray-400 hover:text-gray-600" data-close>&times;</button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-gray-700">Label</label>
                <input type="text" class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-400 focus:border-yellow-400" data-field="label" placeholder="Hostel / Block" value="${this.escape(initial.label||'')}">
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700">Address Line</label>
                <input type="text" class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-400 focus:border-yellow-400" data-field="line1" placeholder="Delivery address" value="${this.escape(initial.line1||'')}">
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700">Line 2 (optional)</label>
                <input type="text" class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-400 focus:border-yellow-400" data-field="line2" placeholder="Building / Area" value="${this.escape(initial.line2||'')}">
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700">Landmark / Room (optional)</label>
                <input type="text" class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-400 focus:border-yellow-400" data-field="landmark" placeholder="Near ... / Room ..." value="${this.escape(initial.landmark||'')}">
              </div>
            </div>
            <div class="mt-5 flex items-center justify-end gap-3">
              <button type="button" class="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50" data-cancel>Cancel</button>
              <button type="button" class="px-3 py-2 text-sm rounded-md bg-yellow-400 text-gray-900 hover:bg-yellow-300" data-save>Save</button>
            </div>
          </div>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.el = overlay;

        const getVal = (name)=> modal.querySelector(`[data-field="${name}"]`).value.trim();
        const close = ()=>{ this.close(); resolve(null); };
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', ()=>{
          const label = getVal('label');
          const line1 = getVal('line1');
          const line2 = getVal('line2');
          const landmark = getVal('landmark');
          if(!line1){
            modal.querySelector('[data-field="line1"]').classList.add('ring-2','ring-red-400');
            return;
          }
          this.close();
          resolve({ label, line1, line2, landmark });
        });
        overlay.addEventListener('click', (e)=>{ if(e.target===overlay){ close(); } });
        // ESC to close
        const esc = (e)=>{ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', esc);} };
        document.addEventListener('keydown', esc);
      });
    }
    close(){ if(this.el){ this.el.remove(); this.el=null; } }
    escape(str){ return String(str).replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  }
  window.addressModal = new AddressModal();
})();
