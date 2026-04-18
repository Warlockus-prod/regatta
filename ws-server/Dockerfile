FROM node:22-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js race-physics.js ./

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs wsuser
USER wsuser

ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
