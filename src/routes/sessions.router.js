import { Router } from 'express'

import sessionsController from '../controllers/sessions.controller.js'

const router = Router()

/**
 * @openapi
 * /api/sessions/register:
 *   post:
 *     tags: [Sessions]
 *     summary: Registra un usuario nuevo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password]
 *             properties:
 *               first_name: { type: string, example: Thomas }
 *               last_name: { type: string, example: Munoz }
 *               email: { type: string, format: email, example: thomas@correo.com }
 *               password: { type: string, example: coder123 }
 *     responses:
 *       201:
 *         description: Usuario creado, devuelve el id
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/register', sessionsController.register)

/**
 * @openapi
 * /api/sessions/login:
 *   post:
 *     tags: [Sessions]
 *     summary: Inicia sesion y emite la cookie coderCookie con el JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login correcto (cookie httpOnly en el header Set-Cookie)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/login', sessionsController.login)

/**
 * @openapi
 * /api/sessions/current:
 *   get:
 *     tags: [Sessions]
 *     summary: Devuelve el usuario del JWT guardado en la cookie
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *       401:
 *         description: No hay sesion activa o el token es invalido
 */
router.get('/current', sessionsController.current)

/**
 * @openapi
 * /api/sessions/logout:
 *   post:
 *     tags: [Sessions]
 *     summary: Cierra la sesion borrando la cookie
 *     responses:
 *       200:
 *         description: Sesion cerrada
 */
router.post('/logout', sessionsController.logout)

export default router
