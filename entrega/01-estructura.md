# 1. Estructura del proyecto

## Descripción del repositorio

El repositorio contiene la **API AdoptMe**, una aplicación backend en Node.js + Express + MongoDB que gestiona usuarios, mascotas y adopciones. Sobre el proyecto base de la cursada, este entregable final agrega tres cosas: la **suite de tests funcionales** del router de adopciones, la **dockerización** de la aplicación y la **documentación** necesaria para reproducir todo sin información adicional.

La organización sigue una **arquitectura en capas**, donde cada capa solo conoce a la inmediatamente inferior:

```
routes  ->  controllers  ->  services (repositories)  ->  dao  ->  models  ->  MongoDB
```

Esta separación no es decorativa: es exactamente lo que hace posible testear la API sin base de datos. Los controllers acceden a los datos únicamente a través de los tres objetos exportados por `src/services/index.js`, así que reemplazando los métodos de esos objetos con mocks se aísla todo lo que está por debajo (DAO, Mongoose y MongoDB).

## Árbol de directorios

Generado con:

```bash
find . -not -path "./node_modules*" -not -path "./.git/*" -not -path "./coverage*" | sort
```

```
backend-3_coderhouse/
├── .c8rc.json
├── .dockerignore
├── .env.example
├── .gitignore
├── .mocharc.json
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
├── server.js
├── entrega/
│   ├── 01-estructura.md
│   ├── 02-tests-funcionales.md
│   ├── 03-dockerizacion.md
│   ├── 04-imagen-docker.md
│   ├── 05-ejecucion.md
│   ├── 06-readme.md
│   ├── ENTREGABLE.md
│   ├── generar-entregable.mjs
│   ├── capturas/
│   ├── logs/
│   └── postman/
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── database.js
│   │   └── swagger.js
│   ├── controllers/
│   │   ├── adoptions.controller.js
│   │   ├── health.controller.js
│   │   ├── mocks.controller.js
│   │   ├── pets.controller.js
│   │   ├── sessions.controller.js
│   │   └── users.controller.js
│   ├── dao/
│   │   ├── Adoption.dao.js
│   │   ├── Pets.dao.js
│   │   ├── Users.dao.js
│   │   └── models/
│   │       ├── Adoption.js
│   │       ├── Pet.js
│   │       └── User.js
│   ├── dto/
│   │   ├── Pet.dto.js
│   │   └── User.dto.js
│   ├── middlewares/
│   │   ├── error.middleware.js
│   │   └── validateObjectId.middleware.js
│   ├── public/
│   │   └── img/
│   ├── repository/
│   │   ├── AdoptionRepository.js
│   │   ├── GenericRepository.js
│   │   ├── PetRepository.js
│   │   └── UserRepository.js
│   ├── routes/
│   │   ├── adoption.router.js
│   │   ├── health.router.js
│   │   ├── mocks.router.js
│   │   ├── pets.router.js
│   │   ├── sessions.router.js
│   │   └── users.router.js
│   ├── services/
│   │   └── index.js
│   └── utils/
│       ├── index.js
│       ├── mocking.js
│       └── uploader.js
└── test/
    ├── adoption.router.test.js
    └── fixtures/
        └── fakes.js
```

## Propósito de cada archivo y carpeta

### Raíz del proyecto

| Archivo | Propósito |
|---|---|
| `server.js` | **Entrypoint.** Carga las variables de entorno, conecta a MongoDB, pone a escuchar Express y registra el apagado ordenado ante `SIGTERM`/`SIGINT`. Es el comando que ejecuta el contenedor. |
| `package.json` | Metadatos, dependencias y scripts (`start`, `dev`, `test`, `test:coverage`). Declara `"type": "module"`, por lo que todo el proyecto usa ESM (`import`/`export`). |
| `package-lock.json` | Fija las versiones exactas del árbol de dependencias. Es lo que permite que `npm ci` produzca builds reproducibles dentro de Docker. |
| `Dockerfile` | Build multi-stage de 5 etapas que produce la imagen de producción. |
| `.dockerignore` | Lista de lo que **no** se envía al daemon de Docker al construir: `node_modules`, `.env`, `.git`, `coverage/`, `entrega/`. Acelera el build y evita filtrar secretos. |
| `.env.example` | Plantilla versionada de las variables de entorno, con los tres formatos posibles de `MONGODB_URI` (Atlas, Mongo local, Mongo desde contenedor). |
| `.gitignore` | Excluye `node_modules/`, `.env`, `coverage/` y las imágenes subidas en desarrollo. |
| `.mocharc.json` | Configuración de Mocha: qué archivos son specs, timeout de 10 s, reporter `spec`. Evita repetir flags en cada corrida. |
| `.c8rc.json` | Configuración del reporte de cobertura: qué archivos incluir y en qué formatos reportar. |
| `README.md` | Documentación principal del proyecto: instalación, endpoints, tests, Docker y URLs del entregable. |

### `src/` — código de la aplicación

| Carpeta / archivo | Propósito |
|---|---|
| `app.js` | Configura Express: parseo de JSON y cookies, archivos estáticos, monta los routers bajo `/api/*`, expone Swagger UI y cierra la cadena con los middlewares de 404 y de error. **No llama a `listen()` ni se conecta a Mongo**, y eso es lo que permite importarlo desde los tests. |
| `config/database.js` | Función `connectDB`: valida que exista `MONGODB_URI` y conecta con `serverSelectionTimeoutMS` para fallar rápido si la base no responde. |
| `config/swagger.js` | Definición OpenAPI 3.0.3 (info, servers, tags, schemas y respuestas reutilizables) y escaneo de los comentarios JSDoc de los routers con `swagger-jsdoc`. |
| `routes/` | Un router de Express por dominio. Mapean URL + método HTTP a un controller y aplican los middlewares de validación. Además contienen la documentación OpenAPI de cada endpoint en comentarios `@openapi`. |
| `controllers/` | Lógica de cada endpoint: leen `req`, delegan en los services y arman la respuesta con el código HTTP correspondiente. No conocen Mongoose. |
| `services/index.js` | Instancia los tres repositories (`usersService`, `petsService`, `adoptionsService`). Es el **único punto de acceso a datos** de los controllers y, por lo tanto, el punto donde los tests aplican los mocks. |
| `repository/` | Interfaz de negocio estable sobre los DAO (`getAll`, `getBy`, `create`, `update`, `delete`) más métodos específicos como `getUserByEmail`. Aísla a los controllers de cómo se accede a los datos. |
| `dao/` | Acceso directo a Mongoose (`find`, `findOne`, `create`, `findByIdAndUpdate`, `findByIdAndDelete`). Es la única capa que habla con los modelos. |
| `dao/models/` | Esquemas de Mongoose: `User`, `Pet` y `Adoption`. |
| `dto/` | Vistas de salida. `User.dto.js` construye el payload del JWT y la representación pública del usuario, garantizando que el `password` nunca se serialice en una respuesta. |
| `middlewares/error.middleware.js` | `notFoundHandler` (404 en JSON para rutas inexistentes) y `errorHandler` (500 en JSON, sin filtrar detalles internos). Express 5 reenvía a este último cualquier promesa rechazada de un handler `async`. |
| `middlewares/validateObjectId.middleware.js` | Valida que los parámetros de ruta tengan formato de ObjectId antes de llegar al controller, para devolver 400 en lugar de un 500 por `CastError` de Mongoose. |
| `utils/index.js` | Helpers transversales: `createHash` y `passwordValidation` (bcrypt) y el `__dirname` que ESM no provee. |
| `utils/mocking.js` | Generadores de usuarios y mascotas falsas con `@faker-js/faker`, usados por el módulo de mocks. |
| `utils/uploader.js` | Configuración de `multer` para la carga de imágenes de mascotas, con límite de 5 MB por archivo. |
| `public/img/` | Destino de las imágenes subidas. Se sirve como estático en `/static/img/...`. |

### `test/` — tests funcionales

| Archivo | Propósito |
|---|---|
| `adoption.router.test.js` | Los 28 tests funcionales de los tres endpoints de `adoption.router.js`. |
| `fixtures/fakes.js` | Factories de datos falsos (`makeFakeUser`, `makeFakePet`, `makeFakeAdoption`) y la lista de ids inválidos usada para probar la validación. |

### `entrega/` — documentación del entregable

| Carpeta / archivo | Propósito |
|---|---|
| `01-estructura.md` … `06-readme.md` | Las seis secciones pedidas por la consigna. |
| `ENTREGABLE.md` | Documento único que reúne las seis secciones con el código y los logs ya embebidos. Es el que se copia al Google Docs. |
| `generar-entregable.mjs` | Script que regenera `ENTREGABLE.md` insertando el contenido real de los archivos de código y de los logs. Evita que el documento quede desincronizado del código. |
| `logs/` | Salidas de consola usadas como evidencia (tests, cobertura, auditoría, build y ejecución de Docker). |
| `capturas/` | Capturas de pantalla de respaldo. |
| `postman/` | Colección de Postman con todos los endpoints listos para probar. |
