# syntax=docker/dockerfile:1.7
# Build context: repository root (npm workspaces monorepo).

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --workspace shared --include-workspace-root
COPY shared shared
COPY server server
RUN npm run build -w server

# ---------- runtime ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/server/dist server/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["node", "server/dist/server.js"]
