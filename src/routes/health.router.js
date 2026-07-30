import { Router } from 'express'

import healthController from '../controllers/health.controller.js'

const router = Router()

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Estado del servicio y de la conexion a MongoDB
 *     responses:
 *       200:
 *         description: El proceso esta vivo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload:
 *                   type: object
 *                   properties:
 *                     uptime: { type: integer, example: 42 }
 *                     environment: { type: string, example: production }
 *                     database: { type: string, example: connected }
 */
router.get('/', healthController.getHealth)

export default router
