import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

type GlobalPrisma = typeof globalThis & {
  __awarePrisma?: PrismaClient;
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

  if (!globalForPrisma.__awarePrisma) {
    globalForPrisma.__awarePrisma = createPrismaClient();
  }

  return globalForPrisma.__awarePrisma;
}
