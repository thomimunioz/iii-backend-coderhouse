# 4. Imagen Docker

## Nombre y tag de la imagen

| Dato | Valor |
|---|---|
| Repositorio en DockerHub | `thomimunioz/iii-backend-coderhouse` |
| Tag de versión | `1.0.0` |
| Tag móvil | `latest` |
| Referencia completa | `thomimunioz/iii-backend-coderhouse:1.0.0` |
| URL pública | https://hub.docker.com/r/thomimunioz/iii-backend-coderhouse |
| Imagen base | `node:22-alpine` |
| Puerto expuesto | `8080` |
| Usuario de ejecución | `node` (uid 1000, no-root) |

### Criterio de etiquetado

Se publican **dos tags apuntando a la misma imagen**:

- **`1.0.0`** — tag inmutable con versionado semántico. Es el que debería usarse en cualquier despliegue, porque garantiza que siempre se ejecute exactamente el mismo artefacto.
- **`latest`** — tag móvil, cómodo para probar rápido. No sirve para producción: cambia con cada publicación, y quien haga `docker pull` en dos momentos distintos puede recibir imágenes diferentes.

```bash
docker build -t thomimunioz/iii-backend-coderhouse:1.0.0 .
docker tag thomimunioz/iii-backend-coderhouse:1.0.0 thomimunioz/iii-backend-coderhouse:latest
```

## Evidencia de que la imagen fue construida correctamente

Log completo del build en la sección 3. Verificación del artefacto generado:

```bash
docker images thomimunioz/iii-backend-coderhouse
docker history thomimunioz/iii-backend-coderhouse:1.0.0
```

{{LOG:entrega/logs/docker-imagen.log}}

## Evidencia de ejecución del contenedor

```bash
docker run -d --name adoptme -p 8080:8080 --env-file .env thomimunioz/iii-backend-coderhouse:1.0.0
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
docker push thomimunioz/iii-backend-coderhouse:1.0.0
docker push thomimunioz/iii-backend-coderhouse:latest
```

### Manejo de credenciales

Para el `docker login` se usa un **Personal Access Token** generado en DockerHub (*Account Settings → Personal access tokens*) y no la contraseña de la cuenta. Ventajas:

- El token se puede revocar sin cambiar la contraseña.
- Se le puede dar permiso de solo lectura o solo escritura.
- Es lo que se usa en un pipeline de CI/CD, donde la contraseña de la cuenta nunca debería estar disponible.

El token no se versiona ni queda en el historial de comandos: se ingresa cuando `docker login` lo solicita por prompt.

## Escaneo básico de seguridad

Se usaron **dos escáneres independientes** para no depender de una sola base de datos de vulnerabilidades:

```bash
docker scout quickview thomimunioz/iii-backend-coderhouse:1.0.0
docker scout cves --only-severity critical,high thomimunioz/iii-backend-coderhouse:1.0.0
```

### Primer escaneo: el hallazgo

{{LOG:entrega/logs/docker-scout-antes.log}}

### Análisis del hallazgo y corrección aplicada

La primera versión de la imagen arrojó **1 vulnerabilidad crítica y 5 altas**, repartidas en cuatro paquetes: `tar`, `brace-expansion`, `sigstore` y `picomatch`.

El dato clave es que **ninguno de esos paquetes pertenece al proyecto**. Tres evidencias lo confirman:

1. `npm audit --omit=dev` sobre las dependencias de la aplicación reporta **0 vulnerabilidades**.
2. Trivy, analizando `/app/node_modules` paquete por paquete, reporta **0 vulnerabilidades**.
3. Trivy, analizando el sistema operativo (Alpine 3.24.1), reporta **0 vulnerabilidades**.

Los cuatro paquetes son **dependencias internas de npm**, que viene preinstalado en `node:22-alpine` bajo `/usr/local/lib/node_modules/npm/`. Es decir: los CVE los aportaba la herramienta de instalación, no el código ni las librerías del proyecto.

La corrección aprovecha que **la aplicación no usa npm en tiempo de ejecución**: el contenedor arranca con `node server.js`, y tanto el `HEALTHCHECK` como el apagado ordenado usan el binario `node` directamente. Por lo tanto, npm se elimina de la etapa final:

```dockerfile
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx
```

Esto produce dos beneficios:

| Beneficio | Detalle |
|---|---|
| Elimina los 6 CVE | Los paquetes vulnerables dejan de existir en el sistema de archivos de la imagen |
| Reduce la superficie de ataque | Un contenedor productivo sin gestor de paquetes impide que, ante una ejecución remota de código, el atacante instale herramientas adicionales |

Una aclaración honesta sobre el tamaño: borrar archivos en una capa superior **no achica** la imagen en disco, porque los archivos siguen existiendo en la capa base y solo se marcan como eliminados. Lo que cambia es el sistema de archivos efectivo del contenedor, que es lo que analizan los escáneres y lo que ve un proceso corriendo adentro. La ganancia acá es de seguridad, no de peso.

### Segundo escaneo: verificación de la corrección

Escaneo de la imagen publicada, ya sin npm:

{{LOG:entrega/logs/docker-scout.log}}

### Segunda opinión: Trivy

{{LOG:entrega/logs/trivy-resumen.log}}

### Auditoría de las dependencias de Node

Complemento del escaneo de la imagen: `docker scout` y Trivy analizan la imagen completa (sistema operativo y paquetes detectados), mientras que `npm audit` analiza el árbol de dependencias declarado en `package.json`.

{{LOG:entrega/logs/npm-audit-produccion.log}}

**0 vulnerabilidades en las dependencias de producción**, que son las únicas presentes en la imagen. Un `npm audit` sin filtros reporta hallazgos en devDependencies (herramientas de testing), pero esos paquetes son eliminados por la etapa `prune` y no llegan a la imagen publicada.

### Medidas de seguridad aplicadas a la imagen

| Medida | Implementación |
|---|---|
| Imagen base mínima | `node:22-alpine`: menos paquetes, menos CVEs |
| Sin toolchain de compilación | El compilador queda en una etapa intermedia que no se publica |
| Sin devDependencies | Etapa `prune` antes de armar el runtime |
| Sin gestor de paquetes | `npm` y `npx` eliminados de la etapa final: no se usan en runtime |
| Doble escaneo | Docker Scout y Trivy, con bases de datos de vulnerabilidades distintas |
| Proceso no privilegiado | `USER node` (uid 1000) |
| Secretos fuera de la imagen | `.env` excluido por `.dockerignore`; variables inyectadas en runtime |
| Versión de Node fijada | `node:22-alpine` en lugar de `latest` |
| Dependencias fijadas | `npm ci` sobre `package-lock.json` |
| Estado observable | `HEALTHCHECK` sobre `/api/health` |
| Credenciales de registry | Personal Access Token revocable, no la contraseña de la cuenta |
