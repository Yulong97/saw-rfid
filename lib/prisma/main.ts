import { PrismaClient } from '@/lib/generated/client-main';
import path from 'path';

// 根据 ONEDRIVE_BASE_PATH 生成 SQLite 连接 URL（统一使用正斜杠，避免 Windows 路径解析问题）
function getMainDatabaseUrl(): string | undefined {
  const basePath = process.env.ONEDRIVE_BASE_PATH;
  if (!basePath) {
    return process.env.MAIN_DATABASE_URL;
  }

  const dbPath = path.join(
    basePath,
    '001shared',
    'saw-rfid-project',
    'databases',
    'main.db'
  );

  return `file:${dbPath.replace(/\\/g, '/')}`;
}

const databaseUrl = getMainDatabaseUrl();

if (databaseUrl) {
  process.env.MAIN_DATABASE_URL = databaseUrl;
}

if (process.env.ONEDRIVE_BASE_PATH) {
  process.env.RAW_DATA_BASE_PATH = process.env.ONEDRIVE_BASE_PATH;
}

// 开发模式下避免重复实例；URL 变化时重建 Client，防止热重载仍指向旧路径
const globalForPrisma = globalThis as unknown as {
  prismaMain: PrismaClient | undefined;
  prismaMainDatabaseUrl: string | undefined;
};

const cachedUrl = globalForPrisma.prismaMainDatabaseUrl;
if (
  globalForPrisma.prismaMain &&
  cachedUrl &&
  databaseUrl &&
  cachedUrl !== databaseUrl
) {
  void globalForPrisma.prismaMain.$disconnect();
  globalForPrisma.prismaMain = undefined;
}

export const prismaMain =
  globalForPrisma.prismaMain ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaMain = prismaMain;
  globalForPrisma.prismaMainDatabaseUrl = databaseUrl;
}

// Helper function to disconnect (useful for cleanup)
export async function disconnectMainDb() {
  await prismaMain.$disconnect();
}