# Token互助平台方案 v3.0

> **文档版本：** v3.0  
> **日期：** 2026-05-30  
> **状态：** 简化方案  
> **定位：** 群内互助，信任为基础

---

## 一、核心思路

### 1.1 设计原则

```
✅ 最简实现
├── 不做加密 → 群内信任
├── 不做客户端 → 纯网页操作
├── 不做复杂计费 → 用户自觉
└── 不做监控 → 贡献者自己看API后台

✅ 威慑机制
├── 提供"统计工具下载"入口 → 心理威慑
├── 一一对应分配Key → 贡献者可监控
└── 异常可追溯 → 发现问题可取消权限
```

### 1.2 核心机制

```
贡献者：
├── 在API后台申请多个Key（如5个）
├── 在平台提交这些Key
└── 在API后台监控每个Key的使用量

使用者：
├── 浏览可用Key
├── 申请使用
├── 获得专属Key（一一对应）
└── 自觉使用，可选安装统计工具

平台：
├── 展示可用Key
├── 分配Key（一一对应）
├── 记录分配关系
└── 提供统计工具下载入口（威慑用）
```

---

## 二、功能设计

### 2.1 页面结构

```
页面1：首页/浏览Key
├── 按平台筛选（OpenAI、Claude、Gemini等）
├── 按模型筛选
├── 显示：平台、模型、剩余额度、贡献者
└── 点击"申请使用"

页面2：贡献Key
├── 选择平台
├── 填写API请求地址（base_url）
├── 填写支持的模型（多选）
├── 填写API Key（多个，每行一个）
├── 填写自称的额度（用户自觉）
└── 提交

页面3：我的Key
├── 我贡献的Key列表
├── 我使用的Key列表
└── 每个Key的使用状态

页面4：统计工具引导（弹窗）
├── 介绍统计工具
├── 下载按钮（可选）
└── 说明：未安装也可手动填写
```

### 2.2 数据模型

```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Key表
CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_id INTEGER NOT NULL,  -- 贡献者ID
    platform TEXT NOT NULL,            -- 平台名称
    base_url TEXT NOT NULL,            -- API请求地址
    models TEXT NOT NULL,              -- 支持的模型（JSON数组）
    api_key TEXT NOT NULL,             -- API Key
    claimed_quota TEXT,                -- 自称的额度
    status TEXT DEFAULT 'available',   -- 状态：available/assigned/disabled
    assigned_to INTEGER,               -- 分配给谁
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contributor_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);
```

### 2.3 核心流程

```
贡献流程：
1. 用户登录
2. 进入"贡献Key"页面
3. 填写：平台、地址、模型、Key、额度
4. 提交 → Key状态为"available"

使用流程：
1. 用户登录
2. 浏览可用Key
3. 点击"申请使用"
4. 平台分配一个Key → 状态改为"assigned"
5. 用户在"我的Key"页面看到分配的Key
6. 复制Key使用

监控流程（贡献者自行操作）：
1. 登录API提供商后台
2. 查看每个Key的使用量
3. 发现异常 → 在平台禁用该Key
```

---

## 三、技术实现

### 3.1 技术栈

```
前端：单个HTML文件 + CSS + JS
后端：Python Flask
数据库：SQLite（一个文件）
部署：任意服务器或本地运行
```

### 3.2 目录结构

```
tokenplan/
├── app.py              # Flask后端
├── database.db         # SQLite数据库
├── static/
│   └── index.html      # 前端页面
└── README.md
```

### 3.3 API设计

```
POST /api/register      # 用户注册
POST /api/login         # 用户登录
GET  /api/keys          # 获取可用Key列表
POST /api/keys          # 贡献Key
POST /api/keys/:id/assign  # 申请使用Key
GET  /api/my-keys       # 获取我的Key（贡献的+使用的）
POST /api/keys/:id/disable # 禁用Key（贡献者操作）
```

---

## 四、威慑机制

### 4.1 统计工具引导

```
在以下场景显示：
├── 用户首次登录
├── 用户申请Key时
└── "我的Key"页面常驻入口

展示内容：
├── 工具介绍：自动统计token使用量
├── 下载按钮（链接到GitHub或脚本）
├── 说明：安装后可一键同步使用量
└── 提示：未安装也可手动填写
```

### 4.2 威慑效果

```
对正常使用者：
├── 方便统计自己的使用量
├── 可选安装，无强制
└── 心理上有"被监控"的感觉

对想滥用/转卖的人：
├── 看到有统计工具 → 心理压力
├── 知道Key一一对应 → 可追溯
└── 知道贡献者可监控 → 有威慑
```

---

## 五、实施计划

### 5.1 第一阶段：基础功能

```
目标：能跑起来，群内试用

功能：
├── 用户注册/登录
├── 贡献Key
├── 浏览可用Key
├── 申请使用Key
└── 查看我的Key

时间：1-2天
```

### 5.2 第二阶段：完善体验

```
目标：提升用户体验

功能：
├── 筛选功能（按平台、模型）
├── 贡献者可禁用Key
├── 统计工具引导弹窗
└── 使用说明页面

时间：1天
```

---

## 六、总结

### 6.1 与原方案对比

| 维度 | 原方案 | 新方案 |
|------|--------|--------|
| 加密 | 端到端加密 | 无 |
| 客户端 | Tauri桌面应用 | 无 |
| 计费 | 复杂计费系统 | 用户自觉 |
| 监控 | 平台监控 | 贡献者自己看API后台 |
| 数据库 | PostgreSQL + Redis | SQLite |
| 开发时间 | 1-2个月 | 2-3天 |

### 6.2 核心优势

```
1. 极简实现
   ├── 开发成本低
   ├── 维护成本低
   └── 快速上线

2. 信任机制
   ├── 群筛选保证素质
   ├── 一一对应可追溯
   └── 贡献者自行监控

3. 威慑效果
   ├── 统计工具入口
   ├── 心理压力
   └── 降低滥用风险
```

---

**文档结束**
