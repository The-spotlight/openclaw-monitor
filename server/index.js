const express = require('express');
const path = require('path');
const helmet = require('helmet');
const config = require('./config');

const app = express();

// 安全头（允许 Chart.js CDN）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// 信任代理（支持 X-Forwarded-For）
app.set('trust proxy', 1);

// 速率限制（简单实现，无额外依赖）
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();

  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (now - record.windowStart > config.rateLimitWindow) {
    record.count = 1;
    record.windowStart = now;
    return next();
  }

  record.count++;
  if (record.count > config.rateLimitMax) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((config.rateLimitWindow - (now - record.windowStart)) / 1000),
    });
  }
  next();
}

// 定时清理速率限制记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.windowStart > config.rateLimitWindow * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, config.rateLimitWindow);

app.use(rateLimit);

// 静态文件
app.use(express.static(path.join(__dirname, '..', 'public')));

// 采集器（延迟加载，捕获初始化错误）
let cpuCollector, memCollector, sessionCollector, logCollector;
try {
  cpuCollector = require('./collectors/cpu');
  memCollector = require('./collectors/memory');
  sessionCollector = require('./collectors/sessions');
  logCollector = require('./collectors/logs');
} catch (err) {
  console.error('[FATAL] Failed to load collectors:', err);
  process.exit(1);
}

// 中间件：会话追踪 + 请求日志
app.use(sessionCollector.middleware);
app.use(logCollector.requestLogger);

// 路由（每个带独立 try-catch）
app.get('/api/status', (req, res) => {
  try {
    const os = require('os');
    const startTime = app.get('startTime');
    res.json({
      online: true,
      uptime: Date.now() - startTime.getTime(),
      startTime: startTime.toISOString(),
      version: 'v2.4.1',
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status', detail: err.message });
  }
});

app.get('/api/metrics', (req, res) => {
  try {
    res.json({
      cpu: cpuCollector.getMetrics(),
      memory: memCollector.getMetrics(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get metrics', detail: err.message });
  }
});

app.get('/api/sessions', (req, res) => {
  try {
    res.json(sessionCollector.getSessions());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sessions', detail: err.message });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    const level = req.query.level || 'all';
    const limit = parseInt(req.query.limit) || 50;
    res.json(logCollector.getLogs(level, limit));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get logs', detail: err.message });
  }
});

// 健康检查端点（用于运行验证）
app.get('/api/health', (req, res) => {
  try {
    const metrics = cpuCollector.getMetrics();
    res.json({ status: 'ok', cpu: metrics.current, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 全局错误处理中间件
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.stack || err.message);
  logCollector.addLog('error', `Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动采集器
cpuCollector.start();
memCollector.start();
sessionCollector.start();
logCollector.startHealthCheck(cpuCollector, memCollector);

// 记录启动时间
const startTime = new Date();
app.set('startTime', startTime);

logCollector.addLog('info', `Server starting on port ${config.port}`);
logCollector.addLog('info', `Platform: ${process.platform}, Node: ${process.version}`);

const server = app.listen(config.port, () => {
  console.log(`OpenClaw Monitor running at http://localhost:${config.port}`);
  logCollector.addLog('info', 'Server started successfully');
});

// 优雅关闭
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  logCollector.addLog('info', `Server shutting down (${signal})`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

// 未捕获异常
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  try { logCollector.addLog('error', `Uncaught exception: ${err.message}`); } catch {}
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[WARN] Unhandled rejection:', reason);
  try { logCollector.addLog('error', `Unhandled rejection: ${reason}`); } catch {}
});

module.exports = app;
