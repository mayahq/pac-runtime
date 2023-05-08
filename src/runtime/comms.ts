import { Application, Router } from "../../deps.ts"
import { getSmallRandomId } from "../utils/misc.ts";

type CommsInitArgs = {
    app: Application;
}

type WebsocketMap = {
    [key: string]: WebSocket
}

type ConnMessage = {
    event: string;
    data: unknown;
}

type EventListener = (msg: ConnMessage) => Promise<void>;
type ListenerMap = {
    [eventName: string]: {
        [listenerId: string]: EventListener
    }
}

export class Comms {
    app: Application;
    socketRouter: Router;
    connections: WebsocketMap;
    messageListeners: ListenerMap;

    constructor({ app }: CommsInitArgs) {
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
                ctx.response.body = { message: 'This request is not upgradable to the websocket protocol' }
            }

            const connectionId = getSmallRandomId()
            const ws = ctx.upgrade()
            ws.onopen = () => {
                console.log('Got new websocket connection.')
            }

            this.connections[connectionId] = ws
            ws.onclose = () => {
                delete this.connections[connectionId]
            }

            ws.onmessage = async (msg) => {
                await this._handleSocketMessage(msg, ws)
            }
        })

        this.app.use(this.socketRouter.allowedMethods())
        this.app.use(this.socketRouter.routes())
    }

    async _handleSocketMessage(message: MessageEvent<ConnMessage>, connection: WebSocket) {
        await console.log('Received ws message', message.data, 'from connection', connection)
        const event = message.data.event
        if (!this.messageListeners[event]) {
            return
        }

        Object.values(this.messageListeners[event]).forEach(listener => listener(message.data))
    }

    addMessageListener(event: string, listener: EventListener) {
        const listenerId = getSmallRandomId()
        if (!this.messageListeners[event]) {
            this.messageListeners[event] = {}
        }

        this.messageListeners[event][listenerId] = listener
        return listenerId
    }

    removeEventListener(event: string, listenerId: string) {
        if (this.messageListeners?.[event]?.[listenerId]) {
            delete this.messageListeners[event][listenerId]
        }
    }

    async broadcast(msg: ConnMessage) {
        const connections = Object.values(this.connections)
        for (const i in connections) {
            const conn = connections[i]
            await conn.send(JSON.stringify(msg))
        }
    }

    async send(connectionId: string, msg: ConnMessage) {
        const conn = this.connections[connectionId]
        if (!conn) {
            const e = new Error(`Connection with ID ${connectionId} not found.`)
            e.name = 'CONN_NOT_FOUND'
            throw e
        }

        await conn.send(JSON.stringify(msg))
    }


    init() {
        this._registerPrimarySocketListener()
    }
}