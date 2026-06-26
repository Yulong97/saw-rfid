# 项目优化建议 (Project Optimization Proposal)

基于对 `saw-rfid` 项目的分析，以下是针对架构、性能、代码质量和用户体验的优化建议。

## 1. 架构优化：采用 React Server Components (RSC)

**当前状态**: 
- `app/page.tsx` 标记为 `'use client'`。
- 使用 `useEffect` 在组件挂载后发起异步请求获取数据。
- 页面加载流程：下载 HTML -> 下载 JS -> 执行 JS -> 请求数据 -> 渲染内容。

**问题**:
- **首屏延迟**: 用户需要等待多次往返才能看到数据。
- **客户端负担**: 所有数据获取逻辑都在客户端执行。

**建议**:
- **重构为 Server Component**: 移除 `app/page.tsx` 的 `'use client'`。
- **服务端直接获取**: 在组件主体中直接 `await` 数据库查询或 Server Actions。
- **组件拆分**: 将交互部分（如“添加类型”、“添加项目”的弹窗和表单）拆分为独立的 Client Components (e.g., `SAWTypeManager.tsx`, `SAWItemManager.tsx`)。

**预期效果**:
- 页面加载速度显著提升（First Contentful Paint）。
- 减少客户端 JavaScript 体积。

## 2. 表单处理优化：引入 React Hook Form + Zod

**当前状态**: 
- 使用多个 `useState` (`typeName`, `typeDescription`, `itemName`...) 管理表单。
- 手动编写验证逻辑（如 `if (!typeName.trim()) ...`）。
- JSON 参数通过 `JSON.parse` 手动校验。

**问题**:
- **代码冗余**: 随着表单项增加，state 和 handler 数量爆炸。
- **性能问题**: 每次键盘输入都会触发整个组件重新渲染。
- **验证脆弱**: 难以处理复杂的验证规则。

**建议**:
- **采用 React Hook Form**: 利用其非受控组件模式，减少渲染次数。
- **集成 Zod**: 定义严格的 Schema（特别是针对 `DesignParameter`），自动处理类型推断和错误消息。
- **示例**:
  ```typescript
  const sawItemSchema = z.object({
    name: z.string().min(1, "名称不能为空"),
    designParameter: z.string().refine((val) => {
      try { JSON.parse(val); return true; } catch { return false; }
    }, "必须是有效的 JSON 格式")
  });
  ```

## 3. 类型安全与数据一致性

**当前状态**: 
- `SAWItem` 接口中 `DesignParameter` 定义为 `any`。
- 数据库中存储为 JSON，但代码层面缺乏结构约束。

**建议**:
- **定义强类型接口**: 不要使用 `any`，为 `DesignParameter` 定义具体的 TypeScript 接口。
- **运行时验证**: 在保存到数据库前，使用 Zod 确保 JSON 结构符合预期。

## 4. 目录结构与代码组织

**当前状态**: 
- `components` 目录下文件较多且扁平。
- `app/page.tsx` 文件较大（400+ 行），包含多个 Modal 和 Card 逻辑。

**建议**:
- **按功能分组**: 
  - `components/features/saw/`: 存放 SAW 相关的特定组件。
  - `components/ui/`: 存放通用 UI 组件（已存在）。
- **拆分大文件**: 将 `app/page.tsx` 中的 Dialog 和 Card 内容提取为子组件。

## 5. 开发者体验 (DX)

**建议**:
- **Prettier**: 确保项目配置了 Prettier 并与 ESLint 集成，保持代码风格统一。
- **路径别名**: 继续充分利用 `@/` 别名，避免相对路径地狱（目前已使用，保持即可）。

---

## 实施路线图

1.  **第一阶段**: 安装并配置 `zod` (已安装) 和 `react-hook-form` (已安装)，重构 `app/page.tsx` 中的表单。
2.  **第二阶段**: 将 `app/page.tsx` 拆分为 Server Component (数据获取) + Client Component (交互)。
3.  **第三阶段**: 完善 `DesignParameter` 的类型定义和校验。
