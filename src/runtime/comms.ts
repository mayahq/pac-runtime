import { Application, Router } from '../../deps.ts'
import { getSmallRandomId } from '../utils/misc.ts'
import { CommsInterface, ConnMessage, EventListener } from './runtime.d.ts'

type CommsInitArgs = {
    app: Application
}

type ListenerMap = {
    [eventName: string]: {
        [listenerId: string]: EventListener
    }
}

type WebsocketMap = {
    [key: string]: WebSocket
}

export class Comms implements CommsInterface {
    id: string
    app: Application
    socketRouter: Router
    connections: WebsocketMap
    messageListeners: ListenerMap

    constructor({ app }: CommsInitArgs) {
        this.id = getSmallRandomId()

        this.app = app
        this.socketRouter = new Router()
        this.socketRouter.prefix('/socket')
        this.connections = {}
        this.messageListeners = {}
    }

    _registerPrimarySocketListener() {
        this.socketRouter.get('/', (ctx) => {
            if (!ctx.isUpgradable) {
                ctx.response.status = 400
                ctx.response.body = {
                    message: 'This request is not upgradable to the websocket protocol',
                }
            }

            const connectionId = getSmallRandomId()
            const ws = ctx.upgrade()
            ws.onopen = () => {
                console.log('Got new websocket connection.')
                this.connections[connectionId] = ws
            }

            ws.onclose = () => {
                delete this.connections[connectionId]
                console.log('Connection closed:', connectionId)
            }

            ws.onmessage = async (msg) => {
                await this._handleSocketMessage(msg, ws)
            }
        })

        this.app.use((ctx, next) => this.socketRouter.allowedMethods()(ctx, next))
        this.app.use((ctx, next) => this.socketRouter.routes()(ctx, next))
    }

    async _handleSocketMessage(
        message: MessageEvent<ConnMessage>,
        connection: WebSocket,
    ) {
        console.log(
            'Received ws message',
            message.data,
            'from connection',
            connection,
        )
        const event = message.data.event
        if (!this.messageListeners[event]) {
            return
        }

        Object.values(this.messageListeners[event]).forEach((listener) => listener(message.data))
    }

    addMessageListener(event: string, listener: EventListener) {
        const listenerId = getSmallRandomId()
        if (!this.messageListeners[event]) {
            this.messageListeners[event] = {}
        }

        this.messageListeners[event][listenerId] = listener
        return listenerId
    }

    removeMessageListener(event: string, listenerId: string) {
        if (this.messageListeners?.[event]?.[listenerId]) {
            delete this.messageListeners[event][listenerId]
        }
    }

    async broadcast(msg: ConnMessage) {
        const connections = Object.values(this.connections)
        for (const conn of connections) {
            await conn.send(JSON.stringify(msg))
        }
    }

    async send(connectionId: string, msg: ConnMessage) {
        const conn = this.connections[connectionId]
        if (!conn) {
            const e = new Error(
                `Connection with ID ${connectionId} not found.`,
            )
            e.name = 'CONN_NOT_FOUND'
            throw e
        }

        await conn.send(JSON.stringify(msg))
    }

    init() {
        this.socketRouter = new Router().prefix('/socket')
        this._registerPrimarySocketListener()
    }
}
