import { FunctionalProgramDsl, FunctionalSymbolDsl } from './program.d.ts'
import { Runtime } from '../runtime/runtime.ts'
import { AsyncLock, lodash as _ } from '../../deps.ts'
// import Symbol from '../symbol/symbol.ts'

interface Symbol {
    onInit: (runnableInstance: FRunnable) => Promise<void>
    onExecute: (runnableInstance: FRunnable, args?: Record<string, any>) => Promise<any>
}

type FProgramInitArgs = {
    dsl: FunctionalProgramDsl
}

type FRunnableInitArgs = {
    dsl: FunctionalProgramDsl
    leafSymbolMap: Record<string, LeafSymbolDef>
    parent?: FRunnable
    parentSymbolId?: string | null
    symbolId: string
}

type LeafSymbolDef = {
    dslRepresentation: FunctionalSymbolDsl
    instance: Symbol
}

function isUrl(url: string) {
    try {
        new URL(url)
        return true
    } catch (_) {
        return false
    }
}

type EvaluateFieldFunc = (args: Record<string, any>) => any

export class FRunnable {
    leafSymbolMap: Record<string, LeafSymbolDef>
    symbolMap: Record<string, FunctionalSymbolDsl>
    parent?: FRunnable
    parentSymbolId?: string | null
    fieldLocks: AsyncLock
    symbolId: string
    symbolFieldVals: Record<string, any>
    dsl: FunctionalProgramDsl

    constructor(args: FRunnableInitArgs) {
        this.dsl = args.dsl
        this.symbolId = args.symbolId
        this.leafSymbolMap = args.leafSymbolMap
        this.symbolMap = {}

        args.dsl.symbols.forEach((s) => this.symbolMap[s.id] = s)

        this.parent = args.parent
        this.parentSymbolId = args.parentSymbolId
        this.fieldLocks = new AsyncLock()
        this.symbolFieldVals = {}
    }

    private getFieldSpec(name: string) {
        return this.symbolMap[this.symbolId].inputs[name]
    }

    getEvaluateSymbolFieldFunction(name: string): EvaluateFieldFunc {
        console.log('field:', name)
        const field = this.getFieldSpec(name)
        switch (field.type) {
            case 'lambda_input': {
                if (!field.inputPortName) {
                    throw new Error(`Invalid field spec: ${field}`)
                }
                return this.parent!.getEvaluateSymbolFieldFunction(field.inputPortName)
            }
            case 'symbol': {
                if (!field.symbolId) {
                    throw new Error(`Invalid symbol field spec: ${field}`)
                }

                // The upcoming symbol is a leaf symbol, we can just execute it and get back the result
                return (args?: Record<string, any>) => {
                    return new Promise((resolve, reject) => {
                        this.fieldLocks.acquire(name, async (done: (e: Error | null, r: unknown) => void) => {
                            if (!field.symbolId) {
                                return done(new Error(`Invalid symbol field spec: ${field}`), null)
                            }
                            if (this.symbolFieldVals[field.symbolId]) {
                                return done(null, _.get(this.symbolFieldVals[field.symbolId], field.value))
                            } else {
                                const runnable = new FRunnable({
                                    symbolId: field.symbolId,
                                    dsl: this.dsl,
                                    leafSymbolMap: this.leafSymbolMap,
                                    parent: this.parent,
                                    parentSymbolId: this.parent?.symbolId,
                                })
                                const result = await runnable.run(args)
                                this.symbolFieldVals[field.symbolId] = result
                                return _.get(result, field.value)
                            }
                        }, (e: Error | null, r: unknown) => {
                            if (e) {
                                return reject(e)
                            }
                            resolve(r)
                        })
                    })
                }
            }
            default:
                return async (_: Record<string, any>) => field.value
        }
    }

    async run(args?: Record<string, any>): Promise<any> {
        /**
         * Execute the symbol if its a leaf symbol
         */
        if (this.leafSymbolMap[this.symbolId]) {
            return await this.leafSymbolMap[this.symbolId].instance.onExecute(this, args)
        }

        // Now we know its a fucking subflow, gotta do recursion.
        const symbol = this.symbolMap[this.symbolId]
        const outputChildren: FunctionalSymbolDsl[] = []

        symbol.children.symbols.forEach((s) => {
            if (symbol.children.out.includes(s.id)) {
                outputChildren.push(s)
            }
        })

        return await Promise.all(outputChildren.map((symbol) => {
            const runnable = new FRunnable({
                symbolId: symbol.id,
                dsl: this.dsl,
                leafSymbolMap: this.leafSymbolMap,
                parent: this,
                parentSymbolId: this.symbolId,
            })
            return runnable.run(args)
        }))
    }

    async init(initPromises: Promise<any>[] = []) {
        Object.values(this.symbolMap).forEach((symbol) => {
            if (!symbol.children || symbol.children.symbols.length === 0) {
                const promise = this.leafSymbolMap[symbol.id].instance.onInit(
                    new FRunnable({
                        dsl: this.dsl,
                        leafSymbolMap: this.leafSymbolMap,
                        symbolId: symbol.id,
                        parent: this,
                        parentSymbolId: this.parentSymbolId,
                    }),
                )
                initPromises.push(promise)
            } else {
                new FRunnable({
                    dsl: { symbols: symbol.children.symbols },
                    leafSymbolMap: this.leafSymbolMap,
                    symbolId: symbol.id,
                    parent: this,
                    parentSymbolId: this.symbolId,
                }).init(initPromises)
            }
        })

        return initPromises
    }
}

export class FProgram {
    dsl: FunctionalProgramDsl
    leafSymbols: Record<string, LeafSymbolDef>
    stopped: boolean

    constructor({ dsl }: FProgramInitArgs) {
        this.dsl = dsl
        this.leafSymbols = {}
        this.stopped = false
    }

    private async importSymbolType(type: string) {
        if (type.startsWith('gh:')) {
            // gh:mayahq/stdlib/http
            const location = type.replace('gh:', '').trim()
            const locationParts = location.split('/')
            if (locationParts.length !== 3) {
                throw new Error(`Invalid github type path: ${type}`)
            }
            const [user, repo, symbolName]: string[] = locationParts
            return await import(`https://raw.githubusercontent.com/${user}/${repo}/${symbolName}/${symbolName}.ts`)
        } else if (type.startsWith('ghPath')) {
            const location = type.replace('ghPath:', '').trim()
            return await import(`https://raw.githubusercontent.com/${location}.ts`)
        } else if (isUrl(type)) {
            return await import(type)
        } else {
            return await import(`https://deno.land/x/${type}.ts`)
        }
    }

    async getLeafSymbols(symbols: FunctionalSymbolDsl[], runtime?: Runtime) {
        for (const i in symbols) {
            const symbol = symbols[i]

            if (!symbol.children || symbol?.children?.symbols?.length === 0) {
                const SymbolClass = await this.importSymbolType(symbol.type)
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

    async deploy(runtime?: Runtime) {
        await this.getLeafSymbols(this.dsl.symbols, runtime)
        this.stopped = false
    }
}
