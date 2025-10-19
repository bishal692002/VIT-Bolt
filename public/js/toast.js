// Modern Toast Notification System
class Toast {
  constructor() {
    this.container = null;
    this.enabled = true;
    this.sound = false;
    this.defaultDuration = 3500;
    this._audioCtx = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
    this.loadConfig();
  }

  loadConfig() {
    try {
      const enabled = localStorage.getItem('toast:enabled');
      const sound = localStorage.getItem('toast:sound');
      const duration = localStorage.getItem('toast:duration');
      if (enabled !== null) this.enabled = enabled === '1';
      if (sound !== null) this.sound = sound === '1';
      if (duration !== null) {
        const d = parseInt(duration, 10);
        if (!isNaN(d) && d >= 1000 && d <= 15000) this.defaultDuration = d;
      }
    } catch {}
  }

  saveConfig() {
    try {
      localStorage.setItem('toast:enabled', this.enabled ? '1' : '0');
      localStorage.setItem('toast:sound', this.sound ? '1' : '0');
      localStorage.setItem('toast:duration', String(this.defaultDuration));
    } catch {}
  }

  setConfig({ enabled, sound, duration } = {}) {
    if (typeof enabled === 'boolean') this.enabled = enabled;
    if (typeof sound === 'boolean') this.sound = sound;
    if (typeof duration === 'number' && duration >= 1000 && duration <= 15000) this.defaultDuration = duration;
    this.saveConfig();
  }

  show(message, type = 'info', duration) {
    if (!this.enabled) return null;
    const finalDuration = typeof duration === 'number' ? duration : this.defaultDuration;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const colors = {
      success: { bg: '#10b981', icon: '#ecfdf5' },
      error: { bg: '#ef4444', icon: '#fef2f2' },
      warning: { bg: '#f59e0b', icon: '#fffbeb' },
      info: { bg: '#3b82f6', icon: '#eff6ff' }
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: white;
      border-left: 4px solid ${color.bg};
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.08);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: right;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    toast.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${color.bg};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 18px;
        flex-shrink: 0;
      ">${icons[type]}</div>
      <div style="flex: 1; color: #374151; font-size: 14px; line-height: 1.5;">${message}</div>
      <button style="
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      " onmouseover="this.style.background='#f3f4f6'; this.style.color='#374151'" onmouseout="this.style.background='none'; this.style.color='#9ca3af'">×</button>
    `;

    // Add animation styles if not already added
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
        .toast-notification:hover {
          transform: translateX(-4px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.1) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Close button functionality
    const closeBtn = toast.querySelector('button');
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.remove(toast);
    };

    // Click to dismiss
    toast.onclick = () => this.remove(toast);

    this.container.appendChild(toast);

    // Auto remove after duration
    if (finalDuration > 0) {
      setTimeout(() => this.remove(toast), finalDuration);
    }

    // Optional sound
    if (this.sound) {
      this.playSound();
    }

    return toast;
  }

  remove(toast) {
    toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  playSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._audioCtx) this._audioCtx = new AudioCtx();
      const ctx = this._audioCtx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.26);
    } catch {}
  }
}

// Create global toast instance
window.toast = new Toast();
