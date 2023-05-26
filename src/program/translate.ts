import { ProcedureDsl, ProgramDsl } from './hybrid.d.ts'

export type PortMap = Record<string, Record<string, string[]>>

function isLeafProc(proc: ProcedureDsl): boolean {
    return !proc.children
}

export function getAllProcedures(procs: ProcedureDsl[], res: Record<string, ProcedureDsl> = {}) {
    for (const proc of procs) {
        res[proc.id] = proc
        if (!isLeafProc(proc)) {
            getAllProcedures(Object.values(proc.children!.procedures), res)
        }
    }
    return res
}

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

export function createDepthMap(
    procs: ProcedureDsl[],
    soFar: string[] = [],
    result: Record<string, string[]> = {},
) {
    for (const proc of procs) {
        const newSoFar = soFar.concat(proc.id)
        result[proc.id] = newSoFar
        if (proc.children) {
            createDepthMap(Object.values(proc.children.procedures), newSoFar, result)
        }
    }

    return result
}

export function createParentMap(
    procs: ProcedureDsl[],
    result: Record<string, string> = {},
    current = '',
) {
    for (const proc of procs) {
        if (!proc.children) {
            result[proc.id] = current
        } else {
            createParentMap(
                Object.values(proc.children.procedures),
                result,
                proc.id,
            )
        }
    }

    return result
}

// proc 3 output1
// input: 4
// leafInputs: [ "3", "7" ]

// proc 3 output1
// input: 5
// leafInputs: [ "5" ]

// proc 3 output2
// input: 6
// leafInputs: [ "6" ]
