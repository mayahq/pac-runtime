import { getSmallRandomId } from "../utils/misc.ts";

type Symbol = any;

export type ProgramDSL = {
    symbols: Symbol[];
}

type SendFunction = (msg: unknown) => unknown


type SymbolInstance = {
    onInit: (runtime: unknown | null) => Promise<unknown>;
    onMessage: (send: SendFunction, message: unknown) => Promise<unknown>
}

type RunnableInitArgs = {
    dsl: ProgramDSL;
    leafSymbolMap: Record<string, LeafSymbolDef>
    parent?: Runnable;
    parentSymbolId?: string | null;
    baseProgram: Program;
}

type ProgramInitArgs = {
    dsl: ProgramDSL;
}

type LeafSymbolDef = {
    dslRepresentation: Symbol;
    instance: SymbolInstance;
}

type HookType = 'beforeSend' | 'onTerminate'
type HookMap = Record<HookType, Record<string, Function>>

export class Runnable {
    leafSymbolMap: Record<string, LeafSymbolDef>
    symbolMap: Record<string, Symbol>
    parent?: Runnable;
    parentSymbolId?: string | null;
    baseProgram: Program;

    constructor({ dsl, leafSymbolMap, parent, parentSymbolId, baseProgram }: RunnableInitArgs) {
        this.baseProgram = baseProgram
        this.leafSymbolMap = leafSymbolMap
        
        this.symbolMap = {}
        dsl.symbols.forEach((s) => this.symbolMap[s.id] = s)
        this.parent = parent
        this.parentSymbolId = parentSymbolId
    }

    getSendFunction(symbolId: string): SendFunction | null {
        const symbol = this.symbolMap[symbolId]
        const hasOutputs = symbol.wires.length > 0 && symbol.wires[0].length > 0

        if (hasOutputs) {
            return (msg: unknown) => {
                const nextNodeIds = symbol.wires[0]
                /**
                 * Execute pre-send hooks
                 */
                Object.values(this.baseProgram.hooks['beforeSend']).forEach(fn => {
                    try {
                        fn(msg)
                    } catch (_) {
                        //
                    }
                })
                nextNodeIds.forEach((nodeId: string) => this.runSymbol(nodeId, msg))
            }
        } else if (this.parent && this.parentSymbolId) {
            return this.parent.getSendFunction(this.parentSymbolId)
        }

        return null
    }

    initSymbols() {
        Object.values(this.symbolMap).forEach(symbol => {
            const isLeafNode = symbol.children.symbols.length === 0
            if (isLeafNode) {
                this.leafSymbolMap[symbol.id].instance.onInit(
                    this.getSendFunction(symbol.id)
                )
            } else {
                new Runnable({
                    dsl: { symbols: symbol.children.symbols },
                    leafSymbolMap: this.leafSymbolMap,
                    parent: this,
                    parentSymbolId: symbol.id,
                    baseProgram: this.baseProgram
                }).initSymbols()
            }
        })
    }

    runSymbol(symbolId: string, msg: unknown) {
        const symbol = this.symbolMap[symbolId]
        const isLeafNode = symbol.children.symbols.length === 0

        if (isLeafNode) {
            const sendfn = this.getSendFunction(symbolId)
            const symbolInstance = this.leafSymbolMap[symbolId]
            if (sendfn !== null) {
                symbolInstance.instance.onMessage(sendfn, msg)
            } else {
                /**
                 * If sendfn is null, that means we're at a terminal node.
                 * Calling all onTerminate hooks here.
                 */
                Object.values(this.baseProgram.hooks['onTerminate'])
                    .forEach(fn => fn(msg))
            }
        } else {
            const runnable = new Runnable({
                dsl: { symbols: symbol.children.symbols }, 
                leafSymbolMap: this.leafSymbolMap,
                parent: this,
                parentSymbolId: symbolId,
                baseProgram: this.baseProgram
            })

            const firstNode = symbol.children.wires.in[0][0]
            runnable.runSymbol(firstNode, msg)
        }
    }
}

export class Program {
    dsl: ProgramDSL
    leafSymbols: Record<string, LeafSymbolDef>
    runnable: Runnable;
    hooks: HookMap

    constructor({ dsl }: ProgramInitArgs) {
        this.dsl = dsl
        this.leafSymbols = {}
        this.runnable = new Runnable({ dsl, leafSymbolMap: this.leafSymbols, baseProgram: this })
        this.hooks = {
            beforeSend: {},
            onTerminate: {}
        }
    }

    async getLeafSymbols(symbols: Symbol[]) {
        for (const i in symbols) {
            const symbol = symbols[i]
            const isLeaf = symbol.children.symbols.length === 0
            if (isLeaf) {
                const SymbolClass = await import(symbol.type)
                const symbolInstance = new SymbolClass.default(null)
                this.leafSymbols[symbol.id] = {
                    instance: symbolInstance,
                    dslRepresentation: symbol
                }
            } else {
                await this.getLeafSymbols(symbol.children.symbols)
            }
        }
    }

    runFrom(symbolId: string, msg: unknown) {
        return this.runnable.runSymbol(symbolId, msg)
    }

    async deploy() {
        await this.getLeafSymbols(this.dsl.symbols)
        this.runnable.leafSymbolMap = this.leafSymbols

        /**
         * Initialise all symbols
         */
        this.runnable.initSymbols()
    }

    addHook(type: HookType, fn: Function) {
        const hookId = getSmallRandomId()
        this.hooks[type][hookId] = fn
        return hookId
    }
}