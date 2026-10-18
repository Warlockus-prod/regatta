# ---- Build stage ----
FROM node:22-alpine AS builder
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
FROM node:22-alpine AS runner
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

# Copy standalone output (includes node_modules with compiled native addons)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Event retention job (docs/OPS.md), run with `docker exec regatta node
# scripts/prune-events.mjs --dry-run`; uses the traced better-sqlite3 above.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/prune-events.mjs ./scripts/prune-events.mjs

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
