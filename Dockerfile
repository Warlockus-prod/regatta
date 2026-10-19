# Base image pinned to the multi-arch index digest of node:22-alpine, so a
# rebuild of the same commit uses the same base. Dependabot (docker) moves the
# digest forward weekly; keep both stages on the same digest.
# ---- Build stage ----
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS builder
WORKDIR /app

# Build deps for better-sqlite3 native binding
RUN apk add --no-cache python3 make g++ gcc

# Install dependencies (use lockfile)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir /data \
 && chown nextjs:nodejs /data

# Copy standalone output (includes node_modules with compiled native addons).
# The code stays owned by root: the runtime user can read it but not rewrite
# it, even when the container runs without a read-only root filesystem. The
# app writes only to /data (the volume) and the Next.js cache below.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Event retention job (docs/OPS.md), run with `docker exec regatta node
# scripts/prune-events.mjs --dry-run`; uses the traced better-sqlite3 above.
COPY --from=builder /app/scripts/prune-events.mjs ./scripts/prune-events.mjs

# The only writable path under /app. Prod mounts a tmpfs here (read-only root
# filesystem, ops/deploy/compose.yml); this directory serves local runs.
RUN mkdir -p /app/.next/cache && chown nextjs:nodejs /app/.next/cache

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
