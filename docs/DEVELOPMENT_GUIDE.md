# 开发指南 (Development Guide)

## 目录
1. [环境设置](#环境设置)
2. [开发工作流](#开发工作流)
3. [代码规范](#代码规范)
4. [数据库操作](#数据库操作)
5. [API开发](#api开发)
6. [前端开发](#前端开发)
7. [测试](#测试)
8. [部署](#部署)

---

## 环境设置

### 必需工具
- Node.js 18+ (推荐 20+)
- PostgreSQL 15+
- Redis (可选，用于缓存)
- Git
- VS Code (推荐)

### 推荐工具
- Postman 或 Apifox (API测试)
- DBeaver 或 pgAdmin (数据库管理)
- Docker (容器化开发)

### VS Code 插件
- ESLint
- Prettier
- Prisma
- TypeScript
- Tailwind CSS IntelliSense (如果使用)

---

## 开发工作流

### 1. 克隆项目
```bash
git clone <repository-url>
cd real-estate-erp
```

### 2. 后端开发流程

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 填充初始数据（可选）
npm run prisma:seed

# 启动开发服务器
npm run start:dev
```

### 3. 前端开发流程

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动开发服务器
npm run dev
```

### 4. 分支策略
- `main` - 生产环境
- `develop` - 开发环境
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支
- `hotfix/*` - 紧急修复

---

## 代码规范

### TypeScript 规范

#### 命名约定
```typescript
// 类名：PascalCase
class UserService {}

// 接口：PascalCase，以 I 开头（可选）
interface IUser {}

// 类型：PascalCase
type UserRole = 'admin' | 'user';

// 函数/方法：camelCase
function getUserById() {}

// 变量/常量：camelCase
const userName = 'admin';

// 常量（不可变）：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 私有属性：camelCase，以 _ 开头
private _prisma: PrismaService;

// 文件名：kebab-case
// user.service.ts
// auth.controller.ts
```

#### 文件结构
```typescript
// 1. 导入
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// 2. 装饰器
@Injectable()
export class UserService {
  // 3. 属性
  constructor(private prisma: PrismaService) {}

  // 4. 公共方法
  async findAll() {}

  // 5. 私有方法
  private async validateUser() {}
}
```

### NestJS 最佳实践

#### 模块结构
```
module-name/
├── dto/              # 数据传输对象
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── query-*.dto.ts
├── entities/         # 实体（如果不用 Prisma）
├── interfaces/       # TypeScript 接口
├── strategies/       # Passport 策略（如果是 Auth 模块）
├── guards/           # 守卫（如果是 Auth 模块）
├── *.module.ts       # 模块定义
├── *.controller.ts   # 控制器
├── *.service.ts      # 服务
└── *.spec.ts         # 测试文件
```

#### DTO 验证
```typescript
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEmail()
  email?: string;
}
```

#### 服务层模式
```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data,
    });
  }
}
```

---

## 数据库操作

### Prisma 操作

#### 基本查询
```typescript
// 查找所有
const users = await prisma.user.findMany();

// 条件查询
const user = await prisma.user.findUnique({
  where: { username: 'admin' },
});

// 关联查询
const userWithRole = await prisma.user.findUnique({
  where: { id },
  include: {
    role: true,
    department: true,
  },
});

// 分页查询
const users = await prisma.user.findMany({
  skip: 0,
  take: 10,
  orderBy: { createdAt: 'desc' },
});
```

#### 创建和更新
```typescript
// 创建
const user = await prisma.user.create({
  data: {
    username: 'newuser',
    password: 'hashedPassword',
    name: 'New User',
  },
});

// 更新
const user = await prisma.user.update({
  where: { id },
  data: {
    name: 'Updated Name',
  },
});

// 删除
await prisma.user.delete({
  where: { id },
});
```

#### 事务处理
```typescript
await prisma.$transaction(async (tx) => {
  // 创建用户
  const user = await tx.user.create({
    data: { username: 'test' },
  });

  // 创建相关记录
  await tx.profile.create({
    data: { userId: user.id },
  });
});
```

### 数据库迁移

```bash
# 创建迁移
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset

# 查看 Prisma Studio
npx prisma studio
```

---

## API开发

### RESTful API 设计

#### 资源命名
```
GET    /api/v1/users          # 获取列表
GET    /api/v1/users/:id      # 获取详情
POST   /api/v1/users          # 创建
PUT    /api/v1/users/:id      # 更新
DELETE /api/v1/users/:id      # 删除
```

#### 响应格式

**成功响应**
```json
{
  "data": { ... },
  "message": "操作成功"
}
```

**列表响应**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

**错误响应**
```json
{
  "statusCode": 400,
  "message": "错误信息",
  "error": "Bad Request"
}
```

### 控制器示例

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles('admin')
  findAll(@Query() query: PaginationDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

---

## 前端开发

### 组件结构

```typescript
// 组件文件结构
import React, { useState, useEffect } from 'react';
import { Form, Input, Button } from 'antd';

interface UserFormProps {
  onSuccess?: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // API 调用
      message.success('提交成功');
      onSuccess?.();
    } catch (error) {
      message.error('提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit}>
      {/* 表单字段 */}
    </Form>
  );
};
```

### API 服务

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 处理未授权
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// services/user.ts
import api from './api';

export const userService = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};
```

### 状态管理 (Zustand)

```typescript
// store/user.ts
import { create } from 'zustand';

interface UserState {
  user: any;
  token: string;
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: localStorage.getItem('token') || '',
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: '' });
  },
}));
```

---

## 测试

### 单元测试

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an array of users', async () => {
    const expectedUsers = [{ id: '1', name: 'Test' }];
    jest.spyOn(prisma.user, 'findMany').mockResolvedValue(expectedUsers);

    const users = await service.findAll();
    expect(users).toEqual(expectedUsers);
  });
});
```

### E2E 测试

```bash
# 运行 E2E 测试
npm run test:e2e
```

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 手动部署

#### 后端
```bash
cd backend
npm run build
pm2 start dist/main.js --name erp-backend
pm2 save
pm2 startup
```

#### 前端
```bash
cd frontend
npm run build
# 将 dist 目录部署到 Nginx
```

---

## 常见问题

### Prisma 相关

**Q: Prisma Client 生成失败**
A: 尝试以下方法：
1. 使用 Docker 生成
2. 更新 Node.js 到 v20+
3. 使用提供的脚本 `./backend/scripts/generate-prisma.sh`

### 开发相关

**Q: CORS 错误**
A: 确保后端的 CORS 配置包含前端地址

**Q: 数据库连接失败**
A: 检查 PostgreSQL 是否运行，并确认 .env 配置

---

## 资源

- [NestJS 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [React 文档](https://react.dev/)
- [Ant Design 文档](https://ant.design/)

---

*最后更新: 2024-02-08*
