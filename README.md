# OpenClaw Monitor

实时服务监控系统，提供服务状态、CPU/内存使用、活跃会话、日志等监控功能。

## 功能特性

- **实时服务状态监控**：在线状态、运行时长、版本信息
- **资源使用监控**：CPU、内存使用率实时采集，折线图展示历史趋势
- **活跃会话追踪**：基于 IP + User-Agent 的会话识别，支持 idle 超时和自动清理
- **日志系统**：分级日志（info/warn/error），支持级别过滤
- **告警通知**：CPU 超过 80%、内存超过 90% 时触发通知
- **数据持久化**：SQLite 存储历史数据，服务重启不丢失
- **安全防护**：Helmet 安全头、速率限制
- **可配置化**：支持环境变量配置各项参数

## 技术栈

- **后端**：Node.js + Express 5.x
- **前端**：原生 JavaScript (ES Modules) + Chart.js
- **数据库**：better-sqlite3
- **安全**：helmet

## 项目结构

```
openclaw-monitor/
├── public/                    # 前端静态资源
│   ├── js/
│   │   ├── api.js           # API 调用封装
│   │   ├── charts.js        # 图表组件
│   │   ├── eventBus.js      # 事件总线
│   │   ├── events.js        # 事件绑定
│   │   ├── main.js          # 入口文件
│   │   ├── render.js        # UI 渲染
│   │   ├── state.js         # 状态管理
│   │   └── toast.js         # 通知系统
│   ├── index.html
│   └── style.css
├── server/                   # 后端代码
│   ├── collectors/          # 数据采集器
│   │   ├── cpu.js          # CPU 采集
│   │   ├── logs.js         # 日志采集
│   │   ├── memory.js       # 内存采集
│   │   └── sessions.js     # 会话采集
│   ├── routes/             # API 路由
│   ├── config.js           # 配置管理
│   ├── db.js               # 数据库封装
│   └── index.js            # 服务入口
├── test/                    # 测试文件
│   ├── api.test.js
│   └── collectors.test.js
├── scripts/
│   └── validate.js         # 项目验证脚本
├── .env.example             # 环境变量示例
├── package.json
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

访问 http://localhost:3000 查看监控面板。

## 配置

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

### 配置项说明

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `PORT` | 3000 | 服务端口 |
| `NODE_ENV` | development | 运行环境 |
| `SAMPLE_INTERVAL` | 2000 | 资源采集间隔 (ms) |
| `HISTORY_SIZE` | 30 | 内存历史数据条数 |
| `HEALTH_CHECK_INTERVAL` | 30000 | 健康检查间隔 (ms) |
| `CPU_WARN_THRESHOLD` | 80 | CPU 告警阈值 (%) |
| `MEM_WARN_THRESHOLD` | 90 | 内存告警阈值 (%) |
| `SESSION_IDLE_TIMEOUT` | 60000 | 会话 idle 超时 (ms) |
| `SESSION_REMOVE_TIMEOUT` | 300000 | 会话移除超时 (ms) |
| `MAX_LOGS` | 200 | 最大日志条数 |
| `RATE_LIMIT_WINDOW` | 60000 | 速率限制窗口 (ms) |
| `RATE_LIMIT_MAX` | 100 | 速率限制请求数 |
| `DATA_DIR` | ./data | 数据存储目录 |
| `DATA_RETENTION_HOURS` | 24 | 数据保留时长 (小时) |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 获取服务状态 |
| GET | `/api/metrics` | 获取 CPU/内存指标 |
| GET | `/api/sessions` | 获取活跃会话列表 |
| GET | `/api/logs` | 获取日志 (支持 `level` 和 `limit` 参数) |
| GET | `/api/health` | 健康检查 |

### 接口示例

```bash
# 获取服务状态
curl http://localhost:3000/api/status

# 获取日志（按级别过滤）
curl "http://localhost:3000/api/logs?level=error&limit=20"

# 健康检查
curl http://localhost:3000/api/health
```

## 测试

```bash
# 运行所有测试
npm run test:all

# 运行采集器测试
npm test

# 运行 API 测试
npm run test:api

# 项目验证
npm run validate
```

## 数据持久化

项目使用 SQLite 数据库存储历史数据：

- **数据目录**：`./data/`（可通过 `DATA_DIR` 配置）
- **数据库文件**：`monitor.db`
- **数据保留**：默认保留 24 小时（可通过 `DATA_RETENTION_HOURS` 配置）

## 安全特性

- **Helmet**：自动设置安全 HTTP 头
- **CSP**：内容安全策略，仅允许自身和 Chart.js CDN
- **速率限制**：每分钟最多 100 个 API 请求
- **XSS 防护**：前端渲染时自动转义 HTML

## 许可证

ISC
