import { Application } from '../../deps.ts'
import { Runtime } from '../runtime/runtime.ts'
import getProgramRouter from './program.ts'

function createBaseApp(runtime: Runtime) {
    const app = new Application()

    // Program router
    const programRouter = getProgramRouter(runtime)
    app.use(programRouter.allowedMethods())
    app.use(programRouter.routes())

    return app
}

export default createBaseApp
