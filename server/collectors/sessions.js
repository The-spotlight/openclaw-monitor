const crypto = require('crypto');
const config = require('../config');
const { upsertStat, getStat } = require('../db');

const sessions = new Map();
let peak = 0;

// 从持久化恢复峰值
try {
  const saved = getStat.get('peak_sessions');
  if (saved) peak = parseInt(saved.value) || 0;
} catch {}

function getClientIp(req) {
  // 支持代理环境
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp.trim();
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return ip.replace('::ffff:', '');
}

function getSessionId(ip, userAgent) {
  const hash = crypto.createHash('md5')
    .update(`${ip}:${userAgent || 'unknown'}`)
    .digest('hex')
    .slice(0, 8);
  return `sess_${hash}`;
}

function trackRequest(req) {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || 'unknown';
  const id = getSessionId(ip, ua);

  if (sessions.has(id)) {
    const s = sessions.get(id);
    s.requests++;
    s.lastActivity = Date.now();
    s.status = 'active';
    s.lastPath = req.path;
  } else {
    sessions.set(id, {
      id,
      ip,
      userAgent: ua.length > 100 ? ua.slice(0, 100) + '...' : ua,
      connectedAt: new Date().toISOString(),
      requests: 1,
      status: 'active',
      lastActivity: Date.now(),
      lastPath: req.path,
    });
  }

  const count = sessions.size;
  if (count > peak) {
    peak = count;
    // 持久化峰值
    try { upsertStat.run('peak_sessions', String(peak)); } catch {}
  }
}

function middleware(req, res, next) {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }
  trackRequest(req);
  next();
}

function cleanup() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    const elapsed = now - s.lastActivity;
    if (elapsed > config.sessionRemoveTimeout) {
      sessions.delete(id);
    } else if (elapsed > config.sessionIdleTimeout) {
      s.status = 'idle';
    }
  }
}

function start() {
  setInterval(cleanup, config.sessionCleanupInterval);
}

function getSessions() {
  return {
    sessions: [...sessions.values()].map(({ lastActivity, lastPath, ...rest }) => rest),
    count: sessions.size,
    peak,
  };
}

module.exports = { start, middleware, getSessions, getClientIp };
