# Prisma + SQLite 多数据库配置指南
（下面的具体的数据只是例子）
## 一、安装依赖

```bash
npm install @prisma/client
npm install -D prisma
```

## 二、创建第一个数据库

### 1. 创建文件夹结构

```
prisma/
└── main/
lib/
└── prisma/
actions/
└── main/
```

### 2. 创建 Schema 文件

**文件：`prisma/main/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/@prisma/client-main"
}

datasource db {
  provider = "sqlite"
  url      = env("MAIN_DATABASE_URL")
}

model SAW_Item {
  id                Int       @id @default(autoincrement())
  name              String?
  description       String?
  type_id           Int?
  DesignParameter   Json?
  Fabrication_date  DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  isActive          Boolean   @default(true)
  type              SAW_Type? @relation(fields: [type_id], references: [id])
}

model SAW_Type {
  id          Int        @id @default(autoincrement())
  name        String
  description String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  isActive    Boolean    @default(true)
  SAW_Items   SAW_Item[]
}
```

### 3. 配置环境变量

**文件：`.env`**

```env
ONEDRIVE_BASE_PATH="C:/Users/YOUR_USERNAME/OneDrive"
```

**文件：`.env.example`**

```env
ONEDRIVE_BASE_PATH="C:/Users/YOUR_USERNAME/OneDrive"
```

**说明：**
- 只需要配置 `ONEDRIVE_BASE_PATH`
- `MAIN_DATABASE_URL` 会自动组合为：`file:{ONEDRIVE_BASE_PATH}/001shared/saw-rfid-project/databases/main.db`
- `RAW_DATA_BASE_PATH` 会自动设置为 `ONEDRIVE_BASE_PATH` 的值
- 其他路径都会在代码运行时自动生成，不需要在 `.env` 文件中配置

### 4. 创建 OneDrive 文件夹

```
C:\Users\YOUR_USERNAME\OneDrive\001shared\saw-rfid-project\databases\
```

### 5. 执行迁移

```bash
npx prisma migrate dev --name init --schema=./prisma/main/schema.prisma
```

### 6. 创建 Prisma Client 实例

**文件：`lib/prisma/main.ts`**

```typescript
import { PrismaClient } from '@prisma/client-main';

// Auto-generate database paths from base OneDrive path
if (process.env.ONEDRIVE_BASE_PATH) {
  const basePath = process.env.ONEDRIVE_BASE_PATH;
  process.env.MAIN_DATABASE_URL = `file:${basePath}/001shared/saw-rfid-project/databases/main.db`;
  process.env.RAW_DATA_BASE_PATH = basePath;
}

const globalForPrisma = globalThis as unknown as {
  prismaMain: PrismaClient | undefined;
};

export const prismaMain = globalForPrisma.prismaMain ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaMain = prismaMain;
}

export async function disconnectMainDb() {
  await prismaMain.$disconnect();
}
```

**说明：**
- 在创建 PrismaClient 之前，会自动从 `ONEDRIVE_BASE_PATH` 组合生成完整的数据库路径
- 这样每台电脑只需要配置 `ONEDRIVE_BASE_PATH`，其他路径自动生成

### 7. 创建 Server Actions

**文件：`actions/main/saw-actions.ts`**

**编写规则：**

1. **文件开头声明 `'use server'`**
2. **导入对应数据库的 Prisma Client**：`import { prismaMain } from '@/lib/prisma/main'`
3. **每个函数对应一个数据库操作**：
   - 查询：`prismaMain.模型名.findMany()` / `findUnique()` / `findFirst()`
   - 创建：`prismaMain.模型名.create({ data })`
   - 更新：`prismaMain.模型名.update({ where, data })`
   - 删除：`prismaMain.模型名.delete({ where })` 或软删除用 `update`
4. **模型名对应 schema 中的 model 名称**（注意大小写）
5. **使用 try-catch 包裹，返回统一格式**：`{ success: boolean, data/error }`
6. **修改数据后调用 `revalidatePath('/')` 刷新缓存**
7. **函数参数类型根据 schema 字段定义**：可选字段用 `?`，必填字段不加

**常用 Prisma 查询方法：**
- `findMany()` - 查询多条
- `findUnique()` - 根据唯一字段查询
- `create()` - 创建
- `update()` - 更新
- `delete()` - 删除
- `where` - 过滤条件
- `include` - 包含关联表数据
- `orderBy` - 排序
- `select` - 选择特定字段

## 三、修改 Schema（迁移操作）

### 1. 编辑 `prisma/main/schema.prisma`

添加字段或新表

### 2. 执行迁移

```bash
npx prisma migrate dev --name migration_description --schema=./prisma/main/schema.prisma
```

## 四、添加第二个数据库

### 1. 创建文件夹和文件

```
prisma/
└── warehouse/
    └── schema.prisma
lib/
└── prisma/
    └── warehouse.ts
actions/
└── warehouse/
    └── inventory-actions.ts
```

### 2. 配置 Schema

**文件：`prisma/warehouse/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/@prisma/client-warehouse"
}

datasource db {
  provider = "sqlite"
  url      = env("WAREHOUSE_DATABASE_URL")
}

model Inventory {
  id       Int      @id @default(autoincrement())
  itemName String
  quantity Int
  location String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3. 添加环境变量

**无需添加**（会自动从 `ONEDRIVE_BASE_PATH` 生成）

如果需要，可以在 `lib/prisma/warehouse.ts` 中添加类似的路径生成逻辑

### 4. 执行迁移

```bash
npx prisma migrate dev --name init --schema=./prisma/warehouse/schema.prisma
```

### 5. 创建 Prisma Client

**文件：`lib/prisma/warehouse.ts`**

```typescript
import { PrismaClient } from '@prisma/client-warehouse';

const globalForPrisma = globalThis as unknown as {
  prismaWarehouse: PrismaClient | undefined;
};

export const prismaWarehouse = globalForPrisma.prismaWarehouse ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaWarehouse = prismaWarehouse;
}
```

### 6. 创建 Server Actions

**文件：`actions/warehouse/inventory-actions.ts`**

按照第二步第7条的规则编写，主要区别：
- 导入 `prismaWarehouse` 而不是 `prismaMain`
- 模型名根据 `warehouse/schema.prisma` 中定义的 model 名称

## 五、常用命令

```bash
# 生成 Prisma Client
npx prisma generate --schema=./prisma/main/schema.prisma

# 创建并应用迁移
npx prisma migrate dev --name description --schema=./prisma/main/schema.prisma

# 打开数据库管理界面
npx prisma studio --schema=./prisma/main/schema.prisma

# 同步 schema（不创建迁移记录）
npx prisma db push --schema=./prisma/main/schema.prisma

# 重置数据库（删除所有数据）
npx prisma migrate reset --schema=./prisma/main/schema.prisma
```

## 六、多设备使用注意事项

### OneDrive 同步规则

1. 只能在一台电脑上使用（不能同时）
2. 切换前完全关闭应用
3. 等待 OneDrive 同步完成
4. 确认无 `.db-journal` 或 `.db-wal` 文件

### 新电脑首次使用

1. 克隆项目
2. `npm install`
3. 复制 `.env.example` 到 `.env`
4. 修改 `.env` 中的 `ONEDRIVE_BASE_PATH`（将 YOUR_USERNAME 改为实际用户名）
5. 等待 OneDrive 同步数据库文件
6. `npx prisma generate --schema=./prisma/main/schema.prisma`

## 七、.gitignore 配置

确保包含：

```gitignore
# env files
.env*
!.env.example

# database files
*.db
*.db-journal
*.db-wal
```

## 八、项目结构

```
saw-rfid/
├── actions/
│   ├── main/
│   │   └── saw-actions.ts
│   └── warehouse/
│       └── inventory-actions.ts
├── app/
│   ├── page.tsx
│   └── layout.tsx
├── lib/
│   ├── prisma/
│   │   ├── main.ts
│   │   └── warehouse.ts
│   └── utils.ts
├── prisma/
│   ├── main/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── warehouse/
│       ├── schema.prisma
│       └── migrations/
├── .env
├── .env.example
└── .gitignore
```

## 九、页面中使用示例

```typescript
import { getSAWItems, createSAWItem } from '@/actions/main/saw-actions';

// 获取数据
const result = await getSAWItems();
if (result.success) {
  console.log(result.data);
}

// 创建数据
const newItem = await createSAWItem({
  name: 'Item 1',
  description: 'Description',
  Fabrication_date: new Date(),
});
```

