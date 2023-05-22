import { FunctionalProgramDsl, FunctionalSymbolDsl } from './program.d.ts'
import { Runtime } from '../runtime/runtime.ts'
import { AsyncLock, lodash as _ } from '../../deps.ts'
import { getSmallRandomId } from '../utils/misc.ts'
// import Symbol from '../symbol/symbol.ts'

interface Symbol {
    init: (runnableInstance: FRunnable) => Promise<void>
    call: (runnableInstance: FRunnable, args?: Record<string, any>) => Promise<any>
}

type FProgramInitArgs = {
    dsl: FunctionalProgramDsl
    rootNodeId: string
}

type FRunnableInitArgs = {
    symbolDef: FunctionalSymbolDsl
    leafSymbolMap: Record<string, LeafSymbolDef>
    parent?: FRunnable
    parentSymbolId?: string | null
}

type LeafSymbolDef = {
    dslRepresentation: FunctionalSymbolDsl
    instance: Symbol
}

type EvaluateFieldFunc = (args?: Record<string, any>) => any

function isUrl(url: string) {
    try {
        new URL(url)
        return true
    } catch (_) {
        return false
    }
}

export class FRunnable {
    symbolDef: FunctionalSymbolDsl
    leafSymbolMap: Record<string, LeafSymbolDef>
    parent?: FRunnable

    fieldLocks: typeof AsyncLock
    symbolFieldVals: Record<string, any>

    constructor(args: FRunnableInitArgs) {
        this.leafSymbolMap = args.leafSymbolMap
        this.symbolDef = args.symbolDef
        this.parent = args.parent

        this.fieldLocks = new AsyncLock()
        this.symbolFieldVals = {}
    }

    private getFieldSpec(name: string) {
        return this.symbolDef.inputs[name]
    }

    private getEvaluateSymbolFieldFunction(name: string): EvaluateFieldFunc {
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
                                const nextSymbolDef = this.parent!.symbolDef.children.symbols.find((s) =>
                                    s.id === field.symbolId
                                )
                                if (!nextSymbolDef) {
                                    return done(new Error(`Symbol with ID ${field.symbolId} does not exist`), null)
                                }
                                const runnable = new FRunnable({
                                    symbolDef: nextSymbolDef,
                                    leafSymbolMap: this.leafSymbolMap,
                                    parent: this.parent,
                                })
                                const result = await runnable.run(args)
                                this.symbolFieldVals[field.symbolId] = result
                                const final = _.get(result, field.value)
                                return done(null, final)
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
                return async (_?: Record<string, any>) => field.value
        }
    }

    evaluateProperty(name: string, args?: Record<string, any>) {
        const evaluatePropertyFunc = this.getEvaluateSymbolFieldFunction(name)
        return evaluatePropertyFunc(args)
    }

    async run(args?: Record<string, any>): Promise<any> {
        // console.log('running node', this.symbolDef.id)
        /**
         * Execute the symbol if its a leaf symbol
         */
        if (this.leafSymbolMap[this.symbolDef.id]) {
            return await this.leafSymbolMap[this.symbolDef.id].instance.call(this, args)
        }

        /**
         * This is a lambda. Execute it with a
         */
        const outputChildren: FunctionalSymbolDsl[] = []
        this.symbolDef.children.symbols.forEach((s) => {
            if (this.symbolDef.children.out.includes(s.id)) {
                outputChildren.push(s)
            }
        })

        return await Promise.all(outputChildren.map((symbol) => {
            const runnable = new FRunnable({
                symbolDef: symbol,
                leafSymbolMap: this.leafSymbolMap,
                parent: this,
            })
            return runnable.run(args)
        }))
    }

    init(initPromises: Promise<any>[] = []) {
        // Call init if its a primitive symbol
        if (this.leafSymbolMap[this.symbolDef.id]) {
            initPromises.push(
                this.leafSymbolMap[this.symbolDef.id].instance.init(this),
            )
        } else {
            // Init all child symbols
            Object.values(this.symbolDef.children.symbols).forEach((symbolDef) => {
                new FRunnable({
                    symbolDef,
                    leafSymbolMap: this.leafSymbolMap,
                    parent: this,
                }).init(initPromises)
            })
        }

        return Promise.all(initPromises)
    }
}

export class FProgram {
    dsl: FunctionalProgramDsl
    leafSymbols: Record<string, LeafSymbolDef>
    stopped: boolean
    rootNodeId: string
    runnable: FRunnable

    constructor({ dsl, rootNodeId }: FProgramInitArgs) {
        this.dsl = dsl
        this.leafSymbols = {}
        this.rootNodeId = rootNodeId
        this.stopped = false

        const symbolId = getSmallRandomId()
        const baseSymbol = {
            id: symbolId,
            label: 'lambda',
            type: 'lambda',
            inputs: {},
            outputs: {},
            children: {
                in: [[]],
                out: [this.rootNodeId],
                symbols: this.dsl.symbols,
            },
        }

        this.runnable = new FRunnable({
            leafSymbolMap: this.leafSymbols,
            symbolDef: baseSymbol,
        })
    }

    private async importSymbolType(type: string) {
        if (type.startsWith('gh:')) {
            // gh:mayahq/stdlib/http
            const location = type.replace('gh:', '').trim()
            const locationParts = location.split('/')
            if (![3, 4].includes(locationParts.length)) {
                throw new Error(`Invalid github type path: ${type}`)
            }
            if (locationParts.length === 3) {
                const [user, repo, symbolName]: string[] = locationParts
                return await import(
                    `https://raw.githubusercontent.com/${user}/${repo}/main/symbols/${symbolName}/${symbolName}.ts`
                )
            } else {
                const [user, repo, branch, symbolName]: string[] = locationParts
                return await import(
                    `https://raw.githubusercontent.com/${user}/${repo}/${branch}/symbols/${symbolName}/${symbolName}.ts`
                )
            }
        } else if (type.startsWith('ghPath')) {
            const location = type.replace('ghPath:', '').trim()
            return await import(`https://raw.githubusercontent.com/${location}.ts`)
        } else if (isUrl(type) || type.startsWith('File://')) {
            return await import(type)
        } else {
            const parts = type.split('/')
            if (parts.length === 2) {
                return await import(`https://deno.land/x/${parts[0]}/symbols/${parts[1]}/${parts[1]}.ts`)
            } else {
                return await import(`https://deno.land/x/${type}.ts`)
            }
            // return await import(type)
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
        this.runnable.leafSymbolMap = this.leafSymbols
        this.stopped = false

        await this.runnable.init()
    }

    async run(args?: any) {
        return (await this.runnable.run(args))[0]
    }

    stop() {
    }
}
