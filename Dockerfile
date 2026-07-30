# syntax=docker/dockerfile:1

# ==============================================================================
#  AdoptMe API - Proyecto Final Backend III (Coderhouse)
#
#  Build multi-stage con cinco etapas. La imagen final solo contiene Node, las
#  dependencias de produccion y el codigo de src/: ni compiladores, ni tests,
#  ni devDependencies, ni documentacion de la entrega.
#
#  Comandos utiles:
#    docker build -t thomimunioz/adoptme-backend3:1.0.0 .
#    docker build --target test .        -> corre los 28 tests dentro de la imagen
# ==============================================================================


# ------------------------------------------------------------------------------
# Etapa 1: base
# Imagen ligera y version de Node fijada. alpine pesa ~60 MB contra ~380 MB de
# node:22 completa, y al fijar el major se evita que un cambio de Node rompa el
# build sin aviso.
# ------------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# Los procesos no deberian correr como root dentro del contenedor. La imagen
# oficial de Node ya trae el usuario "node" (uid 1000), asi que se reutiliza.
ENV NODE_ENV=production \
    PORT=8080


# ------------------------------------------------------------------------------
# Etapa 2: dependencias
# Se copian SOLO package.json y package-lock.json antes del codigo fuente. Asi
# la capa de npm ci queda cacheada y se reinstala unicamente cuando cambian las
# dependencias, no cada vez que se toca un archivo de src/.
# ------------------------------------------------------------------------------
FROM base AS deps

# bcrypt es un modulo nativo y no publica binarios precompilados para musl (la
# libc de Alpine), por lo que hay que compilarlo. El toolchain se instala como
# paquete virtual y se borra en la misma capa: nunca llega a la imagen final.
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package.json package-lock.json ./

# npm ci instala exactamente las versiones del lockfile (build reproducible),
# a diferencia de npm install que puede resolver versiones nuevas.
RUN npm ci --include=dev \
    && apk del .build-deps


# ------------------------------------------------------------------------------
# Etapa 3: test (opcional)
# Permite correr la suite dentro de la imagen con:  docker build --target test .
# Si un test falla, el build falla: sirve como puerta de calidad antes de pushear.
# ------------------------------------------------------------------------------
FROM deps AS test

ENV NODE_ENV=test

COPY .mocharc.json ./
COPY src ./src
COPY test ./test

RUN npm test


# ------------------------------------------------------------------------------
# Etapa 4: prune
# Deja el arbol de node_modules listo para produccion.
# ------------------------------------------------------------------------------
FROM deps AS prune

# Descarta devDependencies (mocha, chai, sinon, supertest, c8) del arbol ya
# instalado. Compilar una sola vez y podar es mas rapido que hacer dos npm ci.
RUN npm prune --omit=dev && npm cache clean --force


# ------------------------------------------------------------------------------
# Etapa 5: runtime
# Imagen final. Parte de base (limpia, sin toolchain) y copia solo lo necesario
# para ejecutar la app: node_modules de produccion, server.js y src/.
# ------------------------------------------------------------------------------
FROM base AS runtime

LABEL org.opencontainers.image.title="AdoptMe API" \
      org.opencontainers.image.description="API de adopciones - Proyecto Final Backend III (Coderhouse)" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="Thomas Munoz" \
      org.opencontainers.image.source="https://github.com/thomimunioz/backend-3_coderhouse"

# --chown evita un RUN chown extra (que duplicaria el peso de la capa copiada).
COPY --from=prune --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src ./src

# Se deja de ser root recien al final, cuando ya no hay nada que instalar.
USER node

EXPOSE 8080

# Docker consulta /api/health, que responde 200 mientras el proceso este vivo e
# informa aparte el estado de la conexion a MongoDB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Formato exec (sin shell): node queda como PID 1 y recibe el SIGTERM de
# `docker stop` directo. server.js escucha esa senal y cierra ordenadamente.
CMD ["node", "server.js"]
