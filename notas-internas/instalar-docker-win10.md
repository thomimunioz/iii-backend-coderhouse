# Instalar Docker Desktop en Windows 10 Pro (build 19045)

Nota interna: no forma parte del entregable. Es la guía para dejar Docker andando en esta máquina.

Tu equipo cumple los requisitos: **Windows 10 Pro 22H2 (build 19045)**, que es el mínimo que pide Docker Desktop 4.x.

---

## Paso 0 — Verificar que la virtualización esté activa

Abrí el **Administrador de tareas** (`Ctrl+Shift+Esc`) → pestaña **Rendimiento** → **CPU**. Abajo a la derecha tiene que decir:

```
Virtualización: Habilitada
```

Si dice *Deshabilitada*, hay que activarla en el BIOS/UEFI (reiniciar y entrar con `F2`, `F10`, `F12` o `Del` según el equipo). La opción se llama **Intel VT-x**, **Intel Virtualization Technology** o **AMD-V / SVM Mode**.

---

## Paso 1 — Instalar WSL 2

Docker Desktop usa WSL 2 como backend. Abrí **PowerShell como Administrador** (botón derecho en Inicio → *Windows PowerShell (Administrador)*) y ejecutá:

```powershell
wsl --install
```

Eso habilita las dos características necesarias (*Subsistema de Windows para Linux* y *Plataforma de máquina virtual*), descarga el kernel y instala Ubuntu por defecto.

**Reiniciar la máquina.**

Después del reinicio, verificar:

```powershell
wsl --status
wsl --version
```

Debe reportar `Versión predeterminada: 2`. Si no:

```powershell
wsl --set-default-version 2
wsl --update
```

### Si `wsl --install` no existe (comando no reconocido)

Ruta manual, también en PowerShell como Administrador:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Reiniciar, descargar e instalar el paquete de actualización del kernel de Linux desde
https://aka.ms/wsl2kernel y después:

```powershell
wsl --set-default-version 2
```

---

## Paso 2 — Instalar Docker Desktop

1. Descargar el instalador desde https://www.docker.com/products/docker-desktop/ → **Download for Windows (AMD64)**.
2. Ejecutar `Docker Desktop Installer.exe`.
3. En la pantalla de configuración, dejar marcado **"Use WSL 2 instead of Hyper-V"**.
4. Finalizar y **reiniciar la sesión de Windows** si lo pide.
5. Abrir **Docker Desktop** desde el menú Inicio y esperar a que el ícono de la ballena (abajo a la derecha) deje de moverse: eso significa que el daemon está corriendo.

> Docker Desktop tiene que quedar **abierto**. Si se cierra, el daemon se apaga y cualquier comando `docker` falla con `error during connect`.

---

## Paso 3 — Verificar la instalación

**Cerrá y volvé a abrir la terminal (y VSCode)** para que tome el nuevo PATH. Después:

```powershell
docker --version
docker compose version
docker info
docker run --rm hello-world
```

El último comando descarga una imagen mínima y la ejecuta. Si imprime *"Hello from Docker!"*, está todo listo.

---

## Paso 4 — Crear la cuenta y el token de DockerHub

1. Crear cuenta en https://hub.docker.com (si no tenés). Anotá el **usuario exacto**: es el prefijo del nombre de la imagen (`USUARIO/adoptme-backend3`).
2. Crear el repositorio: **Repositories → Create repository**
   - Name: `adoptme-backend3`
   - Visibility: **Public** (la consigna pide que la URL sea accesible públicamente)
3. Generar un token en lugar de usar la contraseña: **Account Settings → Personal access tokens → Generate new token**
   - Description: `backend3-coderhouse`
   - Permissions: **Read & Write**
   - Copiar el token (se muestra una sola vez).
4. Loguearse desde la terminal:

```powershell
docker login -u thomimunioz
# cuando pida password, pegar el TOKEN (no la contraseña de la cuenta)
```

---

## Problemas frecuentes

| Error | Causa y solución |
|---|---|
| `error during connect: ... The system cannot find the file specified` | Docker Desktop no está abierto. Abrilo y esperá a que el ícono se estabilice. |
| `docker: command not found` / `no se reconoce` | Falta reiniciar la terminal después de instalar, para que tome el PATH. |
| `WSL 2 installation is incomplete` | Falta el paquete del kernel: https://aka.ms/wsl2kernel |
| `Hardware assisted virtualization ... not enabled` | Virtualización deshabilitada en el BIOS (ver Paso 0). |
| Docker Desktop tarda muchísimo en arrancar | Normal la primera vez. Si queda colgado: botón derecho en la ballena → *Restart*. |
| `denied: requested access to the resource is denied` al pushear | El nombre de la imagen no coincide con tu usuario de DockerHub, o falta `docker login`. |
