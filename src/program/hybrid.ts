/**
 * Given how fast we've switched between execution styles,
 * it's very probable that some of the design decisions I made
 * for older execution styles have leaked into this one. It's
 * possible that things can be done a lot more efficiently or
 * simply than the current version. If you discover anything
 * like that, please reach out immediately.
 *
 * - dusnat
 */

import type {
    EvaluateFieldFunc,
    LiteGraphSpec,
    ProcedureDsl,
    ProgramDsl,
    ProgramEvent,
    PulseEventDetail,
    RunnableCallback,
} from './hybrid.d.ts'
import { Runtime } from '../runtime/runtime.ts'
import { isUrl } from '../utils/misc.ts'
import Symbol from '../symbol/symbol.ts'
import { AsyncLock, lodash as _ } from '../../deps.ts'
import {
    createLeafInputMap,
    createParentMap,
    getAllProcedures,
    getFirstProcId,
    getLastProcId,
    getProgramDsl,
    PortMap,
} from './translate.ts'

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
    baseProgram: Program
}

export class Runnable {
    dsl: ProcedureDsl
    parent: Runnable | null
    baseProgram: Program

    fieldLocks: typeof AsyncLock
    symbolFieldVals: Record<string, any>
    sender: RunnableCallback

    constructor({ dsl, parent, baseProgram }: RunnableInitArgs) {
        this.dsl = dsl
        this.parent = parent
        this.baseProgram = baseProgram

        this.fieldLocks = new AsyncLock()
        this.symbolFieldVals = {}
        this.sender = this.getPulseCallback()
    }

    private isLeafProcedure() {
        return !!this.baseProgram.leafProcedures[this.dsl.id]
    }

    private getFieldSpec(name: string) {
        return this.dsl.inputs[name]
    }

    private getPulseCallback(): RunnableCallback {
        const leafInputMap = this.baseProgram.leafInputMap[this.dsl.id]
        let fn = (_val: any, _?: string) => {}

        if (!this.isLeafProcedure() || !leafInputMap) {
            fn = (_val, _) => null
        } else {
            fn = (val: any, portName?: string) => {
                const destinations = portName ? leafInputMap[portName] : Object.values(leafInputMap)[0]
                destinations.forEach((destination) => {
                    const pulseData: PulseEventDetail = {
                        pulse: val,
                        metadata: {
                            sender: this.dsl.id,
                            timestamp: Date.now(),
                        },
                        destination: destination,
                    }
                    const pulseEvent = new CustomEvent('pulse', {
                        detail: pulseData,
                    })

                    this.baseProgram.hub.dispatchEvent(pulseEvent)
                })
            }
        }

        return (val: any, portName?: string) => {
            // Run the procedure-done hooks
            // console.log('pulseCallbackVal', val)
            this.baseProgram.hooks['onProcedureDone'].forEach((hook) => hook(val, this.dsl.id, portName))
            fn(val, portName)
        }
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
                return (_pulse?: Record<string, any>) => {
                    return new Promise((resolve, reject) => {
                        this.fieldLocks.acquire(name, async (done: (e: Error | null, r: unknown) => void) => {
                            if (!field.id) {
                                return done(new Error(`Invalid symbol field spec: ${field}`), null)
                            }
                            if (this.symbolFieldVals[field.id]) {
                                return done(null, _.get(this.symbolFieldVals[field.id], field.value))
                            } else {
                                const runnable = this.baseProgram.getDeepRunnable(field.id)
                                const result = await runnable.run()
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
                return (_pulse?: Record<string, any>) =>
                    new Promise((resolve) => {
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

    evaluateProperty(name: string, pulse?: Record<string, any>) {
        const evaluatePropertyFunc = this.getEvaluateSymbolFieldFunction(name)
        return evaluatePropertyFunc(pulse)
    }

    async init(runtime?: Runtime, promises: Promise<any>[] = []) {
        const leafProcDef = this.baseProgram.leafProcedures[this.dsl.id]
        if (leafProcDef) {
            promises.push(leafProcDef.instance.init(this, this.sender, runtime))
        } else {
            Object.values(this.dsl!.children!.procedures).forEach((procDsl) => {
                new Runnable({
                    dsl: procDsl,
                    baseProgram: this.baseProgram,
                    parent: this,
                }).init(runtime, promises)
            })
        }

        await Promise.all(promises)
    }

    async run(pulse?: Record<string, any>): Promise<any> {
        /**
         * Execute the symbol if its a leaf symbol
         */
        if (this.baseProgram.leafProcedures[this.dsl.id]) {
            const val = await new Promise((resolve) => {
                let callback: RunnableCallback = (val, _) => {
                    this.baseProgram.hooks['onProcedureDone'].forEach((fn) => fn(val, this.dsl.id))
                    resolve(val)
                }
                if (pulse) {
                    resolve(1) // Don't need to wait for the procedure if this is pulse-based
                    callback = (val, port) => {
                        this.sender(val, port)
                    }
                }

                this.baseProgram.leafProcedures[this.dsl.id].instance._call(
                    this,
                    callback,
                    pulse,
                )
            })
            return val
        }

        /**
         * A pulse can only ever be sent to a leaf procedure's input, and
         * never a subflow input.
         */
        if (pulse) {
            throw new Error(`Pulse sent to subflow input: ${this.dsl.id}`)
        }

        /**
         * We've run into my biggest enemy - a lambda.
         */
        const outputChildren: ProcedureDsl[] = []
        Object.values(this.dsl.children!.outputs).forEach((out) => {
            const child = this.dsl.children!.procedures[out.procedureId]
            outputChildren.push(child)
        })

        return await Promise.all(outputChildren.map((symbol) => {
            const runnable = new Runnable({
                dsl: symbol,
                parent: this,
                baseProgram: this.baseProgram,
            })
            return runnable.run()
        }))
    }
}

export class Program {
    dsl: ProgramDsl
    leafProcedures: Record<string, LeafProcedureDef>
    allProcedures: Record<string, ProcedureDsl>
    leafInputMap: PortMap
    parentMap: Record<string, string>
    liteGraphDsl?: LiteGraphSpec
    hooks: Record<ProgramEvent, Function[]>

    hub: EventTarget
    listener: EventListener

    constructor({ dsl }: ProgramInitArgs) {
        this.dsl = dsl

        this.leafProcedures = {}
        this.leafInputMap = createLeafInputMap(this.dsl)

        const procedureList = Object.values(this.dsl.procedures)
        this.parentMap = createParentMap(procedureList)
        this.allProcedures = getAllProcedures(procedureList)

        this.hub = new EventTarget()
        this.listener = (_) => undefined
        this.hooks = {
            onProcedureDone: [],
        }
    }

    static from(spec: LiteGraphSpec): Program {
        const dsl = getProgramDsl(spec)
        const program = new Program({ dsl })
        program.liteGraphDsl = spec
        return program
    }

    /**
     * Runs a program with a given pulse and returns the response.
     * Use this if you're trying to experiment.
     *
     * @param spec The program DSL in LiteGraph form.
     * @param runtime An instance of the Runtime class.
     * @param data The pulse to inject in the starting node.
     * @param firstProcedureId The starting node ID. Will be auto-determined (best effort) if not provided.
     * @param lastProcedureId The terminating node ID. Will be auto-determined (best effort) if not proviced.
     * @param timeout The timeout for evaluation, starting *after* the program has deployed completely.
     * @returns
     */
    static eval(
        spec: LiteGraphSpec,
        runtime: Runtime,
        data: any,
        firstProcedureId?: string,
        lastProcedureId?: string,
        timeout?: number,
    ): Promise<any> {
        if (!firstProcedureId) {
            firstProcedureId = getFirstProcId(spec)
        }
        if (!lastProcedureId) {
            lastProcedureId = getLastProcId(spec)
        }

        const program = Program.from(spec)
        let errorTimeout: any = null

        return new Promise((resolve, reject) => {
            const handler = async (val: any, id: string, portName: string) => {
                console.log('handler called for', val, id)
                if (id !== lastProcedureId) {
                    return
                }

                if (errorTimeout) {
                    clearTimeout(errorTimeout)
                }
                resolve({ result: val, portName })
                program.removeHook('onProcedureDone', handler)
            }

            program.addHook('onProcedureDone', handler)
            program.deploy(runtime)
                .then(() => {
                    if (timeout) {
                        errorTimeout = setTimeout(() => {
                            program.stop()
                            reject(new Error('Timed out!'))
                        }, timeout)
                    }

                    const e = new CustomEvent('pulse', {
                        detail: {
                            pulse: data,
                            metadata: {
                                sender: '0',
                                timestamp: Date.now(),
                            },
                            destination: firstProcedureId,
                        },
                    })

                    program.hub.dispatchEvent(e)
                })
        })
    }

    getDeepRunnable(procedureId: string): Runnable {
        if (!this.allProcedures[procedureId]) {
            throw new Error(`Procedure with ID: ${procedureId} does not exist.`)
        }

        const levels: string[] = []
        let current = procedureId
        while (current !== '') {
            levels.push(current)
            current = this.parentMap[current]
        }

        let runnable: any = null
        levels.reverse().forEach((level) => {
            const lastRunnable: Runnable | null = runnable
            runnable = new Runnable({
                dsl: this.allProcedures[level],
                baseProgram: this,
                parent: lastRunnable,
            })
        })

        return runnable as Runnable
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

    private async getLeafProcedures(
        procedures: Record<string, ProcedureDsl> = this.dsl.procedures,
        runtime?: Runtime,
    ) {
        for (const i in procedures) {
            const procedure = procedures[i]

            if (!procedure.children) {
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

    async init(runtime?: Runtime) {
        const parent: ProcedureDsl = {
            id: 'parent',
            inputs: {},
            pulseNext: {},
            type: 'parent',
            children: {
                pulseIn: [],
                outputs: {},
                procedures: this.dsl.procedures,
            },
        }
        await new Runnable({
            dsl: parent,
            baseProgram: this,
            parent: null,
        }).init(runtime)
    }

    async deploy(runtime?: Runtime) {
        await this.getLeafProcedures(this.dsl.procedures, runtime)
        await this.init(runtime)

        const listener: EventListener = async (e: Event) => {
            const event = e as CustomEvent
            const data: PulseEventDetail = event.detail
            const { pulse, destination } = data

            const destinationProcedure = this.leafProcedures[destination]
            const runnable = new Runnable({
                dsl: destinationProcedure.dslRepresentation,
                baseProgram: this,
                parent: null,
            })
            runnable.run(pulse)
        }
        this.hub.addEventListener('pulse', listener)
    }

    async stop() {
        this.hub.removeEventListener('pulse', this.listener)
    }

    async addHook(event: ProgramEvent, hook: Function) {
        this.hooks[event].push(hook)
    }

    async removeHook(event: ProgramEvent, hook: Function) {
        this.hooks[event] = this.hooks[event].filter((h) => h !== hook)
    }
}
