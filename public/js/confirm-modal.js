// Modern Confirmation Modal System
class ConfirmModal {
  constructor() {
    this.modal = null;
  }

  show(options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Confirm Action',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'info', // success, error, warning, info
        icon = null
      } = options;

      // Remove existing modal if any
      this.remove();

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';
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

      const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
      };

      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: '?'
      };

      const modalColor = colors[type] || colors.info;
      const modalIcon = icon || icons[type] || icons.info;

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'confirm-modal';
      modal.style.cssText = `
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
        animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      `;

      modal.innerHTML = `
        <div style="padding: 24px; text-align: center;">
          <div style="
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: ${modalColor}15;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: ${modalColor};
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
            ">${modalIcon}</div>
          </div>
          <h3 style="
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 8px 0;
          ">${title}</h3>
          <p style="
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 24px 0;
            line-height: 1.6;
          ">${message}</p>
          <div style="display: flex; gap: 12px;">
            <button id="modal-cancel" style="
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
            <button id="modal-confirm" style="
              flex: 1;
              padding: 12px 24px;
              border: none;
              background: ${modalColor};
              color: white;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 8px ${modalColor}40;
            ">${confirmText}</button>
          </div>
        </div>
      `;

      // Add animations
      if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes scaleOut {
            from {
              transform: scale(1);
              opacity: 1;
            }
            to {
              transform: scale(0.9);
              opacity: 0;
            }
          }
          #modal-cancel:hover {
            background: #f9fafb !important;
            border-color: #d1d5db !important;
          }
          #modal-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          }
        `;
        document.head.appendChild(style);
      }

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      this.modal = overlay;

      // Handle buttons
      modal.querySelector('#modal-confirm').onclick = () => {
        this.remove();
        resolve(true);
      };

      modal.querySelector('#modal-cancel').onclick = () => {
        this.remove();
        resolve(false);
      };

      // Close on overlay click
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          this.remove();
          resolve(false);
        }
      };

      // ESC key to cancel
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          this.remove();
          resolve(false);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  remove() {
    if (this.modal) {
      const modal = this.modal.querySelector('.confirm-modal');
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

// Create global confirm instance
window.confirmModal = new ConfirmModal();
