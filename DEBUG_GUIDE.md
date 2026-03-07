# 调试指南 - 数值化状态与事件记忆

## 📍 提示词组装位置

**文件**: `components/chat/chat-view.tsx`
**函数**: `handleSend` (第155-230行)

## 🔍 组装顺序

发送给LLM的消息按以下顺序组装：

```javascript
messagesToSend = [
  // 1. 系统提示词（如果配置了）
  { role: 'system', content: '外部配置的系统提示词' },

  // 2. 对话摘要（如果有）
  { role: 'system', content: '以下是之前对话的摘要...' },

  // 3. 状态和事件信息（如果有）
  { role: 'system', content: '当前状态信息：\n<numeric_states>...' },

  // 4. 输出格式说明（如果启用了状态或事件）
  { role: 'system', content: '【重要】你必须严格按照以下XML格式回复...' },

  // 5. 最近N条对话消息
  { role: 'user', content: '...' },
  { role: 'assistant', content: '...' },
  ...
]
```

## 🛠️ 调试方法

### 1. 查看控制台日志

打开浏览器开发者工具（F12），在发送消息时会看到：

```
=== 发送给LLM的完整Prompt ===
系统提示词数量: 4
最近消息数量: 10
状态数量: 2
事件数量: 3
事件记忆开启: true

完整消息列表:
[0] SYSTEM:
你是一个友好的AI助手...

[1] SYSTEM:
当前状态信息：
<numeric_states>
  <state id="affection" name="好感度" value="75" .../>
</numeric_states>

[2] SYSTEM:
【重要】你必须严格按照以下XML格式回复...

[3] USER:
今天心情很好！
```

### 2. 检查状态是否正确配置

#### 添加数值化状态
1. 点击输入框左侧的 **📊 图标**
2. 点击"添加状态"
3. 填写信息：
   - 名称：`affection`（必须是英文ID）
   - 当前值：50
   - 范围：0-100
4. 保存

#### 启用事件记忆
1. 点击输入框左侧的 **📅 图标**
2. 打开"事件记忆"开关

### 3. 检查LLM响应

发送消息后，查看控制台：

```
[State] 状态更新: [{id: "affection", delta: 5}]
[Event] 新事件: {importance: 7, content: "用户分享了愉快的心情"}
```

如果**没有**这些日志，说明：
- LLM没有返回XML格式
- 或者XML格式不正确

### 4. 查看实际响应内容

在控制台中搜索 `fullContent`，可以看到LLM的原始响应。

## ⚠️ 常见问题

### 问题1: 状态和事件没有变化

**可能原因：**
1. ❌ 没有添加数值化状态
2. ❌ 事件记忆开关未打开
3. ❌ LLM没有按XML格式回复

**检查方法：**
```javascript
// 控制台查看
状态数量: 0  // ← 如果是0，说明没配置状态
事件记忆开启: false  // ← 如果是false，需要打开开关
```

### 问题2: LLM不使用XML格式

**原因：**
- DeepSeek等模型可能不严格遵守格式要求
- 需要在系统提示词中额外强调

**解决方案：**

在"系统提示词"中添加：
```
你必须严格按照XML格式回复，这对系统解析很重要。
每次回复都要包含<response>、<content>等标签。
```

### 问题3: XML解析失败

**检查LLM的原始输出：**
1. 打开控制台
2. 搜索 `fullContent`
3. 查看是否包含 `<response>` 标签

**正确的格式：**
```xml
<response>
  <content>
    我很高兴听到这个消息！
  </content>
  <state_updates>
    <update id="affection" delta="+5" />
  </state_updates>
  <event>
    <importance>6</importance>
    <description>用户分享了积极的情绪</description>
  </event>
</response>
```

## 🔧 手动测试

### 测试脚本（控制台）

```javascript
// 检查当前对话的状态
const conv = window.__conversations__?.find(c => c.id === window.__currentId__);
console.log('状态:', conv?.numericStates);
console.log('事件:', conv?.memoryEvents);
console.log('事件开关:', conv?.enableEventMemory);
```

## 📝 优化建议

### 1. 强化系统提示词

在外部系统提示词中明确说明：
```
【角色设定】
你是XXX角色...

【交互规则】
- 你必须使用XML格式回复
- 根据对话更新状态值（如好感度、信任度）
- 记录重要的对话事件

【回复格式】
严格按照<response>标签格式，包含<content>、<state_updates>、<event>
```

### 2. 测试流程

1. 添加一个"好感度"状态（0-100）
2. 打开事件记忆
3. 发送："谢谢你一直陪着我"
4. 期望结果：
   - 好感度增加
   - 新增事件："用户表达感激"

### 3. 验证方式

```javascript
// 控制台查看
console.log('=== 当前状态 ===');
// 应该看到状态更新和事件记录
```

## 🎯 完整工作流程

```mermaid
用户发送消息
    ↓
组装Prompt（系统提示词 + 状态 + 事件 + 格式说明 + 消息）
    ↓
发送给LLM
    ↓
LLM返回XML格式
    ↓
解析XML
    ├→ 提取<content>显示
    ├→ 解析<state_updates>更新状态
    └→ 解析<event>添加事件
    ↓
在UI上可见状态变化
```

---

**重要提示：** 如果看不到变化，请先检查控制台日志，确认：
1. ✅ 状态数量 > 0 或事件开关 = true
2. ✅ LLM响应包含XML标签
3. ✅ 看到 `[State]` 或 `[Event]` 日志
