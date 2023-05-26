import { ProcedureDsl, ProgramDsl } from './hybrid.d.ts'

export type PortMap = Record<string, Record<string, string[]>>

/**
 * @param proc An individual procedure's DSL
 * @returns `true` if the procedure is a leaf procedure, `false` otherwise.
 */
export function isLeafProc(proc: ProcedureDsl): boolean {
    return !proc.children
}

/**
 * @param procs List of procedures - these can have child procedures of their own
 * @param _res Accumulator - you don't need to pass this
 * @returns A map of procedures to their IDs.
 */
export function getAllProcedures(procs: ProcedureDsl[], _res: Record<string, ProcedureDsl> = {}) {
    for (const proc of procs) {
        _res[proc.id] = proc
        if (!isLeafProc(proc)) {
            getAllProcedures(Object.values(proc.children!.procedures), _res)
        }
    }
    return _res
}

/**
 * @param proc The procedure in question
 * @param cache Cache to use
 * @returns The list of IDs of leaf procedures that would receive the pulse,
 *          should the pulse be sent to this procedure
 */
export function getLeafInputs(proc: ProcedureDsl, cache: Record<string, string[]> = {}) {
    const res: string[] = []
    if (cache[proc.id]) {
        return cache[proc.id]
    }

    if (isLeafProc(proc)) {
        res.push(proc.id)
    } else {
        for (const procId of proc.children!.pulseIn) {
            const inputsForProcId = getLeafInputs(proc.children!.procedures[procId], cache)
            cache[procId] = inputsForProcId
            res.push(...inputsForProcId)
        }
    }

    return res
}

/**
 * @param procs List of procedures
 * @param parent The parent that contains `procs` as children. Can be null.
 * @param soFar Accumulator for results. You don't need to pass this
 * @returns A map specifying which procedure's which output port connects to which
 * procedures' input ports
 */
export function createOutInMap(
    procs: ProcedureDsl[],
    parent: ProcedureDsl | null = null,
    soFar: Record<string, any> = {},
): Record<string, Record<string, string[]>> {
    for (const proc of procs) {
        for (const portName in proc.pulseNext) {
            if (!soFar[proc.id]) {
                soFar[proc.id] = {}
            }
            if (!soFar[proc.id][portName]) {
                soFar[proc.id][portName] = []
            }

            for (const output of proc.pulseNext[portName]) {
                switch (output.type) {
                    case 'procedure_input': {
                        soFar[proc.id][portName].push(output.procedureId)
                        break
                    }
                    case 'lambda_output': {
                        soFar[proc.id][portName] = soFar[proc.id][portName].concat(soFar[parent!.id][output.portName])
                        break
                    }
                }
            }
        }

        if (!isLeafProc(proc)) {
            createOutInMap(
                Object.values(proc!.children!.procedures),
                proc,
                soFar,
            )
        }
    }

    return soFar
}

/**
 * @param program The program DSL
 * @returns A map specifying which procedure's which port is directly or indirectly connected to
 * which leaf procedure inputs.
 * `{ procId: { portName1: ['procId1', 'procId2'] } }`
 */
export function createLeafInputMap(program: ProgramDsl): PortMap {
    const topLevelProcList = Object.values(program.procedures)
    const outInMap = createOutInMap(topLevelProcList)
    const allProcedures = getAllProcedures(topLevelProcList)

    const cache = {}
    const result: PortMap = {}

    for (const procId in outInMap) {
        const procOutMap = outInMap[procId]
        result[procId] = {}

        for (const portName in procOutMap) {
            const res: string[] = []
            const topLevelInputs = procOutMap[portName]
            for (const input of topLevelInputs) {
                const leafInputs = getLeafInputs(allProcedures[input], cache)
                leafInputs.forEach((i) => res.push(i))
            }
            result[procId][portName] = res
        }
    }

    return result
}

/**
 * @param procs List of procedures to create parent map for. These procedures can themselves have children.
 * @param _result Accumulator - you don't need to pass this
 * @param _current State variable - you don't need to pass this
 * @returns A map with the procedure ID as the key, and it's parent procedure as the value
 */
export function createParentMap(
    procs: ProcedureDsl[],
    _result: Record<string, string> = {},
    _current = '',
) {
    for (const proc of procs) {
        _result[proc.id] = _current
        if (proc.children) {
            createParentMap(
                Object.values(proc.children.procedures),
                _result,
                proc.id,
            )
        }
    }

    return _result
}
