# syntax=docker/dockerfile:1

# ---- Etapa 1: build -------------------------------------------------------
# Compila TypeScript (server + cliente) y copia vistas/estáticos a dist/.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.client.json ./
COPY scripts ./scripts
COPY src ./src

RUN npm run build

# ---- Etapa 2: runtime ------------------------------------------------------
# Imagen final: solo dependencias de producción + dist/ compilado.
# Usuario no-root y healthcheck sobre GET /health (ya expuesto en src/app.ts).
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN addgroup -S nodejs \
  && adduser -S cartaapp -G nodejs \
  && mkdir -p dist/public/imagenes \
  && chown -R cartaapp:nodejs /app

# Permite que el proceso de node (corriendo como usuario no-root) escuche en
# un puerto < 1024 (ej. 80 en Producción) sin ser root. cap_add a nivel de
# contenedor no basta por sí solo para un proceso no-root — se le da la
# capability directamente al binario (más confiable que depender de
# "ambient capabilities").
RUN apk add --no-cache libcap \
  && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")" \
  && apk del libcap

USER cartaapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:$PORT/health || exit 1

CMD ["node", "dist/server.js"]
