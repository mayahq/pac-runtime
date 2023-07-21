import { Application, oakCors } from '../../deps.ts'
import { Runtime } from '../runtime/runtime.ts'
import getHealthRouter from './routes/health.ts'
import getProgramRouter from './routes/program.ts'

function createBaseApp(runtime: Runtime) {
    const app = new Application()

    app.use(oakCors({ origin: '*' }))

    // Health router
    const healthRouter = getHealthRouter()
    app.use(healthRouter.allowedMethods())
    app.use(healthRouter.routes())

    // Program router
    const programRouter = getProgramRouter(runtime)
    app.use(programRouter.allowedMethods())
    app.use(programRouter.routes())

    return app
}

export default createBaseApp
