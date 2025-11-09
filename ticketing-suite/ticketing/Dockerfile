# ---- Build Stage ----
FROM node:20-bullseye-slim AS build
WORKDIR /app

# 1) Install deps first (cache-friendly)
COPY package.json package-lock.json* yarn.lock* .npmrc* ./
RUN npm ci --legacy-peer-deps

# 2) Generate Prisma client BEFORE building NestJS
COPY prisma ./prisma
RUN npx prisma generate

# 3) Copy source and compile
COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-bullseye-slim AS runtime
WORKDIR /app

# Environment (Railway injects env vars, we just set sensible defaults)
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000

# TLS certs for Neon/Upstash connections
RUN apt-get update && apt-get install -y ca-certificates openssl && rm -rf /var/lib/apt/lists/*

# Bring only what we need to run
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000), r => process.exit(r.statusCode>=200 && r.statusCode<500?0:1)).on('error', () => process.exit(1))"

EXPOSE 3000

# Run DB migrations on startup, then launch NestJS
# (Your build output is dist/src/main.js per your logs)
CMD sh -c "npx prisma migrate deploy && node dist/src/main.js"



