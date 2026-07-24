import { PrismaClient } from "@prisma/client";

// Cliente único de Prisma, reutilizable en toda la app.
//
// En desarrollo, el hot-reload de Next.js reevalúa los módulos y crearía una
// nueva instancia de PrismaClient en cada recarga (agotando las conexiones).
// Para evitarlo, guardamos la instancia en el objeto global.
//
// Este es el único módulo que la Tarea 3 importará para reemplazar el `Map`
// en memoria de conversationStore.ts y la config del BusinessContext.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
