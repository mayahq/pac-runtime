import type { Children, Metadata, Schema, SymbolDsl, SymbolImpl, Wires } from './symbol.d.ts'
import { Runtime } from '../runtime/runtime.ts'
import { getSmallRandomId } from '../utils/misc.ts'
import { Runnable } from '../program/hybrid.ts'
import { RunnableCallback } from '../program/hybrid.d.ts'
import { Context } from '../runtime/runtime.d.ts'

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

    async _init(runner: Runnable, sender: RunnableCallback, runtime?: Runtime): Promise<void> {
        this.init(runner, sender, runtime)
            .catch(e => {
                this.runtime.functions.sendMessage(
                    'error',
                    {
                        message: (e as Error).message,
                        name: (e as Error).name,
                        sourceProcedure: runner.dsl.id,
                        timestamp: Date.now(),
                        place: 'init'
                    }
                )
            })
    }

    async init(_runner: Runnable, _sender: RunnableCallback, _runtime?: Runtime): Promise<void> {
        // Left for the symbol developer to override
    }

    async _call(
        _runner: Runnable,
        _ctx: Context,
        _callback: RunnableCallback,
        _pulse?: Record<string, any>,
    ) {
        this.runtime.functions.reportExecutionStatus(_runner.dsl.id, 'RUNNING')
        const schema = this.getSelfSchema()
        const vals: Record<string, any> = {}
        for (const propertyName in schema.inputSchema) {
            vals[propertyName] = await _runner.evaluateProperty(propertyName, _pulse)
        }

        // Do not allow completely overwriting the pulse. Properties can only
        // be overwritten explicitly.
        const callback: RunnableCallback = (val: any, portName?: string) => {
            this.runtime.recordProcedureIo({
                nodeType: _runner.dsl.type,
                inputs: vals,
                output: {
                    data: val,
                    portName: portName || ''
                }
            })
            this.runtime.functions.reportExecutionStatus(_runner.dsl.id, 'DONE')
            _callback({ ..._pulse, ...val }, portName)
        }
        this.call(_ctx, vals, callback, _pulse)
            .catch(e => {
                this.runtime.functions.reportExecutionStatus(_runner.dsl.id, 'ERROR')
                this.runtime.functions.sendMessage(
                    'error',
                    {
                        message: (e as Error).message,
                        name: (e as Error).name,
                        sourceProcedure: _runner.dsl.id,
                        timestamp: Date.now(),
                        place: 'call'
                    }
                )
            })
    }

    async call(
        _ctx: Context,
        _vals: Record<string, any>,
        _callback: RunnableCallback,
        _pulse?: Record<string, any>,
    ): Promise<any> {
        // Left for the symbol developer to override
    }
}

export default Symbol
