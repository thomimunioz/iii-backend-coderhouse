# Qué falta para cerrar la entrega

Nota interna: no forma parte del entregable.

## Estado actual

| Ítem de la consigna | Estado |
|---|---|
| Tests funcionales de todos los endpoints de `adoption.router.js` | **Listo** — 28 tests, 28 pasando |
| Mocks y fakes para aislar dependencias externas | **Listo** — Sinon sobre los services + factories con faker |
| Cobertura completa y casos variados | **Listo** — 100% en el módulo de adopciones (statements, líneas, funciones) |
| Tests ejecutados y verificados | **Listo** — log en `entrega/logs/test.log` |
| Dockerfile optimizado | **Listo** — multi-stage de 5 etapas, Alpine, no-root, healthcheck |
| Construir la imagen localmente y probarla | Pendiente: requiere Docker instalado |
| Subir la imagen a DockerHub | Pendiente |
| Escaneo básico de seguridad | Parcial: `npm audit --omit=dev` ya da 0 vulnerabilidades; falta `docker scout` |
| README actualizado | **Listo** — faltan solo los logs de Docker |
| Documento del entregable | **Listo** — `entrega/ENTREGABLE.md`, faltan los 7 logs de Docker |
| Repositorio público en GitHub | Pendiente: crear el repo y pushear |
| Google Docs | Pendiente: copiar `ENTREGABLE.md` |

---

## 1. Confirmar el usuario de DockerHub

Toda la documentación asume `thomimunioz` como usuario de DockerHub y la imagen
`thomimunioz/adoptme-backend3`. **Si tu usuario de DockerHub es distinto**, hay que cambiarlo en
cuatro lugares:

```
README.md                          (tabla de enlaces, comandos de docker, sección DockerHub)
Dockerfile                         (LABEL org.opencontainers.image.source)
entrega/04-imagen-docker.md        (tabla de datos de la imagen)
entrega/generar-entregable.mjs     (objeto DATOS)
```

Buscar y reemplazar `thomimunioz` y regenerar el documento.

---

## 2. Secuencia completa de Docker

Con Docker Desktop abierto, desde `G:\Thomi - Mi Carpeta\CODERHOUSE\backend-3_coderhouse`:

```powershell
# --- Build ---
docker build -t thomimunioz/adoptme-backend3:1.0.0 . 2>&1 | Tee-Object entrega\logs\docker-build.log

# --- Tests dentro de la imagen ---
docker build --target test -t adoptme-tests . 2>&1 | Tee-Object entrega\logs\docker-test-target.log

# --- Tamaño y capas de la imagen ---
docker images thomimunioz/adoptme-backend3 | Tee-Object entrega\logs\docker-imagen.log
docker history thomimunioz/adoptme-backend3:1.0.0 | Tee-Object -Append entrega\logs\docker-imagen.log

# --- Correr el contenedor ---
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/adoptme-backend3:1.0.0
Start-Sleep -Seconds 20
docker ps | Tee-Object entrega\logs\docker-run.log
docker logs adoptme 2>&1 | Tee-Object -Append entrega\logs\docker-run.log
curl.exe http://localhost:8080/api/health | Tee-Object -Append entrega\logs\docker-run.log
curl.exe http://localhost:8080/api/adoptions | Tee-Object -Append entrega\logs\docker-run.log

# --- Confirmar que NO corre como root ---
docker exec adoptme id | Tee-Object -Append entrega\logs\docker-run.log

# --- Tag y push ---
docker tag thomimunioz/adoptme-backend3:1.0.0 thomimunioz/adoptme-backend3:latest
docker login -u thomimunioz
docker push thomimunioz/adoptme-backend3:1.0.0 2>&1 | Tee-Object -Append entrega\logs\docker-imagen.log
docker push thomimunioz/adoptme-backend3:latest 2>&1 | Tee-Object -Append entrega\logs\docker-imagen.log

# --- Escaneo de seguridad ---
docker scout quickview thomimunioz/adoptme-backend3:1.0.0 2>&1 | Tee-Object entrega\logs\docker-scout.log
docker scout cves --only-severity critical,high thomimunioz/adoptme-backend3:1.0.0 2>&1 | Tee-Object -Append entrega\logs\docker-scout.log

# --- Limpieza ---
docker stop adoptme
docker rm adoptme
```

Requisito previo: que exista el `.env` con un `MONGODB_URI` que funcione. Si Mongo corre en esta
máquina (no en un contenedor), la URI dentro del contenedor tiene que usar `host.docker.internal`
en lugar de `localhost`.

Después de generar los logs:

```powershell
node entrega\generar-entregable.mjs
```

Ya no debería avisar sobre logs pendientes.

---

## 3. Capturas de pantalla (`entrega/capturas/`)

Las capturas refuerzan la evidencia. Las más valiosas:

| Archivo sugerido | Qué capturar |
|---|---|
| `01-tests-passing.png` | La terminal con los 28 tests en verde |
| `02-coverage.png` | La tabla de cobertura, o `coverage/index.html` en el navegador |
| `03-swagger.png` | `http://localhost:8080/api/docs` con los endpoints desplegados |
| `04-docker-build.png` | El final del build mostrando el `naming to docker.io/...` |
| `05-docker-ps-healthy.png` | `docker ps` con el STATUS en `(healthy)` |
| `06-health-contenedor.png` | La respuesta de `/api/health` con la app corriendo en Docker |
| `07-dockerhub.png` | La página pública del repositorio en DockerHub |
| `08-adopcion-201.png` | Postman mostrando el `POST /api/adoptions/:uid/:pid` con 201 |

---

## 4. Repositorio en GitHub

```powershell
cd "G:\Thomi - Mi Carpeta\CODERHOUSE\backend-3_coderhouse"
git init
git add .
git commit -m "Proyecto Final Backend III: tests funcionales, Docker y documentacion"
git branch -M main
```

Crear el repositorio **público** `backend-3_coderhouse` en https://github.com/new
(sin README, sin .gitignore, sin licencia: el repo local ya los tiene) y después:

```powershell
git remote add origin https://github.com/thomimunioz/backend-3_coderhouse.git
git push -u origin main
```

Verificar en GitHub que **no** se haya subido el `.env` (está en `.gitignore`, pero conviene mirarlo).

---

## 5. Google Docs

1. Abrir `entrega/ENTREGABLE.md`.
2. Copiar todo el contenido y pegarlo en un Google Docs nuevo.
3. Insertar las capturas de `entrega/capturas/` en las secciones de evidencia.
4. Verificar que las dos URLs (GitHub y DockerHub) abran correctamente en una ventana de incógnito:
   la consigna evalúa que sean accesibles públicamente.
