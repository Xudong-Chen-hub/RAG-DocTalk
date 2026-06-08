# RAG-DocTalk

# 一个基于RAG的智能文档回答系统

## 一、项目背景

检索增强生成（RAG）是目前企业级文档问答的主流方案。本题目要求学生开发一个 Web 应用，用户上传 PDF 或 TXT 文档，系统自动对文档内容进行切分、向量化并存储，然后用户可以在聊天界面中针对文档内容提问，系统检索相关段落并结合大模型生成答案。

## 二、设计要求

1.功能需求：

- 文档上传与解析：支持上传 .pdf 或 .txt 文件，前端展示上传进度，后端提取文本内容。
- 文本分块与向量化：将提取的文本按固定大小（如 500 字符）或有重叠的方式切块，使用 embeddings 模型（如 text-embedding-3-small 或本地 BAAI/bge-small-zh）生成向量。
- 向量存储与检索：将向量存入向量数据库（Chroma / FAISS / Milvus Lite）。用户提问后，将问题向量化，检索最相似的 Top-K 文本块。
- LLM 生成答案：将检索到的文本块作为上下文，调用 LLM 生成答案，并在前端聊天界面中同时显示答案和引用的原文片段（支持高亮）。
- 对话历史管理：同一个文档支持多轮对话（上下文不跨文档），用户可新建对话。
- 具备来源添加功能，可用户自行添加文本也可以联网搜索
- 对话功能，根据添加的文本，调用对应的大模型执行对应的用户需求操作
- 支持多模态输出，例如音频、视频、思维导图、PPT等等

​2.界面样式：拟采用Coogle出版的Open notebooklm作为可视化样式模板，并且功能向botebooklm看齐

- 界面分为三部分：Source、Community、Studio
- Source界面用于添加文本
- Community界面用于用户的对话界面
- Studio界面用于补充多模态的选项以及对应多模态文件生成的存放

## 三、基本技术路线

### 3.1 总体架构

```
┌─────────────────────────────────────────────────────┐
│                    前端 (Browser)                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Source   │  │  Community   │  │    Studio    │  │
│  │  来源管理  │  │   对话交互    │  │  多模态输出   │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│       │               │                │           │
└───────┼───────────────┼────────────────┼───────────┘
        │   REST API     │                │
        ▼                ▼                ▼
┌─────────────────────────────────────────────────────┐
│                    后端 (FastAPI)                     │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 文档解析  │  │ 文本分块  │  │   向量化 & 检索   │  │
│  │ PDF/TXT  │  │ Chunking │  │ Embedding + VDB  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │             │                │             │
│       └──────┬──────┘                │             │
│              ▼                       ▼             │
│  ┌──────────────────┐  ┌──────────────────────┐   │
│  │   LLM 对话引擎    │  │   多模态生成引擎       │   │
│  │ Context + RAG    │  │ 音频/视频/脑图/PPT     │   │
│  └──────────────────┘  └──────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              数据持久层                         │   │
│  │   SQLite(元数据) + ChromaDB(向量) + 本地文件    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 技术选型

| 层次               | 技术                                                         | 选型理由                                                                     |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **前端框架**       | Vue 3 + TypeScript (Composition API)                         | 学习曲线平缓，SFC 单文件组件直觉友好，适合三面板布局                         |
| **前端 UI 库**     | Tailwind CSS + ShadCN UI (shadcn-vue)                        | 极简设计，源码级定制，与 NotebookLM 安静精致的视觉风格高度契合               |
| **前端状态管理**   | Pinia                                                        | Vue 3 官方推荐，TypeScript 支持好，适合三面板间的状态共享                    |
| **后端框架**       | Python FastAPI                                               | 异步支持好，自带 OpenAPI 文档，与 Python ML/AI 生态无缝对接                  |
| **文档解析**       | PyMuPDF (PDF) + python-docx (Word) + 内置 (TXT)              | PyMuPDF 解析 PDF 质量高；python-docx 处理 .docx 办公文档；轻量无额外依赖     |
| **文本分块**       | LangChain Text Splitters                                     | 提供 RecursiveCharacterTextSplitter，支持重叠分块，中英文兼容                |
| **Embedding 模型** | OpenAI text-embedding-3-small / BAAI bge-small-zh (本地备选) | 前者精度高，后者可离线部署，按需切换                                         |
| **向量数据库**     | ChromaDB                                                     | Python 原生，零配置启动，适合开发和小规模部署                                |
| **LLM**            | DeepSeek V4 Pro (主) / 兼容 OpenAI 接口                      | 1M 上下文窗口，成本可控，Agent 能力优秀                                      |
| **对话记忆**       | SQLite + 会话级上下文管理                                    | 轻量，无需额外部署；按文档隔离对话历史                                       |
| **多模态生成**     | 音频: Edge-TTS / OpenAI TTS                                  | 文字转语音，自然度高                                                         |
|                    | 脑图: Markmap (前端渲染)                                     | 从 Markdown 生成思维导图，纯前端方案                                         |
|                    | PPT: python-pptx                                             | 服务端生成 .pptx 文件                                                        |
| **联网搜索**       | Tavily Search API / DuckDuckGo                               | 补充外部知识来源                                                             |
| **任务队列**       | Celery + Redis (可选，多模态生成异步化)                      | 音频/PPT 生成耗时较长，异步处理避免阻塞                                      |

### 3.3 后端架构设计

#### 3.3.1 项目目录结构 (Python)

```
backend/
├── app/
│   ├── main.py                # FastAPI 入口，路由注册
│   ├── config.py              # 配置管理（环境变量、模型参数）
│   ├── api/
│   │   ├── documents.py       # 文档上传/解析/管理 API
│   │   ├── conversations.py   # 对话管理 API
│   │   ├── chat.py            # 聊天接口（RAG 问答）
│   │   ├── sources.py         # 来源管理（文本/搜索/URL）
│   │   └── studio.py          # 多模态生成 API（音频/脑图/PPT）
│   ├── core/
│   │   ├── parser.py          # 文档解析（PDF/TXT/Word → 文本）
│   │   ├── chunker.py         # 文本分块（固定大小/语义分块）
│   │   ├── embedder.py        # Embedding 封装（OpenAI / BGE 切换）
│   │   ├── retriever.py       # 向量检索（Top-K + MMR 去重）
│   │   └── llm.py             # LLM 调用封装（统一接口，支持多模型）
│   ├── services/
│   │   ├── rag_service.py     # RAG 核心流程（检索 + 生成 + 引用）
│   │   ├── multimodal.py      # 多模态生成（音频/脑图/PPT）
│   │   └── web_search.py      # 联网搜索服务
│   ├── models/
│   │   ├── document.py        # 文档数据模型
│   │   ├── conversation.py    # 对话数据模型
│   │   └── schemas.py         # Pydantic 请求/响应模型
│   └── db/
│       ├── sqlite.py          # SQLite 连接管理
│       ├── chroma.py          # ChromaDB 初始化与操作
│       └── file_store.py      # 文件存储管理（上传目录、生成文件）
├── requirements.txt
└── tests/
```

#### 3.3.2 RAG Pipeline 核心流程

```
1. 文档上传
   Request: POST /api/documents/upload  (multipart/form-data)
   → 文件保存到 uploads/
   → 调用 parser 提取文本
   → 调用 chunker 分块 (500字符, 50字符重叠)
   → 调用 embedder 生成向量
   → 存入 ChromaDB collection (以 document_id 命名)
   → 文档元信息写入 SQLite
   Response: { document_id, filename, chunk_count, status }

2. 提问回答
   Request: POST /api/chat/ask  { conversation_id, question }
   → 将 question 向量化
   → 在对应文档的 ChromaDB collection 中检索 Top-K (K=5~10)
   → MMR 去重 (保证检索结果多样性)
   → 构建 Prompt: System(角色+引用要求) + Context(检索文本块) + History(近N轮) + Question
   → 调用 LLM 生成答案
   → 解析引用标记，匹配回原文位置
   → 保存对话记录到 SQLite
   Response: { answer, citations: [{chunk_id, text, highlight_position}] }

3. 复合问题处理
   用户: "Q1营收多少？CEO是谁？"
   → LLM 拆解: ["Q1 营收是多少", "CEO 是谁"]
   → 分别检索 (每个子问题独立查询向量数据库)
   → 合并去重后的 Top-K 文本块
   → 构建 Prompt: Context(合并块) + "请分别回答以下问题：1. Q1营收 2. CEO"
   → 返回带引用的完整回答

4. 幻觉防护
   → System Prompt 要求每个断言必须标注来源 chunk
   → Temperature = 0.1~0.3 (低创造力)
   → 后端解析 [N] 标记 → 验证 chunk_id 存在 → 标记不可靠引用
```

#### 3.3.3 API 路由设计

| 方法     | 路径                           | 功能                                 |
| -------- | ------------------------------ | ------------------------------------ |
| `POST`   | `/api/documents/upload`        | 上传 PDF/TXT 文档                    |
| `GET`    | `/api/documents`               | 获取文档列表                         |
| `DELETE` | `/api/documents/{id}`          | 删除文档及向量数据                   |
| `POST`   | `/api/sources/text`            | 手动添加文本来源                     |
| `POST`   | `/api/sources/search`          | 联网搜索添加来源                     |
| `POST`   | `/api/conversations`           | 创建新对话                           |
| `GET`    | `/api/conversations?doc_id=`   | 获取文档下的对话列表                 |
| `POST`   | `/api/chat/ask`                | 发送消息 (RAG 问答)                  |
| `GET`    | `/api/chat/{conv_id}/messages` | 获取对话历史                         |
| `POST`   | `/api/studio/audio`            | 生成音频概述 (用户主动触发)          |
| `POST`   | `/api/studio/mindmap`          | 生成思维导图 Markdown (用户主动触发) |
| `POST`   | `/api/studio/ppt`              | 生成 PPT 文件 (用户主动触发)         |
| `GET`    | `/api/studio/files`            | 获取已生成的多模态文件列表           |

### 3.4 前端架构设计 (Vue 3)

#### 3.4.1 组件树

```
App.vue
├── Layout.vue (三面板布局, 可拖拽调整宽度)
│   ├── Source.vue (左侧 ~25%)
│   │   ├── SourceHeader (面板标题 + 新建按钮)
│   │   ├── SourceTabs (文档 / 文本 / 搜索)
│   │   │   ├── FileUpload.vue (拖拽上传, 进度条)
│   │   │   ├── TextInput.vue (手动输入文本)
│   │   │   └── WebSearch.vue (搜索框 + 结果勾选)
│   │   └── SourceList.vue (已添加的来源列表)
│   │       └── SourceCard.vue (来源卡片: 文件名/摘要/删除)
│   ├── Community.vue (中间 ~45%)
│   │   ├── ChatHeader.vue (当前文档名 + 新建对话)
│   │   ├── MessageList.vue (消息列表)
│   │   │   └── MessageBubble.vue (消息气泡)
│   │   │       ├── AnswerContent (Markdown + 高亮引用)
│   │   │       └── CitationChip (引用标签, 点击展开原文)
│   │   └── ChatInput.vue (输入框 + 发送 + 停止生成)
│   └── Studio.vue (右侧 ~30%)
│       ├── StudioHeader (面板标题)
│       ├── GenerationOptions (音频 / 脑图 / PPT 按钮)
│       └── StudioFileList.vue (已生成文件列表, 下载/预览)
```

#### 3.4.2 前端目录结构

```
frontend/
├── src/
│   ├── views/
│   │   ├── Source.vue            # 来源管理面板
│   │   ├── Community.vue         # 对话交互面板
│   │   └── Studio.vue            # 多模态输出面板
│   ├── components/
│   │   ├── source/               # Source 面板子组件
│   │   ├── community/            # Community 面板子组件
│   │   └── studio/               # Studio 面板子组件
│   ├── stores/                   # Pinia 状态管理
│   │   ├── document.ts           # 文档/来源状态
│   │   ├── conversation.ts       # 对话状态
│   │   └── studio.ts            # 多模态任务状态
│   ├── composables/              # 可复用逻辑 (useChat, useUpload...)
│   ├── api/                      # API 请求封装
│   └── router/                   # Vue Router 配置
├── package.json
└── vite.config.ts
```

#### 3.4.3 面板交互逻辑

```
Source 面板 (来源管理):
  - 上传文档 → 后端解析 + 向量化 → 完成后出现在来源列表
  - 添加文本 → 提交到后端 → 同样进入向量化流程
  - 联网搜索 → 输入关键词 → 后端搜索 → 用户勾选结果 → 导入为来源
  - 点击来源卡片 → 右侧 Community 切换到对应文档的对话

Community 面板 (对话交互):
  - 新建对话 → 选择关联的文档来源
  - 发送消息 → SSE 流式返回答案 (打字机效果)
  - 引用标记 [1][2] → hover/click 弹出原文片段
  - 对话历史保存 → 切换对话可回溯

Studio 面板 (多模态生成):
  - 根据当前对话上下文生成:
    · 音频概述: 类似 NotebookLM 的双人播客对话
    · 思维导图: Markdown 大纲 → Markmap 渲染
    · PPT: 服务端生成 .pptx → 提供下载
  - 生成状态展示 (pending / processing / done)
```

### 3.5 数据存储设计

#### SQLite 表结构（用于对话记忆）

```sql
-- 文档表
documents (
    id TEXT PRIMARY KEY,        -- UUID
    filename TEXT NOT NULL,     -- 原始文件名
    file_type TEXT,             -- pdf / txt / docx
    file_path TEXT,             -- 服务器存储路径
    chunk_count INTEGER,        -- 分块数量
    status TEXT,                -- processing / ready / error
    created_at TIMESTAMP
)

-- 来源表（手动文本 / 搜索结果 等非文件来源）
sources (
    id TEXT PRIMARY KEY,
    document_id TEXT,           -- 关联 documents.id (可为空)
    source_type TEXT,           -- manual / web_search
    title TEXT,
    content TEXT,               -- 原始文本
    chunk_count INTEGER,
    created_at TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
)

-- 对话表
conversations (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,  -- 关联的文档
    title TEXT,                 -- 对话标题 (自动生成)
    created_at TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
)

-- 消息表
messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT,                  -- user / assistant
    content TEXT,               -- 消息内容
    citations JSON,             -- 引用数据 [{chunk_id, text, position}]
    created_at TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
)

-- 多模态生成任务表
studio_tasks (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    task_type TEXT,             -- audio / mindmap / ppt
    status TEXT,                -- pending / processing / done / error
    output_path TEXT,           -- 生成文件存储路径
    created_at TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
)
```

#### ChromaDB 集合设计

```
每个文档/来源对应一个 ChromaDB Collection:
  collection_name = "doc_{document_id}"
  metadata: { chunk_index, char_start, char_end, source_text_preview }
  embedding: OpenAI text-embedding-3-small (1536维) 或 BGE (768维)
```

### 3.6 开发阶段划分

| 阶段                    | 内容                                                                  | 预计产物                       |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------ |
| **Phase 1: 基础搭建**   | 项目脚手架（Vue3 + Vite / FastAPI）、目录初始化、依赖安装             | 前后端可启动的空框架           |
| **Phase 2: 前端界面**   | 三面板布局、Source/Community/Studio 组件、Mock 数据交互               | 完整前端 UI 可预览（无需后端） |
| **Phase 3: 后端基础**   | FastAPI 路由、文档上传/解析（PDF/TXT/Word）、SQLite + ChromaDB 初始化 | API 可用，Swagger 可测试       |
| **Phase 4: 前后端联调** | 前端接入真实 API、上传进度、来源列表、对话交互                        | 前端不再依赖 Mock 数据         |
| **Phase 5: RAG 核心**   | 文本分块、向量化、检索、LLM 生成、引用标注、流式返回                  | 核心问答功能完整可用           |
| **Phase 6: 对话增强**   | 多轮历史管理、上下文窗口、新建/切换对话                               | 完整对话体验                   |
| **Phase 7: 多模态输出** | 音频生成、脑图渲染、PPT 导出（仅在用户主动触发时执行）                | Studio 面板功能完整            |
| **Phase 8: 打磨与部署** | UI 细节打磨、引用高亮、响应式适配、Docker 化部署                      | 可交付的完整系统               |

### 3.7 关键技术决策说明

1. **为什么用 ChromaDB 而不是 FAISS/Milvus？** — ChromaDB 是 Python 原生库，`pip install` 即用，零配置。FAISS 偏底层、Milvus Lite 需要额外服务。开发阶段 ChromaDB 最合适，后续可平滑迁移到 Milvus。

2. **为什么分块大小选 500 字符？** — 对应中文约 250~500 字，能覆盖一个完整的段落语义，同时保证检索精度。配合 50 字符重叠避免关键信息落在分块边界。后续通过实验对比不同策略（语义分块、动态分块）迭代优化。

3. **为什么使用余弦相似度？** — OpenAI `text-embedding-3-small` 和 BGE 模型输出的向量均经过归一化（模长为 1），归一化向量下余弦相似度与点积数学上等价。这是 embedding 检索的标准默认方案，99% 场景无需更换。后续如需优化，优先调整分块策略和检索参数（Top-K、MMR），而非相似度算法。

4. **引用机制如何实现？** — 每个 chunk 记录其原始文档中的字符偏移量 (char_start, char_end)。LLM 返回答案时要求用 `[N]` 标记引用来源，后端解析后匹配回 chunk 位置，前端据此高亮原文。

5. **对话上下文策略？** — 每个文档独立维护对话历史。上下文窗口 = 系统提示 + 最近 N 轮对话 (默认 10 轮) + 当前检索到的 Top-K 文本块。不跨文档共享上下文，避免语义污染。

6. **如何应对 LLM 幻觉（Hallucination）？** — 三道防线：(a) **强制引用** — System Prompt 要求每个断言标注来源 chunk，无法标注的声明"文档中未提及"；(b) **低温度推理** — temperature 设为 0.1~0.3，减少模型创造性发挥；(c) **后端引用验证** — 解析 LLM 返回的 `[N]` 标记，验证对应 chunk 确实存在且内容吻合，不吻合的标记为"不可靠引用"。

7. **如何保证检索质量（召回率）？** — (a) **MMR (最大边际相关性)** 检索替代纯 Top-K，在相关性和多样性之间平衡；(b) **相似度阈值** — 若 Top-1 相似度低于阈值（默认 0.65），直接告知用户"文档中未找到相关信息"，不让 LLM 猜测；(c) **查询重写** — 用户问题模糊时，由 LLM 先改写为更精确的检索查询，再执行向量检索。

8. **一个消息包含多个问题时如何处理？** — 用户一次提出两个独立问题（如"Q1 的营收是多少？CEO 是谁？"）时，传统 RAG 的单一向量检索可能偏向某个子问题。使用**查询拆解（Query Decomposition）**：LLM 将复合问题拆为独立子问题 → 分别检索 → 合并上下文 → 生成完整回答。这是传统 RAG 的轻量增强，无需引入 Agentic RAG。

9. **多模态生成的技术路径？** — 仅在用户主动触发时执行（Studio 面板的 GenerationOptions 按钮），不在对话中自动运行。
   - **音频**: 从文档提取摘要 → 生成双人对话脚本 → TTS 合成（Edge-TTS 免费，OpenAI TTS 更自然）
   - **思维导图**: LLM 生成 Markdown 大纲 → 前端 Markmap 库渲染为可交互脑图
   - **PPT**: LLM 生成结构化内容 → python-pptx 模板化生成 .pptx 文件

10. **API 响应 ≠ 数据库字段（澄清）** — API 返回的 JSON（如 `{ document_id, filename, chunk_count, status }`、`{ answer, citations: [...] }`）是网络传输的临时响应体，用于前后端通信。持久化数据存储在 SQLite（业务元数据）和 ChromaDB（向量）中。两者格式不同、生命周期不同：API 响应当次请求结束后即消失，数据库记录永久保存。
