import { ProcedureDsl, ProgramDsl } from '../../mod.ts'
import { getSmallRandomId } from '../utils/misc.ts'
import { Children } from './hybrid.d.ts'

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
            destProc.inputs[destPort.name] = {
                type: 'lambda_input',
                portName: sourceNode.properties!.name as string,
                value: destPort.value as string,
            }
        } else if (destNode.type === 'graph/output') {
            //
            children.outputs[destNode.properties!.name] = {
                portName: sourcePort.name,
                procedureId: sourceId,
            }
        } else {
            destProc.inputs[destPort.name] = {
                id: sourceId,
                type: 'procedure',
                value: `${sourcePort.name}.${destPort.value as string}`,
            }
        }
    }

    return children
}

export function getProgramDsl(graph: LiteGraphSpec): ProgramDsl {
    const lNode: LiteGraphNode = {
        id: 0,
        type: 'baeLambda',
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
