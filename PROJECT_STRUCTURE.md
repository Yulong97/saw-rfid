# saw-rfid 项目目录结构说明

> 科研项目管理 Web 应用 — 基于 Next.js 16 + React 19 + Prisma (SQLite) + shadcn/ui  
> 最后扫描时间：2026-06-24

---

## 项目概览

这是一个面向 **SAW-RFID 科研** 的项目管理 Web 应用，主要功能包括：

| 模块 | 路由 | 状态 |
|------|------|------|
| SAW 器件管理 | `/` | ✅ 已实现 |
| 数据/文件管理 | `/data-management` | ✅ 已实现 |
| Obsidian 笔记浏览 | `/obsidian-notes` | ✅ 已实现 |
| 实验管理 | `/experiments/*` | ⏳ 侧边栏占位，未实现 |
| 文献管理 | `/literature/*` | ⏳ 侧边栏占位，未实现 |
| RLC 谐振计算 | `/RLC-calculator` | ⏳ 侧边栏占位，未实现 |
| 全局搜索 / 设置 | `/search`, `/settings` | ⏳ 侧边栏占位，未实现 |

**数据存储策略**：数据库和原始数据文件存放在 OneDrive 同步目录，通过 `.env` 中的 `ONEDRIVE_BASE_PATH` 统一配置，便于多设备同步（需避免同时写入）。

---

## 目录树（核心部分）

```
saw-rfid/
├── app/                    # Next.js App Router 页面与 API
├── actions/                # Server Actions（服务端业务逻辑）
├── components/             # React 组件
├── hooks/                  # 自定义 React Hooks
├── lib/                    # 工具库与 Prisma 客户端
├── prisma/                 # 数据库 Schema 与迁移
├── public/                 # 静态资源
├── aaa/                    # 空目录（无内容，可忽略或删除）
├── .env / .env.example     # 环境变量
├── next.config.ts          # Next.js 配置
├── package.json            # 依赖与脚本
└── *.md                    # 项目文档
```

---

## 各目录详细说明

### `app/` — 页面路由与 API 入口

Next.js App Router 的核心目录，决定 URL 与页面/API 行为。

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `app/layout.tsx` | 根布局：侧边栏、字体、全局容器 | 影响**所有页面**的外壳结构；改错会导致全站布局异常 |
| `app/page.tsx` | 首页：SAW 类型与 SAW 器件 CRUD | 改动影响器件管理 UI 与交互 |
| `app/globals.css` | 全局 Tailwind / CSS 变量 | 改动影响全站样式主题 |
| `app/data-management/page.tsx` | 数据管理页：文件上传、同步、预览、下载 | 改动影响 OneDrive 原始数据的管理功能 |
| `app/obsidian-notes/page.tsx` | 笔记列表：分页、文件夹筛选、搜索 | 改动影响 Obsidian 笔记浏览入口 |
| `app/obsidian-notes/[path]/page.tsx` | 单篇笔记详情：Markdown + KaTeX 渲染 | 改动影响笔记阅读体验、图片/公式显示 |
| `app/obsidian-notes/search/page.tsx` | 笔记搜索页 | 改动影响搜索 UI 与结果展示 |
| `app/api/download/route.ts` | 文件下载 API | 改动影响数据管理模块的下载功能 |
| `app/api/preview/route.ts` | 文件预览 API（文本/图片/视频等） | 改动影响 `FilePreview` 组件的预览能力 |
| `app/api/stream/route.ts` | 大文件流式传输 API | 改动影响视频/大文件的在线播放 |
| `app/api/obsidian-image/route.ts` | Obsidian 笔记内嵌图片代理 | 改动影响笔记中图片能否正常显示 |

**注意**：侧边栏中大量链接（实验、文献、RLC 计算器等）在 `app/` 下**尚无对应页面**，点击会 404。

---

### `actions/` — Server Actions（服务端业务逻辑）

使用 `'use server'` 标记，供前端页面直接调用，运行在 Node.js 服务端。

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `actions/main/saw-actions.ts` | SAW 类型/器件的增删查，操作 `SAW_Type` / `SAW_Item` 表 | 改动影响首页器件管理；需配合 `prisma/schema` 字段一致 |
| `actions/main/data-management-actions.ts` | 数据记录 CRUD、目录扫描同步、文件上传/下载 | 改动影响数据管理页全部功能；路径硬编码为 `001shared/saw-rfid-project/raw_data/test` |
| `actions/main/obsidian-actions.ts` | 读取 Obsidian 目录、解析 Markdown、搜索笔记 | 改动影响笔记模块；默认读取 `OBSIDIAN_BASE_PATH` 或硬编码 OneDrive 路径 |

**改动原则**：此处是业务核心，改数据库操作或文件路径时，需同步检查 `app/api/` 中的对应逻辑是否一致。

---

### `components/` — UI 组件

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `components/app-sidebar.tsx` | 左侧导航菜单（含未实现功能的链接） | 改动影响全站导航结构 |
| `components/breadcrumb-nav.tsx` | 面包屑导航及预设配置 `breadcrumbConfigs` | 改动影响各页面顶部路径显示 |
| `components/file-preview.tsx` | 文件预览弹窗（调用 preview/stream API） | 改动影响数据管理中的预览体验 |
| `components/ui/*` | shadcn/ui 基础组件（Button、Dialog、Table 等约 40+ 个） | 通常**不要直接改**；通过 `npx shadcn@latest add` 管理；局部样式调整影响对应组件外观 |

---

### `hooks/` — 自定义 Hooks

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `hooks/use-mobile.ts` | 检测是否为移动端（断点 768px） | 改动影响 `Sidebar` 等响应式组件的行为 |

---

### `lib/` — 工具与基础设施

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `lib/utils.ts` | `cn()` 工具函数（合并 Tailwind 类名） | 全项目通用，极少需要改动 |
| `lib/prisma/main.ts` | Prisma 客户端单例；根据 `ONEDRIVE_BASE_PATH` 自动生成 `MAIN_DATABASE_URL` | **关键文件**：改动影响所有数据库访问；数据库路径为 `{ONEDRIVE}/001shared/saw-rfid-project/databases/main.db` |

---

### `prisma/` — 数据库定义与迁移

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `prisma/main/schema.prisma` | 数据模型定义（SQLite） | 改动后需执行 `npx prisma migrate dev`；会影响 `@prisma/client-main` 生成结果 |
| `prisma/main/migrations/` | 历史迁移 SQL | **不要手动改**已有迁移；新变更应新建迁移 |
| `prisma/main/migrations/migration_lock.toml` | 迁移锁（provider = sqlite） | 一般不动 |

**当前数据模型**：

- `SAW_Type` — SAW 器件类型
- `SAW_Item` — SAW 器件实例（含 `DesignParameter` JSON、`Fabrication_date`）
- `data_management` — 数据/文件管理记录（关联 OneDrive 相对路径）

详细配置说明见 `PRISMA_SETUP_GUIDE.md`。

---

### `public/` — 静态资源

| 路径 | 用途 | 改动影响 |
|------|------|----------|
| `public/*.svg` | 默认图标（file、window、vercel） | 可通过 URL 直接访问；替换不影响业务逻辑 |

---

### `aaa/` — 空目录

目前无任何文件，可能是临时测试目录。**可安全删除**，不影响项目运行。

---

## 根目录配置文件

| 文件 | 用途 | 改动影响 |
|------|------|----------|
| `.env` | 本地环境变量（**不提交 Git**） | 必须配置 `ONEDRIVE_BASE_PATH`；改错会导致数据库/文件路径找不到 |
| `.env.example` | 环境变量模板 | 仅文档用途，不影响运行 |
| `next.config.ts` | Next.js 配置（如 Server Actions 100MB 体限制） | 改动影响构建行为与大文件上传 |
| `package.json` | 依赖与 npm 脚本 | 改动依赖需 `npm install`；`postinstall` 会自动 `prisma generate` |
| `tsconfig.json` | TypeScript 配置 | 改动影响类型检查与路径别名 `@/*` |
| `components.json` | shadcn/ui 组件生成配置 | 改动影响 `shadcn add` 命令的输出路径 |
| `eslint.config.mjs` | ESLint 规则 | 改动影响代码检查 |
| `postcss.config.mjs` | PostCSS / Tailwind 处理 | 改动影响 CSS 编译 |
| `.gitignore` | Git 忽略规则 | 改动影响哪些文件被跟踪 |
| `.cursorignore` | Cursor IDE 忽略规则 | 改动影响 AI 索引范围 |

---

## 根目录文档文件

| 文件 | 内容 |
|------|------|
| `README.md` | Next.js 默认说明（较简略） |
| `PRISMA_SETUP_GUIDE.md` | Prisma + SQLite + OneDrive 多设备配置完整指南 |
| `BREADCRUMB_OPTIMIZATION.md` | 面包屑导航优化记录 |
| `OPTIMIZATION_PROPOSAL.md` | 性能/架构优化提案 |
| `PROJECT_STRUCTURE.md` | 本文件 — 目录结构说明 |

---

## 外部数据路径（非项目内目录）

这些路径不在代码仓库中，由环境变量和代码动态拼接：

```
{ONEDRIVE_BASE_PATH}/
├── 001shared/saw-rfid-project/
│   ├── databases/
│   │   └── main.db              ← SQLite 主数据库
│   └── raw_data/
│       └── test/                ← 数据管理模块的文件存储目录
└── obsidian/Obsidian_Yulong/    ← Obsidian 笔记库（可通过 OBSIDIAN_BASE_PATH 覆盖）
```

| 改动场景 | 影响 |
|----------|------|
| 修改 `.env` 中 `ONEDRIVE_BASE_PATH` | 数据库和原始数据读写位置全部改变 |
| 修改 `lib/prisma/main.ts` 中的路径拼接 | 数据库位置改变，需迁移 `main.db` |
| 修改 `data-management-actions.ts` 中 `RAW_DATA_RELATIVE_PATH` | 文件管理扫描/存储目录改变 |
| 修改 `obsidian-actions.ts` / `obsidian-image/route.ts` 中的 Obsidian 路径 | 笔记模块读取的笔记库改变 |

**多设备注意**：`.env.example` 说明同一时刻只应在一台设备上运行应用，并等待 OneDrive 同步完成后再切换设备，避免 SQLite 并发写入损坏。

---

## 技术栈速查

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix) |
| 数据库 | Prisma 6 + SQLite（存于 OneDrive） |
| Markdown | react-markdown, remark-gfm, remark-math, rehype-katex |
| 表单/校验 | react-hook-form, zod |
| 图表 | recharts |
| 通知 | sonner |

---

## 常用 npm 脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run lint         # ESLint 检查
# postinstall 自动执行: prisma generate --schema=prisma/main/schema.prisma
```

数据库迁移（修改 schema 后）：

```bash
npx prisma migrate dev --schema=prisma/main/schema.prisma
```

---

## 改动风险等级参考

| 风险 | 目录/文件 | 说明 |
|------|-----------|------|
| 🔴 高 | `prisma/main/schema.prisma`, `lib/prisma/main.ts`, `.env` | 影响数据持久化与路径，可能导致数据丢失或找不到 |
| 🔴 高 | `actions/main/data-management-actions.ts` | 涉及文件系统读写，路径错误可能写到错误位置 |
| 🟡 中 | `app/api/*`, `actions/main/*` | 影响对应功能模块的 API 行为 |
| 🟡 中 | `app/layout.tsx`, `components/app-sidebar.tsx` | 影响全站布局与导航 |
| 🟢 低 | `components/ui/*` | 组件库，局部 UI 调整 |
| 🟢 低 | `public/`, `hooks/`, `lib/utils.ts` | 影响范围小 |
| ⚪ 无 | `aaa/`, `*.md` 文档 | 不影响运行 |

---

## 快速恢复记忆：数据流

```
用户浏览器
    │
    ├─► app/page.tsx ──────────► actions/main/saw-actions.ts ──► lib/prisma/main.ts ──► main.db
    │
    ├─► app/data-management/ ──► actions/main/data-management-actions.ts ──► main.db + OneDrive/raw_data
    │                         └─► app/api/download|preview|stream
    │
    └─► app/obsidian-notes/ ───► actions/main/obsidian-actions.ts ──► OneDrive/Obsidian 目录
                              └─► app/api/obsidian-image
```

---

*如需补充新模块，建议遵循现有模式：`prisma/schema` → `actions/main/` → `app/xxx/page.tsx` → 在 `app-sidebar.tsx` 添加导航。*
