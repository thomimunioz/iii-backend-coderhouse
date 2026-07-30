import { Router } from 'express'

import petsController from '../controllers/pets.controller.js'
import uploader from '../utils/uploader.js'
import validateObjectId from '../middlewares/validateObjectId.middleware.js'

const router = Router()

/**
 * @openapi
 * /api/pets:
 *   get:
 *     tags: [Pets]
 *     summary: Lista todas las mascotas
 *     responses:
 *       200:
 *         description: Listado de mascotas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Pet' }
 *   post:
 *     tags: [Pets]
 *     summary: Crea una mascota
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, specie, birthDate]
 *             properties:
 *               name: { type: string, example: Firulais }
 *               specie: { type: string, example: dog }
 *               birthDate: { type: string, format: date, example: '2021-05-14' }
 *     responses:
 *       201:
 *         description: Mascota creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 payload: { $ref: '#/components/schemas/Pet' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/', petsController.getAllPets)
router.post('/', petsController.createPet)

/**
 * @openapi
 * /api/pets/withimage:
 *   post:
 *     tags: [Pets]
 *     summary: Crea una mascota subiendo su imagen
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, specie, birthDate, image]
 *             properties:
 *               name: { type: string }
 *               specie: { type: string }
 *               birthDate: { type: string, format: date }
 *               image: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Mascota creada con imagen
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/withimage', uploader.single('image'), petsController.createPetWithImage)

/**
 * @openapi
 * /api/pets/{pid}:
 *   put:
 *     tags: [Pets]
 *     summary: Actualiza una mascota
 *     parameters:
 *       - in: path
 *         name: pid
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               specie: { type: string }
 *     responses:
 *       200:
 *         description: Mascota actualizada
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Pets]
 *     summary: Elimina una mascota
 *     parameters:
 *       - in: path
 *         name: pid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Mascota eliminada
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:pid', validateObjectId('pid'), petsController.updatePet)
router.delete('/:pid', validateObjectId('pid'), petsController.deletePet)

export default router
