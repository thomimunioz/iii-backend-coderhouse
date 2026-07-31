/**
 * Convierte entrega/ENTREGABLE.md en un HTML listo para imprimir a PDF o para
 * copiar y pegar dentro de un Google Docs conservando el formato.
 *
 * Uso:
 *     npm install marked --no-save
 *     node entrega/generar-html.mjs
 *
 * Después: abrir entrega/ENTREGABLE.html en el navegador y
 *   - Ctrl+P -> "Guardar como PDF"   (para entregar en PDF), o
 *   - Ctrl+A, Ctrl+C y pegar en un documento de Google Docs.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ESTILOS = `
    :root { color-scheme: light; }

    body {
        font-family: "Segoe UI", Calibri, Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.55;
        color: #1a1a1a;
        background: #ffffff;
        max-width: 190mm;
        margin: 0 auto;
        padding: 12mm 10mm;
    }

    h1, h2, h3, h4 { line-height: 1.25; page-break-after: avoid; }

    h1 {
        font-size: 21pt;
        color: #0b3d63;
        border-bottom: 2.5px solid #0b3d63;
        padding-bottom: 6px;
        margin-top: 30px;
    }
    /* Cada sección numerada arranca en página nueva al imprimir */
    h1 + hr, hr + h1 { page-break-before: always; }

    h2 { font-size: 15.5pt; color: #14507d; margin-top: 26px; }
    h3 { font-size: 12.5pt; color: #24618f; margin-top: 20px; }
    h4 { font-size: 11pt; color: #333; margin-top: 16px; }

    p { margin: 9px 0; text-align: justify; }

    /* Bloques de código: se permite el corte de línea para que nada quede
       fuera del margen del PDF. */
    pre {
        background: #f6f8fa;
        border: 1px solid #d5dbe1;
        border-left: 3.5px solid #0b3d63;
        border-radius: 4px;
        padding: 10px 12px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        page-break-inside: avoid;
    }

    pre code {
        font-family: Consolas, "Courier New", monospace;
        font-size: 8.6pt;
        line-height: 1.4;
        background: none;
        padding: 0;
        color: #1a1a1a;
    }

    :not(pre) > code {
        font-family: Consolas, "Courier New", monospace;
        font-size: 9.2pt;
        background: #eef1f4;
        border: 1px solid #dde2e7;
        border-radius: 3px;
        padding: 1px 5px;
        color: #a3234a;
    }

    table {
        border-collapse: collapse;
        width: 100%;
        margin: 14px 0;
        font-size: 9.8pt;
        page-break-inside: avoid;
    }

    th, td { border: 1px solid #c9d1d9; padding: 6px 9px; text-align: left; vertical-align: top; }
    th { background: #0b3d63; color: #ffffff; font-weight: 600; }
    tr:nth-child(even) td { background: #f6f8fa; }

    blockquote {
        border-left: 3.5px solid #b8c4ce;
        margin: 12px 0;
        padding: 2px 14px;
        color: #4a5563;
        background: #fafbfc;
    }

    ul, ol { margin: 9px 0; padding-left: 26px; }
    li { margin: 4px 0; }

    hr { border: none; border-top: 1px solid #d5dbe1; margin: 26px 0; }

    a { color: #14507d; text-decoration: none; word-break: break-all; }

    img { max-width: 100%; height: auto; page-break-inside: avoid; }

    @page { size: A4; margin: 14mm 12mm; }

    @media print {
        body { padding: 0; max-width: none; }
        pre { border-left-width: 3px; }
    }
`

const main = async () => {
    const md = await readFile(join(__dirname, 'ENTREGABLE.md'), 'utf8')

    marked.setOptions({ gfm: true, breaks: false })
    const cuerpo = marked.parse(md)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Proyecto Final Backend III — Thomas Muñoz</title>
<style>${ESTILOS}</style>
</head>
<body>
${cuerpo}
</body>
</html>
`

    const salida = join(__dirname, 'ENTREGABLE.html')
    await writeFile(salida, html, 'utf8')

    console.log(`Generado: ${salida}`)
    console.log(`Tamano:   ${(html.length / 1024).toFixed(0)} KB`)
    console.log('\nAbrirlo en el navegador y usar Ctrl+P > "Guardar como PDF",')
    console.log('o Ctrl+A / Ctrl+C para pegarlo en un Google Docs.')
}

main().catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('Falta la dependencia: correr primero  npm install marked --no-save')
        process.exit(1)
    }
    console.error(error.message)
    process.exit(1)
})
