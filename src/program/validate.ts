import type {
    LiteGraphSpec,
    LiteGraphNode,
    LiteGraphNodeInput,
    LiteGraphNodeOutput
} from './hybrid.d.ts'

function validateSubgraphPorts(
    identifier: string,
    inputs: LiteGraphNodeInput[], 
    outputs: LiteGraphNodeOutput[], 
    subgraph: LiteGraphSpec
): string[] {
    const problems: string[] = []
    const subgraphInputMap: Record<string, LiteGraphNode> = {}
    const subgraphOutputMap: Record<string, LiteGraphNode> = {}
    for (const node of subgraph.nodes) {
        if (node.type === 'graph/input') {
            subgraphInputMap[node.id] = node
        } else if (node.type === 'graph/output') {
            subgraphOutputMap[node.id] = node
        }
    }

    for (const idx in inputs) {
        const input = inputs[idx]
        if (input.type === 'basepulse') continue
        if (!input.linkTo) {
            problems.push(`Subgraph [${identifier}] has input #${idx} which maps to no internal graph/input node.`)
            continue
        }

        if (!subgraphInputMap[input.linkTo]) {
            problems.push(
                `Subgraph [${identifier}] has input #${idx} which maps to unknown internal graph/input node [${input.linkTo}].`
            )
        }
    }

    const inputNodes = Object.values(subgraphInputMap)
    for (const inputNode of inputNodes) {
        if (!inputs.some(i => i.linkTo === inputNode.id) && inputNode.inputs![0].name !== '') {
            problems.push(
                `Subgraph [${identifier}] has dangling input node [${inputNode.id}].`
            )
        }
    }

    const basePulseNodes = inputNodes.filter(n => n.inputs?.[0].name === '')
    if (basePulseNodes.length === 0) {
        problems.push(
            `Subgraph [${identifier}] has no basepulse node.`
        )
    } else if (basePulseNodes.length > 1) {
        problems.push(`Subgraph [${identifier}] has more than one basepulse nodes: ${basePulseNodes.map(n => n.id).join(', ')}.`)
    }


    for (const idx in outputs) {
        const output = outputs[idx]
        // console.log('checking output of subflow', identifier, output)
        if (!output.linkTo) {
            problems.push(
                `Subgraph [${identifier}] has output #${idx} which maps to no internal graph/output node.`
            )
            continue
        }

        if (!subgraphOutputMap[output.linkTo]) {
            problems.push(
                `Subgraph [${identifier}] has output #${idx} which maps to unknown internal graph/input node [${output.linkTo}].`
            )
        }
    }

    return problems
}

export function validateFlow(
    flow: LiteGraphSpec, 
    scene = 'main', 
    accumulated: Record<string, string[]> = {}
): Record<string, string[]> {
    const nodeMap: Record<string, LiteGraphNode> = {}
    flow.nodes.forEach(node => nodeMap[node.id] = node)
    const problems: string[] = []
    if (!accumulated[scene]) {
        accumulated[scene] = problems
    }

    /**
     * Verifying link integrity
     */
    for (const link of flow.links) {
        const timestamp = Math.random()
        const [id, srcNodeId, srcNodePort, destNodeId, destNodePort] = link
        if (!nodeMap[srcNodeId] || !nodeMap[destNodeId]) {
            if (!nodeMap[srcNodeId]) problems.push(`Link [${id}] refers to non-existent source node [${srcNodeId}]`)
            if (!nodeMap[destNodeId]) problems.push(`Link [${id}] refers to non-existent destination node [${destNodeId}]`)
            continue
        }

        const srcNode = nodeMap[srcNodeId]
        const srcPortIdx = parseInt(srcNodePort as string)
        const destNode = nodeMap[destNodeId]
        const destPortIdx = parseInt(destNodePort as string)

        if (srcPortIdx >= srcNode.outputs!.length) {
            problems.push(`Link [${id}] refers to non-existent output port #${srcPortIdx} of node [${srcNodeId}]`)
        }
        if (destPortIdx >= destNode.inputs!.length) {
            problems.push(`Link [${id}] refers to non-existent output port #${srcPortIdx} of node [${srcNodeId}]`)
        }

        if (srcPortIdx < srcNode.outputs!.length && destPortIdx < destNode.inputs!.length) {
            const srcPort = srcNode.outputs![srcPortIdx]
            const destPort = destNode.inputs![destPortIdx]

            if (srcNode.type !== 'graph/input' && destNode.type !== 'graph/output') {
                if (
                    (srcPort.type === 'pulse' && destPort.type !== 'basepulse') ||
                    (srcPort.type !== 'pulse' && destPort.type === 'basepulse')
                ) {
                    // console.log('errors in link', id, 'reporting problem', timestamp)
                    problems.push(`Link [${id}] connects incompatible outputs: [${srcPort.type} -> ${destPort.type}]`)
                }
            }
        }
    }

    /**
     * Verifying node integrity
     */
    for (const node of flow.nodes) {
        if (node.type === 'function_instance') {
            if (!node.function) {
                problems.push(`Node [${node.id}] is a function instance but has no function key.`)
                continue
            }
            if (!flow.functions?.[node.function!]) {
                problems.push(`Node [${node.id}] refers to a non existent function [${node.function}].`)
                continue
            }
        } else if (node.type === 'subflow') {
            if (!node.subgraph) {
                problems.push(`Node [${node.id}] is of type subgraph but does not contain a subgraph.`)
            }
            const portProblems = validateSubgraphPorts(
                `${node.id}`, 
                node.inputs!, 
                node.outputs!, 
                node.subgraph as LiteGraphSpec
            )
            portProblems.forEach(prob => problems.push(prob))
            validateFlow(node.subgraph as LiteGraphSpec, `${node.id}`, accumulated)
        } else {
            if (!node.inputs) {
                problems.push(`Node [${node.id}] does not have an inputs field.`)
            }
            if (!node.outputs) {
                problems.push(`Node [${node.id}] does not have an outputs field.`)
            }
        }
    }

    return accumulated
}