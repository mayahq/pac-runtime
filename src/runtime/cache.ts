import { getSmallRandomId } from "../utils/misc.ts"

type ValueMap = Record<string, any>
type Output = {
    portName: string
    result: any
}

type ExecutionCacheSessionArgs = {
    sessionId: string
}

const primitives: Record<string, boolean> = {
    string: true,
    number: true,
    boolean: true,
    undefined: true
}

export class ExecutionCacheSession {
    sessionId: string
    store: Record<string, Map<string, Output>>
    objectReferenceStore: WeakMap<any, string>

    constructor({ sessionId }: ExecutionCacheSessionArgs) {
        this.sessionId = sessionId
        this.store = {}
        this.objectReferenceStore = new WeakMap<any, string>()
    }

    getUniqueIdForObject(object: any): string {
        const result = this.objectReferenceStore.get(object)
        if (result) {
            return result
        }

        const objectId = getSmallRandomId()
        this.objectReferenceStore.set(object, objectId)
        return objectId
    }

    getObjectKeyForCache(valueMap: ValueMap): string {
        const sortedEntries = Object.entries(valueMap).sort((a, b) => a[0] < b[0] ? -1 : 1)
        return sortedEntries.map(entry => {
            if (primitives[typeof entry[1]]) {
                return entry[1].toString()
            } else if (entry[1] === null) {
                return 'null'
            } else {
                return this.getUniqueIdForObject(entry[1])
            }
        }).join('.')
    }

    get(procType: string, inputs: ValueMap): Output | undefined {
        if (!this.store[procType]) {
            this.store[procType] = new Map<string, Output>()
        }

        const key = this.getObjectKeyForCache(inputs)
        return this.store[procType].get(key)
    }

    set(procType: string, inputs: ValueMap, output: Output): string {
        if (!this.store[procType]) {
            this.store[procType] = new Map<string, Output>()
        }

        const key = this.getObjectKeyForCache(inputs)
        this.store[procType].set(key, output)
        return key
    }
}

export class ExecutionCache {
    store: Record<string, ExecutionCacheSession>

    constructor() {
        this.store = {}
    }

    get(sessionId: string, procType: string, inputs: ValueMap): Output | undefined {
        if (!this.store[sessionId]) {
            this.store[sessionId] = new ExecutionCacheSession({ sessionId })
        }
        return this.store[sessionId].get(procType, inputs)
    }

    set(sessionId: string, procType: string, inputs: ValueMap, output: Output): string {
        if (!this.store[sessionId]) {
            this.store[sessionId] = new ExecutionCacheSession({ sessionId })
        }

        const key = this.store[sessionId].set(procType, inputs, output)
        return key
    }
}