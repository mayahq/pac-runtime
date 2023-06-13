import { Context } from './runtime.d.ts'

export class RuntimeContext implements Context {
    store: Record<string, unknown>

    constructor() {
        this.store = {}
    }

    set: Context['set'] = async (key, data) => {
        this.store[key] = data
    }

    get: Context['get'] = async (key, _default) => {
        const val = this.store[key]
        if (val === undefined) {
            return _default
        }

        return val
    }
}
