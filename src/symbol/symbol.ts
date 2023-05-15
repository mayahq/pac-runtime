import type {
    Children,
    Metadata,
    OnMessageCallback,
    Property,
    PropertyObject,
    Schema,
    SymbolDsl,
    SymbolImpl,
    TypedMetadata,
    Wires,
} from './symbol.d.ts'
import generateId from '../utils/generateId.ts'
import TypedInput from './inputs/typedInput.ts'
import { Runtime } from '../runtime/runtime.ts'

class Symbol implements SymbolImpl {
    static type = ''
    static isConfig = false
    static schema: Schema = {
        inputSchema: {},
        outputSchema: {},
        propertiesSchema: {},
        editorProperties: {
            category: '',
            icon: '',
            color: '',
            paletteLabel: '',
        },
    }
    static description = ''

    readonly id: string = generateId()
    readonly properties: {
        [fieldName: string]: PropertyObject
    }
    children?: Children = {
        wires: {
            in: [[]],
            out: [[]],
        },
        symbols: [],
    }
    metadata?: Metadata = {
        position: {
            x: 0,
            y: 0,
        },
        prefix: '',
        step_id: '',
        tmp_id: '',
    }
    wires: Wires = [[]]

    runtime: Runtime

    constructor(runtime: Runtime, args: SymbolDsl) {
        if (args.id) {
            this.id = args.id
        }
        this.runtime = runtime
        if (args.children) {
            this.children = args?.children || {
                wires: {
                    in: [[]],
                    out: [[]],
                },
                symbols: [],
            }
        }
        if (args.wires) {
            this.wires = args.wires
        }
        if (args.metadata) {
            this.metadata = args.metadata
        }
        if (args.properties) {
            this.properties = args.properties
        } else {
            this.properties = this.evaluateSymbolProperties(this, {})
        }
        if (args.wires) {
            this.wires = args.wires
        }
    }

    async _runtimeMessageHandler(msg: Record<string, unknown>, callback: OnMessageCallback): Promise<void> {
        const vals: { [propName: string]: PropertyObject } = this.evaluateSymbolProperties(this, msg)
        await this.onMessage(msg, vals, callback)
    }
    async onInit(_callback: OnMessageCallback): Promise<void> {
    }

    private async onMessage(
        _msg: Record<string, any>,
        _vals: Record<string, any>,
        _callback: OnMessageCallback,
    ): Promise<void> {
    }

    private generateDslSchema(symbol: Symbol): { [name: string]: TypedMetadata } {
        const evaluated: { [name: string]: TypedMetadata } | undefined = {}
        Object.entries(Symbol.schema.propertiesSchema).forEach(([property, propVal]) => {
            try {
                const field: Property = { [property]: propVal }
                if ((field[property] instanceof TypedInput)) {
                    evaluated[property] = (propVal as TypedInput).generateSchema(property, propVal as TypedInput)
                } else {
                    evaluated[property] = {
                        component: 'input',
                        label: property,
                    }
                }
            } catch (error) {
                console.error(`Error evaluating ${property} in ${symbol.id}:${Symbol.type}:${Symbol.name}`, error)
                throw error
            }
        })
        return evaluated
    }

    private evaluateSymbolProperties(symbol: Symbol, msg: Record<string, unknown>) {
        const evaluated: { [propName: string]: PropertyObject } = {}
        Object.entries(Symbol.schema.propertiesSchema).forEach(([property, propVal]) => {
            try {
                const field: Property = { [property]: propVal }
                if ((field[property] instanceof TypedInput)) {
                    evaluated[property] = (propVal as TypedInput).evaluateField(symbol, msg)
                } else {
                    evaluated[property] = {
                        value: propVal.value,
                        type: propVal.type,
                    }
                }
            } catch (error) {
                console.error(`Error evaluating ${property} in ${symbol.id}:${Symbol.type}:${Symbol.name}`, error)
                throw error
            }
        })
        return evaluated
    }

    toJSON(): string {
        const out: SymbolDsl = {
            id: this.id,
            type: Symbol.type,
            isConfig: Symbol.isConfig,
            description: Symbol.description,
            properties: this.properties,
            schema: {
                editorProperties: Symbol.schema.editorProperties,
                inputSchema: Symbol.schema.inputSchema,
                outputSchema: Symbol.schema.outputSchema,
                propertiesSchema: this.generateDslSchema(this),
            },
            children: this.children,
            metadata: this.metadata,
            wires: this.wires,
        }
        return JSON.stringify(out, null, 2)
    }

    // static fromJSON(symbolRepr: string, callback?: OnMessageCallback): Symbol {
    //     const dummy = {}
    //     try {
    //         const parsed: SymbolDsl = JSON.parse(symbolRepr)
    //         const sym: Symbol = new Symbol(callback ? callback : dummy, parsed)
    //         return sym
    //     } catch (error) {
    //         throw error
    //     }
    // }
}

export default Symbol
