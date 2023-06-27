import { Program } from '../../mod.ts'
import {
    Children,
    LiteGraphNode,
    LiteGraphNodeInput,
    LiteGraphSpec,
    PrimitiveType,
    ProcedureDsl,
    ProgramDsl,
} from './hybrid.d.ts'

export type PortMap = Record<string, Record<string, string[]>>

export class TranslateError extends Error {
    static type = 'TRANSLATE_ERROR'
}

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

// export function getSubflowInputMap(
//     procs: ProcedureDsl[], 
//     results: Record<string, string[]> = {}, 
//     parent = '#'
// ): Record<string, string[]> {
//     for (const proc of procs) {
//         if (proc.type )
//     }
//     return results
// }

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
): PortMap {
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
    console.log('outInMap', outInMap)
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

const primitives: Record<string, boolean> = {
    json: true,
    string: true,
    boolean: true,
    number: true,
}
function isPrimitiveType(input: LiteGraphNodeInput): boolean {
    return !!primitives[input.type]
}

function getChildren(lNode: LiteGraphNode): Children | undefined {
    if (!lNode.subgraph) {
        return undefined
    }

    const children: Children = {
        outputs: {},
        pulseIn: [],
        procedures: {},
    }

    const nodeMap: Record<string, LiteGraphNode> = {}
    for (const node of lNode.subgraph!.nodes) {
        nodeMap[node.id.toString()] = node
        if (['graph/input', 'graph/output', 'graph/pulse'].includes(node.type)) {
            continue
        }

        const procId = node.id.toString()
        const proc: ProcedureDsl = {
            id: procId,
            type: node.type,
            inputs: {},
            pulseNext: {},
        }

        node.inputs?.forEach((input) => {
            if (isPrimitiveType(input)) {
                proc.inputs[input.name] = {
                    type: input.type as PrimitiveType,
                    value: input.value as string | number | boolean | JSON,
                }
            } else if (input.type === 'pulse') {
                proc.inputs[input.name] = {
                    type: 'pulse',
                    value: input.value as string,
                }
            }
        })

        if (node.subgraph) {
            proc.children = getChildren(node)
        }
        children.procedures[proc.id] = proc
    }

    for (const link of lNode.subgraph!.links) {
        const sourceId = link[1].toString()
        const sourcePortIdx = link[2] as number
        const sourceNode = nodeMap[sourceId]
        const sourcePort = sourceNode.outputs![sourcePortIdx]
        const sourceProc = children.procedures[sourceId]

        const destId = link[3].toString()
        const destPortIdx = link[4] as number
        const destNode = nodeMap[destId]
        const destPort = destNode!.inputs![destPortIdx]
        const destProc = children.procedures[destId]

        if (sourceNode.type === 'graph/input') {
            if (sourcePort.type === 'basepulse') {
                children.pulseIn.push(destId)
            } else {
                // The first input of a graph/input node contains the input name
                destProc.inputs[destPort.name] = {
                    type: 'lambda_input',
                    portName: sourceNode.inputs![0].value as string,
                    value: destPort.value as string,
                }
            }
        } else if (destNode.type === 'graph/output') {
            if (sourcePort.type === 'pulse') {
                if (!sourceProc.pulseNext[sourcePort.name]) {
                    sourceProc.pulseNext[sourcePort.name] = []
                }
                // The first input of a graph/output node contains the output name
                sourceProc.pulseNext[sourcePort.name].push({
                    type: 'lambda_output',
                    portName: destNode.inputs![0].value as string,
                })
            } else {
                children.outputs[destPort.value as string] = {
                    portName: sourcePort.name,
                    procedureId: sourceId,
                }
            }
        } else {
            if (sourcePort.type === 'basepulse' || sourcePort.type === 'pulse') { // Ugly. Needs to be a single type
                if (!sourceProc.pulseNext[sourcePort.name]) {
                    sourceProc.pulseNext[sourcePort.name] = []
                }

                sourceProc.pulseNext[sourcePort.name].push({
                    type: 'procedure_input',
                    procedureId: destProc.id,
                })
            } else {
                destProc.inputs[destPort.name] = {
                    id: sourceId,
                    type: 'procedure',
                    value: `${sourcePort.name}.${destPort.value as string}`,
                }
            }
        }
    }

    return children
}

/**
 * @param graph The program in LiteGraph form
 * @returns The executable program DSL
 */
export function getProgramDsl(graph: LiteGraphSpec): ProgramDsl {
    const lNode: LiteGraphNode = {
        id: 0,
        type: 'baseLambda',
        subgraph: {
            nodes: graph.nodes,
            links: graph.links,
        },
    }

    const children = getChildren(lNode)
    return {
        procedures: children!.procedures,
    }
}


/**
 * Finds the ID of the first and the last procedures
 * 
 * @param graph The program in LiteGraph form
 * @returns The IDs of the starting and ending procedure
 */
export function guessEdgeProcIds(graph: LiteGraphSpec): (string | null)[] {
    const { nodes, links } = graph
    const nodeMap: Record<string, LiteGraphNode> = {}
    nodes.forEach((n) => nodeMap[n.id.toString()] = n)

    const procIdsWithPulseInput: Record<string, boolean> = {}
    const procIdsWithPulseOutput: Record<string, boolean> = {}


    for (const link of links) {
        const sourceNode = nodeMap[link[1].toString()]
        const sourceNodePort = link[2]
        const output = sourceNode?.outputs?.[sourceNodePort as number]
        if (output?.type === 'pulse' || output?.type === 'basepulse') {
            procIdsWithPulseOutput[sourceNode.id.toString()] = true
        }

        const destNode = nodeMap[link[3].toString()]
        const destNodePort = link[4]
        const input = destNode?.inputs?.[destNodePort as number]

        if (input?.type === 'basepulse') {
            procIdsWithPulseInput[destNode.id.toString()] = true
        }
    }

    let firstProcId = null, lastProcId = null

    for (const procId in procIdsWithPulseInput) {
        if (!procIdsWithPulseOutput[procId]) {
            lastProcId = procId
            break
        }
    }

    for (const procId in procIdsWithPulseOutput) {
        if (!procIdsWithPulseInput[procId]) {
            firstProcId = procId
            break
        }
    }

    return [firstProcId, lastProcId]
}
