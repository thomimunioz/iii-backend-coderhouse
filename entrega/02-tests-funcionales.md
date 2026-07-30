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

{{ARCHIVO:test/adoption.router.test.js}}

### `test/fixtures/fakes.js`

{{ARCHIVO:test/fixtures/fakes.js}}

### `.mocharc.json`

{{ARCHIVO:.mocharc.json}}

## Evidencia de ejecución

### Entorno

{{LOG:entrega/logs/entorno.log}}

### `npm test`

{{LOG:entrega/logs/test.log}}

**28 tests, 28 pasando, 0 fallando.**

### Cobertura del módulo de adopciones — `npm run test:coverage:adoption`

{{LOG:entrega/logs/test-coverage-adoption.log}}

El módulo de adopciones queda con **100% de statements, líneas y funciones**. La única rama sin cubrir es el operador `??` defensivo de la línea 19 de `validateObjectId.middleware.js`, que solo se activaría si Express entregara un parámetro de ruta `undefined`, algo imposible con las rutas declaradas.

El script incluye umbrales (`--check-coverage --statements=100 --lines=100 --functions=100 --branches=85`): si una modificación futura baja la cobertura, el comando falla.

### Cobertura global — `npm run test:coverage`

{{LOG:entrega/logs/test-coverage-global.log}}

La cobertura global es de 77% de statements y 94% de branches. La diferencia corresponde a los módulos que no forman parte del alcance de este entregable (users, pets, sessions, mocks), que no tienen tests propios. Los archivos del flujo de adopciones aparecen todos al 100%.

### Verificación de los endpoints de la API

Salida de un chequeo directo contra la app levantada en memoria (sin MongoDB), que confirma que la aplicación responde y que la especificación OpenAPI se genera con los 16 endpoints:

{{LOG:entrega/logs/verificacion-endpoints.log}}

### Auditoría de dependencias de producción

{{LOG:entrega/logs/npm-audit-produccion.log}}

Las dependencias de producción son las únicas que llegan a la imagen Docker: **0 vulnerabilidades**.
