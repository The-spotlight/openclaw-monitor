/**
 * 启动验证脚本
 * 启动服务器，等待就绪，验证所有端点，然后退出
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3099; // 用不同端口避免冲突
const BASE = `http://localhost:${PORT}`;
const TIMEOUT = 15000;

let server;
let passed = 0;
let failed = 0;

function request(path) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), 5000);
    http.get(`${BASE}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

async function validate() {
  console.log('\n🔍 OpenClaw Monitor - 启动验证\n');

  // 启动服务器
  console.log(`Starting server on port ${PORT}...`);
  server = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  let startOutput = '';
  server.stdout.on('data', d => startOutput += d.toString());
  server.stderr.on('data', d => startOutput += d.toString());

  // 等待服务器启动
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server start timeout')), TIMEOUT);
    const check = setInterval(async () => {
      try {
        await request('/api/health');
        clearInterval(check);
        clearTimeout(timer);
        resolve();
      } catch {}
    }, 500);
  });

  console.log('Server started.\n');

  // 等待采集器积累数据
  await new Promise(r => setTimeout(r, 3000));

  // 验证端点
  console.log('📡 API Endpoints:');

  try {
    const health = await request('/api/health');
    assert(health.status === 200, '/api/health returns 200');
    assert(health.body.status === 'ok', '/api/health status is "ok"');
  } catch (e) {
    assert(false, `/api/health - ${e.message}`);
  }

  try {
    const status = await request('/api/status');
    assert(status.status === 200, '/api/status returns 200');
    assert(status.body.online === true, 'Service reports online');
    assert(typeof status.body.uptime === 'number', 'Uptime is numeric');
    assert(status.body.version === 'v2.4.1', 'Version matches');
    assert(!!status.body.hostname, 'Hostname present');
  } catch (e) {
    assert(false, `/api/status - ${e.message}`);
  }

  try {
    const metrics = await request('/api/metrics');
    assert(metrics.status === 200, '/api/metrics returns 200');
    assert(typeof metrics.body.cpu.current === 'number', 'CPU current is numeric');
    assert(metrics.body.cpu.current >= 0 && metrics.body.cpu.current <= 100, 'CPU in valid range');
    assert(Array.isArray(metrics.body.cpu.history), 'CPU history is array');
    assert(typeof metrics.body.memory.current === 'number', 'Memory current is numeric');
    assert(metrics.body.memory.totalGB > 0, 'Total memory > 0');
    assert(Array.isArray(metrics.body.memory.history), 'Memory history is array');
  } catch (e) {
    assert(false, `/api/metrics - ${e.message}`);
  }

  try {
    const sessions = await request('/api/sessions');
    assert(sessions.status === 200, '/api/sessions returns 200');
    assert(Array.isArray(sessions.body.sessions), 'Sessions is array');
    assert(typeof sessions.body.count === 'number', 'Count is numeric');
    assert(typeof sessions.body.peak === 'number', 'Peak is numeric');
  } catch (e) {
    assert(false, `/api/sessions - ${e.message}`);
  }

  try {
    const logs = await request('/api/logs');
    assert(logs.status === 200, '/api/logs returns 200');
    assert(Array.isArray(logs.body.logs), 'Logs is array');
    assert(logs.body.logs.length > 0, 'Has log entries');
    assert(typeof logs.body.total === 'number', 'Total is numeric');
    // 验证日志结构
    const log = logs.body.logs[0];
    assert(log.level && log.message && log.time, 'Log entry has required fields');
  } catch (e) {
    assert(false, `/api/logs - ${e.message}`);
  }

  try {
    const filtered = await request('/api/logs?level=info&limit=3');
    assert(filtered.status === 200, '/api/logs with filter returns 200');
    assert(filtered.body.logs.length <= 3, 'Limit respected');
    filtered.body.logs.forEach(l => assert(l.level === 'info', `Filtered log is info level`));
  } catch (e) {
    assert(false, `/api/logs filter - ${e.message}`);
  }

  // 验证静态文件
  console.log('\n📄 Static Files:');
  try {
    const html = await request('/');
    assert(html.status === 200, 'index.html served');
    assert(typeof html.body === 'string' && html.body.includes('OpenClaw'), 'HTML contains OpenClaw');
  } catch (e) {
    assert(false, `Static HTML - ${e.message}`);
  }

  // 验证 404
  console.log('\n🛡️ Error Handling:');
  try {
    const notFound = await request('/api/nonexistent');
    assert(notFound.status === 404, '404 for unknown endpoint');
  } catch (e) {
    assert(false, `404 handling - ${e.message}`);
  }

  // 结果
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(40)}\n`);

  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

validate().catch(err => {
  console.error('Validation failed:', err.message);
  if (server) server.kill();
  process.exit(1);
});
