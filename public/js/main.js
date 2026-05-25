import state from './state.js';
import bus from './eventBus.js';
import { fetchStatus, fetchMetrics, fetchSessions, fetchLogs } from './api.js';
import { initCharts } from './charts.js';
import { render } from './render.js';
import { checkAlerts } from './toast.js';
import { bindEvents } from './events.js';

let tickInProgress = false;

async function tick() {
  if (tickInProgress) return; // 防止重叠请求
  tickInProgress = true;

  try {
    const [status, metrics, sessions, logs] = await Promise.all([
      fetchStatus(),
      fetchMetrics(),
      fetchSessions(),
      fetchLogs(state.currentLogFilter),
    ]);

    if (status) {
      state.online = status.online;
      state.uptime = status.uptime;
      state.startTime = status.startTime;
      state.version = status.version;
      state.lastError = null;
    } else {
      state.online = false;
      state.lastError = 'Server unreachable';
    }

    if (metrics) {
      state.cpu = metrics.cpu.current;
      state.memory = metrics.memory.current;
      state.cpuHistory = metrics.cpu.history;
      state.memHistory = metrics.memory.history;
    }

    if (sessions) {
      state.sessions = sessions.sessions;
      state.peakSessions = sessions.peak;
    }

    if (logs) {
      state.logs = logs.logs;
    }
  } catch (err) {
    state.online = false;
    state.lastError = err.message;
  }

  // 通过事件总线通知各模块
  render(state);
  bus.emit('data:metrics', { cpuHistory: state.cpuHistory, memHistory: state.memHistory });
  bus.emit('alert:check', state);

  tickInProgress = false;
}

function startPolling() {
  clearInterval(state.timer);
  state.timer = setInterval(tick, state.refreshInterval);
}

// 初始化
initCharts();
bindEvents(state);

// 事件驱动：响应配置变更
bus.on('config:refreshChange', () => startPolling());
bus.on('config:filterChange', () => tick());

// 首次拉取 + 启动轮询
tick();
startPolling();
