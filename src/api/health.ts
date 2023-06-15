import { Router } from '../../deps.ts'

function getHealthRouter(): Router {
    const router = new Router()
    router.prefix('/health')

    router.get('/', (ctx) => {
        ctx.response.status = 200
        ctx.response.body = {
            status: 'ok',
            timestamp: Date.now(),
        }
    })

    return router
}

export default getHealthRouter
