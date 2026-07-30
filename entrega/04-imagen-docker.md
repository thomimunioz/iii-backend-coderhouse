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

{{LOG:entrega/logs/docker-imagen.log}}

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

{{LOG:entrega/logs/docker-run.log}}

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

{{LOG:entrega/logs/docker-scout.log}}

### Auditoría de las dependencias de Node

Complemento del escaneo de la imagen: `docker scout` analiza los paquetes del sistema operativo y las dependencias detectadas, mientras que `npm audit` analiza el árbol de npm.

{{LOG:entrega/logs/npm-audit-produccion.log}}

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
