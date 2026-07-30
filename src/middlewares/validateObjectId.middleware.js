const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/

/**
 * Valida que los params indicados tengan forma de ObjectId antes de llegar al
 * controller. Sin este middleware, un id malformado llega a Mongoose, lanza un
 * CastError y la API responde 500 cuando en realidad es un error del cliente (400).
 *
 * Se usa una expresion regular de 24 caracteres hexadecimales en lugar de
 * mongoose.Types.ObjectId.isValid porque ese metodo tambien acepta cualquier
 * string de 12 caracteres, lo que dejaria pasar ids invalidos como "prueba-12345".
 *
 * @param {...string} params nombres de los parametros de ruta a validar
 */
const validateObjectId = (...params) => {
    return (req, res, next) => {
        for (const param of params) {
            const value = req.params[param]

            if (!OBJECT_ID_PATTERN.test(value ?? '')) {
                return res.status(400).send({
                    status: 'error',
                    error: `El parametro ${param} no es un ObjectId valido: ${value}`
                })
            }
        }

        return next()
    }
}

export default validateObjectId
