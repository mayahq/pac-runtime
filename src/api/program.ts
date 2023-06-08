import { Router } from '../../deps.ts'
import { Runtime } from '../runtime/runtime.ts'
import { Program } from '../program/hybrid.ts'

function getProgramRouter(runtime: Runtime) {
    const router = new Router()
    router.prefix('/program')

    router.post('/deploy', async (ctx) => {
        const reqBody = await ctx.request.body().value
        const program = reqBody.program
        await runtime.deploy({ liteGraphDsl: program })

        ctx.response.status = 200
        ctx.response.body = { message: 'Program successfully deployed' }
    })

    router.post('/stop', (ctx) => {
        ctx.response.status = 200
        ctx.response.body = { message: 'Program successfully stopped ' }
    })

    router.post('/eval', async (ctx) => {
        const reqBody = await ctx.request.body().value
        const { program, data, firstProcedureId, lastProcedureId, timeout } = reqBody
        try {
            const result = await Program.eval(program, runtime, data, firstProcedureId, lastProcedureId, timeout)
            ctx.response.status = 200
            ctx.response.body = result
        } catch (e) {
            ctx.response.status = 500
            ctx.response.body = e
        }
    })

    router.get('/', (ctx) => {
        const program = runtime?.program?.liteGraphDsl
        ctx.response.status = 200
        ctx.response.body = { program: program }
    })

    return router
}

export default getProgramRouter
