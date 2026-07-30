import { petsService, usersService } from '../services/index.js'
import { generatePets, generateUsers, MOCK_PASSWORD } from '../utils/mocking.js'

const DEFAULT_MOCK_USERS = 50
const DEFAULT_MOCK_PETS = 100
const MAX_QUANTITY = 500

/**
 * Lee una cantidad de la query string y la deja dentro de un rango razonable,
 * para que nadie pueda pedir /generateData?users=999999 y tumbar la base.
 */
const parseQuantity = (rawValue, fallback) => {
    const parsed = Number.parseInt(rawValue, 10)

    if (Number.isNaN(parsed) || parsed < 0) return fallback

    return Math.min(parsed, MAX_QUANTITY)
}

/** GET /api/mocks/mockingusers - genera usuarios falsos SIN insertarlos. */
const mockingUsers = async (req, res) => {
    const quantity = parseQuantity(req.query.quantity, DEFAULT_MOCK_USERS)
    const users = await generateUsers(quantity)

    return res.send({ status: 'success', payload: users })
}

/** GET /api/mocks/mockingpets - genera mascotas falsas SIN insertarlas. */
const mockingPets = async (req, res) => {
    const quantity = parseQuantity(req.query.quantity, DEFAULT_MOCK_PETS)
    const pets = generatePets(quantity)

    return res.send({ status: 'success', payload: pets })
}

/**
 * POST /api/mocks/generateData?users=10&pets=20
 * Genera e inserta datos falsos en MongoDB. Devuelve cuantos documentos creo.
 */
const generateData = async (req, res) => {
    const usersQuantity = parseQuantity(req.query.users ?? req.body?.users, DEFAULT_MOCK_USERS)
    const petsQuantity = parseQuantity(req.query.pets ?? req.body?.pets, DEFAULT_MOCK_PETS)

    const [users, pets] = await Promise.all([generateUsers(usersQuantity), generatePets(petsQuantity)])

    const insertedUsers = usersQuantity > 0 ? await usersService.createMany(users) : []
    const insertedPets = petsQuantity > 0 ? await petsService.createMany(pets) : []

    return res.status(201).send({
        status: 'success',
        message: 'Datos generados e insertados en MongoDB',
        payload: {
            users: insertedUsers.length,
            pets: insertedPets.length,
            mockPassword: MOCK_PASSWORD
        }
    })
}

export default {
    mockingUsers,
    mockingPets,
    generateData
}
