<div align="center">

# EduFlow AI

### AI-powered course development platform

将课程想法转化为结构化 AI Course Blueprint，并通过 Course Workspace 与 Lesson Workspace 持续完成课程设计、单课备课和教学资产导出。

[![Version](https://img.shields.io/badge/version-v0.7.0-3157d5)](https://github.com/RyanBao9527/eduflow-ai/tree/v0.7.0)
![Next.js](https://img.shields.io/badge/Next.js-16-111827?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116+-009688?logo=fastapi)
![Status](https://img.shields.io/badge/status-active_development-f59e0b)

</div>

> [!NOTE]
> **Current Version: v0.7.0 — AI Course Export MVP.** 教师可以把当前查看的教案版本导出为 Word 或 Markdown，并把 PPT 内容结构导出为 Markdown。

## Product Positioning

EduFlow AI 是面向教师、课程研发人员和培训团队的 AI 课程研发平台。它把分散在文档、表格和对话中的课程需求整理为稳定、可扩展的课程结构，让 AI 生成结果不再是一次性文本，而是可以持续编辑和扩展的课程项目资产。

### 解决的问题

- **课程需求缺少结构**：教学目标、学员画像、课时安排和资源需求往往散落在不同工具中。
- **AI 输出难以持续使用**：一次性生成的大纲缺少稳定 ID、项目状态和后续编辑入口。
- **长课程生成成本不稳定**：超大响应容易重复、截断，并消耗不必要的 Token。
- **模型与业务容易耦合**：直接绑定单一模型会增加后续效果和成本比较的改造成本。

### 当前工作流

```text
AI-assisted Course Wizard
→ AI Course Blueprint
→ Save as CourseProject
→ Course Workspace
→ Select a Lesson
→ Lesson Workspace
→ Generate and review ResourceArtifact versions
→ Export the selected version as DOCX or Markdown
```

## Features

| 能力 | 当前实现 |
| --- | --- |
| AI-assisted Course Wizard | 通过本地课程推荐、卡片式学员画像、AI 规划默认值和产品化确认流程完成五步课程创建 |
| AI Course Blueprint | 1–20 课时生成详细蓝图，21–50 课时生成模块、阶段、完整索引与关键课时 |
| Structured AI Output | Prompt v3、JSON Output、Pydantic 校验、重复课时检查和截断保护 |
| Model-agnostic LLM Layer | 统一 LLM Provider 接口，当前接入 DeepSeek，模型信息由环境变量配置 |
| CourseProject | 使用稳定 UUID、`schemaVersion`、状态和生成元数据封装课程资产 |
| Local Persistence | 多个课程项目保存到 localStorage，并兼容迁移旧草稿与 session 蓝图 |
| Course Workspace | 管理课程信息与结构、查看课时资源进度并进入单课备课 |
| Lesson Workspace | 围绕指定课时查看教学目标和模块信息，生成并管理单课教学资源 |
| Lesson-level Resource Generation | 为指定课时生成教师教案或 PPT 课件内容结构 |
| ResourceArtifact | 独立保存资源内容、生成元数据、稳定 UUID 和最近三个版本 |
| Lesson Resource Preview | 在 Lesson Workspace 只读查看最新资源、生成模型、Token 使用和历史版本 |
| Local Resource Export | 将当前查看的教师教案导出为 DOCX/Markdown，将 PPT 内容结构导出为 Markdown |
| Dashboard Management | 展示本地课程项目、状态、更新时间和对应的继续操作入口 |
| Data-loss Protection | 自动保存、显式 Workspace 保存、未保存离开提醒和存储异常回退 |
| Engineering Quality | Vitest、Testing Library、Pytest、ESLint 和 Next.js production build |

## Product Preview

截图将在后续版本随真实产品流程持续补充，并统一存放在 `assets/screenshots/`。

| Dashboard | Course Creation Wizard |
| :---: | :---: |
| **Screenshot placeholder**<br><sub>`assets/screenshots/dashboard.png`</sub> | **Screenshot placeholder**<br><sub>`assets/screenshots/course-wizard.png`</sub> |

| AI Course Blueprint | Course Workspace |
| :---: | :---: |
| **Screenshot placeholder**<br><sub>`assets/screenshots/course-blueprint.png`</sub> | **Screenshot placeholder**<br><sub>`assets/screenshots/course-workspace.png`</sub> |

## Architecture

```mermaid
flowchart LR
    U["Teacher / Course Designer"] --> W["Next.js Web App"]
    W --> D["Dashboard"]
    W --> C["Course Creation Wizard"]
    W --> R["Blueprint Result"]
    W --> CW["Course Workspace"]
    CW --> LW["Lesson Workspace"]
    C --> V["React Hook Form + Zod"]
    D --> P["Versioned CourseProject Store"]
    C --> P
    R --> P
    CW --> P
    LW --> RA["Versioned ResourceArtifact Store"]
    W --> A["FastAPI Backend"]
    A --> S["Course Generation Service"]
    A --> RS["Resource Generation Service"]
    S --> I["LLM Provider Interface"]
    RS --> I
    I --> DS["DeepSeek Provider"]
    I -. "Future providers" .-> F["OpenAI / Gemini / Anthropic"]
```

Next.js 负责课程向导、结果预览、Dashboard、Workspace 与浏览器本地持久化；FastAPI 负责课程生成业务、Prompt、模型调用和结构校验。课程业务只依赖统一的结构化 LLM 接口，不直接绑定 DeepSeek。

### CourseProject 数据边界

```text
CourseProject
├── schemaVersion: "1.0"
├── id / status / timestamps
├── courseBrief
├── coursePlan
└── generation metadata
```

MVP 不使用数据库。CourseProject repository 隔离了存储细节，后续接入持久化 API 时可以保留 Workspace 组件和稳定数据结构。

ResourceArtifact 使用独立的版本化 localStorage repository，通过 `courseProjectId`、`lessonId` 和 `resourceType` 关联课程项目。资源不会嵌入或改写 CourseProject。

### 课程与单课工作台职责

```text
CourseProject
↓
CoursePlan
↓
Lesson
↓
ResourceArtifact
```

- **Course Workspace**：负责课程信息、模块和课时结构管理，以及课时资源进度导航。
- **Lesson Workspace**：负责单课教学准备、按需资源生成、最新结果查看和历史版本切换。

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, App Router, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide Icons |
| Forms & Validation | React Hook Form, Zod |
| Backend | FastAPI, Uvicorn, Pydantic, Pydantic Settings |
| AI Integration | Model-agnostic Provider Protocol, DeepSeek, structured JSON output |
| Persistence | Browser localStorage and sessionStorage compatibility fallback |
| Testing | Vitest, Testing Library, jsdom, Pytest, HTTPX |
| Tooling | pnpm, Python venv, ESLint, Next.js Webpack development server |

## Current Version

### v0.7.0 — AI Course Export MVP

v0.7.0 增加独立的浏览器端 Export Layer，让只读 ResourceArtifact 成为可下载、可继续编辑的教学资产。

Highlights:

- Export the currently selected lesson-plan version as Word or Markdown.
- Export the currently selected slide-outline version as Markdown.
- Preserve ready and superseded ResourceArtifact versions during export.
- Generate files locally without a new API, database, or export record.

Not included:

- PPTX or PDF generation.
- Batch export or cloud storage.
- Database, authentication, RAG, or Agent capabilities.

### v0.6.2 — Course Creation UX Refinement

v0.6.2 聚焦课程创建体验：课程主题优先、渐进补充课程简介，并用“主要学习者、年龄/学习阶段、学习基础”替代易混淆的学员字段语义。

Highlights:

- Topic-first course creation with grouped local topic suggestions.
- Clear timing for course title completion and optional course description disclosure.
- Learner profile cards separate learner identity from learning stage.
- Adult learner defaults that preserve manual choices and legacy drafts.
- No changes to CourseBrief, CourseProject, backend APIs, prompts, or LLM providers.

### v0.6.1 — Course Topic First UX

- Topic-first Step 1 workflow.
- Local course title suggestions and subject recommendations.
- Existing data compatibility preserved.

### v0.6.0 — Lesson Workspace

v0.6.0 将单课资源生成升级为独立的 Lesson Workspace，让教师围绕具体课时完成教学准备，同时保持 CourseProject、CoursePlan、ResourceArtifact 和后端生成 API 兼容。

Highlights:

- Lesson-level preparation workflow and dedicated Lesson Workspace.
- Teacher lesson plan and slide outline generation for a selected lesson.
- Read-only resource result preview with generation metadata.
- ResourceArtifact latest-ready lookup and immutable version history.
- Lightweight Course Workspace lesson navigation and resource status summaries.

Not included:

- Database.
- Authentication.
- Multi-user collaboration.
- PPT file generation.
- Word or Excel export.
- Download and batch generation.
- RAG or Agent capabilities.

## Roadmap

### v0.1.0 — Foundation

- Next.js + FastAPI.
- Course Wizard.
- Basic frontend and backend architecture.

### v0.2.0 — AI Course Blueprint

- LLM Provider abstraction.
- DeepSeek integration.
- Structured course generation.

### v0.2.1 — Resource Planning

- Resource planning model.
- Prompt v3.
- Course-level resource purpose and scope planning.

### v0.3.0 — Course Workspace

- CourseProject architecture.
- Local persistence.
- Editable Course Workspace.
- Dashboard project management.

### v0.4.0 — AI Resource Generation MVP

- Lesson-level teacher lesson plan generation.
- Slide outline generation.
- ResourceArtifact local persistence and version management.
- Read-only Workspace resource preview.

### v0.5.0 — AI Course Wizard UX Upgrade

- Local course recommendations.
- Card-based learner profile selection.
- Smart defaults for AI course planning.
- Productized resource plan and final confirmation flow.
- Existing CourseBrief, CourseProject and generation API compatibility.

### v0.6.0 — Lesson Workspace

- Single-lesson preparation workflow.
- Dedicated Lesson Workspace route and lesson overview.
- Teacher lesson plan and slide outline generation.
- Read-only current and historical ResourceArtifact viewing.
- Course Workspace lesson navigation and resource status summaries.

### v0.6.1 — Course Topic First UX

- Course topic is the primary Step 1 input.
- Local course title suggestion system and subject recommendation rules.
- Existing CourseBrief and CourseProject data compatibility.

### v0.6.2 — Course Creation UX Refinement

- Grouped local topic suggestions and progressive optional description entry.
- Clear course title completion guidance before AI course creation.
- Learner profile semantics that separate identity, learning stage, and foundation.
- Adult-stage defaults that preserve manual choices and legacy drafts.

### v0.7.0 — AI Course Export MVP

- Browser-side DOCX and Markdown export for teacher lesson plans.
- Markdown export for PPT content outlines.
- Exact export of the ResourceArtifact version currently selected in Lesson Workspace.
- No changes to CourseProject, ResourceArtifact, backend APIs, prompts, or LLM providers.

### Next

- **Advanced Export Formats:** PPTX、PDF 和批量导出能力。
- **Knowledge Base / RAG:** 知识检索、来源约束和引用增强。

## Local Development

### Requirements

- Node.js 20.9+
- pnpm 11 或兼容版本
- Python 3.11+

### Clone

```bash
git clone https://github.com/RyanBao9527/eduflow-ai.git
cd eduflow-ai
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

前端默认运行在 [http://localhost:3000](http://localhost:3000)：

- Dashboard：`/dashboard`
- 新建课程：`/courses/new`
- 课程蓝图：`/courses/result?projectId={id}`
- Course Workspace：`/courses/{id}`
- Lesson Workspace：`/courses/{id}/lessons/{lessonId}`

### Backend

在项目根目录执行：

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

- Health check：[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- OpenAPI docs：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Environment Variables

不要提交真实的 `.env` 或 `frontend/.env.local`。

Backend `.env`：

| Variable | Purpose |
| --- | --- |
| `APP_NAME` / `APP_ENVIRONMENT` | FastAPI application configuration |
| `CORS_ORIGINS` | Allowed frontend origins |
| `LLM_PROVIDER` | Active LLM provider identifier |
| `LLM_MODEL` | Model configured for the active provider |
| `LLM_BASE_URL` | Provider API base URL |
| `LLM_API_KEY` | Server-only API key; never expose to the frontend |
| `LLM_REQUEST_TIMEOUT` | Model request timeout |
| `LLM_MAX_OUTPUT_TOKENS` | Maximum completion token budget |
| `LLM_TEMPERATURE` | Structured generation temperature |
| `MAX_GENERATED_JSON_BYTES` | Maximum accepted generated JSON size |

Frontend `frontend/.env.local`：

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` |

### Validation

```bash
# Frontend
cd frontend
pnpm test
pnpm lint
pnpm build

# Backend — from repository root
source .venv/bin/activate
python -m pytest tests/backend -q
```

## Project Structure

```text
EduFlow AI/
├── frontend/
│   ├── app/                       # Next.js routes and pages
│   ├── components/                # Shared layout and UI components
│   ├── features/
│   │   ├── course-wizard/         # Course intake and draft flow
│   │   ├── course-generation/     # AI API, schemas and blueprint result
│   │   ├── course-resources/      # Resource generation, artifacts and read-only results
│   │   ├── course-workspace/      # CourseProject storage, migration and editor
│   │   ├── lesson-workspace/      # Single-lesson preparation and resource workflow
│   │   └── dashboard/             # Local project management
│   ├── tests/                     # Frontend unit and interaction tests
│   └── types/                     # Shared TypeScript types
├── backend/
│   ├── models/                    # Pydantic request and response models
│   ├── routers/                   # FastAPI routes
│   ├── services/                  # Course/resource generation and LLM providers
│   └── prompts/                   # Versioned course and resource prompts
├── tests/backend/                 # Backend regression tests
├── assets/                        # Project screenshots and presentation assets
├── .env.example                   # Backend environment template
└── requirements.txt               # Python dependencies
```

---

<div align="center">
  <strong>EduFlow AI</strong><br />
  <sub>From course idea to structured delivery.</sub>
</div>
