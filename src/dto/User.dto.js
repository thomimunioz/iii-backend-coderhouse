export default class UserDTO {

    /** Payload que viaja dentro del JWT: nunca incluye el password. */
    static getUserTokenFrom = (user) => {
        return {
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            email: user.email
        }
    }

    /** Vista publica del usuario para las respuestas HTTP. */
    static getUserResponseFrom = (user) => {
        return {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            pets: user.pets ?? []
        }
    }
}
