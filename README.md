# Token2Token - API Key 互助平台

一个基于 Flask 的 API Key 共享与互助平台，用户可以贡献和使用各平台的 API Key。

## 功能特性

- 用户注册与登录
- 贡献 API Key（支持多个平台）
- 申请使用 API Key
- Key 的有效期管理
- 贡献度统计

## 支持的平台

### 海外平台
- OpenAI (GPT)
- Anthropic (Claude)
- Google (Gemini)
- Mistral AI
- xAI (Grok)
- Meta (Llama)
- Together AI
- Fireworks AI
- Groq
- Cohere
- Perplexity
- Replicate
- Hugging Face

### 国内平台
- DeepSeek (深度求索)
- 豆包大模型 (字节跳动)
- 讯飞星火
- 百度文心一言
- 阿里通义千问
- 智谱ChatGLM
- 月之暗面 (Kimi)
- MiniMax (海螺AI)
- 零一万物 (Yi)
- 百川智能
- 阶跃星辰
- 硅基流动
- 腾讯混元
- 商汤日日新
- 360智脑
- 昆仑万维天工
- 华为盘古
- Xiaomi MiMo
- vivo蓝心大模型

## 技术栈

- **后端**: Python Flask
- **数据库**: SQLite
- **前端**: HTML, CSS, JavaScript

## 安装与运行

### 1. 克隆项目

```bash
git clone https://github.com/zhangmask/token2token.git
cd token2token
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 运行应用

```bash
python app.py
```

应用将在 http://localhost:5000 启动。

## 项目结构

```
token2token/
├── static/
│   ├── index.html      # 前端页面
│   ├── app.js          # 前端逻辑
│   └── style.css       # 样式文件
├── app.py              # Flask 后端
├── database.db         # SQLite 数据库（自动生成）
├── requirements.txt    # Python 依赖
└── README.md           # 项目说明
```

## 使用说明

1. 注册账号并登录
2. 在「贡献 Key」页面提交您的 API Key
3. 在「申请 Key」页面申请使用其他用户贡献的 Key
4. 在「我的 Key」页面管理您的 Key

## 许可证

MIT License