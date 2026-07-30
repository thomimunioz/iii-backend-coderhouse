import swaggerJsdoc from 'swagger-jsdoc'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'AdoptMe API',
            version: '1.0.0',
            description:
                'API del Proyecto Final de Backend III (Coderhouse). Permite gestionar usuarios, ' +
                'mascotas y adopciones, y generar datos de prueba con el modulo de mocking.'
        },
        servers: [
            { url: 'http://localhost:8080', description: 'Entorno local' },
            { url: 'http://localhost:8080', description: 'Contenedor Docker (puerto publicado)' }
        ],
        tags: [
            { name: 'Adoptions', description: 'Alta y consulta de adopciones' },
            { name: 'Users', description: 'Gestion de usuarios' },
            { name: 'Pets', description: 'Gestion de mascotas' },
            { name: 'Sessions', description: 'Registro, login y sesion actual' },
            { name: 'Mocks', description: 'Generacion de datos de prueba' },
            { name: 'Health', description: 'Estado del servicio' }
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6889f1abce8e4f2bc9a5d201' },
                        first_name: { type: 'string', example: 'Thomas' },
                        last_name: { type: 'string', example: 'Munoz' },
                        email: { type: 'string', format: 'email', example: 'thomas@correo.com' },
                        role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
                        pets: {
                            type: 'array',
                            items: { type: 'string', example: '6889f1abce8e4f2bc9a5d444' }
                        }
                    }
                },
                Pet: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6889f1abce8e4f2bc9a5d444' },
                        name: { type: 'string', example: 'Firulais' },
                        specie: { type: 'string', example: 'dog' },
                        birthDate: { type: 'string', format: 'date', example: '2021-05-14' },
                        adopted: { type: 'boolean', example: false },
                        owner: { type: 'string', nullable: true, example: null },
                        image: { type: 'string', example: '/static/img/firulais.jpg' }
                    }
                },
                Adoption: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6889f1abce8e4f2bc9a5d999' },
                        owner: { type: 'string', example: '6889f1abce8e4f2bc9a5d201' },
                        pet: { type: 'string', example: '6889f1abce8e4f2bc9a5d444' }
                    }
                },
                SuccessMessage: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'success' },
                        message: { type: 'string', example: 'Pet adopted' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'error' },
                        error: { type: 'string', example: 'Adoption not found' }
                    }
                }
            },
            responses: {
                BadRequest: {
                    description: 'Parametros invalidos o estado de negocio incompatible',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: { status: 'error', error: 'Pet is already adopted' }
                        }
                    }
                },
                NotFound: {
                    description: 'El recurso solicitado no existe',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: { status: 'error', error: 'Adoption not found' }
                        }
                    }
                },
                ServerError: {
                    description: 'Error inesperado del servidor',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: { status: 'error', error: 'Error interno del servidor' }
                        }
                    }
                }
            }
        }
    },
    // Ruta absoluta para que la especificacion se genere igual desde la raiz del
    // proyecto, desde el contenedor o desde mocha. El replace es necesario en
    // Windows: path.join devuelve backslashes y el glob de swagger-jsdoc solo
    // entiende barras normales (sin esto la spec sale sin ningun path).
    apis: [join(__dirname, '../routes/*.js').replace(/\\/g, '/')]
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec
