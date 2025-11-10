# ---- Build Stage ----
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Copy manifest first
COPY package.json package-lock.json* yarn.lock* .npmrc* ./

# Copy prisma BEFORE npm ci so @prisma/client postinstall can run
COPY prisma ./prisma

# Install deps (postinstall will find schema now)
RUN npm ci --legacy-peer-deps

# (Re)generate Prisma client explicitly (harmless if already done)
RUN npx prisma generate

# Copy source and build Nest
COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-bullseye-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production HOST=0.0.0.0
RUN apt-get update && apt-get install -y ca-certificates openssl && rm -rf /var/lib/apt/lists/*

# Bring runtime artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Add entrypoint that runs migrations then starts Node
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000), r=>process.exit(r.statusCode>=200&&r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

EXPOSE 3000
ENTRYPOINT ["/app/start.sh"]
