import express from 'express'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'

import usersRouter from './routes/users.router.js'
import petsRouter from './routes/pets.router.js'
import adoptionsRouter from './routes/adoption.router.js'
import sessionsRouter from './routes/sessions.router.js'
import mocksRouter from './routes/mocks.router.js'
import healthRouter from './routes/health.router.js'

import swaggerSpec from './config/swagger.js'
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js'
import __dirname from './utils/index.js'

const app = express()

app.use(express.json())
app.use(cookieParser())

// Imagenes subidas por multer (POST /api/pets/withimage)
app.use('/static', express.static(`${__dirname}/../public`))

app.use('/api/health', healthRouter)
app.use('/api/users', usersRouter)
app.use('/api/pets', petsRouter)
app.use('/api/adoptions', adoptionsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/mocks', mocksRouter)

// Documentacion interactiva generada con swagger-jsdoc a partir de los routers
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'AdoptMe API' }))
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec))

// Los dos middlewares de cierre van siempre al final de la cadena
app.use(notFoundHandler)
app.use(errorHandler)

export default app
