import bcrypt from 'bcrypt'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const SALT_ROUNDS = 10

export const createHash = async (password) => {
    const salts = await bcrypt.genSalt(SALT_ROUNDS)
    return bcrypt.hash(password, salts)
}

export const passwordValidation = async (user, password) => bcrypt.compare(password, user.password)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default __dirname
