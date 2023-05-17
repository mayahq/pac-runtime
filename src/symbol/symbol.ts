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
import TypedInput from './inputs/typedInput.ts'
import { Runtime } from '../runtime/runtime.ts'
import { getSmallRandomId } from '../Utils/misc.ts'

type SelfProperties = {
    name: string
    type: string
    isConfig: boolean
    description: string
}

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

    readonly id: string = getSmallRandomId()
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

    getSelfSchema(): Schema {
        return (this.constructor as any).schema as Schema
    }

    getSelfProperties(): SelfProperties {
        const props = this.constructor as any
        return {
            type: props.type,
            name: props.name,
            description: props.description,
            isConfig: props.isConfig,
        }
    }

    async _runtimeMessageHandler(msg: Record<string, unknown>, callback: OnMessageCallback): Promise<void> {
        const vals: { [propName: string]: unknown } = this.evaluateSymbolProperties(this, msg)
        await this.onMessage(msg, vals, callback)
    }
    async onInit(_callback: OnMessageCallback): Promise<void> {
    }

    async onMessage(
        _msg: Record<string, any>,
        _vals: Record<string, any>,
        _callback: OnMessageCallback,
    ): Promise<void> {
    }

    private generateDslSchema(symbol: Symbol): { [name: string]: TypedMetadata } {
        const { name, type } = this.getSelfProperties()
        const evaluated: { [name: string]: TypedMetadata } | undefined = {}
        Object.entries(this.getSelfSchema().propertiesSchema).forEach(([property, propVal]) => {
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
                console.error(`Error evaluating ${property} in ${symbol.id}:${type}:${name}`, error)
                throw error
            }
        })
        return evaluated
    }

    private evaluateSymbolProperties(symbol: Symbol, msg: Record<string, unknown>) {
        const { name, type } = this.getSelfProperties()
        const evaluated: { [propName: string]: unknown } = {}
        Object.entries(this.getSelfSchema().propertiesSchema).forEach(([property, propVal]) => {
            try {
                evaluated[property] = propVal.evaluateField(symbol, property, msg)['value']
            } catch (error) {
                console.error(`Error evaluating ${property} in ${symbol.id}:${type}:${name}`, error)
                throw error
            }
        })
        return evaluated
    }

    toJSON(): string {
        const { type, isConfig, description } = this.getSelfProperties()
        const out: SymbolDsl = {
            id: this.id,
            type: type,
            isConfig: isConfig,
            description: description,
            properties: this.properties,
            schema: {
                editorProperties: this.getSelfSchema().editorProperties,
                inputSchema: this.getSelfSchema().inputSchema,
                outputSchema: this.getSelfSchema().outputSchema,
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
