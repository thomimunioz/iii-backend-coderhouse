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

{{ARCHIVO:README.md}}
