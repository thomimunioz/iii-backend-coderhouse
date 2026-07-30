import { Router } from 'express'

import usersController from '../controllers/users.controller.js'
import validateObjectId from '../middlewares/validateObjectId.middleware.js'

const router = Router()

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Lista todos los usuarios
 *     responses:
 *       200:
 *         description: Listado de usuarios
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
router.get('/', usersController.getAllUsers)

/**
 * @openapi
 * /api/users/{uid}:
 *   get:
 *     tags: [Users]
 *     summary: Obtiene un usuario por id
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload: { $ref: '#/components/schemas/User' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags: [Users]
 *     summary: Actualiza un usuario
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string, example: Thomas }
 *               last_name: { type: string, example: Munoz }
 *               role: { type: string, example: admin }
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessMessage' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Users]
 *     summary: Elimina un usuario
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessMessage' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:uid', validateObjectId('uid'), usersController.getUser)
router.put('/:uid', validateObjectId('uid'), usersController.updateUser)
router.delete('/:uid', validateObjectId('uid'), usersController.deleteUser)

export default router
