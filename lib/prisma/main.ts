import { PrismaClient } from '@prisma/client-main';

// Auto-generate database paths from base OneDrive path
if (process.env.ONEDRIVE_BASE_PATH) {
  const basePath = process.env.ONEDRIVE_BASE_PATH;
  process.env.MAIN_DATABASE_URL = `file:${basePath}/001shared/saw-rfid-project/databases/main.db`;
  process.env.RAW_DATA_BASE_PATH = basePath;
}

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prismaMain: PrismaClient | undefined;
};

export const prismaMain = globalForPrisma.prismaMain ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaMain = prismaMain;
}

// Helper function to disconnect (useful for cleanup)
export async function disconnectMainDb() {
  await prismaMain.$disconnect();
}