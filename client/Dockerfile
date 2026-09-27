# ── Client build ─────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
RUN npm ci --workspace=client --include-workspace-root=false
COPY client/ ./client/
RUN npm run build --workspace=client

# ── Serve static output with nginx ───────────────────────────────────────────
FROM nginx:alpine AS client
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
