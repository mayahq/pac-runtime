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
    ProgramHook,
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
    guessEdgeProcIds,
    getProgramDsl,
    PortMap,
} from './translate.ts'
import { Context } from '../runtime/runtime.d.ts'
import { InMemoryContext } from '../runtime/context.ts'

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

/**
 * The runnable class represents an instance of a procedure
 * (including subflows) that can be run. This is where the procedure
 * code is actually run. Every runnable is run only once, and then discarded.
 *
 * A more apt name would be literally "Procedure",
 * but that's taken by the Procedure class in the SDK.
 */
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

    /**
     * Figures out which procedures to send the message next based on it's
     * output connections. Runs the `onProcedureDone` hooks before forwarding
     * the pulse.
     *
     * @returns a function that asks the hub to forward the pulse to said procedures.
     */
    private getPulseCallback(): RunnableCallback {
        const leafInputMap = this.baseProgram.leafInputMap[this.dsl.id]
        let fn = (_val: any, _?: string, _ctx?: Context) => {}

        if (!this.isLeafProcedure() || !leafInputMap) {
            fn = (_val, _, _ctx) => null
        } else {
            fn = (val: any, portName?: string, ctx?: Context) => {
                const destinations = portName ? leafInputMap[portName] : Object.values(leafInputMap)[0]
                destinations?.forEach((destination) => {
                    const pulseData: PulseEventDetail = {
                        pulse: val,
                        metadata: {
                            sender: this.dsl.id,
                            timestamp: Date.now(),
                        },
                        destination: destination,
                        context: ctx
                    }
                    const pulseEvent = new CustomEvent('pulse', {
                        detail: pulseData,
                    })

                    this.baseProgram.hub.dispatchEvent(pulseEvent)
                })
            }
        }

        return (val: any, portName?: string, ctx?: Context) => {
            this.baseProgram.hooks['onProcedureDone'].forEach((hook) => hook(val, this.dsl.id, portName))
            fn(val, portName, ctx)
        }
    }

    /**
     * Figures out how to resolve the value of an input. For eval type properties,
     * recursively executes previous procedures to get the value.
     *
     * Every directly-connected previous procedure is executed only once. After
     * that, it's value is cached. This ensures that if one running-instance of a
     * procedure requires two of it's eval-type fields from the same procedure, it
     * doesn't end up executing it twice. This works with subflows as well.
     *
     * @param name Name of the field to be evaluated
     * @returns a function that returns the evaluated value of the said field.
     */
    private getEvaluateSymbolFieldFunction(name: string): EvaluateFieldFunc {
        const field = this.getFieldSpec(name)
        if (!field) {
            const expectedInputs = Object.keys(this.dsl.inputs).join(', ')
            throw new Error(
                `No input found by name ${name} in procedure type ${this.dsl.type}. The expected inputs are: ${expectedInputs}`)
        }

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
                return (_pulse?: Record<string, any>, ctx?: Context) => {
                    return new Promise((resolve, reject) => {
                        this.fieldLocks.acquire(name, async (done: (e: Error | null, r: unknown) => void) => {
                            if (!field.id) {
                                return done(new Error(`Invalid symbol field spec: ${field}`), null)
                            }
                            if (this.symbolFieldVals[field.id]) {
                                return done(null, _.get(this.symbolFieldVals[field.id], field.value))
                            } else {
                                const runnable = this.baseProgram.getDeepRunnable(field.id)
                                const result = await runnable.run(ctx)
                                this.symbolFieldVals[field.id] = result
                                if (field.value) {
                                    const final = _.get(result, field.value)
                                    return done(null, final)
                                } else {
                                    return done(null, result)
                                }
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
                return async (_?: Record<string, any>) => {
                    if (field.type === 'json') {
                        return JSON.parse(field.value as string)
                    }
                    return field.value
                }
        }
    }

    /**
     * Evaluates the value of a given input of the procedure.
     *
     * @param name Name of the input.
     * @param pulse Pulse received at time of evaluation.
     * @returns The evaluated value of the input.
     */
    evaluateProperty(name: string, pulse?: Record<string, any>, ctx?: Context) {
        const evaluatePropertyFunc = this.getEvaluateSymbolFieldFunction(name)
        return evaluatePropertyFunc(pulse, ctx)
    }

    /**
     * Recursively calls the init method of all leaf procedures
     * that this runnable contains.
     *
     * @param runtime Runtime instance
     * @param promises Accumulator of all the promises returned by the init
     *                 methods of all leaf nodes.
     */
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

    /**
     * Runs the `call` method of a procedure. For subflow evals, it will recursively
     * call itself for the children node connected to it's eval outputs.
     *
     * @param ctx The execution context, unique to each execution
     * @param pulse The pulse received, if triggered by pulse.
     * @returns whatever the procedure passed to the callback in it's `call` method.
     */
    async run(ctx?: Context, pulse?: Record<string, any>, ): Promise<any> {
        console.log(`Running [${this.dsl.type}] ${this.dsl.id}`)

        if (!ctx) {
            ctx = new InMemoryContext()
        } else {
            /**
             * We want to shallow-clone the context before passing it on to a procedure, so that
             * future modifications to the context do not affect the current procedure. To some
             * degree, at least. Need to see if deep-cloning is viable.
             */
            ctx = ctx.clone()
        }

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
                        this.sender(val, port, ctx)
                    }
                }

                this.baseProgram.leafProcedures[this.dsl.id].instance._call(
                    this,
                    ctx as unknown as Context, // smh
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
         * We've run into my biggest enemy - a lambda. Find out which children
         * nodes contribute to the output of this lambda.
         */
        const outputChildren: ProcedureDsl[] = []
        Object.values(this.dsl.children!.outputs).forEach((out) => {
            const child = this.dsl.children!.procedures[out.procedureId]
            outputChildren.push(child)
        })

        /**
         * And then run them.
         */
        return await Promise.all(outputChildren.map((symbol) => {
            const runnable = new Runnable({
                dsl: symbol,
                parent: this,
                baseProgram: this.baseProgram,
            })
            return runnable.run(ctx)
        }))
    }
}

/**
 * The Program class contains all the informatin global to the program,
 * such as the DSL, the event hub, the procedure instances, etc.
 *
 * Every runtime will have one Program object related to it, at any
 * point of time.
 */
export class Program {
    dsl: ProgramDsl
    leafProcedures: Record<string, LeafProcedureDef>
    allProcedures: Record<string, ProcedureDsl>
    leafInputMap: PortMap
    parentMap: Record<string, string>
    liteGraphDsl?: LiteGraphSpec
    hooks: Record<ProgramEvent, ProgramHook[]>

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

    /**
     * Takes a LiteGraph DSL and returns the corresponding Program
     * object. Useful if you want to run a LiteGraph program
     *
     * @param spec The program DSL in LiteGraph spec.
     * @returns Program instance that can be deployed and run.
     */
    static from(spec: LiteGraphSpec): Program {
        const dsl = getProgramDsl(spec)

        console.log('dsl', JSON.stringify(dsl, null, 4))

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
        data: any,
        runtime?: Runtime,
        firstProcedureId?: string,
        lastProcedureId?: string,
        timeout?: number,
    ): Promise<any> {
        if (!firstProcedureId || !lastProcedureId) {
            const [guessedFirstProcId, guessedLastProcId] = guessEdgeProcIds(spec)
            console.log('heh', guessedFirstProcId, guessedLastProcId)
            if (!firstProcedureId) {
                if (!guessedFirstProcId) {
                    throw new Error('Unable to auto-determine first procedure ID.')
                }
                firstProcedureId = guessedFirstProcId
            }

            if (!lastProcedureId) {
                if (!guessedLastProcId) {
                    throw new Error('Unable to determine last procedure ID.')
                }
                lastProcedureId = guessedLastProcId
            }
        }

        const program = Program.from(spec)
        let errorTimeout: any = null

        return new Promise((resolve, reject) => {
            const handler = async (val: any, id: string, portName?: string) => {
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

    /**
     * To run a runnable in eval mode, it must have the correct `parent`
     * runnable set. Simply creating a Runnable instance via it's DSL
     * with a `null` parent will not work.
     *
     * This function takes a procedure ID and creates a Runnable with the
     * right parent, with the right parent, with the right parent, and so on.
     *
     * @param procedureId ID of the procedure to get a runnable for
     * @returns A runnable with it's parents populated
     */
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

    /**
     * Gets the type of a procedure from the DSL, uses it to construct
     * the remote URL where it's code exists, and then imports it.
     *
     * @param type The type of the procedure
     * @returns Whatever is imported from the remote procedure file
     */
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

    /**
     * Gets instances of all leaf (non-subflow) procedures in the program.
     * This needs to be done because the program has a deploy state, so its
     * important that there is only one instance of one procedure because the
     * procedure might be accumulating information within itself on every call.
     *
     * For example, if a procedure is supposed to register an HTTP endpoint
     * with the runtime on initialisation, we need to make sure it only happens
     * once.
     *
     * @param procedures Map of procedures to their IDs, out of which the leaf procedures are to be found.
     * @param runtime Runtime instance
     */
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

    /**
     * Calls the init method of every leaf procedure to,
     * well, initalise it.
     *
     * @param runtime Runtime instance
     */
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

    /**
     * Initialises the program and starts the event hub to
     * facilitate pulse-based communication between procedures.
     *
     * @param runtime Runtime instance
     */
    async deploy(runtime?: Runtime) {
        await this.getLeafProcedures(this.dsl.procedures, runtime)
        await this.init(runtime)

        const listener: EventListener = async (e: Event) => {
            const event = e as CustomEvent
            const data: PulseEventDetail = event.detail
            const { pulse, destination, context } = data

            console.log('Received pulse for destination', destination)
            const destinationProcedure = this.leafProcedures[destination]
            const runnable = new Runnable({
                dsl: destinationProcedure.dslRepresentation,
                baseProgram: this,
                parent: null,
            })
            runnable.run(context, pulse)
        }
        this.hub.addEventListener('pulse', listener)
    }

    /**
     * Disables pulse-based communication between procedures.
     */
    async stop() {
        this.hub.removeEventListener('pulse', this.listener)
    }

    /**
     * Allows the programmer to hook into certain events such as
     * procedure completion, pulse reception, etc. Think of it like
     * the `addEventListener` API in the browser.
     *
     * @param event Type of event to register a hook for.
     * @param hook Function to run when said event occurs.
     */
    async addHook(event: ProgramEvent, hook: ProgramHook) {
        this.hooks[event].push(hook)
    }

    /**
     * Allows the programmer to remove a hook.
     *
     * @param event Type of event to remove the hook from.
     * @param hook The hook to remove.
     */
    async removeHook(event: ProgramEvent, hook: ProgramHook) {
        this.hooks[event] = this.hooks[event].filter((h) => h !== hook)
    }
}
