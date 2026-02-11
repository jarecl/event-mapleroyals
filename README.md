# MapleRoyals 活动管理系统

一个为 MapleRoyals 游戏社区设计的全栈活动管理系统，用于管理和组织各种游戏活动。

## 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **UI 框架**: Element Plus
- **路由管理**: Vue Router 4
- **状态管理**: Pinia
- **HTTP 客户端**: Axios

### 后端
- **框架**: Hono (轻量级 Node.js Web 框架)
- **数据库**: PostgreSQL
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs

## 项目结构

```
event-mapleroyals/
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── components/         # 组件目录
│   │   ├── router/             # 路由配置
│   │   │   └── index.js
│   │   ├── stores/             # Pinia 状态管理
│   │   │   └── user.js
│   │   ├── views/              # 页面组件
│   │   │   ├── Login.vue           # 登录页面
│   │   │   ├── Register.vue        # 注册页面
│   │   │   ├── ResetPassword.vue   # 重置密码
│   │   │   ├── UserHome.vue        # 用户首页（活动列表）
│   │   │   ├── CreateActivity.vue  # 创建活动
│   │   │   ├── ActivityDetail.vue  # 活动详情
│   │   │   ├── MyRoles.vue         # 我的活动角色
│   │   │   ├── MyActivities.vue    # 我的活动
│   │   │   └── AdminPanel.vue      # 管理后台
│   │   ├── App.vue            # 根组件
│   │   └── main.js            # 应用入口
│   ├── index.html             # HTML 模板
│   ├── vite.config.js         # Vite 配置
│   └── package.json           # 前端依赖
│
├── backend/                    # 后端应用
│   ├── src/
│   │   ├── db.js              # 数据库连接配置
│   │   ├── index.js           # 服务器入口
│   │   ├── middleware/        # 中间件目录
│   │   ├── routes/            # 路由目录
│   │   │   ├── auth.js        # 认证相关路由
│   │   │   ├── admin.js       # 管理员路由
│   │   │   ├── user.js        # 用户路由
│   │   │   └── activity.js    # 活动相关路由
│   │   └── utils/             # 工具函数目录
│   ├── scripts/               # 脚本目录
│   └── package.json           # 后端依赖
│
└── README.md                   # 项目说明文档
```

## 功能模块

### 用户认证模块
- 用户登录/注册
- JWT 身份验证
- 密码重置功能
- 密码修改
- 自动登录状态检查

### 活动管理模块
- 活动列表展示
- 创建新活动
- 活动详情查看
- 活动参与管理

### 角色管理模块
- 查看个人活动角色
- 管理参与的活动
- 角色权限分配

### 管理后台模块（管理员权限）
- 用户管理
- 活动审核
- 系统配置管理

## 快速开始

### 前置要求
- Node.js 18+
- PostgreSQL 数据库

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 配置环境变量

1. 复制后端环境变量模板文件：
```bash
cp backend/.env.example backend/.env
```

2. 编辑 `backend/.env` 文件，填入你的实际配置：
```env
# 服务器配置
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mapleroyals
DB_USER=postgres
DB_PASSWORD=your_database_password_here

# JWT 密钥（请使用强随机字符串）
JWT_SECRET=your_jwt_secret_key_here
```

**重要**: `.env` 文件包含敏感信息，已被 `.gitignore` 忽略，不会被提交到 Git 仓库。

### 配置数据库

1. 确保 PostgreSQL 数据库运行中
2. 在 `backend/.env` 中配置数据库连接信息
3. 运行数据库初始化脚本（如需要）

### 启动开发服务器

```bash
# 启动后端服务 (端口 3001)
cd backend
npm run dev

# 启动前端服务 (端口 3000)
cd frontend
npm run dev
```

访问 http://localhost:3000 查看应用

### 构建生产版本

```bash
# 构建前端
cd frontend
npm run build

# 启动后端生产服务
cd ../backend
npm start
```

## 开发环境

- **前端开发服务器**: http://localhost:3000
- **后端 API 服务器**: http://localhost:3001
- **跨域配置**: 前端通过 Vite 代理连接后端 API

## License

MIT
