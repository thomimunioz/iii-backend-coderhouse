import 'dotenv/config'
import mongoose from 'mongoose'

import app from './src/app.js'
import connectDB from './src/config/database.js'

const PORT = process.env.PORT || 8080

// El entrypoint solo orquesta el arranque: primero levanta la conexion a Mongo
// y despues pone a escuchar Express. app.js no escucha ni conecta, por eso los
// tests pueden importar la app sin abrir un puerto ni tocar la base de datos.
const bootstrap = async () => {
    await connectDB()

    const server = app.listen(PORT, () => {
        console.log(`Servidor escuchando en el puerto ${PORT}`)
        console.log(`Documentacion OpenAPI en http://localhost:${PORT}/api/docs`)
    })

    /**
     * Apagado ordenado. Dentro del contenedor este proceso es PID 1, asi que
     * `docker stop` le manda SIGTERM directo: si no se escucha esa senal, Docker
     * espera 10 segundos y lo mata a la fuerza (SIGKILL), dejando conexiones a
     * medias. Con estos handlers el proceso cierra el servidor HTTP, corta la
     * conexion a Mongo y sale limpio, sin necesidad de un init externo.
     */
    const shutdown = async (signal) => {
        console.log(`${signal} recibido, cerrando la aplicacion...`)

        server.close(async () => {
            await mongoose.connection.close()
            console.log('Servidor HTTP y conexion a MongoDB cerrados')
            process.exit(0)
        })

        // Red de seguridad: si algo queda colgado, no esperar para siempre.
        setTimeout(() => process.exit(1), 10000).unref()
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((error) => {
    console.error('No se pudo iniciar la aplicacion:', error.message)
    process.exit(1)
})
