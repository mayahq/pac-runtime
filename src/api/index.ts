import { Application, oakCors } from '../../deps.ts'
import { Runtime } from '../runtime/runtime.ts'
import getHealthRouter from './health.ts'
import getProgramRouter from './program.ts'

function createBaseApp(runtime: Runtime) {
    const app = new Application()

    app.use(oakCors({ origin: '*' }))

    // Program router
    const programRouter = getProgramRouter(runtime)
    app.use(programRouter.allowedMethods())
    app.use(programRouter.routes())

    // Health router
    const healthRouter = getHealthRouter()
    app.use(healthRouter.allowedMethods())
    app.use(healthRouter.routes())

    return app
}

export default createBaseApp
