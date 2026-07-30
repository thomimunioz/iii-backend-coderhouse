// Se marca el entorno como "test" antes de que se atienda cualquier request:
// el middleware de errores usa esta bandera para no imprimir stacktraces y
// dejar limpia la salida de mocha (que es la evidencia que se entrega).
process.env.NODE_ENV = 'test'

import { expect } from 'chai'
import sinon from 'sinon'
import supertest from 'supertest'

import app from '../src/app.js'
import { adoptionsService, petsService, usersService } from '../src/services/index.js'
import {
    INVALID_OBJECT_IDS,
    fakeObjectId,
    makeFakeAdoption,
    makeFakeAdoptions,
    makeFakePet,
    makeFakeUser
} from './fixtures/fakes.js'

/**
 * TESTS FUNCIONALES DE src/routes/adoption.router.js
 *
 * Endpoints cubiertos:
 *   GET    /api/adoptions
 *   GET    /api/adoptions/:aid
 *   POST   /api/adoptions/:uid/:pid
 *
 * Estrategia:
 *   - supertest levanta la app de Express en memoria (no hace falta npm start
 *     ni un puerto libre: se importa `app`, que no llama a listen()).
 *   - sinon reemplaza los metodos de usersService / petsService / adoptionsService,
 *     que son la unica puerta de acceso a MongoDB. Con eso la base de datos queda
 *     completamente aislada: los tests no necesitan Mongo ni red.
 *   - los fakes de ./fixtures/fakes.js aportan documentos con la forma real de
 *     los modelos User, Pet y Adoption.
 */
describe('Tests funcionales - adoption.router.js (/api/adoptions)', () => {

    const requester = supertest(app)

    // Cada test deja los services como estaban: sin esto un stub se filtraria
    // al test siguiente y los resultados dependerian del orden de ejecucion.
    afterEach(() => {
        sinon.restore()
    })

    // ---------------------------------------------------------------------------
    // GET /api/adoptions
    // ---------------------------------------------------------------------------
    describe('GET /api/adoptions - listado de adopciones', () => {

        it('responde 200 con status success y el listado completo de adopciones', async () => {
            const fakeAdoptions = makeFakeAdoptions(3)
            const getAll = sinon.stub(adoptionsService, 'getAll').resolves(fakeAdoptions)

            const { statusCode, headers, body } = await requester.get('/api/adoptions')

            expect(statusCode).to.equal(200)
            expect(headers['content-type']).to.contain('application/json')
            expect(body.status).to.equal('success')
            expect(body.payload).to.be.an('array').with.lengthOf(3)
            expect(body.payload).to.deep.equal(fakeAdoptions)
            expect(getAll.calledOnce).to.be.true
        })

        it('responde 200 con un array vacio cuando todavia no hay adopciones', async () => {
            sinon.stub(adoptionsService, 'getAll').resolves([])

            const { statusCode, body } = await requester.get('/api/adoptions')

            expect(statusCode).to.equal(200)
            expect(body.status).to.equal('success')
            expect(body.payload).to.be.an('array').that.is.empty
        })

        it('devuelve cada adopcion con las propiedades _id, owner y pet', async () => {
            sinon.stub(adoptionsService, 'getAll').resolves(makeFakeAdoptions(2))

            const { body } = await requester.get('/api/adoptions')

            body.payload.forEach((adoption) => {
                expect(adoption).to.have.property('_id').that.is.a('string')
                expect(adoption).to.have.property('owner').that.is.a('string')
                expect(adoption).to.have.property('pet').that.is.a('string')
            })
        })

        it('responde 500 sin filtrar detalles internos si el service falla', async () => {
            sinon.stub(adoptionsService, 'getAll').rejects(new Error('connect ECONNREFUSED mongodb:27017'))

            const { statusCode, body } = await requester.get('/api/adoptions')

            expect(statusCode).to.equal(500)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Error interno del servidor')
            expect(body.error).to.not.contain('mongodb')
        })
    })

    // ---------------------------------------------------------------------------
    // GET /api/adoptions/:aid
    // ---------------------------------------------------------------------------
    describe('GET /api/adoptions/:aid - adopcion por id', () => {

        it('responde 200 con la adopcion pedida y consulta el service por _id', async () => {
            const fakeAdoption = makeFakeAdoption()
            const getBy = sinon.stub(adoptionsService, 'getBy').resolves(fakeAdoption)

            const { statusCode, body } = await requester.get(`/api/adoptions/${fakeAdoption._id}`)

            expect(statusCode).to.equal(200)
            expect(body.status).to.equal('success')
            expect(body.payload).to.deep.equal(fakeAdoption)
            expect(getBy.calledOnceWithExactly({ _id: fakeAdoption._id })).to.be.true
        })

        it('responde 404 con status error cuando la adopcion no existe', async () => {
            sinon.stub(adoptionsService, 'getBy').resolves(null)

            const { statusCode, body } = await requester.get(`/api/adoptions/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Adoption not found')
            expect(body).to.not.have.property('payload')
        })

        it('responde 400 y no consulta la base cuando el id no tiene formato de ObjectId', async () => {
            const getBy = sinon.stub(adoptionsService, 'getBy').resolves(makeFakeAdoption())

            for (const invalidId of INVALID_OBJECT_IDS) {
                const { statusCode, body } = await requester.get(`/api/adoptions/${invalidId}`)

                expect(statusCode, `id probado: ${invalidId}`).to.equal(400)
                expect(body.status).to.equal('error')
                expect(body.error).to.contain('aid')
            }

            // La validacion corta la cadena antes del controller: el service nunca se llama.
            expect(getBy.called).to.be.false
        })

        it('responde 500 si el service lanza una excepcion inesperada', async () => {
            sinon.stub(adoptionsService, 'getBy').rejects(new Error('CastError simulado'))

            const { statusCode, body } = await requester.get(`/api/adoptions/${fakeObjectId()}`)

            expect(statusCode).to.equal(500)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Error interno del servidor')
        })
    })

    // ---------------------------------------------------------------------------
    // POST /api/adoptions/:uid/:pid
    // ---------------------------------------------------------------------------
    describe('POST /api/adoptions/:uid/:pid - registrar una adopcion', () => {

        let user
        let pet

        beforeEach(() => {
            user = makeFakeUser()
            pet = makeFakePet()
        })

        /** Deja los cinco metodos del flujo feliz stubbeados y los devuelve para poder auditarlos. */
        const stubCaminoFeliz = (adoption = makeFakeAdoption()) => ({
            getUserById: sinon.stub(usersService, 'getUserById').resolves(user),
            getPetBy: sinon.stub(petsService, 'getBy').resolves(pet),
            updateUser: sinon.stub(usersService, 'update').resolves({ ...user }),
            updatePet: sinon.stub(petsService, 'update').resolves({ ...pet, adopted: true }),
            createAdoption: sinon.stub(adoptionsService, 'create').resolves(adoption)
        })

        it('responde 201 con el mensaje "Pet adopted" y la adopcion creada', async () => {
            const adoption = makeFakeAdoption({ owner: user._id, pet: pet._id })
            stubCaminoFeliz(adoption)

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(201)
            expect(body.status).to.equal('success')
            expect(body.message).to.equal('Pet adopted')
            expect(body.payload).to.deep.equal(adoption)
        })

        it('agrega la mascota al array pets del usuario', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.updateUser.calledOnce).to.be.true
            const [idRecibido, cambios] = stubs.updateUser.firstCall.args
            expect(idRecibido).to.equal(user._id)
            expect(cambios.pets).to.deep.equal([{ _id: pet._id }])
        })

        it('conserva las mascotas que el usuario ya tenia', async () => {
            const mascotaPrevia = { _id: fakeObjectId() }
            user = makeFakeUser({ pets: [mascotaPrevia] })
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            const [, cambios] = stubs.updateUser.firstCall.args
            expect(cambios.pets).to.have.lengthOf(2)
            expect(cambios.pets[0]).to.deep.equal(mascotaPrevia)
            expect(cambios.pets[1]).to.deep.equal({ _id: pet._id })
        })

        it('marca la mascota como adoptada y le asigna el owner', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.updatePet.calledOnceWithExactly(pet._id, { adopted: true, owner: user._id })).to.be.true
        })

        it('crea el documento de adopcion vinculando owner y pet', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.createAdoption.calledOnceWithExactly({ owner: user._id, pet: pet._id })).to.be.true
        })

        it('ejecuta las operaciones en el orden correcto (usuario, mascota, adopcion)', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            sinon.assert.callOrder(
                stubs.getUserById,
                stubs.getPetBy,
                stubs.updateUser,
                stubs.updatePet,
                stubs.createAdoption
            )
        })

        it('funciona sin body: toda la informacion viaja en los parametros de ruta', async () => {
            stubCaminoFeliz()

            const { statusCode } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`).send()

            expect(statusCode).to.equal(201)
        })

        it('responde 404 si el usuario no existe y no sigue consultando la mascota', async () => {
            const getUserById = sinon.stub(usersService, 'getUserById').resolves(null)
            const getPetBy = sinon.stub(petsService, 'getBy').resolves(pet)
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves(makeFakeAdoption())

            const { statusCode, body } = await requester.post(`/api/adoptions/${fakeObjectId()}/${pet._id}`)

            expect(statusCode).to.equal(404)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('User not found')
            expect(getUserById.calledOnce).to.be.true
            expect(getPetBy.called).to.be.false
            expect(createAdoption.called).to.be.false
        })

        it('responde 404 si la mascota no existe y no persiste ningun cambio', async () => {
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(null)
            const updateUser = sinon.stub(usersService, 'update').resolves()
            const updatePet = sinon.stub(petsService, 'update').resolves()
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves()

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
            expect(body.error).to.equal('Pet not found')
            expect(updateUser.called).to.be.false
            expect(updatePet.called).to.be.false
            expect(createAdoption.called).to.be.false
        })

        it('responde 400 si la mascota ya fue adoptada y no vuelve a escribir en la base', async () => {
            pet = makeFakePet({ adopted: true, owner: fakeObjectId() })
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(pet)
            const updateUser = sinon.stub(usersService, 'update').resolves()
            const updatePet = sinon.stub(petsService, 'update').resolves()
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves()

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(400)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Pet is already adopted')
            expect(updateUser.called).to.be.false
            expect(updatePet.called).to.be.false
            expect(createAdoption.called).to.be.false
        })

        it('responde 400 cuando el uid no tiene formato de ObjectId', async () => {
            const getUserById = sinon.stub(usersService, 'getUserById').resolves(user)

            const { statusCode, body } = await requester.post(`/api/adoptions/123/${pet._id}`)

            expect(statusCode).to.equal(400)
            expect(body.error).to.contain('uid')
            expect(getUserById.called).to.be.false
        })

        it('responde 400 cuando el pid no tiene formato de ObjectId', async () => {
            const getPetBy = sinon.stub(petsService, 'getBy').resolves(pet)
            sinon.stub(usersService, 'getUserById').resolves(user)

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/mascota-99`)

            expect(statusCode).to.equal(400)
            expect(body.error).to.contain('pid')
            expect(getPetBy.called).to.be.false
        })

        it('valida el uid antes que el pid cuando los dos son invalidos', async () => {
            const { statusCode, body } = await requester.post('/api/adoptions/uid-roto/pid-roto')

            expect(statusCode).to.equal(400)
            expect(body.error).to.contain('uid')
            expect(body.error).to.not.contain('pid')
        })

        it('responde 500 si falla la actualizacion del usuario y no crea la adopcion', async () => {
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(pet)
            sinon.stub(usersService, 'update').rejects(new Error('Write conflict'))
            const createAdoption = sinon.stub(adoptionsService, 'create').resolves()

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(500)
            expect(body.status).to.equal('error')
            expect(body.error).to.equal('Error interno del servidor')
            expect(createAdoption.called).to.be.false
        })

        it('responde 500 si falla la creacion de la adopcion', async () => {
            sinon.stub(usersService, 'getUserById').resolves(user)
            sinon.stub(petsService, 'getBy').resolves(pet)
            sinon.stub(usersService, 'update').resolves()
            sinon.stub(petsService, 'update').resolves()
            sinon.stub(adoptionsService, 'create').rejects(new Error('ValidationError'))

            const { statusCode, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(statusCode).to.equal(500)
            expect(body.error).to.equal('Error interno del servidor')
        })

        it('busca al usuario por id y a la mascota por _id con los params recibidos', async () => {
            const stubs = stubCaminoFeliz()

            await requester.post(`/api/adoptions/${user._id}/${pet._id}`)

            expect(stubs.getUserById.calledOnceWithExactly(user._id)).to.be.true
            expect(stubs.getPetBy.calledOnceWithExactly({ _id: pet._id })).to.be.true
        })
    })

    // ---------------------------------------------------------------------------
    // Contrato del router: solo deben existir las tres rutas declaradas
    // ---------------------------------------------------------------------------
    describe('Contrato del router', () => {

        it('no expone DELETE /api/adoptions/:aid', async () => {
            const { statusCode, body } = await requester.delete(`/api/adoptions/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
            expect(body.status).to.equal('error')
            expect(body.error).to.contain('Ruta no encontrada')
        })

        it('no expone PUT /api/adoptions/:uid/:pid', async () => {
            const { statusCode } = await requester.put(`/api/adoptions/${fakeObjectId()}/${fakeObjectId()}`)

            expect(statusCode).to.equal(404)
        })

        it('no expone POST /api/adoptions sin parametros', async () => {
            const { statusCode } = await requester.post('/api/adoptions')

            expect(statusCode).to.equal(404)
        })

        it('responde 404 con formato JSON ante rutas anidadas inexistentes', async () => {
            const { statusCode, headers, body } = await requester.get(`/api/adoptions/${fakeObjectId()}/extra/ruta`)

            expect(statusCode).to.equal(404)
            expect(headers['content-type']).to.contain('application/json')
            expect(body.status).to.equal('error')
        })
    })
})
