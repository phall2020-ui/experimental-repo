# Multi-stage Dockerfile for the Ticketing Dashboard
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
