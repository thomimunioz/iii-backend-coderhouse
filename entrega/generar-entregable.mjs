/**
 * Genera entrega/ENTREGABLE.md a partir de las seis secciones numeradas.
 *
 * Reemplaza dos tipos de marcador:
 *   {{ARCHIVO:ruta/relativa/a/la/raiz}}  -> bloque de codigo con el contenido real del archivo
 *   {{LOG:ruta/relativa/a/la/raiz}}      -> bloque de texto con la salida de consola guardada
 *
 * De esta forma el documento nunca queda desincronizado del codigo: si se toca
 * un test o se pegan los logs reales de Docker, alcanza con volver a correr:
 *
 *     node entrega/generar-entregable.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '..')

const SECCIONES = [
    '01-estructura.md',
    '02-tests-funcionales.md',
    '03-dockerizacion.md',
    '04-imagen-docker.md',
    '05-ejecucion.md',
    '06-readme.md'
]

const DATOS = {
    titulo: 'Proyecto Final — Backend III',
    subtitulo: 'API AdoptMe: tests funcionales, dockerización y documentación',
    curso: 'Backend III — Coderhouse',
    alumno: 'Thomas Muñoz',
    repositorio: 'https://github.com/thomimunioz/iii-backend-coderhouse',
    dockerhub: 'https://hub.docker.com/r/thomimunioz/iii-backend-coderhouse',
    imagen: 'thomimunioz/iii-backend-coderhouse:1.0.0'
}

const LENGUAJE_POR_EXTENSION = {
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
    '.yml': 'yaml',
    '.yaml': 'yaml'
}

const detectarLenguaje = (ruta) => {
    if (basename(ruta) === 'Dockerfile') return 'dockerfile'
    return LENGUAJE_POR_EXTENSION[extname(ruta)] ?? 'text'
}

/**
 * Si el contenido ya trae backticks triples (por ejemplo el README, que es
 * markdown con bloques de codigo adentro), se abre la cerca con cuatro para
 * que el bloque no se corte a la mitad.
 */
const armarBloque = (contenido, lenguaje) => {
    const cerca = contenido.includes('```') ? '````' : '```'
    return `${cerca}${lenguaje}\n${contenido.replace(/\r\n/g, '\n').trimEnd()}\n${cerca}`
}

const leerArchivo = async (rutaRelativa) => {
    try {
        return await readFile(join(RAIZ, rutaRelativa), 'utf8')
    } catch {
        throw new Error(`No se encontro el archivo referenciado en un marcador: ${rutaRelativa}`)
    }
}

const resolverMarcadores = async (texto) => {
    const marcadores = [...texto.matchAll(/\{\{(ARCHIVO|LOG):([^}]+)\}\}/g)]
    let resultado = texto
    let pendientes = 0

    for (const [completo, tipo, rutaRelativa] of marcadores) {
        const contenido = await leerArchivo(rutaRelativa.trim())

        if (contenido.startsWith('PENDIENTE')) {
            pendientes++
            console.warn(`  ! log pendiente: ${rutaRelativa.trim()}`)
        }

        const lenguaje = tipo === 'LOG' ? 'text' : detectarLenguaje(rutaRelativa.trim())
        resultado = resultado.replace(completo, armarBloque(contenido, lenguaje))
    }

    return { resultado, pendientes }
}

const construirPortada = () => {
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

    return `# ${DATOS.titulo}

## ${DATOS.subtitulo}

**Curso:** ${DATOS.curso}
**Alumno:** ${DATOS.alumno}
**Fecha:** ${fecha}

| Recurso | URL |
|---|---|
| Repositorio (tests + Dockerfile) | ${DATOS.repositorio} |
| Imagen pública en DockerHub | ${DATOS.dockerhub} |
| Imagen y tag | \`${DATOS.imagen}\` |

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

`
}

const main = async () => {
    const partes = [construirPortada()]
    let pendientesTotales = 0

    for (const seccion of SECCIONES) {
        console.log(`> ${seccion}`)
        const texto = await readFile(join(__dirname, seccion), 'utf8')
        const { resultado, pendientes } = await resolverMarcadores(texto)
        pendientesTotales += pendientes
        partes.push(resultado.replace(/\r\n/g, '\n').trimEnd())
    }

    const salida = join(__dirname, 'ENTREGABLE.md')
    await writeFile(salida, partes.join('\n\n---\n\n') + '\n', 'utf8')

    console.log(`\nGenerado: ${salida}`)

    if (pendientesTotales > 0) {
        console.log(`ATENCION: quedan ${pendientesTotales} log(s) sin completar en entrega/logs/.`)
        console.log('Pegar la salida real de Docker en esos archivos y volver a correr este script.')
    }
}

main().catch((error) => {
    console.error(error.message)
    process.exit(1)
})
