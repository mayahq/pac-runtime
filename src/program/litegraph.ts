import { ProcedureDsl, ProgramDsl } from '../../mod.ts'
import { getSmallRandomId } from '../utils/misc.ts'
import { Children, PrimitiveType } from './hybrid.d.ts'

type LiteGraphNodeOutput = {
    name: string
    type: string | number
    links?: string | null | number[]
    value?: string | number | boolean | JSON
    linkType?: string
}

type LiteGraphNodeInput = {
    name: string
    type: string | number
    link: string | null | number
    value?: string
    label?: string
}

export interface LiteGraphNode {
    id: number
    type: string
    pos?: number[]
    size?: Record<string, number> | number[]
    flags?: any
    mode?: number
    outputs?: LiteGraphNodeOutput[]
    inputs?: LiteGraphNodeInput[]
    properties?: Record<string, any>
    subgraph?: LiteGraphSpec
    boxcolor?: string
}

/**
 * links[0]: link ID
 * links[1]: Origin ID
 * links[2]: Origin port index
 * links[3]: Destination ID
 * links[4]: Destination port index
 * links[5]: Type (what the fuck is that?)
 */
type LiteGraphLinks = (number | string)[][]

export type LiteGraphSpec = {
    nodes: LiteGraphNode[]
    links: LiteGraphLinks
    last_node_id?: number
    last_link_id?: number
    groups?: any[]
    config?: Record<string, any>
    version?: number
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
            if (sourcePort.linkType === 'pulse') {
                children.pulseIn.push(destId)
            } else {
                destProc.inputs[destPort.name] = {
                    type: 'lambda_input',
                    portName: sourceNode.properties!.name as string,
                    value: destPort.value as string,
                }
            }
        } else if (destNode.type === 'graph/output') {
            if (sourcePort.linkType === 'pulse') {
                if (sourceProc.pulseNext[sourcePort.name]) {
                    sourceProc.pulseNext[sourcePort.name] = []
                }
                sourceProc.pulseNext[sourcePort.name].push({
                    type: 'lambda_output',
                    portName: destNode.properties!.name,
                })
            } else {
                children.outputs[destNode.properties!.name] = {
                    portName: sourcePort.name,
                    procedureId: sourceId,
                }
            }
        } else {
            if (sourcePort.linkType === 'pulse') {
                if (sourceProc.pulseNext[sourcePort.name]) {
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
