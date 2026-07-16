# EduFlow AI

EduFlow AI 是一个面向教师、课程研发人员和培训团队的 AI 课程研发工作台。本仓库当前完成 Sprint 2：前后端项目骨架、Dashboard、新建课程五步向导和本地草稿。

## 当前范围

- Next.js App Router、TypeScript、Tailwind CSS 和 shadcn/ui 基础配置
- Dashboard Mock 数据、统计卡片、课程卡片和最近导出
- 新建课程五步向导、React Hook Form、Zod 校验和 localStorage 草稿恢复
- 工作台会读取当前设备上的课程草稿，并支持从课程卡片继续编辑
- FastAPI、Pydantic Settings、CORS 和 `GET /health`
- 不包含 AI 课程生成、课程数据库、登录、支付、RAG、团队协作或复杂 Agent

## 环境要求

- Node.js 20.9 或更高版本
- pnpm 11 或兼容版本
- Python 3.11 或更高版本

## 启动前端

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

访问 `http://localhost:3000`，根路径会自动跳转到 `/dashboard`。新建课程向导位于 `http://localhost:3000/courses/new`。

## 启动后端

在项目根目录执行：

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

健康检查地址：`http://127.0.0.1:8000/health`

FastAPI 接口文档：`http://127.0.0.1:8000/docs`

## 运行检查

前端：

```bash
cd frontend
pnpm lint
pnpm test
pnpm build
```

后端：

```bash
source .venv/bin/activate
python -m pytest tests/backend
```

## 环境变量

- 后端：复制根目录 `.env.example` 为 `.env`
- 前端：复制 `frontend/.env.local.example` 为 `frontend/.env.local`
- Sprint 2 不会读取或调用模型 API；AI 变量仅作为后续 Sprint 的占位配置

## 本地课程草稿

- localStorage 键：`eduflow.course-wizard.draft.v1`
- 草稿仅保存在当前浏览器和当前设备
- 可以在向导页面清除草稿；清除前会要求确认
- 最终确认只保存课程需求，不会请求课程生成或 AI API；已保存的课程需求会出现在工作台的最近课程中
