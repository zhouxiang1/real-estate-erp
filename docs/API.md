# Real Estate ERP API Documentation

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Auth Endpoints

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123456"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "系统管理员",
    "email": "admin@example.com",
    "phone": "13800138000",
    "avatar": null,
    "roleId": "uuid",
    "departmentId": "uuid"
  }
}
```

### Get Profile
```http
GET /auth/profile
```
Requires authentication.

**Response:**
```json
{
  "id": "uuid",
  "username": "admin",
  "name": "系统管理员",
  "email": "admin@example.com",
  "phone": "13800138000",
  "avatar": null,
  "roleId": "uuid",
  "role": {
    "id": "uuid",
    "name": "超级管理员",
    "code": "admin"
  },
  "departmentId": "uuid",
  "department": {
    "id": "uuid",
    "name": "总部"
  }
}
```

### Logout
```http
POST /auth/logout
```
Requires authentication.

**Response:**
```json
{
  "message": "登出成功"
}
```

---

## User Endpoints

### Get Users List
```http
GET /users?page=1&limit=10&keyword=search
```
Requires authentication, Admin role.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `keyword` (optional) - Search in name, username, or phone

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "username": "admin",
      "name": "系统管理员",
      "email": "admin@example.com",
      "phone": "13800138000",
      "avatar": null,
      "status": 1,
      "roleId": "uuid",
      "role": {
        "id": "uuid",
        "name": "超级管理员",
        "code": "admin"
      },
      "departmentId": "uuid",
      "department": {
        "id": "uuid",
        "name": "总部"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Get User by ID
```http
GET /users/:id
```
Requires authentication.

**Response:**
```json
{
  "id": "uuid",
  "username": "admin",
  "name": "系统管理员",
  "email": "admin@example.com",
  "phone": "13800138000",
  "avatar": null,
  "status": 1,
  "roleId": "uuid",
  "role": {
    "id": "uuid",
    "name": "超级管理员",
    "code": "admin"
  },
  "departmentId": "uuid",
  "department": {
    "id": "uuid",
    "name": "总部"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Create User
```http
POST /users
```
Requires authentication, Admin role.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "name": "新用户",
  "email": "user@example.com",
  "phone": "13900139000",
  "roleCode": "manager",
  "departmentName": "技术部",
  "status": 1
}
```

### Update User
```http
PUT /users/:id
```
Requires authentication, Admin role.

**Request Body:**
```json
{
  "name": "更新后的用户名",
  "email": "updated@example.com",
  "phone": "13900139001",
  "roleCode": "admin",
  "status": 1
}
```

### Delete User
```http
DELETE /users/:id
```
Requires authentication, Admin role.

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["错误信息1", "错误信息2"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "用户名或密码错误",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "没有权限访问此资源",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "用户不存在",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "服务器内部错误",
  "error": "Internal Server Error"
}
```

---

## Data Models

### User
```typescript
{
  id: string;              // UUID
  username: string;        // Unique
  password: string;        // Hashed (not returned in API)
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;          // 1: Active, 0: Disabled
  roleId: string;
  departmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Role
```typescript
{
  id: string;
  name: string;            // Display name
  code: string;            // Unique code (e.g., 'admin', 'manager')
  description?: string;
  permissions: Json;       // Permission object
  createdAt: Date;
  updatedAt: Date;
}
```

### Department
```typescript
{
  id: string;
  name: string;
  parentId?: string;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Coming Soon

The following endpoints will be implemented in future phases:

- **Project Management**: `/projects/*`
- **Sales CRM**: `/sales/*`
- **Purchase Management**: `/purchase/*`
- **Finance Management**: `/finance/*`
- **Role Management**: `/roles/*`
- **Department Management**: `/departments/*`
- **Operation Logs**: `/logs/*`
