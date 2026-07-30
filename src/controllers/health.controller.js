import mongoose from 'mongoose'

const READY_STATES = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
}

/**
 * GET /api/health
 * Responde 200 siempre que el proceso este vivo e informa el estado de Mongo.
 * Lo usa el HEALTHCHECK del contenedor: el proceso puede estar sano incluso si
 * la base todavia no termino de conectar.
 */
const getHealth = (req, res) => {
    return res.send({
        status: 'success',
        payload: {
            uptime: Math.round(process.uptime()),
            environment: process.env.NODE_ENV ?? 'development',
            database: READY_STATES[mongoose.connection.readyState] ?? 'unknown'
        }
    })
}

export default { getHealth }
