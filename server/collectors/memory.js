const os = require('os');
const config = require('../config');
const { insertMetric, getMetrics } = require('../db');

let current = 0;
let totalGB = 0;
let usedGB = 0;

function calculate() {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    current = (used / total) * 100;
    totalGB = Math.round(total / 1073741824 * 10) / 10;
    usedGB = Math.round(used / 1073741824 * 10) / 10;

    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const value = Math.round(current * 10) / 10;

    // 持久化
    insertMetric.run('memory', value, time);
  } catch (err) {
    console.error('[Memory Collector] Error:', err.message);
  }
}

function start() {
  calculate();
  setInterval(calculate, config.sampleInterval);
}

function getMemoryMetrics() {
  const rows = getMetrics.all('memory', config.historySize);
  const history = rows.reverse().map(r => ({ time: r.time, value: r.value }));
  return {
    current: Math.round(current * 10) / 10,
    totalGB,
    usedGB,
    history,
  };
}

module.exports = { start, getMetrics: getMemoryMetrics };
