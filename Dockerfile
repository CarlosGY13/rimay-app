# syntax=docker/dockerfile:1

# ============================================================
# Rimay - imagen Next.js multi-stage
# Basada en la versión de Node que ya usa el proyecto (Node 18).
# Usa el output "standalone" de Next para una imagen final liviana,
# lista para desplegar en ECR/ECS Fargate más adelante.
# ============================================================

# ---- Stage 1: deps (instala dependencias con el lockfile) ----
FROM node:18-alpine AS deps
# libc6-compat mejora la compatibilidad de algunos binarios nativos en Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: builder (compila la app) ----
FROM node:18-alpine AS builder
WORKDIR /app
# openssl es necesario para los motores de Prisma en Alpine.
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Genera el Prisma Client para que el type-check de `next build` encuentre
# los tipos de @prisma/client (lo importa lib/db.ts). La app todavía no lo usa
# en runtime; eso llega en la Tarea 3.
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: runner (imagen final de producción) ----
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no privilegiado para el proceso final.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copia solo lo necesario del build standalone.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Escuchar en todas las interfaces para que sea alcanzable desde el host/red Docker.
ENV HOSTNAME=0.0.0.0

# El output standalone genera server.js en la raíz.
CMD ["node", "server.js"]
