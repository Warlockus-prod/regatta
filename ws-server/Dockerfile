# Same pinned base as the web image (multi-arch index digest of
# node:22-alpine); Dependabot (docker) moves it forward weekly.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server.js race-physics.js limits.js ./

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs wsuser
USER wsuser

ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
