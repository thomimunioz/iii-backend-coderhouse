import GenericRepository from './GenericRepository.js'

export default class PetRepository extends GenericRepository {
    constructor(dao) {
        super(dao)
    }

    getPetById = (id) => {
        return this.getBy({ _id: id })
    }
}
