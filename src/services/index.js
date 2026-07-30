import Users from '../dao/Users.dao.js'
import Pet from '../dao/Pets.dao.js'
import Adoption from '../dao/Adoption.dao.js'

import UserRepository from '../repository/UserRepository.js'
import PetRepository from '../repository/PetRepository.js'
import AdoptionRepository from '../repository/AdoptionRepository.js'

// Estas tres instancias son el unico punto de acceso a datos que conocen los
// controllers. Al ser objetos exportados (singletons del modulo), en los tests
// se les puede aplicar sinon.stub(servicio, 'metodo') y aislar completamente
// MongoDB sin tocar ni una linea del codigo de produccion.
export const usersService = new UserRepository(new Users())
export const petsService = new PetRepository(new Pet())
export const adoptionsService = new AdoptionRepository(new Adoption())
