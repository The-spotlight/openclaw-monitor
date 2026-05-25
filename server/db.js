const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// 确保数据目录存在
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

const dbPath = path.join(config.dataDir, 'monitor.db');
const db = new Database(dbPath);

// WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS stats (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_metrics_type_created ON metrics_history(type, created_at);
  CREATE INDEX IF NOT EXISTS idx_logs_level_created ON logs(level, created_at);
`);

// 预编译语句
const insertMetric = db.prepare(
  'INSERT INTO metrics_history (type, value, timestamp) VALUES (?, ?, ?)'
);

const insertLog = db.prepare(
  'INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)'
);

const getMetrics = db.prepare(
  'SELECT value, timestamp as time FROM metrics_history WHERE type = ? ORDER BY id DESC LIMIT ?'
);

const getLogs = db.prepare(
  'SELECT level, message, timestamp as time FROM logs ORDER BY id DESC LIMIT ?'
);

const getLogsByLevel = db.prepare(
  'SELECT level, message, timestamp as time FROM logs WHERE level = ? ORDER BY id DESC LIMIT ?'
);

const getLogCount = db.prepare(
  'SELECT COUNT(*) as total FROM logs'
);

const getLogCountByLevel = db.prepare(
  'SELECT COUNT(*) as total FROM logs WHERE level = ?'
);

const upsertStat = db.prepare(
  'INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)'
);

const getStat = db.prepare(
  'SELECT value FROM stats WHERE key = ?'
);

// 数据保留清理
const cleanMetrics = db.prepare(
  'DELETE FROM metrics_history WHERE created_at < ?'
);

const cleanLogs = db.prepare(
  'DELETE FROM logs WHERE created_at < ?'
);

function cleanup() {
  const cutoff = Math.floor(Date.now() / 1000) - config.dataRetentionHours * 3600;
  cleanMetrics.run(cutoff);
  cleanLogs.run(cutoff);
}

// 每小时清理一次过期数据
setInterval(cleanup, 3600000);

module.exports = {
  db,
  insertMetric,
  insertLog,
  getMetrics,
  getLogs,
  getLogsByLevel,
  getLogCount,
  getLogCountByLevel,
  upsertStat,
  getStat,
  cleanup,
};
