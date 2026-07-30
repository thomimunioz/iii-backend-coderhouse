import { usersService } from '../services/index.js'
import UserDTO from '../dto/User.dto.js'

const getAllUsers = async (req, res) => {
    const users = await usersService.getAll()

    return res.send({ status: 'success', payload: users.map(UserDTO.getUserResponseFrom) })
}

const getUser = async (req, res) => {
    const userId = req.params.uid

    const user = await usersService.getUserById(userId)
    if (!user) {
        return res.status(404).send({ status: 'error', error: 'User not found' })
    }

    return res.send({ status: 'success', payload: UserDTO.getUserResponseFrom(user) })
}

const updateUser = async (req, res) => {
    const userId = req.params.uid
    const updateBody = req.body

    const user = await usersService.getUserById(userId)
    if (!user) {
        return res.status(404).send({ status: 'error', error: 'User not found' })
    }

    await usersService.update(userId, updateBody)

    return res.send({ status: 'success', message: 'User updated' })
}

const deleteUser = async (req, res) => {
    const userId = req.params.uid

    const user = await usersService.getUserById(userId)
    if (!user) {
        return res.status(404).send({ status: 'error', error: 'User not found' })
    }

    // El proyecto base buscaba el usuario y respondia "User deleted" sin borrarlo.
    await usersService.delete(userId)

    return res.send({ status: 'success', message: 'User deleted' })
}

export default {
    getAllUsers,
    getUser,
    updateUser,
    deleteUser
}
