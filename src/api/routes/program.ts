import { Router } from '../../../deps.ts'
import { Runtime } from '../../runtime/runtime.ts'
import { Program } from '../../program/hybrid.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { validateFlow } from '../../program/validate.ts'

function getProgramRouter(runtime: Runtime) {
    const router = new Router()
    router.prefix('/program')
    router.use(authMiddleware)

    router.post('/deploy', async (ctx) => {
        const reqBody = await ctx.request.body().value
        const program = reqBody.program
        const skipValidation = reqBody.skipValidation

        if (!skipValidation) {
            const problems = validateFlow(program)

            const problemsExist = Object.keys(problems).some(key => problems[key].length > 0)
            if (problemsExist) {
                ctx.response.status = 400
                ctx.response.body = { problems }
            }
            return
        }

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
        const { program, data, firstProcedureId, lastProcedureId, timeout, cacheSessionId } = reqBody
        try {
            const result = await Program.eval(program, data, runtime, firstProcedureId, lastProcedureId, timeout, cacheSessionId)
            ctx.response.status = 200
            ctx.response.body = result
        } catch (e) {
            ctx.response.status = 500
            ctx.response.body = e
        }
    })

    router.post('/validate', async (ctx) => {
        const reqBody = await ctx.request.body().value
        const { program } = reqBody

        const problems = validateFlow(program)

        const problemsExist = Object.keys(problems).some(key => problems[key].length > 0)
        if (problemsExist) {
            ctx.response.status = 400
            ctx.response.body = { problems }
        } else {
            ctx.response.status = 200
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
