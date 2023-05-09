import { Router } from '../../deps.ts'
import { Runtime } from '../runtime/runtime.ts'
import { getProgramStorage } from '../storage/index.ts'

function getProgramRouter(runtime: Runtime) {
    const router = new Router()
    router.prefix('/program')
    
    router.post('/deploy', async (ctx) => {
        const reqBody = await ctx.request.body().value
        const program = reqBody.program
        await runtime.deploy({ dsl: program })

        ctx.response.status = 200
        ctx.response.body = { message: 'Program successfully deployed' }
    })
    
    router.post('/stop', (ctx) => {
        ctx.response.status = 200
        ctx.response.body = { message: 'Program successfully stopped '}
    })
    
    router.get('/', async (ctx) => {
        const storage = getProgramStorage()
        const program = await storage.get('abcxyz')
        ctx.response.status = 200
        ctx.response.body = { program: program }
    })
    
    return router
}

export default getProgramRouter