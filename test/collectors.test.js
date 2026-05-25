const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

describe('CPU Collector', () => {
  let cpu;

  before(() => {
    // 确保 config 和 db 可加载
    cpu = require('../server/collectors/cpu');
    cpu.start();
  });

  it('getMetrics returns expected shape', () => {
    const metrics = cpu.getMetrics();
    assert.strictEqual(typeof metrics.current, 'number');
    assert(metrics.current >= 0 && metrics.current <= 100, `CPU ${metrics.current} out of range`);
    assert(Array.isArray(metrics.history));
  });

  it('history entries have time and value', async () => {
    // 等待一个采样周期
    await new Promise(r => setTimeout(r, 2500));
    const metrics = cpu.getMetrics();
    if (metrics.history.length > 0) {
      const entry = metrics.history[0];
      assert.strictEqual(typeof entry.time, 'string');
      assert.strictEqual(typeof entry.value, 'number');
    }
  });
});

describe('Memory Collector', () => {
  let mem;

  before(() => {
    mem = require('../server/collectors/memory');
    mem.start();
  });

  it('getMetrics returns expected shape', () => {
    const metrics = mem.getMetrics();
    assert.strictEqual(typeof metrics.current, 'number');
    assert(metrics.current > 0 && metrics.current <= 100);
    assert.strictEqual(typeof metrics.totalGB, 'number');
    assert(metrics.totalGB > 0);
    assert.strictEqual(typeof metrics.usedGB, 'number');
    assert(Array.isArray(metrics.history));
  });
});

describe('Log Collector', () => {
  let logs;

  before(() => {
    logs = require('../server/collectors/logs');
  });

  it('addLog and getLogs work', () => {
    logs.addLog('info', 'Test message');
    logs.addLog('error', 'Test error');
    const result = logs.getLogs('all', 10);
    assert(result.logs.length >= 2);
    assert.strictEqual(result.logs[0].level, 'error');
    assert.strictEqual(result.logs[0].message, 'Test error');
  });

  it('filters by level', () => {
    const result = logs.getLogs('error', 10);
    result.logs.forEach(l => assert.strictEqual(l.level, 'error'));
  });

  it('rejects invalid levels', () => {
    const result = logs.getLogs('invalid', 10);
    assert.strictEqual(result.logs.length, 0);
  });

  it('respects limit', () => {
    for (let i = 0; i < 20; i++) logs.addLog('info', `Msg ${i}`);
    const result = logs.getLogs('all', 5);
    assert(result.logs.length <= 5);
  });
});
