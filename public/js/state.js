const state = {
  online: true,
  cpu: 0,
  memory: 0,
  sessions: [],
  logs: [],
  cpuHistory: [],
  memHistory: [],
  peakSessions: 0,
  refreshInterval: 5000,
  timer: null,
  currentLogFilter: 'all',
  uptime: 0,
  startTime: '',
  version: '',
  lastError: null,
};

export default state;
