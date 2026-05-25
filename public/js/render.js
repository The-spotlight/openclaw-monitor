// 差量更新：只在值变化时更新 DOM
let prevState = {};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el && el.getAttribute(attr) !== value) el.setAttribute(attr, value);
}

function setClass(id, className) {
  const el = document.getElementById(id);
  if (el && el.className !== className) el.className = className;
}

function setStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el && el.style[prop] !== value) el.style[prop] = value;
}

function renderStatus(state) {
  setText('lastUpdate', `更新于 ${new Date().toLocaleTimeString('zh-CN')}`);

  const badgeText = state.online ? '在线' : '离线';
  const badgeClass = `status-badge ${state.online ? 'online' : 'offline'}`;
  setText('statusBadge', badgeText);
  setClass('statusBadge', badgeClass);

  if (state.uptime > 0) {
    const days = Math.floor(state.uptime / 86400000);
    const hours = Math.floor((state.uptime % 86400000) / 3600000);
    const mins = Math.floor((state.uptime % 3600000) / 60000);
    setText('uptime', `${days}天 ${hours}小时 ${mins}分`);
  }
  if (state.startTime) {
    setText('startTime', new Date(state.startTime).toLocaleString('zh-CN'));
  }
  if (state.version) {
    setText('version', state.version);
  }
}

function renderMetrics(state) {
  const cpuText = `${state.cpu.toFixed(1)}%`;
  const cpuClass = `metric-value${state.cpu > 80 ? ' danger' : state.cpu > 60 ? ' warning' : ''}`;
  setText('cpuValue', cpuText);
  setClass('cpuValue', cpuClass);
  setStyle('cpuBar', 'width', `${state.cpu}%`);
  setClass('cpuBar', `progress-fill cpu-fill${state.cpu > 80 ? ' danger' : state.cpu > 60 ? ' warning' : ''}`);

  const memText = `${state.memory.toFixed(1)}%`;
  const memClass = `metric-value${state.memory > 90 ? ' danger' : state.memory > 75 ? ' warning' : ''}`;
  setText('memValue', memText);
  setClass('memValue', memClass);
  setStyle('memBar', 'width', `${state.memory}%`);
  setClass('memBar', `progress-fill mem-fill${state.memory > 90 ? ' danger' : state.memory > 75 ? ' warning' : ''}`);

  setText('sessionCount', String(state.sessions.length));
  setText('peakSessions', String(state.peakSessions));
  setText('sessionBadge', String(state.sessions.length));
}

function renderSessions(sessions) {
  // 只在会话数据变化时重建表格
  const key = JSON.stringify(sessions.map(s => s.id));
  if (key === prevState.sessionsKey) return;
  prevState.sessionsKey = key;

  const tbody = document.getElementById('sessionsBody');
  const fragment = document.createDocumentFragment();

  sessions.forEach(s => {
    const tr = document.createElement('tr');
    const connectedAt = new Date(s.connectedAt);
    const duration = Date.now() - connectedAt.getTime();
    const mins = Math.floor(duration / 60000);
    const secs = Math.floor((duration % 60000) / 1000);
    tr.innerHTML = `
      <td><code>${escapeHtml(s.id)}</code></td>
      <td>${escapeHtml(s.ip)}</td>
      <td>${connectedAt.toLocaleTimeString('zh-CN')}</td>
      <td>${mins}分${secs}秒</td>
      <td>${s.requests}</td>
      <td><span class="session-status ${s.status}">${s.status === 'active' ? '活跃' : '空闲'}</span></td>
    `;
    fragment.appendChild(tr);
  });

  tbody.replaceChildren(fragment);
}

function renderLogs(logs) {
  const container = document.getElementById('logsContainer');
  const fragment = document.createDocumentFragment();

  logs.slice(0, 50).forEach(log => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const time = new Date(log.time).toLocaleTimeString('zh-CN');
    div.innerHTML = `
      <span class="log-time">${escapeHtml(time)}</span>
      <span class="log-level ${escapeHtml(log.level)}">${escapeHtml(log.level.toUpperCase())}</span>
      <span class="log-message">${escapeHtml(log.message)}</span>
    `;
    fragment.appendChild(div);
  });

  container.replaceChildren(fragment);
}

// XSS 防护
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function render(state) {
  renderStatus(state);
  renderMetrics(state);
  renderSessions(state.sessions);
  renderLogs(state.logs);
}
