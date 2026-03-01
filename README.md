# PromptLab

基于 LibreChat 设计的现代化 AI 对话界面，支持所有兼容 OpenAI API 格式的模型。

## ✨ 特性

- 🎨 **ChatGPT 风格界面** - 左侧对话历史，流畅的交互体验
- 🤖 **真实 AI 对话** - 支持 OpenAI、Gemini、DeepSeek 等所有兼容模型
- 💬 **流式响应** - 实时显示 AI 回复，流畅自然
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌓 **深色模式** - 支持浅色/深色主题切换
- 💾 **本地存储** - 对话历史自动保存，刷新不丢失
- 🌏 **中文界面** - 完全本地化的用户体验

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置你的 API Key：

```env
# OpenAI
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 或者使用 Gemini
# OPENAI_API_KEY=your-gemini-api-key
# OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
# OPENAI_MODEL=gemini-2.0-flash-exp
```

> 📖 详细配置指南请查看 [API_CONFIG.md](./API_CONFIG.md)

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 开始使用！

---

## 🎯 支持的模型

PromptLab 支持所有兼容 OpenAI API 格式的服务：

| 服务商 | 状态 | 获取 API Key |
|--------|------|--------------|
| **OpenAI** | ✅ | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Google Gemini** | ✅ | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **DeepSeek** | ✅ | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **通义千问** | ✅ | [dashscope.aliyun.com](https://dashscope.aliyuncs.com/) |
| **Groq** | ✅ | [console.groq.com](https://console.groq.com/keys) |
| **本地模型** | ✅ | Ollama、LM Studio、vLLM 等 |

---

## 📂 项目结构

```
prompt-lab/
├── app/
│   ├── api/chat/route.ts    # API 路由（流式响应）
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 主页
│   └── globals.css          # 全局样式
├── components/
│   ├── chat/                # 聊天组件
│   │   ├── chat-view.tsx    # 主视图
│   │   ├── message.tsx      # 消息组件
│   │   ├── message-list.tsx # 消息列表
│   │   └── chat-input.tsx   # 输入框
│   ├── sidebar/             # 侧边栏组件
│   │   ├── sidebar.tsx      # 侧边栏容器
│   │   ├── conversation-list.tsx  # 对话列表
│   │   └── conversation-item.tsx  # 对话项
│   └── ui/                  # UI 组件
│       ├── button.tsx
│       ├── scroll-area.tsx
│       └── theme-toggle.tsx
├── lib/
│   ├── types.ts             # TypeScript 类型
│   ├── utils.ts             # 工具函数
│   └── storage.ts           # 本地存储
├── .env.example             # 环境变量模板
└── API_CONFIG.md            # API 配置指南
```

---

## 🎨 功能特性

### 对话管理
- ✅ 创建新对话
- ✅ 切换对话
- ✅ 删除对话
- ✅ 对话历史分组（今天、昨天、过去7天、更早）
- ✅ 自动生成对话标题

### 消息功能
- ✅ 实时流式响应
- ✅ Markdown 渲染
- ✅ 代码高亮
- ✅ 自动滚动
- ✅ 上下文保持

### 界面交互
- ✅ 深色/浅色主题
- ✅ 侧边栏折叠
- ✅ 响应式布局
- ✅ 键盘快捷键（Enter 发送、Shift+Enter 换行）

---

## 🔧 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: Radix UI
- **AI SDK**: OpenAI SDK
- **Markdown**: react-markdown + remark-gfm
- **图标**: Lucide React

---

## 📖 使用指南

### 基本操作

1. **发送消息**：在输入框中输入内容，按 Enter 发送
2. **换行**：按 Shift + Enter 换行
3. **新建对话**：点击左上角"新建对话"按钮
4. **切换对话**：点击侧边栏中的对话项
5. **删除对话**：悬停在对话项上，点击垃圾桶图标
6. **切换主题**：点击右上角的主题切换按钮

### 配置不同的模型

**OpenAI GPT-4o**
```env
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

**Google Gemini**
```env
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_MODEL=gemini-2.0-flash-exp
```

**本地 Ollama**
```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.2
```

---

## 🚀 部署

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 添加环境变量（API Key 等）
4. 部署

### Docker

```bash
# 构建镜像
docker build -t promptlab .

# 运行容器
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  -e OPENAI_MODEL=gpt-4o-mini \
  promptlab
```

---

## 🛠️ 开发

### 构建生产版本

```bash
npm run build
npm start
```

### 类型检查

```bash
npx tsc --noEmit
```

---

## ❓ 常见问题

**Q: API Key 安全吗？**
A: API Key 存储在 `.env.local` 中，该文件已在 `.gitignore` 排除，不会被提交。部署时在平台设置环境变量。

**Q: 支持哪些模型？**
A: 支持所有兼容 OpenAI API 格式的模型，包括 GPT、Gemini、Claude（通过代理）、DeepSeek、通义千问等。

**Q: 如何切换模型？**
A: 修改 `.env.local` 中的 `OPENAI_MODEL` 值，重启开发服务器。

**Q: 对话历史存储在哪里？**
A: 当前存储在浏览器的 localStorage 中。清除浏览器数据会丢失历史。

**Q: 可以部署到服务器吗？**
A: 可以！支持 Vercel、Netlify、Docker 等多种部署方式。

---

## 🔮 未来计划

- [ ] 多模型切换（界面选择）
- [ ] 图片上传和多模态支持
- [ ] 对话分享功能
- [ ] 导出对话（Markdown/PDF）
- [ ] 语音输入/输出
- [ ] 插件系统
- [ ] 数据库持久化

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- UI 设计灵感来自 [LibreChat](https://github.com/danny-avila/LibreChat)
- 感谢所有开源贡献者

---

**开始使用 PromptLab，体验流畅的 AI 对话！** 🚀
