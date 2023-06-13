import { Application, Router } from '../../deps.ts'
import { AxiosInstance } from '../../deps.ts'

export type ConnMessage = {
    event: string
    data: unknown
}

export type EventListener = (msg: ConnMessage) => Promise<void>

export type SymbolStatus = 'FAILED' | 'PROGRESS' | 'SUCCESS'
export type ExecutionStatus = 'RUNNING' | 'DONE'

export interface SymbolMethods {
    reportExecutionStatus: (status: ExecutionStatus) => Promise<void>
    sendMessage: (event: string, data: unknown) => Promise<void>
    setStatus: (status: SymbolStatus, message: string) => Promise<void>
}

export interface CommsInterface {
    addMessageListener: (event: string, listener: EventListener) => string
    removeMessageListener: (event: string, listenerId: string) => void
    broadcast: (msg: ConnMessage) => Promise<void>
    send: (connectionId: string, msg: ConnMessage) => Promise<void>
}

export interface Context {
    set: (key: string, data: unknown) => Promise<void>
    get: (key: string, _default?: unknown) => Promise<unknown>
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
    comms: CommsInterface
    functions: SymbolMethods
    axiosInstance: AxiosInstance
}
