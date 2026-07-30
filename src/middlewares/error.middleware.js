/**
 * Cierre de la cadena de Express.
 *
 * Express 5 reenvia automaticamente las promesas rechazadas de los handlers async
 * a un middleware de error, asi que un fallo de MongoDB (o de cualquier service)
 * termina aca y se responde 500 con la misma forma { status, error } que el resto
 * de la API, sin filtrar detalles internos al cliente.
 */

export const notFoundHandler = (req, res) => {
    return res.status(404).send({
        status: 'error',
        error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    })
}

export const errorHandler = (error, req, res, next) => {
    // Durante los tests se silencia el log para no ensuciar la salida de mocha.
    if (process.env.NODE_ENV !== 'test') {
        console.error(`[${req.method} ${req.originalUrl}]`, error)
    }

    const status = error.status ?? 500
    const message = status === 500 ? 'Error interno del servidor' : error.message

    return res.status(status).send({ status: 'error', error: message })
}

export default errorHandler
