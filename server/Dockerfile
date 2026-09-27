# Build native SQLite dependencies separately from the runtime image.
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace=server --include-workspace-root=false --omit=dev

FROM node:24-bookworm-slim AS server
WORKDIR /app/server
ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/app/data/users.db
COPY --from=dependencies /app/node_modules /app/node_modules
COPY server/package.json ./
COPY server/src ./src
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3001
CMD ["node", "src/index.js"]
