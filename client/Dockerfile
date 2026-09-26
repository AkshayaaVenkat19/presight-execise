# ── Client build ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# ── Serve static output with nginx ───────────────────────────────────────────
FROM nginx:alpine AS client
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
