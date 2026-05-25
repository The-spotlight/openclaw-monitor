const path = require('path');

function env(key, defaultValue) {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  if (typeof defaultValue === 'number') return Number(val);
  if (typeof defaultValue === 'boolean') return val === 'true';
  return val;
}

const config = {
  port: env('PORT', 3000),
  nodeEnv: env('NODE_ENV', 'development'),

  // 采集
  sampleInterval: env('SAMPLE_INTERVAL', 2000),
  historySize: env('HISTORY_SIZE', 30),
  healthCheckInterval: env('HEALTH_CHECK_INTERVAL', 30000),

  // 阈值
  cpuWarnThreshold: env('CPU_WARN_THRESHOLD', 80),
  memWarnThreshold: env('MEM_WARN_THRESHOLD', 90),

  // 会话
  sessionIdleTimeout: env('SESSION_IDLE_TIMEOUT', 60000),
  sessionRemoveTimeout: env('SESSION_REMOVE_TIMEOUT', 300000),
  sessionCleanupInterval: env('SESSION_CLEANUP_INTERVAL', 10000),

  // 日志
  maxLogs: env('MAX_LOGS', 200),

  // 安全
  rateLimitWindow: env('RATE_LIMIT_WINDOW', 60000),
  rateLimitMax: env('RATE_LIMIT_MAX', 100),

  // 持久化
  dataDir: env('DATA_DIR', path.join(__dirname, '..', 'data')),
  dataRetentionHours: env('DATA_RETENTION_HOURS', 24),
};

module.exports = config;
