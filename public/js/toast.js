import bus from './eventBus.js';

let lastCpuAlert = 0;
let lastMemAlert = 0;
let lastOfflineAlert = 0;
const COOLDOWN = 15000;

export function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = type === 'error' ? '🔴' : '🟡';

  const content = document.createElement('div');
  content.className = 'toast-content';
  const titleEl = document.createElement('div');
  titleEl.className = 'toast-title';
  titleEl.textContent = title;
  const msgEl = document.createElement('div');
  msgEl.className = 'toast-message';
  msgEl.textContent = message;
  content.appendChild(titleEl);
  content.appendChild(msgEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', () => toast.remove());

  toast.appendChild(icon);
  toast.appendChild(content);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 6000);

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`OpenClaw: ${title}`, { body: message });
  }
}

export function checkAlerts(state) {
  const now = Date.now();

  if (!state.online && now - lastOfflineAlert > COOLDOWN) {
    showToast('error', '服务离线', 'OpenClaw 服务已停止响应，请立即检查！');
    lastOfflineAlert = now;
  }

  if (state.cpu > 80 && now - lastCpuAlert > COOLDOWN) {
    showToast('warning', 'CPU 使用率过高', `当前 CPU 使用率 ${state.cpu.toFixed(1)}%，已超过 80% 阈值`);
    lastCpuAlert = now;
  }

  if (state.memory > 90 && now - lastMemAlert > COOLDOWN) {
    showToast('warning', '内存使用率过高', `当前内存使用率 ${state.memory.toFixed(1)}%，已超过 90% 阈值`);
    lastMemAlert = now;
  }
}

// 监听事件
bus.on('alert:check', checkAlerts);
