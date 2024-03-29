import { Router } from '../../../deps.ts'

function getHealthRouter(): Router {
    const router = new Router()
    router.prefix('/health')

    router.get('/', (ctx) => {
        let timestamp
        for (const [key, value] of ctx.request.url.searchParams.entries()){
            if (key === 'timestamp') timestamp = value
        }
        console.log('/health', ctx.request.url.pathname, timestamp)
        ctx.response.status = 200
        ctx.response.body = {
            status: 'ok',
            timestamp: Date.now(),
        }
    })

    return router
}

export default getHealthRouter
