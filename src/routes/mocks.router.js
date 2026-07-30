import { Router } from 'express'

import mocksController from '../controllers/mocks.controller.js'

const router = Router()

/**
 * @openapi
 * /api/mocks/mockingusers:
 *   get:
 *     tags: [Mocks]
 *     summary: Genera usuarios falsos sin insertarlos en la base
 *     parameters:
 *       - in: query
 *         name: quantity
 *         description: Cantidad a generar (default 50, maximo 500)
 *         schema: { type: integer, example: 50 }
 *     responses:
 *       200:
 *         description: Usuarios generados con password hasheado (coder123)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 */
router.get('/mockingusers', mocksController.mockingUsers)

/**
 * @openapi
 * /api/mocks/mockingpets:
 *   get:
 *     tags: [Mocks]
 *     summary: Genera mascotas falsas sin insertarlas en la base
 *     parameters:
 *       - in: query
 *         name: quantity
 *         description: Cantidad a generar (default 100, maximo 500)
 *         schema: { type: integer, example: 100 }
 *     responses:
 *       200:
 *         description: Mascotas generadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Pet' }
 */
router.get('/mockingpets', mocksController.mockingPets)

/**
 * @openapi
 * /api/mocks/generateData:
 *   post:
 *     tags: [Mocks]
 *     summary: Genera e inserta usuarios y mascotas falsas en MongoDB
 *     parameters:
 *       - in: query
 *         name: users
 *         schema: { type: integer, example: 10 }
 *       - in: query
 *         name: pets
 *         schema: { type: integer, example: 20 }
 *     responses:
 *       201:
 *         description: Datos insertados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload:
 *                   type: object
 *                   properties:
 *                     users: { type: integer, example: 10 }
 *                     pets: { type: integer, example: 20 }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/generateData', mocksController.generateData)

export default router
