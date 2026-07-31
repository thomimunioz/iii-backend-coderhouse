# AdoptMe API — Proyecto Final Backend III (Coderhouse)

API REST de adopción de mascotas construida con Node.js, Express 5 y MongoDB.
Este entregable final agrega sobre el proyecto base:

- **Tests funcionales** de todos los endpoints de `src/routes/adoption.router.js` (28 casos, mocks y fakes, sin necesidad de MongoDB).
- **Imagen Docker optimizada** multi-stage, ejecutada con usuario no-root y con `HEALTHCHECK`.
- **Documentación interactiva** OpenAPI 3.0 servida en `/api/docs`.
- **Módulo de mocking** con `@faker-js/faker` para generar datos de prueba.

---

## Enlaces del entregable

| Recurso | URL |
|---|---|
| Repositorio (tests + Dockerfile) | https://github.com/thomimunioz/iii-backend-coderhouse |
| Imagen pública en DockerHub | https://hub.docker.com/r/thomimunioz/iii-backend-coderhouse |
| Imagen y tag | `thomimunioz/iii-backend-coderhouse:1.0.0` |
| Documentación de la API (local) | http://localhost:8080/api/docs |

---

## Índice

1. [Stack](#stack)
2. [Requisitos](#requisitos)
3. [Instalación local](#instalación-local)
4. [Variables de entorno](#variables-de-entorno)
5. [Scripts disponibles](#scripts-disponibles)
6. [Endpoints](#endpoints)
7. [Tests funcionales](#tests-funcionales)
8. [Cobertura](#cobertura)
9. [Docker](#docker)
10. [DockerHub](#dockerhub)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Decisiones técnicas](#decisiones-técnicas)

---

## Stack

| Capa | Herramienta |
|---|---|
| Runtime | Node.js 22 (ESM, `"type": "module"`) |
| Framework HTTP | Express 5 |
| Base de datos | MongoDB + Mongoose 9 |
| Autenticación | JWT (`jsonwebtoken`) + `bcrypt` |
| Documentación | `swagger-jsdoc` + `swagger-ui-express` (OpenAPI 3.0.3) |
| Datos de prueba | `@faker-js/faker` |
| Testing | Mocha + Chai + Supertest + Sinon |
| Cobertura | c8 |
| Contenedores | Docker (build multi-stage sobre `node:22-alpine`) |

---

## Requisitos

- **Node.js** 20 o superior (probado con v22.16.0).
- **npm** 9 o superior.
- **MongoDB**: instancia local o cluster de MongoDB Atlas.
- **Docker** 20.10 o superior (solo para la parte de contenedores).

> Los tests **no** requieren MongoDB: las dependencias externas están aisladas con mocks.

---

## Instalación local

```bash
git clone https://github.com/thomimunioz/iii-backend-coderhouse.git
cd iii-backend-coderhouse
npm install
cp .env.example .env      # en Windows PowerShell: Copy-Item .env.example .env
```

Editar `.env` con la URI real de MongoDB y levantar el servidor:

```bash
npm run dev
```

Salida esperada:

```
Conectado a MongoDB
Servidor escuchando en el puerto 8080
Documentacion OpenAPI en http://localhost:8080/api/docs
```

Verificación rápida:

```bash
curl http://localhost:8080/api/health
# {"status":"success","payload":{"uptime":3,"environment":"development","database":"connected"}}
```

---

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` / `production` / `test`. En `production` la cookie de sesión se emite con el flag `secure`. |
| `PORT` | no | `8080` | Puerto donde escucha Express. |
| `MONGODB_URI` | **sí** | — | URI de conexión a MongoDB. Si falta, el arranque falla con un mensaje explícito. |
| `SECRET_KEY` | no | `tokenSecretJWT` | Clave para firmar los JWT. En producción debe ser una cadena larga y aleatoria. |

Valores de `MONGODB_URI` según el escenario:

```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/adoptme

# MongoDB local, app corriendo en el host
MONGODB_URI=mongodb://127.0.0.1:27017/adoptme

# MongoDB en el host, app corriendo dentro de un contenedor
MONGODB_URI=mongodb://host.docker.internal:27017/adoptme
```

El archivo `.env` **no se versiona** (está en `.gitignore`) ni se copia a la imagen Docker (está en `.dockerignore`): las variables se inyectan en runtime con `--env-file`.

---

## Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm start` | Levanta el servidor (`node server.js`). Es el comando que usa la imagen Docker. |
| `npm run dev` | Levanta el servidor con recarga automática (`node --watch`). |
| `npm test` | Corre toda la suite de tests con Mocha. |
| `npm run test:adoption` | Corre únicamente los tests de `adoption.router.js`. |
| `npm run test:coverage` | Corre los tests midiendo cobertura de todo `src/`. Genera `coverage/`. |
| `npm run test:coverage:adoption` | Cobertura enfocada en el módulo de adopciones, con umbrales mínimos (falla si baja de 100% en líneas, statements y funciones). |

---

## Endpoints

Documentación interactiva completa en **http://localhost:8080/api/docs**.

### Adopciones — `src/routes/adoption.router.js`

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/adoptions` | Lista todas las adopciones | 200, 500 |
| GET | `/api/adoptions/:aid` | Obtiene una adopción por id | 200, 400, 404, 500 |
| POST | `/api/adoptions/:uid/:pid` | Registra la adopción de una mascota | 201, 400, 404, 500 |

### Resto de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del proceso y de la conexión a MongoDB |
| GET / PUT / DELETE | `/api/users`, `/api/users/:uid` | Gestión de usuarios |
| GET / POST | `/api/pets`, `/api/pets/withimage` | Gestión de mascotas (con carga de imagen) |
| PUT / DELETE | `/api/pets/:pid` | Actualización y baja de mascotas |
| POST | `/api/sessions/register`, `/api/sessions/login`, `/api/sessions/logout` | Registro, login y cierre de sesión |
| GET | `/api/sessions/current` | Usuario del JWT guardado en la cookie |
| GET | `/api/mocks/mockingusers` | Genera usuarios falsos sin insertarlos |
| GET | `/api/mocks/mockingpets` | Genera mascotas falsas sin insertarlas |
| POST | `/api/mocks/generateData?users=10&pets=20` | Genera e inserta datos falsos en MongoDB |

Ejemplo de flujo completo con datos generados:

```bash
# 1. Insertar 10 usuarios y 20 mascotas falsas
curl -X POST "http://localhost:8080/api/mocks/generateData?users=10&pets=20"

# 2. Tomar un id de usuario y uno de mascota
curl http://localhost:8080/api/users
curl http://localhost:8080/api/pets

# 3. Registrar la adopción
curl -X POST http://localhost:8080/api/adoptions/<uid>/<pid>
# {"status":"success","message":"Pet adopted","payload":{...}}
```

---

## Tests funcionales

```bash
npm test
```

### Qué se testea

La suite vive en `test/adoption.router.test.js` y cubre **los tres endpoints** del router de adopciones con 28 casos agrupados en cuatro bloques:

| Bloque | Casos | Qué valida |
|---|---|---|
| `GET /api/adoptions` | 4 | Listado completo, listado vacío, forma de cada documento (`_id`, `owner`, `pet`) y respuesta 500 sin filtrar detalles internos cuando la base falla. |
| `GET /api/adoptions/:aid` | 4 | Adopción encontrada (verificando que se consulte por `_id`), 404 cuando no existe, 400 ante ids con formato inválido sin llegar a la base, y 500 ante excepción inesperada. |
| `POST /api/adoptions/:uid/:pid` | 16 | Camino feliz (201 + `Pet adopted`), los tres efectos de escritura (usuario, mascota, adopción), orden de las operaciones, conservación de mascotas previas, 404 de usuario y de mascota, 400 por mascota ya adoptada, 400 por `uid`/`pid` inválidos, y 500 en cada punto de falla de escritura. |
| Contrato del router | 4 | Que el router exponga **solo** las tres rutas declaradas: `DELETE`, `PUT` y rutas anidadas inexistentes devuelven 404 en formato JSON. |

### Cómo se aíslan las dependencias externas

- **Mocks (Sinon):** los controllers acceden a MongoDB únicamente a través de `usersService`, `petsService` y `adoptionsService` (`src/services/index.js`). Los tests reemplazan sus métodos con `sinon.stub()`, lo que permite forzar cualquier escenario —incluido un fallo de la base— y además **auditar las interacciones**: con qué argumentos se llamó cada método, cuántas veces y en qué orden.
- **Fakes (`test/fixtures/fakes.js`):** factories construidas con `@faker-js/faker` que devuelven documentos con la forma exacta de los modelos `User`, `Pet` y `Adoption`.
- **Supertest:** ejecuta requests HTTP reales contra la app de Express en memoria. Es posible porque `src/app.js` exporta la app sin llamar a `listen()` ni conectarse a Mongo: eso lo hace `server.js`.
- **`afterEach(() => sinon.restore())`:** garantiza que ningún stub se filtre entre tests, de modo que el resultado no dependa del orden de ejecución.

### Evidencia de ejecución

```
> backend-3_coderhouse@1.0.0 test
> mocha

  Tests funcionales - adoption.router.js (/api/adoptions)
    GET /api/adoptions - listado de adopciones
      ✔ responde 200 con status success y el listado completo de adopciones
      ✔ responde 200 con un array vacio cuando todavia no hay adopciones
      ✔ devuelve cada adopcion con las propiedades _id, owner y pet
      ✔ responde 500 sin filtrar detalles internos si el service falla
    GET /api/adoptions/:aid - adopcion por id
      ✔ responde 200 con la adopcion pedida y consulta el service por _id
      ✔ responde 404 con status error cuando la adopcion no existe
      ✔ responde 400 y no consulta la base cuando el id no tiene formato de ObjectId
      ✔ responde 500 si el service lanza una excepcion inesperada
    POST /api/adoptions/:uid/:pid - registrar una adopcion
      ✔ responde 201 con el mensaje "Pet adopted" y la adopcion creada
      ✔ agrega la mascota al array pets del usuario
      ✔ conserva las mascotas que el usuario ya tenia
      ✔ marca la mascota como adoptada y le asigna el owner
      ✔ crea el documento de adopcion vinculando owner y pet
      ✔ ejecuta las operaciones en el orden correcto (usuario, mascota, adopcion)
      ✔ funciona sin body: toda la informacion viaja en los parametros de ruta
      ✔ responde 404 si el usuario no existe y no sigue consultando la mascota
      ✔ responde 404 si la mascota no existe y no persiste ningun cambio
      ✔ responde 400 si la mascota ya fue adoptada y no vuelve a escribir en la base
      ✔ responde 400 cuando el uid no tiene formato de ObjectId
      ✔ responde 400 cuando el pid no tiene formato de ObjectId
      ✔ valida el uid antes que el pid cuando los dos son invalidos
      ✔ responde 500 si falla la actualizacion del usuario y no crea la adopcion
      ✔ responde 500 si falla la creacion de la adopcion
      ✔ busca al usuario por id y a la mascota por _id con los params recibidos
    Contrato del router
      ✔ no expone DELETE /api/adoptions/:aid
      ✔ no expone PUT /api/adoptions/:uid/:pid
      ✔ no expone POST /api/adoptions sin parametros
      ✔ responde 404 con formato JSON ante rutas anidadas inexistentes

  28 passing (136ms)
```

---

## Cobertura

```bash
npm run test:coverage:adoption
```

```
---------------------------------|---------|----------|---------|---------|-------------------
File                             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------------------------|---------|----------|---------|---------|-------------------
All files                        |     100 |    95.65 |     100 |     100 |
 controllers                     |     100 |      100 |     100 |     100 |
  adoptions.controller.js        |     100 |      100 |     100 |     100 |
 middlewares                     |     100 |    85.71 |     100 |     100 |
  validateObjectId.middleware.js |     100 |    85.71 |     100 |     100 | 19
 routes                          |     100 |      100 |     100 |     100 |
  adoption.router.js             |     100 |      100 |     100 |     100 |
---------------------------------|---------|----------|---------|---------|-------------------
```

El módulo de adopciones queda con **100% de statements, líneas y funciones**. La única rama sin cubrir es el operador `??` defensivo de la línea 19 de `validateObjectId.middleware.js`, que solo se activaría si Express entregara un parámetro de ruta `undefined` (imposible con las rutas declaradas).

`npm run test:coverage` mide todo `src/` y reporta 77% de statements y 94% de branches: el resto de los módulos (users, pets, sessions, mocks) no forma parte del alcance de este entregable.

---

## Docker

### Construir la imagen

```bash
docker build -t thomimunioz/iii-backend-coderhouse:1.0.0 .
docker tag thomimunioz/iii-backend-coderhouse:1.0.0 thomimunioz/iii-backend-coderhouse:latest
```

### Correr el contenedor

```bash
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/iii-backend-coderhouse:1.0.0
```

Con MongoDB local en el host, la URI del `.env` debe apuntar a `host.docker.internal`:

```bash
docker run -d --name adoptme -p 8080:8080 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/adoptme" \
  -e SECRET_KEY="una-clave-larga-y-aleatoria" \
  thomimunioz/iii-backend-coderhouse:1.0.0
```

Verificar que la aplicación responde dentro del contenedor:

```bash
docker logs adoptme
docker ps                                     # la columna STATUS debe decir (healthy)
curl http://localhost:8080/api/health
curl http://localhost:8080/api/adoptions
```

Detener y limpiar:

```bash
docker stop adoptme && docker rm adoptme
```

### Correr los tests dentro de la imagen

La etapa `test` del Dockerfile ejecuta la suite durante el build. Si algún test falla, el build falla:

```bash
docker build --target test -t adoptme-tests .
```

### Decisiones de optimización del Dockerfile

| Decisión | Por qué |
|---|---|
| Base `node:22-alpine` | ~60 MB contra ~380 MB de `node:22`. Se fija el major para que un cambio de Node no rompa el build sin aviso. |
| Build multi-stage (5 etapas) | El compilador de C++ y las devDependencies quedan en etapas intermedias que no se publican. La imagen final solo tiene Node, dependencias de producción y `src/`. |
| `COPY package*.json` antes del código | La capa de `npm ci` se cachea y se reinstala solo cuando cambian las dependencias, no cada vez que se toca un archivo de `src/`. |
| `npm ci` en lugar de `npm install` | Instala exactamente las versiones del `package-lock.json`: build reproducible. |
| Toolchain como paquete virtual (`--virtual .build-deps` + `apk del`) | `bcrypt` es un módulo nativo y no publica binarios para musl (la libc de Alpine), así que hay que compilarlo. El toolchain se instala y se borra en la misma capa. |
| `npm prune --omit=dev` | Compila una sola vez y poda: más rápido que hacer dos `npm ci` separados. |
| `.dockerignore` | Excluye `node_modules`, `.env`, `.git`, `coverage/`, `entrega/` y la documentación. Reduce el contexto de build y evita filtrar secretos dentro de la imagen. |
| `USER node` | El proceso no corre como root. Se cambia de usuario recién al final, cuando ya no hay nada que instalar. |
| `COPY --chown=node:node` | Evita un `RUN chown` extra que duplicaría el peso de la capa copiada. |
| `HEALTHCHECK` sobre `/api/health` | Docker marca el contenedor como `healthy`/`unhealthy` sin necesidad de instalar `curl` en la imagen: usa el `fetch` nativo de Node 22. |
| `CMD` en formato exec | Node queda como PID 1 y recibe el `SIGTERM` de `docker stop` directo; `server.js` lo escucha y cierra el servidor HTTP y la conexión a Mongo ordenadamente. |

### Log de construcción

<!-- PENDIENTE: pegar la salida real de `docker build -t thomimunioz/iii-backend-coderhouse:1.0.0 .` -->

### Log de ejecución del contenedor

<!-- PENDIENTE: pegar la salida real de `docker logs adoptme` -->

---

## DockerHub

Imagen pública: **https://hub.docker.com/r/thomimunioz/iii-backend-coderhouse**

```bash
docker login
docker push thomimunioz/iii-backend-coderhouse:1.0.0
docker push thomimunioz/iii-backend-coderhouse:latest
```

Para usarla sin clonar el repositorio:

```bash
docker pull thomimunioz/iii-backend-coderhouse:1.0.0
docker run -d -p 8080:8080 -e MONGODB_URI="<tu-uri>" thomimunioz/iii-backend-coderhouse:1.0.0
```

### Escaneo de seguridad

```bash
docker scout quickview thomimunioz/iii-backend-coderhouse:1.0.0
docker scout cves thomimunioz/iii-backend-coderhouse:1.0.0
npm audit --omit=dev
```

`npm audit --omit=dev` reporta **0 vulnerabilidades** en las dependencias de producción, que son las únicas que llegan a la imagen. Las vulnerabilidades reportadas por `npm audit` sin filtros pertenecen a devDependencies (herramientas de testing), que la etapa `prune` elimina antes de construir la imagen final.

<!-- PENDIENTE: pegar la salida real de `docker scout quickview` -->

---

## Estructura del proyecto

```
iii-backend-coderhouse/
├── .c8rc.json                  Configuración del reporte de cobertura
├── .dockerignore               Qué NO entra al contexto de build
├── .env.example                Plantilla de variables de entorno (versionada)
├── .gitignore
├── .mocharc.json               Configuración de Mocha (spec, timeout, reporter)
├── Dockerfile                  Build multi-stage de 5 etapas
├── package.json
├── README.md
├── server.js                   Entrypoint: conecta a Mongo, escucha y cierra ordenado
├── entrega/                    Documentación del entregable + capturas + Postman
├── src/
│   ├── app.js                  Configura Express y monta los routers (sin listen)
│   ├── config/
│   │   ├── database.js         connectDB con timeout de selección de servidor
│   │   └── swagger.js          Definición OpenAPI + escaneo de los routers
│   ├── controllers/            Lógica de cada endpoint
│   │   ├── adoptions.controller.js
│   │   ├── health.controller.js
│   │   ├── mocks.controller.js
│   │   ├── pets.controller.js
│   │   ├── sessions.controller.js
│   │   └── users.controller.js
│   ├── dao/                    Acceso directo a Mongoose
│   │   ├── Adoption.dao.js
│   │   ├── Pets.dao.js
│   │   ├── Users.dao.js
│   │   └── models/             Esquemas Adoption, Pet, User
│   ├── dto/                    Vistas de salida (nunca exponen el password)
│   ├── middlewares/
│   │   ├── error.middleware.js         notFoundHandler + errorHandler
│   │   └── validateObjectId.middleware.js
│   ├── public/img/             Destino de las imágenes subidas con multer
│   ├── repository/             Interfaz de negocio sobre los DAO
│   ├── routes/                 Routers de Express + documentación OpenAPI en JSDoc
│   │   ├── adoption.router.js
│   │   ├── health.router.js
│   │   ├── mocks.router.js
│   │   ├── pets.router.js
│   │   ├── sessions.router.js
│   │   └── users.router.js
│   ├── services/index.js       Instancias de los repositories (punto de mock)
│   └── utils/
│       ├── index.js            createHash, passwordValidation, __dirname
│       ├── mocking.js          Generadores de usuarios y mascotas falsas
│       └── uploader.js         Configuración de multer
└── test/
    ├── adoption.router.test.js Los 28 tests funcionales
    └── fixtures/fakes.js       Factories de datos falsos
```

### Flujo de una request

```
Request HTTP
    │
    ▼
app.js  ──►  router  ──►  middleware de validación  ──►  controller
                                                              │
                                                              ▼
                                                         service (repository)
                                                              │
                                                              ▼
                                                            DAO
                                                              │
                                                              ▼
                                                     modelo Mongoose ──► MongoDB
```

Los tests interceptan la flecha **controller → service**: todo lo que está a la derecha (DAO, Mongoose, MongoDB) queda fuera del test.

---

## Decisiones técnicas

Cambios sobre el proyecto base entregado por la cursada, y el motivo de cada uno:

| Cambio | Motivo |
|---|---|
| `app.js` exporta la app; `server.js` conecta y escucha | En el base, `app.js` llamaba a `mongoose.connect()` y `app.listen()` al importarse, lo que hacía imposible testear sin abrir un puerto y una conexión real. Separarlo es lo que habilita Supertest. |
| Middleware global de errores | Express 5 reenvía las promesas rechazadas de los handlers async al middleware de error. Sin él, un fallo de Mongo devolvía una respuesta HTML de Express en lugar del formato `{ status, error }` de la API. |
| `notFoundHandler` | Las rutas inexistentes devolvían HTML. Ahora responden 404 en JSON, coherente con el resto de la API. |
| `validateObjectId` en los params | Un id malformado llegaba a Mongoose, lanzaba `CastError` y la API devolvía 500 cuando en realidad es un error del cliente (400). Se valida con una expresión regular de 24 hexadecimales y no con `mongoose.Types.ObjectId.isValid`, porque ese método también acepta cualquier string de 12 caracteres. |
| `POST /api/adoptions/:uid/:pid` responde **201** | El base respondía 200. 201 Created es el código correcto para una creación de recurso. Se mantuvo el mensaje `"Pet adopted"` del base. |
| `user.pets.push({ _id: pet._id })` | El esquema de `User` define `pets` como un array de subdocumentos `{ _id }`. El base pusheaba el `ObjectId` pelado, con forma distinta a la declarada en el modelo. |
| Mensajes de error normalizados | El base mezclaba `"user Not found"` con `"Pet not found"`. Ahora todos siguen el mismo formato. |
| `deleteUser` borra de verdad | En el base, el controller buscaba el usuario y respondía `"User deleted"` sin borrar nada. |
| `SECRET_KEY` desde el entorno | El base tenía el secreto del JWT hardcodeado en el código fuente. |
| `try/catch` en `GET /api/sessions/current` | Un token vencido o manipulado hacía que `jwt.verify` lanzara y la API devolviera 500 en lugar de 401. |
| `findByIdAndUpdate(..., { new: true })` en los DAO | Sin esa opción, Mongoose devuelve el documento **anterior** a la actualización, lo que induce a errores al usar el valor de retorno. |
| Un solo hash de bcrypt para los usuarios mock | Hashear 50 passwords cuesta segundos. El hash se calcula una vez por request y se reutiliza. |
| Límite en `/generateData` | La cantidad se acota a 500 para que un parámetro absurdo no tumbe la base. |

### Limitación conocida

`POST /api/adoptions/:uid/:pid` hace tres escrituras sin transacción. Si la tercera falla, las dos anteriores ya se aplicaron y la API responde 500 dejando datos inconsistentes (existe un test que documenta exactamente ese escenario). La solución correcta es una transacción de MongoDB, que requiere un replica set —no disponible en una instancia standalone—, por lo que queda fuera del alcance de este entregable.

---

## Autor

**Thomas Muñoz** — Backend III, Coderhouse.
