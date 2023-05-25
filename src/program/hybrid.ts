import type { ProcedureDsl, ProgramDsl } from './hybrid.d.ts'
import { Runtime } from '../runtime/runtime.ts'
import { isUrl } from '../utils/misc.ts'
import Symbol from '../symbol/symbol.ts'
import { AsyncLock, lodash as _ } from '../../deps.ts'

// pulse event: pulse::${proc_id}

type ProgramInitArgs = {
    dsl: ProgramDsl
}

type LeafProcedureDef = {
    instance: Symbol
    dslRepresentation: ProcedureDsl
}

type RunnableInitArgs = {
    dsl: ProcedureDsl
    parent: Runnable | null
    leafProcedures: Record<string, LeafProcedureDef>
    baseProgram: Program
}

type EvaluateFieldFunc = (args?: Record<string, any>, pulse?: Record<string, any>) => any





export class Runnable {
    dsl: ProcedureDsl
    parent: Runnable | null
    baseProgram: Program
    leafProcedures: Record<string, LeafProcedureDef>

    fieldLocks: typeof AsyncLock
    symbolFieldVals: Record<string, any>

    constructor({ dsl, parent, leafProcedures, baseProgram }: RunnableInitArgs) {
        this.dsl = dsl
        this.parent = parent
        this.baseProgram = baseProgram
        this.leafProcedures = leafProcedures

        this.fieldLocks = new AsyncLock()
        this.symbolFieldVals = {}
    }

    private getFieldSpec(name: string) {
        return this.dsl.inputs[name]
    }

    private getEvaluateSymbolFieldFunction(name: string): EvaluateFieldFunc {
        const field = this.getFieldSpec(name)
        switch (field.type) {
            case 'lambda_input': {
                if (!field.portName) {
                    throw new Error(`Invalid field spec: ${field}`)
                }
                return this.parent!.getEvaluateSymbolFieldFunction(field.portName)
            }
            case 'procedure': {
                if (!field.id) {
                    throw new Error(`Invalid symbol field spec: ${field}`)
                }

                // The upcoming symbol is a leaf symbol, we can just execute it and get back the result
                return (args?: Record<string, any>) => {
                    return new Promise((resolve, reject) => {
                        this.fieldLocks.acquire(name, async (done: (e: Error | null, r: unknown) => void) => {
                            if (!field.id) {
                                return done(new Error(`Invalid symbol field spec: ${field}`), null)
                            }
                            if (this.symbolFieldVals[field.id]) {
                                return done(null, _.get(this.symbolFieldVals[field.id], field.value))
                            } else {
                                const nextSymbolDef = this.parent!.dsl!.children!.procedures.find((s) =>
                                    s.id === field.id
                                )
                                if (!nextSymbolDef) {
                                    return done(new Error(`Symbol with ID ${field.id} does not exist`), null)
                                }
                                const runnable = new Runnable({
                                    dsl: nextSymbolDef,
                                    leafProcedures: this.leafProcedures,
                                    parent: this.parent,
                                    baseProgram: this.baseProgram
                                })
                                const result = await runnable.run(args)
                                this.symbolFieldVals[field.id] = result
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
            case 'pulse': {
                return (_args?: Record<string, any>, _pulse?: Record<string, any>) => new Promise(resolve => {
                    if (!_pulse) {
                        return resolve(null)
                    }
                    return resolve(_.get(_pulse, field.value))
                })
            }
            default:
                return async (_?: Record<string, any>) => field.value
        }
    }

    getNextInputForPort(portName: string) {
        const nextIds = this.dsl.pulseNext[portName]
        for (const id of nextIds) {
            // if ()
        }
    }

    evaluateProperty(name: string, pulse: Record<string, any>, args?: Record<string, any>) {
        const evaluatePropertyFunc = this.getEvaluateSymbolFieldFunction(name)
        return evaluatePropertyFunc(args, pulse)
    }

    async run(pulse?: Record<string, any>, args?: Record<string, any>): Promise<any> {
        // console.log('running node', this.symbolDef.id)
        /**
         * Execute the symbol if its a leaf symbol
         */
        if (this.leafProcedures[this.dsl.id]) {
            return await this.leafProcedures[this.dsl.id].instance.call(this, pulse, args)
        }

        /**
         * This is a lambda. Execute it with a
         */
        const outputChildren: ProcedureDsl[] = []
        this.dsl!.children!.procedures.forEach((s) => {
            if (this.dsl!.children!.out.includes(s.id)) {
                outputChildren.push(s)
            }
        })

        return await Promise.all(outputChildren.map((symbol) => {
            const runnable = new Runnable({
                dsl: symbol,
                leafProcedures: this.leafProcedures,
                parent: this,
                baseProgram: this.baseProgram       
            })
            return runnable.run(args)
        }))
    }

    sendPulseForward(pulse: Record<string, any>) {
        const activeOutputs: Record<string, boolean> = {}
        for (const key in pulse) {
            if (pulse[key] !== undefined) {
                activeOutputs[key] = true
            }
        }

        for (const portName in activeOutputs) {
            const sendfn = this.getSendFromPortFunction(portName)
            sendfn(pulse)
        }
    }
}





export class Program {
    dsl: ProgramDsl
    leafProcedures: Record<string, LeafProcedureDef>

    constructor({ dsl }: ProgramInitArgs) {
        this.dsl = dsl
        this.leafProcedures = {}
    }

    private async importProcedureType(type: string) {
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

    private async getOutputMap() {
    }

    private async getLeafProcedures(procedures: ProcedureDsl[], runtime?: Runtime) {
        for (const i in procedures) {
            const procedure = procedures[i]

            if (!procedure.children || procedure?.children?.procedures?.length === 0) {
                const ProcedureClass = await this.importProcedureType(procedure.type)
                const procedureInstance: Symbol = new ProcedureClass.default(runtime, procedure)
                this.leafProcedures[procedure.id] = {
                    instance: procedureInstance,
                    dslRepresentation: procedure,
                }
            } else {
                await this.getLeafProcedures(procedure.children.procedures, runtime)
            }
        }
    }

    getLeafInput(leafProcId: string, leafPortName: string): string[] {
        const 
        return []
    }

    getPortMap(procs: ProcedureDsl[], portMapSoFar: Record<string, any> = {}): Record<string, any> {
        for (const proc of procs) {
            console.log(proc)
        }
        return portMapSoFar
    }

    async deploy() {
    }
}
