# Multi-stage Dockerfile for the Ticketing API
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* .npmrc* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000), res => process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"
CMD npx prisma migrate deploy && node dist/main.js
