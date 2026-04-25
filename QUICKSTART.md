# 快速开始指南

## 5分钟快速启动

### 前置条件
确保已安装：
- Docker 和 Docker Compose（推荐）
- 或 Node.js 18+ 和 PostgreSQL 15+

---

## 方式一：Docker 启动（推荐）⚡

### 1. 启动所有服务

```bash
cd real-estate-erp
docker-compose up -d
```

这将启动：
- PostgreSQL (端口 5432)
- Redis (端口 6379)
- 后端 API (端口 3001)
- 前端应用 (端口 80)

### 2. 访问应用

打开浏览器访问：
- **前端应用**: http://localhost
- **后端 API**: http://localhost:3001/api/v1

### 3. 登录系统

```
用户名: admin
密码: admin123456
```

### 4. 停止服务

```bash
docker-compose down
```

---

## 方式二：本地开发 🛠️

### 步骤 1: 启动数据库

#### 使用 Docker（推荐）
```bash
# PostgreSQL
docker run --name erp-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=real_estate_erp \
  -p 5432:5432 \
  -d postgres:15-alpine

# Redis（可选）
docker run --name erp-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

#### 或使用本地 PostgreSQL
创建数据库：
```sql
CREATE DATABASE real_estate_erp;
```

### 步骤 2: 启动后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，确保数据库配置正确

# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 填充初始数据（创建管理员账号）
npm run prisma:seed

# 启动开发服务器
npm run start:dev
```

后端将在 http://localhost:3001 启动

### 步骤 3: 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 默认配置已指向 localhost:3001

# 启动开发服务器
npm run dev
```

前端将在 http://localhost:5173 启动

### 步骤 4: 访问应用

打开浏览器访问 http://localhost:5173

使用以下凭据登录：
```
用户名: admin
密码: admin123456
```

---

## 验证安装

### 检查后端 API

```bash
# 健康检查
curl http://localhost:3001/api/v1/auth/profile

# 登录测试
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}'
```

### 检查数据库

使用 Prisma Studio 查看数据库：
```bash
cd backend
npm run prisma:studio
```

访问 http://localhost:5555

---

## 常见问题

### 问题 1: Prisma 生成失败

**解决方案**：
```bash
cd backend
./scripts/generate-prisma.sh
```

或使用 Docker：
```bash
docker run --rm -v $(pwd):/app -w /app node:20-slim npx prisma generate
```

### 问题 2: 数据库连接失败

**检查**：
1. PostgreSQL 是否正在运行
2. .env 中的数据库连接字符串是否正确
3. 数据库是否已创建

```bash
# 检查 PostgreSQL 容器
docker ps | grep erp-postgres

# 查看日志
docker logs erp-postgres
```

### 问题 3: 前端无法连接后端

**检查**：
1. 后端是否在 3001 端口运行
2. 前端 .env 配置是否正确
3. 检查 CORS 配置

---

## 下一步

安装完成后，你可以：

1. 📖 阅读 [开发指南](docs/DEVELOPMENT_GUIDE.md)
2. 🔌 查看 [API 文档](docs/API.md)
3. 📊 查看 [项目状态](PROJECT_STATUS.md)
4. 🚀 开始开发新功能

---

## 开发提示

### 热重载
- 后端：修改代码后自动重启
- 前端：修改代码后自动刷新浏览器

### 数据库迁移
```bash
cd backend
# 创建新迁移
npx prisma migrate dev --name add_new_feature
```

### 查看日志
```bash
# 后端日志
docker-compose logs -f backend

# 前端日志
docker-compose logs -f frontend

# 所有日志
docker-compose logs -f
```

---

## 生产部署

生产环境部署请参考：
- [README.md](README.md#部署) 中的部署章节
- [开发指南](docs/DEVELOPMENT_GUIDE.md#部署) 中的详细部署说明

---

## 获取帮助

遇到问题？
1. 查看 [README.md](README.md) 中的常见问题
2. 查看 [开发指南](docs/DEVELOPMENT_GUIDE.md) 中的常见问题章节
3. 提交 Issue 到 GitHub

---

**祝你使用愉快！🎉**
