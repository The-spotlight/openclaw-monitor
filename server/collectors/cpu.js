const os = require('os');
const config = require('../config');
const { insertMetric, getMetrics } = require('../db');

let prevSnapshot = null;
let current = 0;

function snapshot() {
  const cpus = os.cpus();
  return cpus.map(cpu => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return { idle: cpu.times.idle, total };
  });
}

function calculate() {
  try {
    const curr = snapshot();
    if (prevSnapshot && curr.length === prevSnapshot.length) {
      let totalIdle = 0;
      let totalDelta = 0;
      for (let i = 0; i < curr.length; i++) {
        const idleDelta = curr[i].idle - prevSnapshot[i].idle;
        const totalD = curr[i].total - prevSnapshot[i].total;
        totalIdle += idleDelta;
        totalDelta += totalD;
      }
      current = totalDelta > 0 ? (1 - totalIdle / totalDelta) * 100 : 0;
    }
    prevSnapshot = curr;

    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const value = Math.round(current * 10) / 10;

    // 持久化
    insertMetric.run('cpu', value, time);
  } catch (err) {
    console.error('[CPU Collector] Error:', err.message);
  }
}

function start() {
  prevSnapshot = snapshot();
  setInterval(calculate, config.sampleInterval);
}

function getCpuMetrics() {
  const rows = getMetrics.all('cpu', config.historySize);
  const history = rows.reverse().map(r => ({ time: r.time, value: r.value }));
  return {
    current: Math.round(current * 10) / 10,
    history,
  };
}

module.exports = { start, getMetrics: getCpuMetrics };
