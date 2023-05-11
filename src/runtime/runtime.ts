import { Application, Router } from '../../deps.ts'
import { Program, ProgramDSL } from '../program/program.ts'
import { Comms } from './comms.ts'
import { Storage } from '../storage/typings.d.ts'
import { LocalStorage } from '../storage/local.ts'
import { stdpath } from '../../deps.ts'
import createBaseApp from '../api/index.ts'

const __dirname = new URL(import.meta.url).pathname

export type AutoShutdownBehaviour = 'NEVER' | 'BY_LAST_USE'

type RuntimeInitArgs = {
    id: string;
    mayaRuntimeToken: string;
    ownerId: string;
    environment: string
    autoShutdownBehaviour: AutoShutdownBehaviour
    maxIdleTime: number
}

type SymbolStatus = 'FAILED' | 'PROGRESS' | 'SUCCESS'
type ExecutionStatus = 'RUNNING' | 'DONE'

interface SymbolMethods {
    reportExecutionStatus: (status: ExecutionStatus) => Promise<void>
    sendMessage: (event: string, data: unknown) => Promise<void>
    setStatus: (status: SymbolStatus, message: string) => Promise<void>
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

export class Runtime {
    id: string
    mayaRuntimeToken: string
    ownerId: string
    environment: string
    app: Application
    dynamicRouter: Router
    comms: Comms
    functions: SymbolMethods
    storage: Storage
    program: Program | null
    autoShutdownBehaviour: 'NEVER' | 'BY_LAST_USE'
    maxIdleTime = 1800000

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
        this.storage = new LocalStorage({
            basePath: stdpath.join(__dirname, '../../../temp'),
        })
        this.program = null
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
