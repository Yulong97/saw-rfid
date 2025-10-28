# 面包屑导航优化

## 概述

已成功为项目的主要页面添加了面包屑导航，提升了用户体验和页面导航的清晰度。

## 实现的功能

### 1. 通用面包屑组件 (`components/breadcrumb-nav.tsx`)

创建了一个可复用的面包屑导航组件，支持：
- 自定义面包屑项目
- 图标支持
- 链接和当前页面状态
- 响应式设计

### 2. 预定义配置

提供了常用页面的面包屑配置：
- `breadcrumbConfigs.home` - 主页
- `breadcrumbConfigs.dataManagement` - 数据管理页面
- `breadcrumbConfigs.obsidianNotes` - Obsidian笔记页面
- `breadcrumbConfigs.noteDetail()` - 笔记详情页面（动态配置）

### 3. 页面优化

已为以下页面添加面包屑导航：

#### 主页 (`app/page.tsx`)
```
主页 > SAW RFID 系统
```

#### 数据管理页面 (`app/data-management/page.tsx`)
```
主页 > 数据管理 > 文件管理
```

#### Obsidian笔记页面 (`app/obsidian-notes/page.tsx`)
```
主页 > 笔记管理 > 笔记浏览
```

#### 笔记详情页面 (`app/obsidian-notes/[path]/page.tsx`)
```
主页 > 笔记管理 > 笔记浏览 > [笔记标题]
```

## 使用方法

### 基本用法

```tsx
import { BreadcrumbNav, breadcrumbConfigs } from '@/components/breadcrumb-nav';

// 使用预定义配置
<BreadcrumbNav items={breadcrumbConfigs.home} />

// 自定义配置
<BreadcrumbNav 
  items={[
    { label: '主页', href: '/', icon: Home },
    { label: '当前页面' }
  ]} 
/>
```

### 自定义面包屑项目

```tsx
interface BreadcrumbItem {
  label: string;        // 显示文本
  href?: string;        // 链接地址（可选）
  icon?: React.ComponentType<{ className?: string }>; // 图标组件（可选）
}
```

## 设计特点

1. **一致性**: 所有页面使用统一的面包屑样式和交互
2. **可访问性**: 支持屏幕阅读器和键盘导航
3. **响应式**: 在不同屏幕尺寸下都能正常显示
4. **图标支持**: 每个面包屑项目都可以配置图标
5. **链接状态**: 自动区分可点击链接和当前页面

## 技术实现

- 基于 shadcn/ui 的 Breadcrumb 组件
- 使用 Lucide React 图标库
- TypeScript 类型安全
- 支持 Next.js 路由

## 未来扩展

可以轻松添加更多页面的面包屑配置，如：
- 实验管理页面
- 文献管理页面
- 设置页面
- 搜索结果页面

只需要在 `breadcrumbConfigs` 中添加新的配置即可。
