import PetDTO from '../dto/Pet.dto.js'
import { petsService } from '../services/index.js'

const getAllPets = async (req, res) => {
    const pets = await petsService.getAll()

    return res.send({ status: 'success', payload: pets })
}

const createPet = async (req, res) => {
    const { name, specie, birthDate } = req.body

    if (!name || !specie || !birthDate) {
        return res.status(400).send({ status: 'error', error: 'Incomplete values' })
    }

    const pet = PetDTO.getPetInputFrom({ name, specie, birthDate })
    const result = await petsService.create(pet)

    return res.status(201).send({ status: 'success', payload: result })
}

const createPetWithImage = async (req, res) => {
    const file = req.file
    const { name, specie, birthDate } = req.body

    if (!name || !specie || !birthDate) {
        return res.status(400).send({ status: 'error', error: 'Incomplete values' })
    }

    if (!file) {
        return res.status(400).send({ status: 'error', error: 'Se requiere el campo image' })
    }

    const pet = PetDTO.getPetInputFrom({
        name,
        specie,
        birthDate,
        // Se guarda la URL publica servida por express.static, no la ruta del disco.
        image: `/static/img/${file.filename}`
    })

    const result = await petsService.create(pet)

    return res.status(201).send({ status: 'success', payload: result })
}

const updatePet = async (req, res) => {
    const petId = req.params.pid

    const pet = await petsService.getPetById(petId)
    if (!pet) {
        return res.status(404).send({ status: 'error', error: 'Pet not found' })
    }

    await petsService.update(petId, req.body)

    return res.send({ status: 'success', message: 'pet updated' })
}

const deletePet = async (req, res) => {
    const petId = req.params.pid

    const pet = await petsService.getPetById(petId)
    if (!pet) {
        return res.status(404).send({ status: 'error', error: 'Pet not found' })
    }

    await petsService.delete(petId)

    return res.send({ status: 'success', message: 'pet deleted' })
}

export default {
    getAllPets,
    createPet,
    createPetWithImage,
    updatePet,
    deletePet
}
