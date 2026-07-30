# 3. Dockerización

## Contenido completo del Dockerfile

{{ARCHIVO:Dockerfile}}

## Contenido completo del `.dockerignore`

{{ARCHIVO:.dockerignore}}

## Explicación de las decisiones de optimización

### Imagen base: `node:22-alpine`

| Imagen | Tamaño aproximado |
|---|---|
| `node:22` | ~380 MB |
| `node:22-slim` | ~200 MB |
| `node:22-alpine` | ~60 MB |

Alpine usa **musl** como librería estándar de C en lugar de glibc, lo que reduce el tamaño de forma drástica y también la superficie de ataque: menos paquetes instalados significa menos CVEs potenciales.

Se fija el **major** de Node (`22`) en lugar de usar `node:latest`. Con `latest`, un cambio de versión mayor de Node podría romper el build sin aviso; con `22` se reciben parches de seguridad manteniendo la compatibilidad. La alternativa aún más estricta es fijar el digest (`node:22-alpine@sha256:...`), que da reproducibilidad total pero exige actualizarlo a mano en cada parche de seguridad.

### Build multi-stage: 5 etapas

```
base ──► deps ──► test    (opcional: docker build --target test .)
          │
          └────► prune ──► runtime  (imagen final publicada)
```

| Etapa | Qué hace | Llega a la imagen final |
|---|---|---|
| `base` | `node:22-alpine`, `WORKDIR /app`, variables de entorno. | Sí (es la base de `runtime`) |
| `deps` | Instala el toolchain de compilación y ejecuta `npm ci` con todas las dependencias. | No |
| `test` | Copia `src/` y `test/` y corre `npm test`. | No |
| `prune` | Elimina las devDependencies del árbol ya instalado. | Solo su `node_modules` |
| `runtime` | Parte de `base` limpia y copia `node_modules` de producción, `server.js` y `src/`. | Sí |

El beneficio concreto: el compilador de C++ (`g++`, `make`, `python3`) y las cinco devDependencies de testing (mocha, chai, sinon, supertest, c8) se usan durante el build pero **nunca se publican**. Docker descarta las etapas intermedias.

### Orden de las capas y caché

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --include=dev
...
COPY --chown=node:node src ./src
```

Docker cachea cada instrucción y reutiliza la capa si la anterior no cambió. Copiando **primero** los manifiestos y recién después el código fuente, un cambio en `src/` no invalida la capa de `npm ci`: el build vuelve a usar las dependencias ya instaladas. Si se copiara todo junto (`COPY . .` antes del `npm ci`), cada modificación de una línea de código obligaría a reinstalar el árbol completo, que es la parte lenta del build.

### `npm ci` en lugar de `npm install`

`npm ci` instala **exactamente** las versiones registradas en `package-lock.json` y falla si el lockfile está desactualizado. `npm install` puede resolver versiones más nuevas dentro del rango del caret (`^`), lo que haría que dos builds del mismo commit produzcan imágenes distintas. Para un artefacto de despliegue, la reproducibilidad no es negociable.

### Compilación de `bcrypt` y paquete virtual

```dockerfile
RUN apk add --no-cache --virtual .build-deps python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --include=dev && apk del .build-deps
```

`bcrypt` es un módulo nativo escrito en C++ y **no publica binarios precompilados para musl**, así que en Alpine hay que compilarlo desde el código fuente. Eso requiere `python3`, `make` y `g++`.

Dos detalles:

- **`--no-cache`** evita que quede el índice de paquetes de apk (~5 MB) dentro de la capa.
- **`--virtual .build-deps`** agrupa esos paquetes bajo un nombre para poder borrarlos todos con un solo `apk del`, en la **misma instrucción `RUN`**. Esto es importante: si el `apk del` estuviera en un `RUN` posterior, los archivos ya estarían escritos en una capa anterior y seguirían pesando en la imagen, porque las capas de Docker son inmutables y solo se acumulan.

De todas formas, en este Dockerfile el toolchain está en la etapa `deps`, que no se publica. Se borra igual para mantener chica la caché de build.

### `npm prune --omit=dev` en lugar de un segundo `npm ci`

Una alternativa habitual es hacer dos instalaciones: una completa para testear y otra solo con `--omit=dev` para producción. Eso implicaría **compilar `bcrypt` dos veces**. En cambio, la etapa `prune` reutiliza el árbol ya compilado y solo descarta lo que no hace falta:

```dockerfile
RUN npm prune --omit=dev && npm cache clean --force
```

`npm cache clean --force` borra la caché de npm (`~/.npm`), que puede sumar decenas de MB y no cumple ninguna función en runtime.

### Usuario no-root

```dockerfile
USER node
```

Por defecto los contenedores corren como **root**. Si un atacante logra ejecución de código dentro del contenedor, ser root le facilita escalar (escribir en el filesystem, instalar paquetes, explotar una fuga del runtime). Las imágenes oficiales de Node ya traen el usuario `node` (uid 1000), así que se reutiliza en lugar de crear uno.

El `USER` se declara **al final**, cuando ya no hay nada que instalar: si se declarara antes, `npm ci` y `apk add` fallarían por falta de permisos.

### `COPY --chown=node:node`

Los archivos se copian como root por defecto, y el usuario `node` necesita poder leer `src/` y escribir en `src/public/img` (destino de multer). La alternativa —`COPY` seguido de `RUN chown -R`— **duplicaría el peso**: `chown` modifica los metadatos de cada archivo, y como cada capa guarda los archivos completos que toca, la imagen terminaría con dos copias de `node_modules`. Hacer el `chown` dentro del mismo `COPY` lo evita.

### `.dockerignore`

Reduce el **contexto de build**: todo lo que el CLI de Docker envía al daemon antes de empezar. Sin él, se enviarían los ~200 MB de `node_modules` en cada build, además de `.git`, `coverage/` y la carpeta `entrega/` con las capturas.

Lo más importante: **excluye `.env`**. Un `COPY . .` con el `.env` en el contexto metería las credenciales de MongoDB dentro de la imagen, y quedarían visibles para cualquiera que haga `docker pull` de un repositorio público. Las variables se inyectan en runtime con `--env-file` o `-e`.

### `HEALTHCHECK`

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health')..."
```

Docker consulta el endpoint `/api/health` y marca el contenedor como `healthy` o `unhealthy`, información visible en `docker ps` y utilizable por un orquestador para reiniciar el servicio.

Se usa el `fetch` nativo de Node 22 en lugar de `curl` o `wget`: **no hay que instalar nada** en la imagen. El `--start-period=15s` da tiempo a que se establezca la conexión con MongoDB antes de empezar a contar fallos.

### `CMD` en formato exec y apagado ordenado

```dockerfile
CMD ["node", "server.js"]
```

En formato exec (array JSON) no se interpone una shell: **Node queda como PID 1** y recibe directamente el `SIGTERM` que envía `docker stop`. Con el formato shell (`CMD node server.js`), el PID 1 sería `/bin/sh` y no reenviaría la señal, por lo que Docker esperaría 10 segundos y mataría el proceso con `SIGKILL`, cortando conexiones a medias.

Además, `server.js` registra los handlers correspondientes:

```javascript
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

que cierran el servidor HTTP, esperan a que terminen las requests en curso, cierran la conexión a MongoDB y salen con código 0. Por eso no hace falta agregar un init externo como `dumb-init` o `tini`: el proceso maneja sus señales. (Si igual se quisiera un init, alcanza con `docker run --init`.)

### Resumen de las optimizaciones

| Técnica | Beneficio |
|---|---|
| Base Alpine | Imagen ~6 veces más chica y menor superficie de ataque |
| Multi-stage | Sin compiladores ni devDependencies en la imagen publicada |
| Orden de capas | Builds incrementales rápidos: `npm ci` se saltea si no cambiaron las dependencias |
| `npm ci` | Builds reproducibles a partir del lockfile |
| Toolchain virtual + `--no-cache` | No quedan artefactos de compilación |
| `prune` + `cache clean` | `bcrypt` se compila una sola vez y no queda caché de npm |
| `USER node` | El proceso no corre como root |
| `COPY --chown` | Evita duplicar capas por un `chown` posterior |
| `.dockerignore` | Contexto de build mínimo y sin secretos |
| `HEALTHCHECK` | Estado del servicio observable sin instalar dependencias extra |
| `CMD` exec + handlers de señales | `docker stop` cierra la app de forma ordenada |

## Log de construcción de la imagen

Comando:

```bash
docker build -t thomimunioz/adoptme-backend3:1.0.0 .
```

{{LOG:entrega/logs/docker-build.log}}

## Tests ejecutados dentro de la imagen

La etapa `test` corre la suite durante el build. Si un test falla, el build falla, lo que la convierte en una puerta de calidad antes de publicar:

```bash
docker build --target test -t adoptme-tests .
```

{{LOG:entrega/logs/docker-test-target.log}}
