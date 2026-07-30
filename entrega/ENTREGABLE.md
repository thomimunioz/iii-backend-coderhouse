# Proyecto Final — Backend III

## API AdoptMe: tests funcionales, dockerización y documentación

**Curso:** Backend III — Coderhouse
**Alumno:** Thomas Muñoz
**Fecha:** 29 de julio de 2026

| Recurso | URL |
|---|---|
| Repositorio (tests + Dockerfile) | https://github.com/thomimunioz/backend-3_coderhouse |
| Imagen pública en DockerHub | https://hub.docker.com/r/thomimunioz/adoptme-backend3 |
| Imagen y tag | `thomimunioz/adoptme-backend3:1.0.0` |

Este documento reúne toda la evidencia del entregable final: estructura del proyecto, tests
funcionales del router de adopciones con su código completo y sus logs de ejecución,
dockerización con la explicación de cada decisión de optimización, datos y evidencia de la
imagen publicada, instrucciones de ejecución y el README completo del repositorio.

---

## Índice

1. Estructura del proyecto
2. Tests funcionales
3. Dockerización
4. Imagen Docker
5. Ejecución del proyecto
6. README

---



---

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

---

# 2. Tests funcionales

## Alcance

La consigna pide tests funcionales para **todos los endpoints** de `src/routes/adoption.router.js`. El router declara exactamente tres rutas:

```javascript
router.get('/', adoptionsController.getAllAdoptions)
router.get('/:aid', validateObjectId('aid'), adoptionsController.getAdoption)
router.post('/:uid/:pid', validateObjectId('uid', 'pid'), adoptionsController.createAdoption)
```

Montado en `app.js` bajo el prefijo `/api/adoptions`, eso da:

| Método | Ruta | Casos de test |
|---|---|---|
| GET | `/api/adoptions` | 4 |
| GET | `/api/adoptions/:aid` | 4 |
| POST | `/api/adoptions/:uid/:pid` | 16 |
| — | Contrato del router (rutas y métodos no declarados) | 4 |
| | **Total** | **28** |

## Stack de testing y por qué

| Herramienta | Rol |
|---|---|
| **Mocha** | Ejecutor de tests. Es el framework usado en la cursada y trabaja con ESM sin flags experimentales. |
| **Chai** | Aserciones legibles (`expect(...).to.deep.equal(...)`). |
| **Supertest** | Hace requests HTTP reales contra la app de Express **en memoria**, sin necesidad de levantar el servidor en un puerto. Esto convierte a los tests en funcionales de verdad: atraviesan el router, los middlewares y el controller, igual que un cliente real. |
| **Sinon** | Mocks y stubs. Reemplaza los métodos de los services para aislar MongoDB y, además, permite **auditar las interacciones**: con qué argumentos se llamó cada método, cuántas veces y en qué orden. |
| **@faker-js/faker** | Genera los datos de los fakes con la forma de los documentos reales. |
| **c8** | Reporte de cobertura. |

## Mocks y fakes: cómo se aíslan las dependencias externas

La única dependencia externa de estos endpoints es **MongoDB**. Se aísla en el punto exacto donde el código de aplicación deja de ser propio y pasa a depender de la base:

```
      TEST                                      CÓDIGO REAL                     AISLADO
                     ┌──────────────────────────────────────────────┐    ┌──────────────────┐
supertest ─request──►│ app.js → router → middleware → controller    │    │  DAO → Mongoose  │
                     └──────────────────────┬───────────────────────┘    │   → MongoDB      │
                                            │                            └──────────────────┘
                                            ▼                                     ▲
                              usersService / petsService /                         │
                              adoptionsService  ◄── sinon.stub() ──────────────────┘
                                                    corta acá
```

**Mock (Sinon).** `usersService`, `petsService` y `adoptionsService` son objetos exportados por `src/services/index.js` y sus métodos son propiedades de instancia, por lo que `sinon.stub(objeto, 'metodo')` los reemplaza sin tocar una línea del código de producción:

```javascript
sinon.stub(adoptionsService, 'getAll').resolves(fakeAdoptions)   // camino feliz
sinon.stub(adoptionsService, 'getAll').rejects(new Error('...')) // falla de la base
```

Esto permite provocar escenarios que con una base real serían difíciles o imposibles de reproducir de forma determinista: una caída de MongoDB, un `ValidationError` al crear, o un fallo justo en la segunda de tres escrituras.

**Fake (`test/fixtures/fakes.js`).** Un fake no verifica interacciones: simplemente reemplaza a un documento real con un objeto de la misma forma. Las factories `makeFakeUser`, `makeFakePet` y `makeFakeAdoption` generan documentos válidos con `faker`. Un detalle importante: las fechas se guardan como string ISO y no como `Date`, porque la respuesta HTTP viaja serializada en JSON, y de esa manera el objeto generado puede compararse con `deep.equal` contra el body recibido.

**Higiene entre tests.** `afterEach(() => sinon.restore())` restaura todos los métodos originales después de cada caso. Sin eso, un stub se filtraría al test siguiente y el resultado dependería del orden de ejecución.

**Consecuencia práctica:** los tests no necesitan MongoDB, ni red, ni variables de entorno. Corren en 136 ms y funcionan igual en una máquina local, en un contenedor Alpine sin base de datos o en un pipeline de CI.

## Qué valida cada grupo de tests

### Grupo 1 — `GET /api/adoptions` (4 casos)

| Test | Qué valida |
|---|---|
| Listado completo | 200, `Content-Type: application/json`, `status: "success"`, que el `payload` sea un array con los 3 documentos esperados (comparación exacta con `deep.equal`) y que el service se llame **una sola vez**. |
| Listado vacío | Que la ausencia de adopciones sea un caso válido (200 + array vacío) y no un 404. |
| Forma de cada documento | Que cada elemento del payload exponga `_id`, `owner` y `pet`. Protege el contrato de la API ante cambios en el modelo. |
| Falla del service | Que un error de la base se traduzca en 500 con formato `{ status, error }` y que el mensaje interno (`connect ECONNREFUSED mongodb:27017`) **no se filtre** al cliente. |

### Grupo 2 — `GET /api/adoptions/:aid` (4 casos)

| Test | Qué valida |
|---|---|
| Adopción encontrada | 200, payload exacto y —clave— que el service se haya consultado con `{ _id: aid }`, es decir, que el parámetro de la URL llegue correctamente hasta la capa de datos. |
| Adopción inexistente | 404, `error: "Adoption not found"` y que la respuesta **no** incluya la propiedad `payload`. |
| Id con formato inválido | 400 para cinco formatos distintos (muy corto, muy largo, no hexadecimal, texto libre) y, además, que el service **nunca se llame**: la validación corta la cadena antes del controller. |
| Excepción inesperada | 500 con mensaje genérico. |

### Grupo 3 — `POST /api/adoptions/:uid/:pid` (16 casos)

Es el endpoint con lógica de negocio, y el que concentra la mayor cantidad de casos. Escribe en tres colecciones, por lo que hay que verificar tanto la respuesta como los **efectos**.

**Camino feliz y efectos (7 casos)**

| Test | Qué valida |
|---|---|
| Respuesta 201 | Código 201 Created, `message: "Pet adopted"` y el documento de adopción en el `payload`. |
| Mascota agregada al usuario | Que `usersService.update` reciba el id del usuario y el array `pets` con la nueva mascota en la forma `{ _id }` que declara el esquema. |
| Mascotas previas conservadas | Que a un usuario que ya tenía una mascota se le agregue la nueva **sin perder la anterior**. Este test detecta un bug clásico: sobrescribir el array en lugar de acumular. |
| Mascota marcada como adoptada | Que `petsService.update` reciba exactamente `{ adopted: true, owner: <uid> }`. |
| Adopción creada | Que `adoptionsService.create` reciba exactamente `{ owner: <uid>, pet: <pid> }`. |
| Orden de las operaciones | Con `sinon.assert.callOrder`: primero se busca el usuario, después la mascota, y solo entonces se escribe. Garantiza que las validaciones ocurran antes de tocar la base. |
| Sin body | Que el endpoint funcione sin body, porque toda la información viaja en los parámetros de ruta. |

**Errores de negocio (3 casos)**

| Test | Qué valida |
|---|---|
| Usuario inexistente | 404 `"User not found"` y que **no se consulte la mascota**: el flujo corta en la primera validación fallida. |
| Mascota inexistente | 404 `"Pet not found"` y que ninguna de las tres escrituras se ejecute. |
| Mascota ya adoptada | 400 `"Pet is already adopted"` y que no se vuelva a escribir en la base. Es la regla de negocio central del endpoint. |

**Validación de parámetros (3 casos)**

| Test | Qué valida |
|---|---|
| `uid` inválido | 400, mensaje que menciona `uid`, y que el service no se llame. |
| `pid` inválido | 400, mensaje que menciona `pid`, y que el service no se llame. |
| Ambos inválidos | Que se informe el **primer** parámetro inválido (`uid`), confirmando el orden de validación. |

**Fallas del servidor (2 casos)**

| Test | Qué valida |
|---|---|
| Falla al actualizar el usuario | 500 y que la adopción **no** se cree: el fallo interrumpe la secuencia. |
| Falla al crear la adopción | 500 con mensaje genérico. Este test documenta explícitamente la limitación conocida: las tres escrituras no están en una transacción. |

**Trazabilidad de parámetros (1 caso)**

Verifica que `getUserById` reciba el `uid` tal cual y que la mascota se busque con `{ _id: pid }`.

### Grupo 4 — Contrato del router (4 casos)

Estos tests validan lo que el router **no** debe exponer, algo que suele quedar sin cubrir:

| Test | Qué valida |
|---|---|
| `DELETE /api/adoptions/:aid` | 404 en JSON con el mensaje del `notFoundHandler`. |
| `PUT /api/adoptions/:uid/:pid` | 404: el método POST no habilita PUT sobre la misma ruta. |
| `POST /api/adoptions` | 404: sin parámetros no existe endpoint de creación. |
| Ruta anidada inexistente | 404 con `Content-Type: application/json`, confirmando que ninguna ruta de la API devuelve HTML. |

## Código completo de los tests

### `test/adoption.router.test.js`

```javascript
// Se marca el entorno como "test" antes de que se atienda cualquier request:
// el middleware de errores usa esta bandera para no imprimir stacktraces y
// dejar limpia la salida de mocha (que es la evidencia que se entrega).
process.env.NODE_ENV = 'test'

import { expect } from 'chai'
import sinon from 'sinon'
import supertest from 'supertest'

import app from '../src/app.js'
import { adoptionsService, petsService, usersService } from '../src/services/index.js'
import {
    INVALID_OBJECT_IDS,
    fakeObjectId,
    makeFakeAdoption,
    makeFakeAdoptions,
    makeFakePet,
    makeFakeUser
} from './fixtures/fakes.js'

/**
 * TESTS FUNCIONALES DE src/routes/adoption.router.js
 *
 * Endpoints cubiertos:
 *   GET    /api/adoptions
 *   GET    /api/adoptions/:aid
 *   POST   /api/adoptions/:uid/:pid
 *
 * Estrategia:
 *   - supertest levanta la app de Express en memoria (no hace falta npm start
 *     ni un puerto libre: se importa `app`, que no llama a listen()).
 *   - sinon reemplaza los metodos de usersService / petsService / adoptionsService,
 *     que son la unica puerta de acceso a MongoDB. Con eso la base de datos queda
 *     completamente aislada: los tests no necesitan Mongo ni red.
 *   - los fakes de ./fixtures/fakes.js aportan documentos con la forma real de
 *     los modelos User, Pet y Adoption.
 */
describe('Tests funcionales - adoption.router.js (/api/adoptions)', () => {

    const requester = supertest(app)

    // Cada test deja los services como estaban: sin esto un stub se filtraria
    // al test siguiente y los resultados dependerian del orden de ejecucion.
    afterEach(() => {
        sinon.restore()
    })

    // ---------------------------------------------------------------------------
    // GET /api/adoptions
    // ---------------------------------------------------------------------------
    describe('GET /api/adoptions - listado de adopciones', () => {

        it('responde 200 con status success y el listado completo de adopciones', async () => {
            const fakeAdoptions = makeFakeAdoptions(3)
            const getAll = sinon.stub(adoptionsService, 'getAll').resolves(fakeAdoptions)

            const { statusCode, headers, body } = await requester.get('/api/adoptions')

            expect(statusCode).to.equal(200)
            expect(headers['content-type']).to.contain('application/json')
            expect(body.status).to.equal('success')
            expect(body.payload).to.be.an('array').with.lengthOf(3)
            expect(body.payload).to.deep.equal(fakeAdoptions)
            expect(getAll.calledOnce).to.be.true
        })

        it('responde 200 con un array vacio cuando todavia no hay adopciones', async () => {
            sinon.stub(adoptionsService, 'getAll').resolves([])

            const { statusCode, body } = await requester.get('/api/adoptions')

            expect(statusCode).to.equal(200)
            expect(body.status).to.equal('success')
            expect(body.payload).to.be.an('array').that.is.empty
        })

        it('devuelve cada adopcion con las propiedades _id, owner y pet', async () => {
            sinon.stub(adoptionsService, 'getAll').resolves(makeFakeAdoptions(2))

            const { body } = await requester.get('/api/adoptions')

            body.payload.forEach((adoption) => {
                expect(adoption).to.have.property('_id').that.is.a('string')
                expect(adoption).to.have.property('owner').that.is.a('string')
                expect(adoption).to.have.property('pet').that.is.a('string')
            })
        })

        it('responde 500 sin filtrar detalles internos si el service falla', async () => {
            sinon.stub(adoptionsService, 'getAll').rejects(new Error('connect ECONNREFUSED mongodb:27017'))

            const { statusCode, body } = await requester.get('/api/adoptions')

            expect(statusCode).to.equal(500)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Error interno del servidor')
            expect(body.error).to.not.contain('mongodb')
        })
    })

    // ---------------------------------------------------------------------------
    // GET /api/adoptions/:aid
    // ---------------------------------------------------------------------------
    describe('GET /api/adoptions/:aid - adopcion por id', () => {

        it('responde 200 con la adopcion pedida y consulta el service por _id', async () => {
            const fakeAdoption = makeFakeAdoption()
            const getBy = sinon.stub(adoptionsService, 'getBy').resolves(fakeAdoption)

            const { statusCode, body } = await requester.get(`/api/adoptions/${fakeAdoption._id}`)

            expect(statusCode).to.equal(200)
            expect(body.status).to.equal('success')
            expect(body.payload).to.deep.equal(fakeAdoption)
            expect(getBy.calledOnceWithExactly({ _id: fakeAdoption._id })).to.be.true
        })

        it('responde 404 con status error cuando la adopcion no existe', async () => {
            sinon.stub(adoptionsService, 'getBy').resolves(null)

            const { statusCode, body } = await requester.get(`/api/adoptions/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Adoption not found')
            expect(body).to.not.have.property('payload')
        })

        it('responde 400 y no consulta la base cuando el id no tiene formato de ObjectId', async () => {
            const getBy = sinon.stub(adoptionsService, 'getBy').resolves(makeFakeAdoption())

            for (const invalidId of INVALID_OBJECT_IDS) {
                const { statusCode, body } = await requester.get(`/api/adoptions/${invalidId}`)

                expect(statusCode, `id probado: ${invalidId}`).to.equal(400)
                expect(body.status).to.equal('error')
                expect(body.error).to.contain('aid')
            }

            // La validacion corta la cadena antes del controller: el service nunca se llama.
            expect(getBy.called).to.be.false
        })

        it('responde 500 si el service lanza una excepcion inesperada', async () => {
            sinon.stub(adoptionsService, 'getBy').rejects(new Error('CastError simulado'))

            const { statusCode, body } = await requester.get(`/api/adoptions/${fakeObjectId()}`)

            expect(statusCode).to.equal(500)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Error interno del servidor')
        })
    })

    // ---------------------------------------------------------------------------
    // POST /api/adoptions/:uid/:pid
    // ---------------------------------------------------------------------------
    describe('POST /api/adoptions/:uid/:pid - registrar una adopcion', () => {

        let user
        let pet

        beforeEach(() => {
            user = makeFakeUser()
            pet = makeFakePet()
        })

        /** Deja los cinco metodos del flujo feliz stubbeados y los devuelve para poder auditarlos. */
        const stubCaminoFeliz = (adoption = makeFakeAdoption()) => ({
            getUserById: sinon.stub(usersService, 'getUserById').resolves(user),
            getPetBy: sinon.stub(petsService, 'getBy').resolves(pet),
            updateUser: sinon.stub(usersService, 'update').resolves({ ...user }),
            updatePet: sinon.stub(petsService, 'update').resolves({ ...pet, adopted: true }),
            createAdoption: sinon.stub(adoptionsService, 'create').resolves(adoption)
        })

        it('responde 201 con el mensaje "Pet adopted" y la adopcion creada', async () => {
            const adoption = makeFakeAdoption({ owner: user._id, pet: pet._id })
            stubCaminoFeliz(adoption)

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(201)
            expect(body.status).to.equal('success')
            expect(body.message).to.equal('Pet adopted')
            expect(body.payload).to.deep.equal(adoption)
        })

        it('agrega la mascota al array pets del usuario', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.updateUser.calledOnce).to.be.true
            const [idRecibido, cambios] = stubs.updateUser.firstCall.args
            expect(idRecibido).to.equal(user._id)
            expect(cambios.pets).to.deep.equal([{ _id: pet._id }])
        })

        it('conserva las mascotas que el usuario ya tenia', async () => {
            const mascotaPrevia = { _id: fakeObjectId() }
            user = makeFakeUser({ pets: [mascotaPrevia] })
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            const [, cambios] = stubs.updateUser.firstCall.args
            expect(cambios.pets).to.have.lengthOf(2)
            expect(cambios.pets[0]).to.deep.equal(mascotaPrevia)
            expect(cambios.pets[1]).to.deep.equal({ _id: pet._id })
        })

        it('marca la mascota como adoptada y le asigna el owner', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.updatePet.calledOnceWithExactly(pet._id, { adopted: true, owner: user._id })).to.be.true
        })

        it('crea el documento de adopcion vinculando owner y pet', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.createAdoption.calledOnceWithExactly({ owner: user._id, pet: pet._id })).to.be.true
        })

        it('ejecuta las operaciones en el orden correcto (usuario, mascota, adopcion)', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            sinon.assert.callOrder(
                stubs.getUserById,
                stubs.getPetBy,
                stubs.updateUser,
                stubs.updatePet,
                stubs.createAdoption
            )
        })

        it('funciona sin body: toda la informacion viaja en los parametros de ruta', async () => {
            stubCaminoFeliz()

            const { statusCode } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`).send()

            expect(statusCode).to.equal(201)
        })

        it('responde 404 si el usuario no existe y no sigue consultando la mascota', async () => {
            const getUserById = sinon.stub(usersService, 'getUserById').resolves(null)
            const getPetBy = sinon.stub(petsService, 'getBy').resolves(pet)
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves(makeFakeAdoption())

            const { statusCode, body } = await requester.post(`/api/adoptions/${fakeObjectId()}/${pet._id}`)

            expect(statusCode).to.equal(404)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('User not found')
            expect(getUserById.calledOnce).to.be.true
            expect(getPetBy.called).to.be.false
            expect(createAdoption.called).to.be.false
        })

        it('responde 404 si la mascota no existe y no persiste ningun cambio', async () => {
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(null)
            const updateUser = sinon.stub(usersService, 'update').resolves()
            const updatePet = sinon.stub(petsService, 'update').resolves()
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves()

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
            expect(body.error).to.equal('Pet not found')
            expect(updateUser.called).to.be.false
            expect(updatePet.called).to.be.false
            expect(createAdoption.called).to.be.false
        })

        it('responde 400 si la mascota ya fue adoptada y no vuelve a escribir en la base', async () => {
            pet = makeFakePet({ adopted: true, owner: fakeObjectId() })
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(pet)
            const updateUser = sinon.stub(usersService, 'update').resolves()
            const updatePet = sinon.stub(petsService, 'update').resolves()
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves()

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(400)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Pet is already adopted')
            expect(updateUser.called).to.be.false
            expect(updatePet.called).to.be.false
            expect(createAdoption.called).to.be.false
        })

        it('responde 400 cuando el uid no tiene formato de ObjectId', async () => {
            const getUserById = sinon.stub(usersService, 'getUserById').resolves(user)

            const { statusCode, body } = await requester.post(`/api/adoptions/123/${pet._id}`)

            expect(statusCode).to.equal(400)
            expect(body.error).to.contain('uid')
            expect(getUserById.called).to.be.false
        })

        it('responde 400 cuando el pid no tiene formato de ObjectId', async () => {
            const getPetBy = sinon.stub(petsService, 'getBy').resolves(pet)
            sinon.stub(usersService, 'getUserById').resolves(user)

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/mascota-99`)

            expect(statusCode).to.equal(400)
            expect(body.error).to.contain('pid')
            expect(getPetBy.called).to.be.false
        })

        it('valida el uid antes que el pid cuando los dos son invalidos', async () => {
            const { statusCode, body } = await requester.post('/api/adoptions/uid-roto/pid-roto')

            expect(statusCode).to.equal(400)
            expect(body.error).to.contain('uid')
            expect(body.error).to.not.contain('pid')
        })

        it('responde 500 si falla la actualizacion del usuario y no crea la adopcion', async () => {
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(pet)
            sinon.stub(usersService, 'update').rejects(new Error('Write conflict'))
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves()

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(500)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Error interno del servidor')
            expect(createAdoption.called).to.be.false
        })

        it('responde 500 si falla la creacion de la adopcion', async () => {
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(pet)
            sinon.stub(usersService, 'update').resolves()
            sinon.stub(petsService, 'update').resolves()
            sinon.stub(adoptionsService, 'create').rejects(new Error('ValidationError'))

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(500)
            expect(body.error).to.equal('Error interno del servidor')
        })

        it('busca al usuario por id y a la mascota por _id con los params recibidos', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.getUserById.calledOnceWithExactly(user._id)).to.be.true
            expect(stubs.getPetBy.calledOnceWithExactly({ _id: pet._id })).to.be.true
        })
    })

    // ---------------------------------------------------------------------------
    // Contrato del router: solo deben existir las tres rutas declaradas
    // ---------------------------------------------------------------------------
    describe('Contrato del router', () => {

        it('no expone DELETE /api/adoptions/:aid', async () => {
            const { statusCode, body } = await requester.delete(`/api/adoptions/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
            expect(body.status).to.equal('error')
            expect(body.error).to.contain('Ruta no encontrada')
        })

        it('no expone PUT /api/adoptions/:uid/:pid', async () => {
            const { statusCode } = await requester.put(`/api/adoptions/${fakeObjectId()}/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
        })

        it('no expone POST /api/adoptions sin parametros', async () => {
            const { statusCode } = await requester.post('/api/adoptions')

            expect(statusCode).to.equal(404)
        })

        it('responde 404 con formato JSON ante rutas anidadas inexistentes', async () => {
            const { statusCode, headers, body } = await requester.get(`/api/adoptions/${fakeObjectId()}/extra/ruta`)

            expect(statusCode).to.equal(404)
            expect(headers['content-type']).to.contain('application/json')
            expect(body.status).to.equal('error')
        })
    })
})
```

### `test/fixtures/fakes.js`

```javascript
import { fakerES as faker } from '@faker-js/faker'
import mongoose from 'mongoose'

/**
 * Factories de datos falsos (fakes) usadas por los tests funcionales.
 *
 * Un fake no es un mock: no verifica interacciones, simplemente reemplaza a un
 * documento real de MongoDB con un objeto de la misma forma. Al no depender de
 * la base, los tests son deterministas y corren en cualquier entorno (incluida
 * una imagen Docker sin Mongo).
 *
 * Detalle importante: las fechas se guardan como string ISO y no como Date,
 * porque la respuesta HTTP viaja serializada en JSON. Asi el objeto generado
 * aca puede compararse con deep.equal contra el body de la respuesta.
 */

/** Genera un ObjectId valido (24 caracteres hexadecimales) como string. */
export const fakeObjectId = () => new mongoose.Types.ObjectId().toString()

export const makeFakeUser = (overrides = {}) => ({
    _id: fakeObjectId(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    // Hash de ejemplo: los tests nunca comparan passwords, solo verifican que no se filtre.
    password: '$2b$10$hashDePruebaNoEsUnPasswordReal',
    role: 'user',
    pets: [],
    ...overrides
})

export const makeFakePet = (overrides = {}) => ({
    _id: fakeObjectId(),
    name: faker.animal.petName(),
    specie: faker.helpers.arrayElement(['dog', 'cat', 'rabbit']),
    birthDate: faker.date.past({ years: 8 }).toISOString(),
    adopted: false,
    owner: null,
    image: faker.image.url(),
    ...overrides
})

export const makeFakeAdoption = (overrides = {}) => ({
    _id: fakeObjectId(),
    owner: fakeObjectId(),
    pet: fakeObjectId(),
    ...overrides
})

export const makeFakeAdoptions = (quantity = 3) =>
    Array.from({ length: quantity }, () => makeFakeAdoption())

/**
 * Ids con formato invalido para probar el middleware validateObjectId.
 * Se excluye el string vacio a proposito: `/api/adoptions/` no llega a la ruta
 * `/:aid` sino a `/`, por lo que no sirve para probar la validacion del param.
 */
export const INVALID_OBJECT_IDS = [
    '123',
    'no-es-un-objectid',
    '6889f1abce8e4f2bc9a5d20',
    '6889f1abce8e4f2bc9a5d2011',
    'ZZZZZZZZce8e4f2bc9a5d201'
]
```

### `.mocharc.json`

```json
{
  "spec": ["test/**/*.test.js"],
  "recursive": true,
  "timeout": 10000,
  "reporter": "spec",
  "color": true,
  "exit": true
}
```

## Evidencia de ejecución

### Entorno

```text
# Entorno de ejecucion de las pruebas
Sistema operativo : Windows 10 Pro (10.0.19045)
Node.js           : v22.16.0
npm               : 10.9.2
```

### `npm test`

```text

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


  28 passing (133ms)
```

**28 tests, 28 pasando, 0 fallando.**

### Cobertura del módulo de adopciones — `npm run test:coverage:adoption`

```text

> backend-3_coderhouse@1.0.0 test:coverage:adoption
> c8 --include=src/routes/adoption.router.js --include=src/controllers/adoptions.controller.js --include=src/middlewares/validateObjectId.middleware.js --check-coverage --statements=100 --lines=100 --functions=100 --branches=85 mocha test/adoption.router.test.js



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


  28 passing (150ms)

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

El módulo de adopciones queda con **100% de statements, líneas y funciones**. La única rama sin cubrir es el operador `??` defensivo de la línea 19 de `validateObjectId.middleware.js`, que solo se activaría si Express entregara un parámetro de ruta `undefined`, algo imposible con las rutas declaradas.

El script incluye umbrales (`--check-coverage --statements=100 --lines=100 --functions=100 --branches=85`): si una modificación futura baja la cobertura, el comando falla.

### Cobertura global — `npm run test:coverage`

```text

> backend-3_coderhouse@1.0.0 test:coverage
> c8 mocha



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


  28 passing (143ms)

---------------------------------|---------|----------|---------|---------|-------------------------
File                             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s       
---------------------------------|---------|----------|---------|---------|-------------------------
All files                        |      77 |     94.2 |   24.67 |      77 |                         
 src                             |     100 |      100 |     100 |     100 |                         
  app.js                         |     100 |      100 |     100 |     100 |                         
 src/config                      |       0 |        0 |       0 |       0 |                         
  database.js                    |       0 |        0 |       0 |       0 | 1-20                    
 src/controllers                 |   47.66 |      100 |   13.63 |   47.66 |                         
  adoptions.controller.js        |     100 |      100 |     100 |     100 |                         
  health.controller.js           |   66.66 |      100 |       0 |   66.66 | 17-25                   
  mocks.controller.js            |   46.87 |      100 |       0 |   46.87 | 13-18,22-26,30-34,41-58 
  pets.controller.js             |      25 |      100 |       0 |      25 | ...21,24-46,49-59,62-72 
  sessions.controller.js         |   30.33 |      100 |       0 |   30.33 | 15-30,33-60,63-76,79-82 
  users.controller.js            |   31.48 |      100 |       0 |   31.48 | 5-8,11-19,22-33,36-47   
 src/dao                         |    57.5 |      100 |      15 |    57.5 |                         
  Adoption.dao.js                |   58.33 |      100 |   16.66 |   58.33 | ...11,14-15,18-19,22-23 
  Pets.dao.js                    |   57.14 |      100 |   14.28 |   57.14 | ...15,18-19,22-23,26-27 
  Users.dao.js                   |   57.14 |      100 |   14.28 |   57.14 | ...15,18-19,22-23,26-27 
 src/dao/models                  |     100 |      100 |     100 |     100 |                         
  Adoption.js                    |     100 |      100 |     100 |     100 |                         
  Pet.js                         |     100 |      100 |     100 |     100 |                         
  User.js                        |     100 |      100 |     100 |     100 |                         
 src/dto                         |   34.28 |      100 |      40 |   34.28 |                         
  Pet.dto.js                     |   33.33 |      100 |      50 |   33.33 | 4-11                    
  User.dto.js                    |   34.78 |      100 |   33.33 |   34.78 | 5-10,14-22              
 src/middlewares                 |   96.66 |       75 |     100 |   96.66 |                         
  error.middleware.js            |    93.1 |       60 |     100 |    93.1 | 20-21                   
  validateObjectId.middleware.js |     100 |    85.71 |     100 |     100 | 19                      
 src/repository                  |   71.83 |      100 |   44.44 |   71.83 |                         
  AdoptionRepository.js          |   81.81 |      100 |   66.66 |   81.81 | 9-10                    
  GenericRepository.js           |    64.7 |      100 |      25 |    64.7 | ...21,24-25,28-29,32-33 
  PetRepository.js               |   81.81 |      100 |   66.66 |   81.81 | 9-10                    
  UserRepository.js              |   73.33 |      100 |      50 |   73.33 | 9-10,13-14              
 src/routes                      |     100 |      100 |     100 |     100 |                         
  adoption.router.js             |     100 |      100 |     100 |     100 |                         
  health.router.js               |     100 |      100 |     100 |     100 |                         
  mocks.router.js                |     100 |      100 |     100 |     100 |                         
  pets.router.js                 |     100 |      100 |     100 |     100 |                         
  sessions.router.js             |     100 |      100 |     100 |     100 |                         
  users.router.js                |     100 |      100 |     100 |     100 |                         
 src/services                    |     100 |      100 |     100 |     100 |                         
  index.js                       |     100 |      100 |     100 |     100 |                         
 src/utils                       |   63.15 |      100 |       0 |   63.15 |                         
  index.js                       |   82.35 |      100 |       0 |   82.35 | 8-10                    
  mocking.js                     |      45 |      100 |       0 |      45 | 13-21,24-26,29-36,39-40 
  uploader.js                    |   84.21 |      100 |       0 |   84.21 | 6,9-10                  
---------------------------------|---------|----------|---------|---------|-------------------------
```

La cobertura global es de 77% de statements y 94% de branches. La diferencia corresponde a los módulos que no forman parte del alcance de este entregable (users, pets, sessions, mocks), que no tienen tests propios. Los archivos del flujo de adopciones aparecen todos al 100%.

### Verificación de los endpoints de la API

Salida de un chequeo directo contra la app levantada en memoria (sin MongoDB), que confirma que la aplicación responde y que la especificación OpenAPI se genera con los 16 endpoints:

```text
200 GET /api/health
     {"status":"success","payload":{"uptime":1,"environment":"development","database":"disconnected"}}

200 GET /api/docs.json
     openapi 3.0.3 | paths: 16 | tags: 6

200 GET /api/mocks/mockingpets?quantity=2
     payload con 2 items -> {"name":"Cooper","specie":"cat","birthDate":"2025-05-03T05:20:24.788Z","adopted":false,"image":"https://picsum.photos/se...

200 GET /api/mocks/mockingusers?quantity=1
     payload con 1 items -> {"first_name":"Catalina","last_name":"Zepeda Caballero","email":"gabriel.badillomonroy56@hotmail.com","password":"$2b$10...

400 GET /api/adoptions/id-invalido
     {"status":"error","error":"El parametro aid no es un ObjectId valido: id-invalido"}

404 GET /ruta-inexistente
     {"status":"error","error":"Ruta no encontrada: GET /ruta-inexistente"}
```

### Auditoría de dependencias de producción

```text
found 0 vulnerabilities
```

Las dependencias de producción son las únicas que llegan a la imagen Docker: **0 vulnerabilidades**.

---

# 3. Dockerización

## Contenido completo del Dockerfile

```dockerfile
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
```

## Contenido completo del `.dockerignore`

```text
# Todo lo que no necesita el build. Reduce el contexto que se envia al daemon,
# acelera la construccion y evita filtrar secretos o basura dentro de la imagen.
node_modules
npm-debug.log*
coverage
.nyc_output

# Secretos: las variables se inyectan en runtime con --env-file, nunca se copian.
.env
*.pem

# Control de version y editor
.git
.gitignore
.vscode
.idea

# Documentacion y material de la entrega (no forma parte de la app)
entrega
notas-internas
README.md
*.md

# Imagenes subidas en desarrollo
src/public/img/*
!src/public/img/.gitkeep
```

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

```text
PENDIENTE: pegar aca la salida completa de

    docker build -t thomimunioz/adoptme-backend3:1.0.0 .
```

## Tests ejecutados dentro de la imagen

La etapa `test` corre la suite durante el build. Si un test falla, el build falla, lo que la convierte en una puerta de calidad antes de publicar:

```bash
docker build --target test -t adoptme-tests .
```

```text
PENDIENTE: pegar aca la salida de correr los tests dentro de la imagen

    docker build --target test -t adoptme-tests .
```

---

# 4. Imagen Docker

## Nombre y tag de la imagen

| Dato | Valor |
|---|---|
| Repositorio en DockerHub | `thomimunioz/adoptme-backend3` |
| Tag de versión | `1.0.0` |
| Tag móvil | `latest` |
| Referencia completa | `thomimunioz/adoptme-backend3:1.0.0` |
| URL pública | https://hub.docker.com/r/thomimunioz/adoptme-backend3 |
| Imagen base | `node:22-alpine` |
| Puerto expuesto | `8080` |
| Usuario de ejecución | `node` (uid 1000, no-root) |

### Criterio de etiquetado

Se publican **dos tags apuntando a la misma imagen**:

- **`1.0.0`** — tag inmutable con versionado semántico. Es el que debería usarse en cualquier despliegue, porque garantiza que siempre se ejecute exactamente el mismo artefacto.
- **`latest`** — tag móvil, cómodo para probar rápido. No sirve para producción: cambia con cada publicación, y quien haga `docker pull` en dos momentos distintos puede recibir imágenes diferentes.

```bash
docker build -t thomimunioz/adoptme-backend3:1.0.0 .
docker tag thomimunioz/adoptme-backend3:1.0.0 thomimunioz/adoptme-backend3:latest
```

## Evidencia de que la imagen fue construida correctamente

Log completo del build en la sección 3. Verificación del artefacto generado:

```bash
docker images thomimunioz/adoptme-backend3
docker history thomimunioz/adoptme-backend3:1.0.0
```

```text
PENDIENTE: pegar aca la salida de

    docker images thomimunioz/adoptme-backend3
    docker history thomimunioz/adoptme-backend3:1.0.0
    docker push thomimunioz/adoptme-backend3:1.0.0
```

## Evidencia de ejecución del contenedor

```bash
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/adoptme-backend3:1.0.0
docker ps
docker logs adoptme
curl http://localhost:8080/api/health
curl http://localhost:8080/api/adoptions
```

Salida esperada de `docker logs adoptme`:

```
Conectado a MongoDB
Servidor escuchando en el puerto 8080
Documentacion OpenAPI en http://localhost:8080/api/docs
```

En `docker ps`, la columna `STATUS` debe pasar de `health: starting` a `(healthy)` dentro de los primeros 45 segundos, según la configuración del `HEALTHCHECK`.

```text
PENDIENTE: pegar aca la salida de

    docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/adoptme-backend3:1.0.0
    docker ps
    docker logs adoptme
    curl http://localhost:8080/api/health
    curl http://localhost:8080/api/adoptions
```

## Publicación en DockerHub

```bash
docker login
docker push thomimunioz/adoptme-backend3:1.0.0
docker push thomimunioz/adoptme-backend3:latest
```

### Manejo de credenciales

Para el `docker login` se usa un **Personal Access Token** generado en DockerHub (*Account Settings → Personal access tokens*) y no la contraseña de la cuenta. Ventajas:

- El token se puede revocar sin cambiar la contraseña.
- Se le puede dar permiso de solo lectura o solo escritura.
- Es lo que se usa en un pipeline de CI/CD, donde la contraseña de la cuenta nunca debería estar disponible.

El token no se versiona ni queda en el historial de comandos: se ingresa cuando `docker login` lo solicita por prompt.

## Escaneo básico de seguridad

```bash
docker scout quickview thomimunioz/adoptme-backend3:1.0.0
docker scout cves --only-severity critical,high thomimunioz/adoptme-backend3:1.0.0
```

```text
PENDIENTE: pegar aca la salida del escaneo de seguridad

    docker scout quickview thomimunioz/adoptme-backend3:1.0.0
    docker scout cves --only-severity critical,high thomimunioz/adoptme-backend3:1.0.0
```

### Auditoría de las dependencias de Node

Complemento del escaneo de la imagen: `docker scout` analiza los paquetes del sistema operativo y las dependencias detectadas, mientras que `npm audit` analiza el árbol de npm.

```text
found 0 vulnerabilities
```

**0 vulnerabilidades en las dependencias de producción**, que son las únicas presentes en la imagen. Un `npm audit` sin filtros reporta hallazgos en devDependencies (herramientas de testing), pero esos paquetes son eliminados por la etapa `prune` y no llegan a la imagen publicada.

### Medidas de seguridad aplicadas a la imagen

| Medida | Implementación |
|---|---|
| Imagen base mínima | `node:22-alpine`: menos paquetes, menos CVEs |
| Sin toolchain de compilación | El compilador queda en una etapa intermedia que no se publica |
| Sin devDependencies | Etapa `prune` antes de armar el runtime |
| Proceso no privilegiado | `USER node` (uid 1000) |
| Secretos fuera de la imagen | `.env` excluido por `.dockerignore`; variables inyectadas en runtime |
| Versión de Node fijada | `node:22-alpine` en lugar de `latest` |
| Dependencias fijadas | `npm ci` sobre `package-lock.json` |
| Estado observable | `HEALTHCHECK` sobre `/api/health` |
| Credenciales de registry | Personal Access Token revocable, no la contraseña de la cuenta |

---

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
git clone https://github.com/thomimunioz/backend-3_coderhouse.git
cd backend-3_coderhouse
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
docker build -t thomimunioz/adoptme-backend3:1.0.0 .
docker tag thomimunioz/adoptme-backend3:1.0.0 thomimunioz/adoptme-backend3:latest
```

Verificar el resultado:

```bash
docker images thomimunioz/adoptme-backend3
```

### B.2 Ejecutar el contenedor

**Opción 1 — con el archivo `.env`:**

```bash
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/adoptme-backend3:1.0.0
```

**Opción 2 — con variables explícitas:**

```bash
docker run -d --name adoptme -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/adoptme" \
  -e SECRET_KEY="una-clave-larga-y-aleatoria" \
  thomimunioz/adoptme-backend3:1.0.0
```

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
docker pull thomimunioz/adoptme-backend3:1.0.0
docker run -d --name adoptme -p 8080:8080 \
  -e MONGODB_URI="<tu-uri-de-mongo>" \
  thomimunioz/adoptme-backend3:1.0.0
```

### B.5 Detener y limpiar

```bash
docker stop adoptme          # SIGTERM: el proceso cierra ordenadamente
docker rm adoptme
docker rmi thomimunioz/adoptme-backend3:1.0.0
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

```text
# Entorno de ejecucion de las pruebas
Sistema operativo : Windows 10 Pro (10.0.19045)
Node.js           : v22.16.0
npm               : 10.9.2
```

### Tests — `npm test`

```text

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


  28 passing (133ms)
```

### Cobertura — `npm run test:coverage:adoption`

```text

> backend-3_coderhouse@1.0.0 test:coverage:adoption
> c8 --include=src/routes/adoption.router.js --include=src/controllers/adoptions.controller.js --include=src/middlewares/validateObjectId.middleware.js --check-coverage --statements=100 --lines=100 --functions=100 --branches=85 mocha test/adoption.router.test.js



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


  28 passing (150ms)

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

### Verificación de endpoints de la aplicación

```text
200 GET /api/health
     {"status":"success","payload":{"uptime":1,"environment":"development","database":"disconnected"}}

200 GET /api/docs.json
     openapi 3.0.3 | paths: 16 | tags: 6

200 GET /api/mocks/mockingpets?quantity=2
     payload con 2 items -> {"name":"Cooper","specie":"cat","birthDate":"2025-05-03T05:20:24.788Z","adopted":false,"image":"https://picsum.photos/se...

200 GET /api/mocks/mockingusers?quantity=1
     payload con 1 items -> {"first_name":"Catalina","last_name":"Zepeda Caballero","email":"gabriel.badillomonroy56@hotmail.com","password":"$2b$10...

400 GET /api/adoptions/id-invalido
     {"status":"error","error":"El parametro aid no es un ObjectId valido: id-invalido"}

404 GET /ruta-inexistente
     {"status":"error","error":"Ruta no encontrada: GET /ruta-inexistente"}
```

### Build de la imagen Docker

```text
PENDIENTE: pegar aca la salida completa de

    docker build -t thomimunioz/adoptme-backend3:1.0.0 .
```

### Ejecución del contenedor

```text
PENDIENTE: pegar aca la salida de

    docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/adoptme-backend3:1.0.0
    docker ps
    docker logs adoptme
    curl http://localhost:8080/api/health
    curl http://localhost:8080/api/adoptions
```

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

---

# 6. README

El `README.md` del repositorio es la puerta de entrada al proyecto y está pensado para que cualquier persona pueda reproducirlo **sin información adicional**. Incluye:

- Las URLs del entregable: repositorio de GitHub e imagen pública en DockerHub.
- El stack completo con la versión de cada herramienta.
- Requisitos previos e instalación paso a paso.
- La tabla de variables de entorno, con los tres formatos posibles de `MONGODB_URI` según dónde corra MongoDB.
- La tabla de scripts de npm disponibles.
- El listado de endpoints con sus códigos de respuesta, más un ejemplo de flujo completo con `curl`.
- La explicación de qué testea cada grupo de tests, cómo se aíslan las dependencias externas y la evidencia de ejecución.
- El reporte de cobertura.
- Los comandos exactos para construir la imagen, correr el contenedor, verificar que funciona, publicarla en DockerHub y escanearla.
- La tabla de decisiones de optimización del Dockerfile.
- El árbol de directorios comentado.
- La tabla de decisiones técnicas: cada cambio respecto del proyecto base y su motivo.
- La limitación conocida del endpoint de adopción (tres escrituras sin transacción).

## Contenido completo del `README.md`

````markdown
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
| Repositorio (tests + Dockerfile) | https://github.com/thomimunioz/backend-3_coderhouse |
| Imagen pública en DockerHub | https://hub.docker.com/r/thomimunioz/adoptme-backend3 |
| Imagen y tag | `thomimunioz/adoptme-backend3:1.0.0` |
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
git clone https://github.com/thomimunioz/backend-3_coderhouse.git
cd backend-3_coderhouse
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
docker build -t thomimunioz/adoptme-backend3:1.0.0 .
docker tag thomimunioz/adoptme-backend3:1.0.0 thomimunioz/adoptme-backend3:latest
```

### Correr el contenedor

```bash
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/adoptme-backend3:1.0.0
```

Con MongoDB local en el host, la URI del `.env` debe apuntar a `host.docker.internal`:

```bash
docker run -d --name adoptme -p 8080:8080 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/adoptme" \
  -e SECRET_KEY="una-clave-larga-y-aleatoria" \
  thomimunioz/adoptme-backend3:1.0.0
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

<!-- PENDIENTE: pegar la salida real de `docker build -t thomimunioz/adoptme-backend3:1.0.0 .` -->

### Log de ejecución del contenedor

<!-- PENDIENTE: pegar la salida real de `docker logs adoptme` -->

---

## DockerHub

Imagen pública: **https://hub.docker.com/r/thomimunioz/adoptme-backend3**

```bash
docker login
docker push thomimunioz/adoptme-backend3:1.0.0
docker push thomimunioz/adoptme-backend3:latest
```

Para usarla sin clonar el repositorio:

```bash
docker pull thomimunioz/adoptme-backend3:1.0.0
docker run -d -p 8080:8080 -e MONGODB_URI="<tu-uri>" thomimunioz/adoptme-backend3:1.0.0
```

### Escaneo de seguridad

```bash
docker scout quickview thomimunioz/adoptme-backend3:1.0.0
docker scout cves thomimunioz/adoptme-backend3:1.0.0
npm audit --omit=dev
```

`npm audit --omit=dev` reporta **0 vulnerabilidades** en las dependencias de producción, que son las únicas que llegan a la imagen. Las vulnerabilidades reportadas por `npm audit` sin filtros pertenecen a devDependencies (herramientas de testing), que la etapa `prune` elimina antes de construir la imagen final.

<!-- PENDIENTE: pegar la salida real de `docker scout quickview` -->

---

## Estructura del proyecto

```
backend-3_coderhouse/
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
````
