// Modern Input Modal
class InputModal {
  constructor() {
    this.modal = null;
  }

  show(options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Input Required',
        message = '',
        placeholder = 'Enter value...',
        confirmText = 'Submit',
        cancelText = 'Cancel',
        type = 'text',
        required = false
      } = options;

      this.remove();

      const overlay = document.createElement('div');
      overlay.className = 'input-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      `;

      const modal = document.createElement('div');
      modal.className = 'input-modal';
      modal.style.cssText = `
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        max-width: 450px;
        width: 90%;
        animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      modal.innerHTML = `
        <div style="padding: 24px;">
          <h3 style="
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 8px 0;
          ">${title}</h3>
          ${message ? `<p style="
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 20px 0;
            line-height: 1.6;
          ">${message}</p>` : ''}
          <textarea id="modal-input" 
            placeholder="${placeholder}" 
            rows="3"
            style="
              width: 100%;
              padding: 12px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              font-size: 14px;
              color: #374151;
              resize: vertical;
              min-height: 80px;
              transition: all 0.2s;
              font-family: inherit;
            "></textarea>
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button id="input-modal-cancel" style="
              flex: 1;
              padding: 12px 24px;
              border: 2px solid #e5e7eb;
              background: white;
              color: #374151;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s;
            ">${cancelText}</button>
            <button id="input-modal-confirm" style="
              flex: 1;
              padding: 12px 24px;
              border: none;
              background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
              color: white;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            ">${confirmText}</button>
          </div>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      this.modal = overlay;

      const input = modal.querySelector('#modal-input');
      input.focus();

      // Handle confirm
      const handleConfirm = () => {
        const value = input.value.trim();
        if (required && !value) {
          input.style.borderColor = '#ef4444';
          input.placeholder = 'This field is required';
          return;
        }
        this.remove();
        resolve(value || null);
      };

      modal.querySelector('#input-modal-confirm').onclick = handleConfirm;
      
      // Enter key to submit
      input.onkeydown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          handleConfirm();
        }
      };

      // Handle cancel
      modal.querySelector('#input-modal-cancel').onclick = () => {
        this.remove();
        resolve(null);
      };

      // Close on overlay click
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          this.remove();
          resolve(null);
        }
      };

      // ESC key
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          this.remove();
          resolve(null);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Reset border on input
      input.oninput = () => {
        input.style.borderColor = '#e5e7eb';
      };
    });
  }

  remove() {
    if (this.modal) {
      const modal = this.modal.querySelector('.input-modal');
      modal.style.animation = 'scaleOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      this.modal.style.animation = 'fadeIn 0.2s ease reverse';
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 200);
    }
  }
}

window.inputModal = new InputModal();
