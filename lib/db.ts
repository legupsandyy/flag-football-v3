import { PrismaClient } from "@prisma/client";

// Supabase's pooler only allows a handful of connections at once, and every
// serverless function on Vercel opens its own. Keeping each one to a single
// connection stops "too many connections" crashes.
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("connection_limit=")) return url;
  return url + (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=20";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
