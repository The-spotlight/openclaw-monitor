const config = require('../config');
const db = require('../db');

function addLog(level, message) {
  try {
    const timestamp = new Date().toISOString();
    db.insertLog.run(level, message, timestamp);
  } catch (err) {
    console.error('[Log Collector] Failed to persist log:', err.message);
  }
}

function getLogs(filter, limit = 50) {
  try {
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200);
    let logs;
    let total;

    if (filter && filter !== 'all') {
      const validLevels = ['error', 'warn', 'info'];
      if (!validLevels.includes(filter)) {
        return { logs: [], total: 0 };
      }
      logs = db.getLogsByLevel.all(filter, safeLimit);
      total = db.getLogCountByLevel.get(filter).total;
    } else {
      logs = db.getLogs.all(safeLimit);
      total = db.getLogCount.get().total;
    }

    return { logs, total };
  } catch (err) {
    console.error('[Log Collector] Failed to read logs:', err.message);
    return { logs: [], total: 0 };
  }
}

function requestLogger(req, res, next) {
  if (req.path.startsWith('/api/')) {
    const { getClientIp } = require('./sessions');
    const ip = getClientIp(req);
    addLog('info', `${req.method} ${req.path} from ${ip}`);
  }
  next();
}

let healthCheckTimer = null;
function startHealthCheck(cpuCollector, memCollector) {
  healthCheckTimer = setInterval(() => {
    try {
      const cpu = cpuCollector.getMetrics().current;
      const mem = memCollector.getMetrics().current;

      addLog('info', `Health check: CPU ${cpu}%, Memory ${mem}%`);

      if (cpu > config.cpuWarnThreshold) {
        addLog('warn', `CPU usage high: ${cpu}% (threshold: ${config.cpuWarnThreshold}%)`);
      }
      if (mem > config.memWarnThreshold) {
        addLog('warn', `Memory usage high: ${mem}% (threshold: ${config.memWarnThreshold}%)`);
      }
    } catch (err) {
      addLog('error', `Health check failed: ${err.message}`);
    }
  }, config.healthCheckInterval);
}

module.exports = { addLog, getLogs, requestLogger, startHealthCheck };
