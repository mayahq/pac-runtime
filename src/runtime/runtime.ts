import { Application, Router } from '../../deps.ts'
import { Program, ProgramDSL } from '../program/program.ts'
import { Comms } from './comms.ts'
import { Storage } from '../storage/typings.d.ts'
import createBaseApp from '../api/index.ts'
import { AxiosInstance } from '../../deps.ts'
import { getAxiosInstance } from './axios.ts'
import { RemoteStorage } from '../storage/remote.ts'
import { stdpath } from '../../test_deps.ts'
import { LocalStorage } from '../storage/local.ts'
import { ExecutionStatus, RuntimeInterface, SymbolMethods } from './runtime.d.ts'

export type AutoShutdownBehaviour = 'NEVER' | 'BY_LAST_USE'

type RuntimeInitArgs = {
    id: string
    mayaRuntimeToken: string
    ownerId: string
    environment: string
    autoShutdownBehaviour: AutoShutdownBehaviour
    maxIdleTime: number
}

type DeployArgs = {
    dsl: ProgramDSL
    saveToStorage?: boolean
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
        // this.storage = new RemoteStorage({
        //     runtime: this,
        // })
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

    async init() {
        this.comms.init()
        const dsl = await this.storage.get(this.id)
        await this.deploy({ dsl, saveToStorage: false })

        /**
         * Dynamic router for registering routes on /program
         */
        this.app.use((ctx, next) => this.dynamicRouter.routes()(ctx, next))
        this.app.use((ctx, next) => this.dynamicRouter.allowedMethods()(ctx, next))

        this.app.listen({ port: 9023 })
    }

    async deploy({ dsl, saveToStorage = true }: DeployArgs) {
        this.program?.stop()
        const program = new Program({ dsl })

        // Re-create the dynamic router
        this.dynamicRouter = new Router().prefix('/dynamic')

        // Re-create the comms channel
        this.comms = new Comms({ app: this.app })

        await program.deploy(this)
        if (saveToStorage) {
            await this.storage.set(this.id, program.dsl)
        }
        this.program = program
    }
}
