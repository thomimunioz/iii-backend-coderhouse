import { adoptionsService, petsService, usersService } from '../services/index.js'

/**
 * GET /api/adoptions
 * Devuelve todas las adopciones registradas.
 */
const getAllAdoptions = async (req, res) => {
    const result = await adoptionsService.getAll()

    return res.send({ status: 'success', payload: result })
}

/**
 * GET /api/adoptions/:aid
 * Devuelve una adopcion por id. 404 si no existe.
 */
const getAdoption = async (req, res) => {
    const adoptionId = req.params.aid

    const adoption = await adoptionsService.getBy({ _id: adoptionId })
    if (!adoption) {
        return res.status(404).send({ status: 'error', error: 'Adoption not found' })
    }

    return res.send({ status: 'success', payload: adoption })
}

/**
 * POST /api/adoptions/:uid/:pid
 * Registra la adopcion de una mascota por parte de un usuario.
 *
 * La operacion toca tres colecciones, en este orden:
 *   1. Users     -> se le agrega la mascota al array pets del adoptante.
 *   2. Pets      -> se marca adopted: true y se guarda el owner.
 *   3. Adoptions -> se crea el documento que vincula owner y pet.
 *
 * Antes de escribir valida que el usuario exista (404), que la mascota exista
 * (404) y que la mascota no haya sido adoptada previamente (400).
 */
const createAdoption = async (req, res) => {
    const { uid, pid } = req.params

    const user = await usersService.getUserById(uid)
    if (!user) {
        return res.status(404).send({ status: 'error', error: 'User not found' })
    }

    const pet = await petsService.getBy({ _id: pid })
    if (!pet) {
        return res.status(404).send({ status: 'error', error: 'Pet not found' })
    }

    if (pet.adopted) {
        return res.status(400).send({ status: 'error', error: 'Pet is already adopted' })
    }

    // El schema de User define pets como un array de subdocumentos { _id },
    // por eso se pushea con esa forma y no el ObjectId pelado.
    user.pets.push({ _id: pet._id })

    await usersService.update(user._id, { pets: user.pets })
    await petsService.update(pet._id, { adopted: true, owner: user._id })
    const adoption = await adoptionsService.create({ owner: user._id, pet: pet._id })

    return res.status(201).send({ status: 'success', message: 'Pet adopted', payload: adoption })
}

export default {
    getAllAdoptions,
    getAdoption,
    createAdoption
}
