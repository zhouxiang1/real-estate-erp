# 生产部署说明

## 访问地址

默认生产访问地址：

```text
http://43.132.207.84:18080
```

如需更换端口，修改项目根目录 `.env` 中的 `FRONTEND_PORT`。

## 服务器目录

建议独立放置在：

```text
/opt/real-estate-erp
```

本项目 Docker Compose 已使用独立项目名、独立容器名和独立内部网络，不会占用宿主机的 PostgreSQL/Redis 端口。

## 首次部署

```bash
mkdir -p /opt/real-estate-erp
cd /opt/real-estate-erp

cp .env.production.example .env
# 修改 .env 中的 POSTGRES_PASSWORD 和 JWT_SECRET

docker compose up -d --build
docker compose logs -f backend
```

后端容器启动时会自动：

- 推送 Prisma 数据库结构到 PostgreSQL
- 初始化角色、部门、测试账号
- 初始化楼盘、房源、客户、成交、佣金、财务演示数据

## 日常维护

```bash
cd /opt/real-estate-erp
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart
```

## 测试账号

| 端口 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | admin | admin123456 |
| 营销经理 | manager | 123456 |
| 置业顾问 | consultant | 123456 |
| 财务 | finance | 123456 |
| 接访 | reception | 123456 |
| 渠道经理 | channel | 123456 |
| 风控 | risk | 123456 |
| 分销经纪人 | distributor | 123456 |
| 内勤 | office | 123456 |

生产正式使用前，请在管理员后台修改默认测试密码。
