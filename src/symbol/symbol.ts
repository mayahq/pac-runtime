import type { Children, Metadata, Property, Schema, SymbolDsl, SymbolImpl, TypedMetadata, Wires } from './symbol.d.ts'
import TypedInput from './inputs/typedInput.ts'
import { Runtime } from '../runtime/runtime.ts'
import { getSmallRandomId } from '../utils/misc.ts'
import { Runnable } from '../program/hybrid.ts'
import { RunnableCallback } from '../program/hybrid.d.ts'

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
    // readonly properties: {
    //     [fieldName: string]: PropertyObject
    // }
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

    async init(_runner: Runnable, _sender: RunnableCallback): Promise<void> {
        // Left for the symbol developer to override
    }

    async _call(
        _runner: Runnable,
        _callback: RunnableCallback,
        _pulse?: Record<string, any>,
    ) {
        const schema = this.getSelfSchema()
        const vals: Record<string, any> = {}
        for (const propertyName in schema.propertiesSchema) {
            vals[propertyName] = await _runner.evaluateProperty(propertyName, _pulse)
        }
        this.call(vals, _callback, _pulse)
    }

    async call(
        _vals: Record<string, any>,
        _callback: RunnableCallback,
        _pulse?: Record<string, any>,
    ): Promise<any> {
        // Left for the symbol developer to override
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

    toJSON(): string {
        const { type, isConfig, description } = this.getSelfProperties()
        const out: SymbolDsl = {
            id: this.id,
            type: type,
            isConfig: isConfig,
            description: description,
            // properties: this.properties,
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
}

export default Symbol
