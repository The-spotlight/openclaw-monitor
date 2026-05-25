import bus from './eventBus.js';

export function bindEvents(state) {
  // 刷新频率切换
  document.getElementById('refreshRate').addEventListener('change', (e) => {
    state.refreshInterval = parseInt(e.target.value);
    bus.emit('config:refreshChange', state.refreshInterval);
  });

  // 日志过滤
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentLogFilter = btn.dataset.level;
      bus.emit('config:filterChange', state.currentLogFilter);
    });
  });

  // 请求浏览器通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
