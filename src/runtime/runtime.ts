import { Application, Router, RouterContext } from '../../deps.ts'
import { Comms } from './comms.ts'
import { Storage } from '../storage/typings.d.ts'
import createBaseApp from '../api/index.ts'
import { AxiosInstance } from '../../deps.ts'
import { getAxiosInstance } from './axios.ts'
import { ExecutionStatus, RuntimeInterface, SymbolMethods } from './runtime.d.ts'
import { match, MatchFunction, pathToRegexp } from '../../deps.ts'
import { RemoteStorage } from '../storage/remote.ts'
// HEAD
import { stdpath } from '../../test_deps.ts'
import { LocalStorage } from '../storage/local.ts'
//
import { Program } from '../../mod.ts'
import { LiteGraphSpec } from '../program/hybrid.d.ts'
// import { stdpath } from '../../test_deps.ts'
// import { LocalStorage } from '../storage/local.ts'
//fp
export type AutoShutdownBehaviour = 'NEVER' | 'BY_LAST_USE'
type ParamsDictionary = {
    [key: string]: string
}

type RuntimeInitArgs = {
    id: string
    mayaRuntimeToken: string
    ownerId: string
    environment: string
    autoShutdownBehaviour: AutoShutdownBehaviour
    maxIdleTime: number
    storage?: Storage
}

type DeployArgs = {
    liteGraphDsl: LiteGraphSpec
    saveToStorage?: boolean
}

type RouteHandler = (ctx: RouterContext<'/(.*)', ParamsDictionary, Record<string, any>>) => Promise<void>
type DynamicRoute = {
    method: string
    regexp: RegExp
    path: string
    handler: RouteHandler
    matchFunction: (path: string) => any
}

function getSymbolMethods(runtime: Runtime): SymbolMethods {
    const reportExecutionStatus = (status: ExecutionStatus) => {
        return runtime.comms.broadcast({
            event: 'nodeexecstatus',
            data: { status },
        })
    }

    const sendMessage = (event: string, data: unknown) => {
        return runtime.comms.broadcast({
            event,
            data,
        })
    }

    const setStatus = (status: string, message: string) => {
        return runtime.comms.broadcast({
            event: 'nodestatus',
            data: {
                status,
                message,
            },
        })
    }

    return {
        reportExecutionStatus,
        sendMessage,
        setStatus,
    }
}

export class Runtime implements RuntimeInterface {
    id: string
    mayaRuntimeToken: string
    ownerId: string
    environment: string
    autoShutdownBehaviour: 'NEVER' | 'BY_LAST_USE'
    maxIdleTime = 1800000

    app: Application
    dynamicRouter: Router
    comms: Comms
    functions: SymbolMethods
    storage: Storage
    program: Program | null
    axiosInstance: AxiosInstance
    dynamicRoutes: DynamicRoute[]

    constructor(props: RuntimeInitArgs) {
        this.id = props.id
        this.mayaRuntimeToken = props.mayaRuntimeToken
        this.ownerId = props.ownerId
        this.environment = props.environment
        this.autoShutdownBehaviour = props.autoShutdownBehaviour
        this.maxIdleTime = props.maxIdleTime

        this.app = createBaseApp(this)
        this.dynamicRouter = new Router()
        this.dynamicRouter.prefix('/dynamic')
        this.comms = new Comms({ app: this.app })
        this.functions = getSymbolMethods(this)

        const __dirname = new URL(import.meta.url).pathname
        this.storage = new LocalStorage({
            basePath: stdpath.join(__dirname, '../../../temp'),
        })
        this.program = null
        this.axiosInstance = getAxiosInstance(this)
        this.dynamicRoutes = []

        this.storage = new RemoteStorage({
            runtime: this,
        })

        if (props.storage) {
            this.storage = props.storage
        }
    }

    get appBackendBaseUrl() {
        switch (this.environment) {
            case 'STAGING':
                return 'https://api.dev.mayalabs.io/app'
            case 'PRODUCTION':
                return 'https://api.mayalabs.io/app'
            default:
                return 'http://localhost:5000'
        }
    }

    get infoSummary() {
        return {
            id: this.id,
            ownerId: this.ownerId,
            environment: this.environment,
            autoShutdown: this.autoShutdownBehaviour,
            storage: this.storage,
        }
    }

    addHttpRoute(method: string, path: string, handler: RouteHandler) {
        const absolutePath = `/dynamic${path}`
        const regexp = pathToRegexp(absolutePath)
        const urlMatch: MatchFunction<Record<string, unknown>> = match(absolutePath, { decode: decodeURIComponent })
        this.dynamicRoutes.push({
            method,
            regexp,
            path: absolutePath,
            handler,
            matchFunction: urlMatch,
        })
    }

    async init() {
        this.comms.init()
        const liteGraphDsl = await this.storage.get(this.id)
        await this.deploy({ liteGraphDsl, saveToStorage: false })

        this.dynamicRouter.all('/(.*)', async (ctx) => {
            const pathname = ctx.request.url.pathname
            const dynamicRoute = this.dynamicRoutes.find((route) => route.regexp.test(pathname))
            if (!dynamicRoute) {
                ctx.response.status = 404
                ctx.response.body = {
                    message: `No matching route found for path ${pathname}`,
                }
                return
            }

            ctx.params = dynamicRoute.matchFunction(pathname)?.params

            await dynamicRoute.handler(ctx)
        })

        this.app.use(this.dynamicRouter.allowedMethods())
        this.app.use(this.dynamicRouter.routes())

        console.log('Runtime', this.infoSummary)
        this.app.listen({ port: 9023 })
    }

    async deploy({ liteGraphDsl, saveToStorage = true }: DeployArgs) {
        this.program?.stop()
        const program = Program.from(liteGraphDsl)
        // const program = new Program({ dsl })
        this.dynamicRoutes = []

        // Re-create the dynamic router
        this.dynamicRouter = new Router().prefix('/dynamic')

        await program.deploy(this)
        if (saveToStorage) {
            await this.storage.set(this.id, liteGraphDsl)
        }
        this.program = program
    }
}
