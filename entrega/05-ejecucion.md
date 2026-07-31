# 5. Ejecución del proyecto

Esta sección contiene los comandos exactos para reproducir el proyecto desde cero, en tres escenarios: ejecución local, ejecución en Docker y ejecución de los tests.

## Requisitos previos

| Requisito | Versión | Necesario para |
|---|---|---|
| Node.js | 20 o superior (probado con v22.16.0) | Ejecución local y tests |
| npm | 9 o superior (probado con 10.9.2) | Instalación de dependencias |
| MongoDB | Atlas o instancia local | Ejecución de la aplicación |
| Docker | 20.10 o superior | Construcción y ejecución de la imagen |

Los **tests no requieren MongoDB ni Docker**: las dependencias externas están aisladas con mocks.

---

## A. Ejecución local

### A.1 Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/thomimunioz/iii-backend-coderhouse.git
cd iii-backend-coderhouse
npm install
```

### A.2 Configurar las variables de entorno

```bash
# Linux / macOS / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Editar `.env` y completar `MONGODB_URI`:

```
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/adoptme
SECRET_KEY=una-clave-larga-y-aleatoria
```

Si se usa **MongoDB Atlas**, verificar que la IP local esté habilitada en el *IP Access List* del cluster. Si se usa **MongoDB local**, arrancar el servicio (`mongod`, o `net start MongoDB` en Windows) y usar `mongodb://127.0.0.1:27017/adoptme`.

### A.3 Levantar el servidor

```bash
npm run dev      # con recarga automática (node --watch)
npm start        # sin recarga
```

Salida esperada:

```
Conectado a MongoDB
Servidor escuchando en el puerto 8080
Documentacion OpenAPI en http://localhost:8080/api/docs
```

Si aparece `No se pudo iniciar la aplicacion: Falta la variable de entorno MONGODB_URI`, el `.env` no se creó o quedó vacío.

### A.4 Verificar que funciona

```bash
curl http://localhost:8080/api/health
# {"status":"success","payload":{"uptime":3,"environment":"development","database":"connected"}}

curl http://localhost:8080/api/adoptions
# {"status":"success","payload":[]}
```

Documentación interactiva: **http://localhost:8080/api/docs**

### A.5 Probar el flujo completo de adopción

```bash
# 1. Generar e insertar datos falsos
curl -X POST "http://localhost:8080/api/mocks/generateData?users=5&pets=10"

# 2. Obtener un id de usuario y uno de mascota
curl http://localhost:8080/api/users
curl http://localhost:8080/api/pets

# 3. Registrar la adopción
curl -X POST http://localhost:8080/api/adoptions/<uid>/<pid>
# {"status":"success","message":"Pet adopted","payload":{...}}

# 4. Verificar que quedó registrada
curl http://localhost:8080/api/adoptions

# 5. Intentar adoptar la misma mascota otra vez
curl -X POST http://localhost:8080/api/adoptions/<uid>/<pid>
# {"status":"error","error":"Pet is already adopted"}
```

---

## B. Construir y ejecutar la imagen Docker

### B.1 Construir la imagen

Desde la raíz del proyecto (donde está el `Dockerfile`):

```bash
docker build -t thomimunioz/iii-backend-coderhouse:1.0.0 .
docker tag thomimunioz/iii-backend-coderhouse:1.0.0 thomimunioz/iii-backend-coderhouse:latest
```

Verificar el resultado:

```bash
docker images thomimunioz/iii-backend-coderhouse
```

### B.2 Ejecutar el contenedor

**Opción 1 — con el archivo `.env`:**

```bash
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/iii-backend-coderhouse:1.0.0
```

**Opción 2 — con variables explícitas:**

```bash
docker run -d --name adoptme -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/adoptme" \
  -e SECRET_KEY="una-clave-larga-y-aleatoria" \
  thomimunioz/iii-backend-coderhouse:1.0.0
```

**Opción 3 — con MongoDB también en un contenedor (recomendada para reproducir el proyecto):**

No requiere cuenta de Atlas ni instalar MongoDB. Los dos contenedores se comunican por una red propia de Docker, donde cada uno resuelve al otro por su nombre:

```bash
# 1. Red privada para que los contenedores se vean entre sí
docker network create adoptme-net

# 2. Base de datos
docker run -d --name adoptme-mongo --network adoptme-net -p 27017:27017 mongo:7

# 3. Aplicación, apuntando a la base por el nombre del contenedor
docker run -d --name adoptme --network adoptme-net -p 8080:8080 \
  -e MONGODB_URI="mongodb://adoptme-mongo:27017/adoptme" \
  -e SECRET_KEY="clave-de-prueba-para-el-entorno-local" \
  thomimunioz/iii-backend-coderhouse:1.0.0
```

El host `adoptme-mongo` de la URI es el nombre del contenedor de la base: Docker lo resuelve por DNS interno dentro de `adoptme-net`. Notar que la URI usa `mongodb://` y no `mongodb+srv://`, porque no hay registros SRV que resolver.

**Importante:** si MongoDB corre en el host (no en un contenedor), dentro del contenedor `localhost` apunta al propio contenedor, no a la máquina. Hay que usar `host.docker.internal`:

```
MONGODB_URI=mongodb://host.docker.internal:27017/adoptme
```

### B.3 Verificar que la aplicación funciona dentro del contenedor

```bash
docker ps                                  # STATUS debe llegar a (healthy)
docker logs adoptme                        # logs de arranque
docker logs -f adoptme                     # seguir los logs en vivo

curl http://localhost:8080/api/health
curl http://localhost:8080/api/adoptions

docker exec -it adoptme sh                 # entrar al contenedor
  # id            -> uid=1000(node) : confirma que NO corre como root
  # ls /app       -> node_modules, package.json, server.js, src
  # exit
```

### B.4 Descargar y ejecutar la imagen desde DockerHub

Sin clonar el repositorio:

```bash
docker pull thomimunioz/iii-backend-coderhouse:1.0.0
docker run -d --name adoptme -p 8080:8080 \
  -e MONGODB_URI="<tu-uri-de-mongo>" \
  thomimunioz/iii-backend-coderhouse:1.0.0
```

### B.5 Detener y limpiar

```bash
docker stop adoptme          # SIGTERM: el proceso cierra ordenadamente
docker rm adoptme
docker rmi thomimunioz/iii-backend-coderhouse:1.0.0

# Si se usó la opción 3 (MongoDB en contenedor), limpiar también:
docker stop adoptme-mongo && docker rm adoptme-mongo
docker network rm adoptme-net
```

---

## C. Correr los tests

### C.1 Localmente

```bash
npm test                            # toda la suite (28 tests)
npm run test:adoption               # solo los tests del router de adopciones
npm run test:coverage               # cobertura de todo src/
npm run test:coverage:adoption      # cobertura enfocada, con umbrales mínimos
```

No hace falta `.env`, ni MongoDB, ni tener el servidor levantado: Supertest levanta la app en memoria y Sinon reemplaza el acceso a la base.

Reporte HTML de cobertura (se genera con los comandos de coverage):

```
coverage/index.html
```

### C.2 Dentro de Docker

La etapa `test` del Dockerfile ejecuta la suite durante el build:

```bash
docker build --target test -t adoptme-tests .
```

Si algún test falla, el build falla con el detalle del error. Es la forma de garantizar que no se publique una imagen con tests rotos.

---

## Evidencia de ejecución exitosa

### Entorno de pruebas

{{LOG:entrega/logs/entorno.log}}

### Tests — `npm test`

{{LOG:entrega/logs/test.log}}

### Cobertura — `npm run test:coverage:adoption`

{{LOG:entrega/logs/test-coverage-adoption.log}}

### Verificación de endpoints de la aplicación

{{LOG:entrega/logs/verificacion-endpoints.log}}

### Build de la imagen Docker

{{LOG:entrega/logs/docker-build.log}}

### Ejecución del contenedor

{{LOG:entrega/logs/docker-run.log}}

---

## Resolución de problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Falta la variable de entorno MONGODB_URI` | No existe el `.env` o no se pasó `--env-file` al contenedor. |
| `MongooseServerSelectionError` en local | La IP no está habilitada en el *IP Access List* de Atlas, o el servicio local de MongoDB no está corriendo. |
| `MongooseServerSelectionError` dentro del contenedor con Mongo en el host | Usar `host.docker.internal` en lugar de `localhost` o `127.0.0.1`. |
| `port is already allocated` | El puerto 8080 está ocupado. Publicar en otro: `-p 3000:8080`. |
| `docker: command not found` | Docker Desktop no está instalado o no se reinició la terminal después de instalarlo. |
| El contenedor queda en `unhealthy` | La app no responde en `/api/health`. Revisar `docker logs adoptme`: casi siempre es la conexión a MongoDB. |
| `npm ci` falla en el build | El `package-lock.json` está desactualizado respecto de `package.json`. Correr `npm install` y volver a construir. |
