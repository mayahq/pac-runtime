import { Context } from './runtime.d.ts'

export class InMemoryContext implements Context {
    store: Record<string, unknown>

    constructor(store?: Record<string, unknown>) {
        if (store) {
            this.store = store
        } else {
            this.store = {}
        }
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

    clone: Context['clone'] = () => {
        return new InMemoryContext({ ...this.store })
    }
}
