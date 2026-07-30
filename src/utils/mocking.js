import { fakerES as faker } from '@faker-js/faker'
import { createHash } from './index.js'

export const MOCK_PASSWORD = 'coder123'
const SPECIES = ['dog', 'cat', 'rabbit', 'hamster', 'bird']

/**
 * Genera un usuario falso con la forma exacta del modelo User.
 * Recibe el hash ya calculado porque hashear con bcrypt es costoso: para 50
 * usuarios se calcula una sola vez y se reutiliza (ver generateUsers).
 */
export const generateUser = (hashedPassword) => {
    return {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        password: hashedPassword,
        role: faker.helpers.arrayElement(['user', 'admin']),
        pets: []
    }
}

export const generateUsers = async (quantity = 50) => {
    const hashedPassword = await createHash(MOCK_PASSWORD)
    return Array.from({ length: quantity }, () => generateUser(hashedPassword))
}

export const generatePet = () => {
    return {
        name: faker.animal.petName(),
        specie: faker.helpers.arrayElement(SPECIES),
        birthDate: faker.date.past({ years: 10 }),
        adopted: false,
        image: faker.image.url()
    }
}

export const generatePets = (quantity = 50) => {
    return Array.from({ length: quantity }, () => generatePet())
}
