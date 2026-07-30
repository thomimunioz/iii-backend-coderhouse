import { Router } from 'express'

import adoptionsController from '../controllers/adoptions.controller.js'
import validateObjectId from '../middlewares/validateObjectId.middleware.js'

const router = Router()

/**
 * @openapi
 * /api/adoptions:
 *   get:
 *     tags: [Adoptions]
 *     summary: Lista todas las adopciones
 *     responses:
 *       200:
 *         description: Listado de adopciones (puede venir vacio)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Adoption' }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', adoptionsController.getAllAdoptions)

/**
 * @openapi
 * /api/adoptions/{aid}:
 *   get:
 *     tags: [Adoptions]
 *     summary: Obtiene una adopcion por id
 *     parameters:
 *       - in: path
 *         name: aid
 *         required: true
 *         description: ObjectId de la adopcion (24 caracteres hexadecimales)
 *         schema: { type: string, example: 6889f1abce8e4f2bc9a5d999 }
 *     responses:
 *       200:
 *         description: Adopcion encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload: { $ref: '#/components/schemas/Adoption' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:aid', validateObjectId('aid'), adoptionsController.getAdoption)

/**
 * @openapi
 * /api/adoptions/{uid}/{pid}:
 *   post:
 *     tags: [Adoptions]
 *     summary: Registra la adopcion de una mascota por parte de un usuario
 *     description: >
 *       Valida que el usuario y la mascota existan y que la mascota no este
 *       adoptada. Luego agrega la mascota al usuario, la marca como adoptada
 *       y crea el documento de adopcion.
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         description: ObjectId del usuario adoptante
 *         schema: { type: string, example: 6889f1abce8e4f2bc9a5d201 }
 *       - in: path
 *         name: pid
 *         required: true
 *         description: ObjectId de la mascota a adoptar
 *         schema: { type: string, example: 6889f1abce8e4f2bc9a5d444 }
 *     responses:
 *       201:
 *         description: Adopcion registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Pet adopted }
 *                 payload: { $ref: '#/components/schemas/Adoption' }
 *       400:
 *         description: Id invalido o mascota ya adoptada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               yaAdoptada:
 *                 value: { status: error, error: Pet is already adopted }
 *               idInvalido:
 *                 value: { status: error, error: 'El parametro uid no es un ObjectId valido: 123' }
 *       404:
 *         description: El usuario o la mascota no existen
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               usuario:
 *                 value: { status: error, error: User not found }
 *               mascota:
 *                 value: { status: error, error: Pet not found }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:uid/:pid', validateObjectId('uid', 'pid'), adoptionsController.createAdoption)

export default router
