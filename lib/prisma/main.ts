import { PrismaClient } from '@prisma/client-main';

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