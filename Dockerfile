# ==========================================
# Etapa 1: compilación del frontend con Vite
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==========================================
# Etapa 2: servidor Node (API de precios reales + estáticos), sin dependencias
# ==========================================
FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data DIST_DIR=/app/dist
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY package.json ./
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/status >/dev/null || exit 1
CMD ["node", "server/index.js"]
