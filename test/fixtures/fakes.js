import { fakerES as faker } from '@faker-js/faker'
import mongoose from 'mongoose'

/**
 * Factories de datos falsos (fakes) usadas por los tests funcionales.
 *
 * Un fake no es un mock: no verifica interacciones, simplemente reemplaza a un
 * documento real de MongoDB con un objeto de la misma forma. Al no depender de
 * la base, los tests son deterministas y corren en cualquier entorno (incluida
 * una imagen Docker sin Mongo).
 *
 * Detalle importante: las fechas se guardan como string ISO y no como Date,
 * porque la respuesta HTTP viaja serializada en JSON. Asi el objeto generado
 * aca puede compararse con deep.equal contra el body de la respuesta.
 */

/** Genera un ObjectId valido (24 caracteres hexadecimales) como string. */
export const fakeObjectId = () => new mongoose.Types.ObjectId().toString()

export const makeFakeUser = (overrides = {}) => ({
    _id: fakeObjectId(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    // Hash de ejemplo: los tests nunca comparan passwords, solo verifican que no se filtre.
    password: '$2b$10$hashDePruebaNoEsUnPasswordReal',
    role: 'user',
    pets: [],
    ...overrides
})

export const makeFakePet = (overrides = {}) => ({
    _id: fakeObjectId(),
    name: faker.animal.petName(),
    specie: faker.helpers.arrayElement(['dog', 'cat', 'rabbit']),
    birthDate: faker.date.past({ years: 8 }).toISOString(),
    adopted: false,
    owner: null,
    image: faker.image.url(),
    ...overrides
})

export const makeFakeAdoption = (overrides = {}) => ({
    _id: fakeObjectId(),
    owner: fakeObjectId(),
    pet: fakeObjectId(),
    ...overrides
})

export const makeFakeAdoptions = (quantity = 3) =>
    Array.from({ length: quantity }, () => makeFakeAdoption())

/**
 * Ids con formato invalido para probar el middleware validateObjectId.
 * Se excluye el string vacio a proposito: `/api/adoptions/` no llega a la ruta
 * `/:aid` sino a `/`, por lo que no sirve para probar la validacion del param.
 */
export const INVALID_OBJECT_IDS = [
    '123',
    'no-es-un-objectid',
    '6889f1abce8e4f2bc9a5d20',
    '6889f1abce8e4f2bc9a5d2011',
    'ZZZZZZZZce8e4f2bc9a5d201'
]
