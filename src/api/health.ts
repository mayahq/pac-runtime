import { Router } from "../../deps.ts";
import { Runtime } from "../runtime/runtime.ts";

function getHealthRouter(runtime: Runtime): Router {
    console.log('runtime', runtime)
    const router = new Router()
    router.prefix('/health')

    router.get('/', (ctx) => {
        ctx.response.status = 200
        ctx.response.body = {
            status: 'ok',
            timestamp: Date.now()
        }
    })

    return router
}

export default getHealthRouter