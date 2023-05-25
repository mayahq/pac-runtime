import { ProcedureDsl, ProgramDsl } from './hybrid.d.ts'

type PortMap = Record<string, Record<string, string[]>>

function isLeafProc(proc: ProcedureDsl): boolean {
    return !proc.children
}

function getAllProcedures(procs: ProcedureDsl[], res: Record<string, ProcedureDsl> = {}) {
    for (const proc of procs) {
        res[proc.id] = proc
        if (!isLeafProc(proc)) {
            getAllProcedures(Object.values(proc.children!.procedures), res)
        }
    }
    return res
}

function getLeafInputs(proc: ProcedureDsl, cache: Record<string, string[]> = {}, soFar: string[] = []) {
    if (cache[proc.id]) {
        return cache[proc.id]
    }

    if (isLeafProc(proc)) {
        soFar.push(proc.id)
    } else {
        for (const procId of proc.children!.pulseIn) {
            getLeafInputs(proc.children!.procedures[procId], cache, soFar)
        }
    }

    cache[proc.id] = soFar
    return soFar
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

export function createLeafInputMap(program: ProgramDsl) {
    const topLevelProcList = Object.values(program.procedures)
    const outInMap = createOutInMap(topLevelProcList)
    const allProcedures = getAllProcedures(topLevelProcList)
    console.log('allProcs', allProcedures)

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
