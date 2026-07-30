import multer from 'multer'
import __dirname from './index.js'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${__dirname}/../public/img`)
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const uploader = multer({
    storage,
    // Limite defensivo: evita que una imagen enorme agote el disco del contenedor.
    limits: { fileSize: 5 * 1024 * 1024 }
})

export default uploader
