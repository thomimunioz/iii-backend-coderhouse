import jwt from 'jsonwebtoken'

import { usersService } from '../services/index.js'
import { createHash, passwordValidation } from '../utils/index.js'
import UserDTO from '../dto/User.dto.js'

const COOKIE_NAME = 'coderCookie'
const TOKEN_EXPIRATION = '1h'
const COOKIE_MAX_AGE = 3600000

// El secreto sale del entorno. El proyecto base lo tenia hardcodeado en el codigo.
const getSecret = () => process.env.SECRET_KEY || 'tokenSecretJWT'

const register = async (req, res) => {
    const { first_name, last_name, email, password } = req.body

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).send({ status: 'error', error: 'Incomplete values' })
    }

    const exists = await usersService.getUserByEmail(email)
    if (exists) {
        return res.status(400).send({ status: 'error', error: 'User already exists' })
    }

    const hashedPassword = await createHash(password)
    const user = await usersService.create({ first_name, last_name, email, password: hashedPassword })

    return res.status(201).send({ status: 'success', payload: user._id })
}

const login = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).send({ status: 'error', error: 'Incomplete values' })
    }

    const user = await usersService.getUserByEmail(email)
    if (!user) {
        return res.status(404).send({ status: 'error', error: "User doesn't exist" })
    }

    const isValidPassword = await passwordValidation(user, password)
    if (!isValidPassword) {
        return res.status(400).send({ status: 'error', error: 'Incorrect password' })
    }

    const userDto = UserDTO.getUserTokenFrom(user)
    const token = jwt.sign(userDto, getSecret(), { expiresIn: TOKEN_EXPIRATION })

    return res
        .cookie(COOKIE_NAME, token, {
            maxAge: COOKIE_MAX_AGE,
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production'
        })
        .send({ status: 'success', message: 'Logged in' })
}

const current = async (req, res) => {
    const cookie = req.cookies[COOKIE_NAME]

    if (!cookie) {
        return res.status(401).send({ status: 'error', error: 'No hay sesion activa' })
    }

    try {
        const user = jwt.verify(cookie, getSecret())
        return res.send({ status: 'success', payload: user })
    } catch (error) {
        // Sin este try/catch un token vencido o manipulado devolvia 500.
        return res.status(401).send({ status: 'error', error: 'Token invalido o expirado' })
    }
}

const logout = async (req, res) => {
    res.clearCookie(COOKIE_NAME)

    return res.send({ status: 'success', message: 'Logged out' })
}

export default {
    register,
    login,
    current,
    logout
}
