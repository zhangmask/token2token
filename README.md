# TokenPlan - API Key 互助平台

一个轻量的 API Key 共享管理工具，数据存储在飞书多维表格中。

**适合场景**：群内成员互相共享 API Key，每人每天最多领一个，可追溯、可管理。

> 项目部署在 [Zeabur](https://zeabur.com)，数据存储在飞书多维表格，无需自建数据库。

---

## 快速使用

### 1. 打开网页

管理员部署好后，会给你一个链接（例如 `https://tokenplan.zeabur.app`）。

打开这个链接，注册账号即可使用。

### 2. 注册

- 填写用户名、密码
- 填写微信ID 和 手机号（用于联系确认）
- 点击注册

### 3. 贡献 Key

如果你有可共享的 API Key：

1. 进入「贡献资源」页面
2. 选择平台（如 OpenAI、Claude 等）
3. 填写 API 地址、模型名称
4. 填写 Key 和失效日期
5. 提交

### 4. 领取 Key

如果你需要某个平台的 Key：

1. 进入「浏览资源」页面
2. 查看可用的 Key
3. 选择后领取
4. 每人每天只能领取一个

### 5. 管理

- 「我的资源」查看自己贡献和正在使用的 Key
- 「操作日志」查看所有操作记录

---

## 常见问题

**Q：需要注册吗？**
需要。注册时需要提供微信ID和手机号，管理员会根据邀请名单确认。

**Q：领了 Key 之后在哪里看？**
在「我的资源」-「正在使用」中可以看到领取的 Key 完整信息。

**Q：每天能领几个？**
每人每天最多领一个。

**Q：能禁用自己贡献的 Key 吗？**
可以。在「我的资源」-「贡献的」中找到对应 Key，点击禁用即可。

---

## 部署到 Zeabur

### 前置条件

1. 在本地安装 lark-cli 并登录：

```bash
npm install -g @larksuiteoapi/cli
lark-cli auth login --domain base
```

2. 导出飞书认证配置：

```bash
# Windows
python -c "
import os, tarfile, base64, io
home = os.path.expanduser('~')
config_dir = os.path.join(home, '.lark-cli')
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    tar.add(config_dir, arcname='.')
print(base64.b64encode(buf.getvalue()).decode())
"
```

复制输出的 base64 字符串，后续会用到。

### Zeabur 部署步骤

1. **Fork 或 Push 代码到 GitHub**

2. **打开 [Zeabur](https://zeabur.com)**
   - 点击 **Create Project** → **Git Repository**
   - 连接你的 GitHub 仓库
   - Zeabur 自动识别为 Python 项目

3. **配置环境变量**
   - 在项目设置中添加 `LARK_CLI_CONFIG`
   - 值粘贴刚才导出的 base64 字符串

4. **等待部署完成**
   - Zeabur 会自动安装依赖、启动服务
   - 部署完成后会分配一个 `https://xxx.zeabur.app` 的链接

5. **把链接发到群里，大家就能用了 🎉**

---

## 项目文件结构

```
tokenplan/
├── app.py              # 后端服务
├── requirements.txt    # Python 依赖
├── runtime.txt         # Python 版本
├── README.md           # 本文件
└── static/
    ├── index.html      # 前端页面
    ├── app.js          # 前端逻辑
    └── style.css       # 页面样式
```
