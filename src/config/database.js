import mongoose from 'mongoose'

const connectDB = async () => {
    const uri = process.env.MONGODB_URI

    if (!uri) {
        throw new Error('Falta la variable de entorno MONGODB_URI')
    }

    await mongoose.connect(uri, {
        // Si Mongo no responde, falla rapido en lugar de dejar el arranque colgado.
        serverSelectionTimeoutMS: 10000
    })

    console.log('Conectado a MongoDB')

    return mongoose.connection
}

export default connectDB
