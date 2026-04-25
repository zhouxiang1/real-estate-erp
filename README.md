# 房地产ERP系统 - MVP

一个基于 React + NestJS + Prisma + PostgreSQL 的单租户房地产ERP系统。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design Pro
- Zustand (状态管理)
- React Router v6
- TanStack Query
- ECharts

### 后端
- NestJS
- Prisma ORM
- PostgreSQL 15+
- Redis
- JWT 认证

## 项目结构

```
real-estate-erp/
├── frontend/          # 前端项目 (React + Vite)
├── backend/           # 后端项目 (NestJS)
└── README.md
```

## 快速开始

### 前置要求

- Node.js 18+ (推荐 20+)
- PostgreSQL 15+
- Redis (可选)
- Docker (可选)

### 1. 克隆项目

```bash
git clone <repository-url>
cd real-estate-erp
```

### 2. 数据库设置

#### 方式一：使用 Docker (推荐)

```bash
# 启动 PostgreSQL
docker run --name erp-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=real_estate_erp \
  -p 5432:5432 \
  -d postgres:15

# 启动 Redis
docker run --name erp-redis \
  -p 6379:6379 \
  -d redis:alpine
```

#### 方式二：本地安装

安装 PostgreSQL 15+ 并创建数据库：
```sql
CREATE DATABASE real_estate_erp;
```

### 3. 后端设置

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# (可选) 填充初始数据
npm run prisma:seed

# 启动开发服务器
npm run start:dev
```

后端服务将在 http://localhost:3001 启动

### 4. 前端设置

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:5173 启动

### 5. 默认账号

```
用户名: admin
密码: admin123456
```

## 开发指南

### 后端 API 文档

启动后端后，访问 Swagger 文档：
```
http://localhost:3001/api/v1/docs
```

### 数据库模型查看

```bash
cd backend
npm run prisma:studio
```

### 构建生产版本

#### 后端
```bash
cd backend
npm run build
npm run start
```

#### 前端
```bash
cd frontend
npm run build
# 输出在 dist/ 目录
```

## Prisma 问题解决方案

如果遇到 `prisma generate` 错误（常见于 macOS ARM）：

### 方案 1: 使用 Docker

```bash
cd backend
docker run --rm -v $(pwd):/app -w /app \
  node:20-slim \
  npx prisma generate
```

### 方案 2: 更新 Node.js 版本

```bash
# 使用 nvm 安装 Node.js 20+
nvm install 20
nvm use 20
npm run prisma:generate
```

### 方案 3: 使用预编译的 Prisma Engine

```bash
cd backend
npx prisma fetch --force
npx prisma generate
```

## 模块说明

### 1. 基础系统
- 用户管理
- 角色权限 (RBAC)
- 组织架构
- 操作日志

### 2. 项目管理
- 项目列表
- 项目详情
- 进度跟踪
- 文档管理

### 3. 销售CRM
- 楼盘/楼栋/房源管理
- 客户管理
- 销售合同
- 一房一价

### 4. 采购管理
- 供应商管理
- 采购订单
- 采购合同

### 5. 财务管理
- 收款记录
- 付款记录
- 财务报表
- 资金流水

## API 端点

### 认证
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/profile` - 获取当前用户信息

### 用户管理
- `GET /api/v1/users` - 获取用户列表
- `POST /api/v1/users` - 创建用户
- `GET /api/v1/users/:id` - 获取用户详情
- `PUT /api/v1/users/:id` - 更新用户
- `DELETE /api/v1/users/:id` - 删除用户

### 项目管理
- `GET /api/v1/projects` - 获取项目列表
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects/:id` - 获取项目详情
- `PUT /api/v1/projects/:id` - 更新项目
- `DELETE /api/v1/projects/:id` - 删除项目

### 销售管理
- `GET /api/v1/sales/complexes` - 获取楼盘列表
- `GET /api/v1/sales/rooms` - 获取房源列表
- `POST /api/v1/sales/contracts` - 创建销售合同
- `GET /api/v1/sales/customers` - 获取客户列表

### 采购管理
- `GET /api/v1/purchase/suppliers` - 获取供应商列表
- `POST /api/v1/purchase/orders` - 创建采购订单
- `PUT /api/v1/purchase/orders/:id` - 更新订单状态

### 财务管理
- `GET /api/v1/finance/incomes` - 获取收款记录
- `GET /api/v1/finance/expenses` - 获取付款记录
- `GET /api/v1/finance/reports` - 获取财务报表

## 环境变量说明

### 后端 (.env)

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

DATABASE_URL="postgresql://postgres:password@localhost:5432/real_estate_erp?schema=public"

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

### 前端 (.env)

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_TITLE=房地产ERP系统
```

## 部署

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动部署

1. 构建前端和后端
2. 使用 PM2 管理后端进程
3. 使用 Nginx 作为反向代理

```bash
# 后端 PM2 配置
pm2 start dist/main.js --name erp-backend
pm2 save
pm2 startup
```

## 常见问题

### 1. Prisma 客户端生成失败

参考上方的 "Prisma 问题解决方案"

### 2. 数据库连接失败

检查 PostgreSQL 是否运行，并确认 .env 中的数据库配置正确

### 3. CORS 错误

确保前端地址已在后端的 CORS 配置中添加

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系开发团队。
