const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

describe('API Endpoints', () => {
  let app;

  before(async () => {
    // 设置测试环境
    process.env.PORT = '0'; // 随机端口
    process.env.DATA_DIR = '/tmp/openclaw-test-' + Date.now();
    app = require('../server/index');
    // 等待采集器初始化
    await new Promise(r => setTimeout(r, 3000));
  });

  describe('GET /api/health', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.strictEqual(typeof res.body.cpu, 'number');
      assert(res.body.timestamp);
    });
  });

  describe('GET /api/status', () => {
    it('returns service status', async () => {
      const res = await request(app).get('/api/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.online, true);
      assert.strictEqual(typeof res.body.uptime, 'number');
      assert(res.body.uptime >= 0);
      assert(res.body.startTime);
      assert(res.body.version);
      assert(res.body.hostname);
      assert(res.body.platform);
      assert(res.body.nodeVersion);
    });
  });

  describe('GET /api/metrics', () => {
    it('returns cpu and memory metrics', async () => {
      const res = await request(app).get('/api/metrics');
      assert.strictEqual(res.status, 200);
      assert(res.body.cpu);
      assert(res.body.memory);
      assert.strictEqual(typeof res.body.cpu.current, 'number');
      assert(Array.isArray(res.body.cpu.history));
      assert.strictEqual(typeof res.body.memory.current, 'number');
      assert.strictEqual(typeof res.body.memory.totalGB, 'number');
      assert(Array.isArray(res.body.memory.history));
    });
  });

  describe('GET /api/sessions', () => {
    it('returns sessions data', async () => {
      const res = await request(app).get('/api/sessions');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.sessions));
      assert.strictEqual(typeof res.body.count, 'number');
      assert.strictEqual(typeof res.body.peak, 'number');
    });
  });

  describe('GET /api/logs', () => {
    it('returns logs without filter', async () => {
      const res = await request(app).get('/api/logs');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.logs));
      assert.strictEqual(typeof res.body.total, 'number');
    });

    it('filters by level', async () => {
      const res = await request(app).get('/api/logs?level=info');
      assert.strictEqual(res.status, 200);
      res.body.logs.forEach(log => {
        assert.strictEqual(log.level, 'info');
      });
    });

    it('respects limit parameter', async () => {
      const res = await request(app).get('/api/logs?limit=2');
      assert.strictEqual(res.status, 200);
      assert(res.body.logs.length <= 2);
    });

    it('handles invalid level gracefully', async () => {
      const res = await request(app).get('/api/logs?level=hacker<script>');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.logs.length, 0);
    });
  });

  describe('GET /unknown', () => {
    it('returns 404', async () => {
      const res = await request(app).get('/api/nonexistent');
      assert.strictEqual(res.status, 404);
      assert(res.body.error);
    });
  });

  describe('Rate Limiting', () => {
    it('allows normal request volume', async () => {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
    });
  });
});
