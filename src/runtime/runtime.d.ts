import { Application, Router } from '../../deps.ts'
import { Comms } from './comms.ts'
import { AxiosInstance } from '../../deps.ts'

export type SymbolStatus = 'FAILED' | 'PROGRESS' | 'SUCCESS'
export type ExecutionStatus = 'RUNNING' | 'DONE'

export interface SymbolMethods {
    reportExecutionStatus: (status: ExecutionStatus) => Promise<void>
    sendMessage: (event: string, data: unknown) => Promise<void>
    setStatus: (status: SymbolStatus, message: string) => Promise<void>
}

export interface RuntimeInterface {
    id: string
    mayaRuntimeToken: string
    ownerId: string
    environment: string
    autoShutdownBehaviour: 'NEVER' | 'BY_LAST_USE'
    maxIdleTime: number

    app: Application
    dynamicRouter: Router
    comms: Comms
    functions: SymbolMethods
    program: Program | null
    axiosInstance: AxiosInstance
}
