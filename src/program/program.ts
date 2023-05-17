import { getSmallRandomId } from '../Utils/misc.ts'
import { Runtime } from '../runtime/runtime.ts'
import { OnMessageCallback, SymbolDsl } from '../symbol/symbol.d.ts'
import Symbol from '../symbol/symbol.ts'

export type ProgramDSL = {
    symbols: SymbolDsl[]
}

type SymbolMessage = Record<string, unknown>

type RunnableInitArgs = {
    dsl: ProgramDSL
    leafSymbolMap: Record<string, LeafSymbolDef>
    parent?: Runnable
    parentSymbolId?: string | null
    baseProgram: Program
}

type ProgramInitArgs = {
    dsl: ProgramDSL
}

type LeafSymbolDef = {
    dslRepresentation: SymbolDsl
    instance: Symbol
}

type HookType = 'beforeSend' | 'onTerminate'
type HookFunction = (...args: unknown[]) => Promise<unknown> | unknown
type HookMap = Record<HookType, Record<string, HookFunction>>

type EvalArgs = {
    dsl: ProgramDSL
    startingSymbolId: string
    msg: SymbolMessage
}

function emptyCallback(_: unknown) {}
export class Runnable {
    leafSymbolMap: Record<string, LeafSymbolDef>
    symbolMap: Record<string, SymbolDsl>
    parent?: Runnable
    parentSymbolId?: string | null
    baseProgram: Program

    constructor({
        dsl,
        leafSymbolMap,
        parent,
        parentSymbolId,
        baseProgram,
    }: RunnableInitArgs) {
        this.baseProgram = baseProgram
        this.leafSymbolMap = leafSymbolMap

        this.symbolMap = {}
        dsl.symbols.forEach((s) => (this.symbolMap[s.id] = s))
        this.parent = parent
        this.parentSymbolId = parentSymbolId
    }

    getSendFunction(symbolId: string): OnMessageCallback | null {
        const symbol = this.symbolMap[symbolId]
        const hasOutputs = symbol.wires.length > 0 && symbol.wires[0].length > 0

        if (hasOutputs) {
            return (msg: unknown) => {
                const nextNodeIds = symbol.wires[0]
                /**
                 * Execute pre-send hooks
                 */
                Object.values(this.baseProgram.hooks['beforeSend']).forEach(
                    (fn) => {
                        try {
                            fn(msg)
                        } catch (_) {
                            //
                        }
                    },
                )
                nextNodeIds.forEach((nodeId: string) =>
                    this.runSymbol(
                        nodeId,
                        msg as SymbolMessage,
                    )
                )
            }
        } else if (this.parent && this.parentSymbolId) {
            return this.parent.getSendFunction(this.parentSymbolId)
        }

        return null
    }

    initSymbols(initPromises: Promise<unknown>[] = []): Promise<unknown> {
        Object.values(this.symbolMap).forEach((symbol) => {
            if (!symbol.children || symbol?.children?.symbols?.length === 0) {
                const promise = this.leafSymbolMap[symbol.id].instance.onInit(
                    this.getSendFunction(symbol.id) || emptyCallback,
                )
                initPromises.push(promise)
            } else {
                new Runnable({
                    dsl: { symbols: symbol.children.symbols },
                    leafSymbolMap: this.leafSymbolMap,
                    parent: this,
                    parentSymbolId: symbol.id,
                    baseProgram: this.baseProgram,
                }).initSymbols(initPromises)
            }
        })

        return Promise.all(initPromises)
    }

    runSymbol(symbolId: string, msg: SymbolMessage) {
        if (this.baseProgram.stopped) {
            return
        }

        const symbol = this.symbolMap[symbolId]

        if (!symbol.children || symbol.children.symbols.length === 0) {
            const sendfn = this.getSendFunction(symbolId)
            const symbolInstance = this.leafSymbolMap[symbolId]
            if (sendfn !== null) {
                symbolInstance.instance._runtimeMessageHandler(msg, sendfn)
            } else {
                symbolInstance.instance._runtimeMessageHandler(msg, (msg) => msg)
                /**
                 * If sendfn is null, that means we're at a terminal node.
                 * Calling all onTerminate hooks here.
                 */
                Object.values(this.baseProgram.hooks['onTerminate']).forEach((fn) => fn(msg))
            }
        } else {
            const runnable = new Runnable({
                dsl: { symbols: symbol.children.symbols },
                leafSymbolMap: this.leafSymbolMap,
                parent: this,
                parentSymbolId: symbolId,
                baseProgram: this.baseProgram,
            })

            const firstNode = symbol.children.wires.in[0][0]
            runnable.runSymbol(firstNode, msg)
        }
    }
}

export class Program {
    dsl: ProgramDSL
    leafSymbols: Record<string, LeafSymbolDef>
    runnable: Runnable
    hooks: HookMap
    stopped: boolean

    constructor({ dsl }: ProgramInitArgs) {
        this.dsl = dsl
        this.leafSymbols = {}
        this.runnable = new Runnable({
            dsl,
            leafSymbolMap: this.leafSymbols,
            baseProgram: this,
        })
        this.hooks = {
            beforeSend: {},
            onTerminate: {},
        }
        this.stopped = false
    }

    async getLeafSymbols(symbols: SymbolDsl[], runtime?: Runtime) {
        for (const i in symbols) {
            const symbol = symbols[i]

            if (!symbol.children || symbol?.children?.symbols?.length === 0) {
                console.log('🚀 ~ file: program.ts:180 ~ Program ~ getLeafSymbols ~ symbol.type:', symbol.type)
                const SymbolClass = await import(symbol.type)
                const symbolInstance: Symbol = new SymbolClass.default(runtime, symbol)
                this.leafSymbols[symbol.id] = {
                    instance: symbolInstance,
                    dslRepresentation: symbol,
                }
            } else {
                await this.getLeafSymbols(symbol.children.symbols, runtime)
            }
        }
    }

    runFrom(symbolId: string, msg: SymbolMessage) {
        if (this.stopped) {
            return
        }
        return this.runnable.runSymbol(symbolId, msg)
    }

    async deploy(runtime?: Runtime) {
        await this.getLeafSymbols(this.dsl.symbols, runtime)
        this.runnable.leafSymbolMap = this.leafSymbols
        this.stopped = false

        /**
         * Initialise all symbols
         */
        await this.runnable.initSymbols()
    }

    addHook(type: HookType, fn: HookFunction) {
        const hookId = getSmallRandomId()
        this.hooks[type][hookId] = fn
        return hookId
    }

    removeHook(type: HookType, hookId: string) {
        delete this.hooks[type][hookId]
    }

    stop() {
        this.stopped = true
    }

    start() {
        this.stopped = false
    }

    private async evaluate(symbolId: string, msg: SymbolMessage): Promise<SymbolMessage> {
        await this.deploy()
        return await new Promise((resolve) => {
            const id = this.addHook('onTerminate', (msg) => {
                resolve(msg as SymbolMessage)
                this.removeHook('onTerminate', id)
            })

            this.runFrom(symbolId, msg)
        })
    }

    static async eval({ dsl, startingSymbolId = '', msg }: EvalArgs): Promise<SymbolMessage> {
        const symbols = dsl.symbols
        if (!startingSymbolId) {
            const symbolsWithInputs: Record<string, boolean> = {}
            symbols.forEach((symbol) => {
                symbol.wires.forEach((wireGroup) => {
                    wireGroup.forEach((symbolId) => symbolsWithInputs[symbolId] = true)
                })
            })
            for (const symbol of symbols) {
                if (!symbolsWithInputs[symbol.id]) {
                    startingSymbolId = symbol.id
                }
                break
            }
        }

        if (!startingSymbolId) {
            throw new Error('No starting symbolId provided, and unable to auto-infer it')
        }

        console.log('Using starting symbolId:', startingSymbolId)

        const program = new Program({ dsl })
        const result = await program.evaluate(startingSymbolId, msg)
        return result
    }
}
