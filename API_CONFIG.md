# API 配置指南

PromptLab 支持所有兼容 OpenAI API 格式的模型服务。

## 快速开始

### 1. 复制环境变量模板

```bash
cp .env.example .env.local
```

### 2. 编辑 `.env.local` 文件

在 `.env.local` 中配置你的 API Key 和相关设置。

---

## 支持的模型服务

### 🤖 OpenAI（官方）

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**可用模型：**
- `gpt-4o` - 最新多模态模型
- `gpt-4o-mini` - 性价比更高
- `gpt-4-turbo` - 强大的 GPT-4 版本
- `gpt-3.5-turbo` - 快速且经济

**获取 API Key：** https://platform.openai.com/api-keys

---

### 💎 Google Gemini

Gemini 现在支持 OpenAI 兼容格式！

```env
OPENAI_API_KEY=your-google-api-key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_MODEL=gemini-2.0-flash-exp
```

**可用模型：**
- `gemini-2.0-flash-exp` - 最新实验版本
- `gemini-1.5-pro` - 强大的多模态模型
- `gemini-1.5-flash` - 快速响应

**获取 API Key：** https://aistudio.google.com/apikey

---

### 🌊 DeepSeek

```env
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

**可用模型：**
- `deepseek-chat` - 对话模型
- `deepseek-coder` - 代码专用

**获取 API Key：** https://platform.deepseek.com/api_keys

---

### 🚀 Claude（通过第三方代理）

如果你使用第三方 OpenAI 兼容的 Claude 代理：

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://your-claude-proxy.com/v1
OPENAI_MODEL=claude-3-5-sonnet-20241022
```

---

### 🇨🇳 通义千问（Qwen）

```env
OPENAI_API_KEY=your-qwen-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-turbo
```

**可用模型：**
- `qwen-turbo` - 快速响应
- `qwen-plus` - 增强版本
- `qwen-max` - 最强性能

---

### 🔥 其他兼容服务

任何支持 OpenAI API 格式的服务都可以使用，只需配置：

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.your-service.com/v1
OPENAI_MODEL=model-name
```

**常见兼容服务：**
- Groq
- Together AI
- Perplexity
- Mistral AI
- Cohere
- 本地部署（Ollama、LM Studio、vLLM 等）

---

## 本地模型部署

### Ollama

1. 安装并启动 Ollama
2. 拉取模型：`ollama pull llama3.2`
3. 配置：

```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.2
```

### LM Studio

1. 启动 LM Studio 并加载模型
2. 启用 API 服务器（默认端口 1234）
3. 配置：

```env
OPENAI_API_KEY=lm-studio
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_MODEL=your-model-name
```

---

## 环境变量说明

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `OPENAI_API_KEY` | ✅ | API 密钥 | - |
| `OPENAI_BASE_URL` | ❌ | API 基础 URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | ❌ | 默认模型 | `gpt-4o-mini` |

---

## 测试配置

启动项目后，发送一条消息测试：

```bash
npm run dev
```

如果配置正确，AI 会正常回复。

如果出现错误，检查：
1. ✅ API Key 是否正确
2. ✅ Base URL 是否正确
3. ✅ 模型名称是否支持
4. ✅ 网络连接是否正常
5. ✅ API 账户是否有余额

---

## 常见问题

### Q: 如何切换模型？

A: 修改 `.env.local` 中的 `OPENAI_MODEL` 值，重启开发服务器。

### Q: 支持流式响应吗？

A: 是的！项目已实现流式响应，消息会实时显示。

### Q: 可以同时使用多个模型吗？

A: 当前版本使用环境变量配置的单一模型。如需切换，修改配置后重启。

### Q: API Key 安全吗？

A: API Key 存储在 `.env.local` 文件中，该文件已在 `.gitignore` 中排除，不会被提交到 Git。

### Q: 本地部署的模型需要 API Key 吗？

A: 不需要，可以填写任意值（如 `ollama` 或 `local`）。

---

## 进阶配置

如需更多自定义，可以修改 `/app/api/chat/route.ts`：

```typescript
const stream = await openai.chat.completions.create({
  model: selectedModel,
  messages: messages,
  stream: true,
  temperature: 0.7,      // 调整创造性（0-2）
  max_tokens: 2000,      // 限制响应长度
  top_p: 1,              // 核采样
  frequency_penalty: 0,  // 频率惩罚
  presence_penalty: 0,   // 存在惩罚
});
```

---

## 获取帮助

- 查看错误日志：浏览器控制台（F12）
- 检查服务器日志：终端输出
- 阅读 API 文档：访问对应服务商的官方文档

祝你使用愉快！🚀
