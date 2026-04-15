import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@/generated/prisma/client';

type GlobalPrisma = typeof globalThis & {
  __bigBossPrisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
  });
}

export function getPrisma() {
  const globalForPrisma = globalThis as GlobalPrisma;

  if (!globalForPrisma.__bigBossPrisma) {
    globalForPrisma.__bigBossPrisma = createPrismaClient();
  }

  return globalForPrisma.__bigBossPrisma;
}

export function isPrismaDatabaseConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1017'].includes(error.code);
  }

  return error instanceof Error && /can't reach database server|connection refused|econnrefused/i.test(error.message);
}
