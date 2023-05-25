import { getSmallRandomId } from '../utils/misc.ts'
import { FunctionalProgramDsl, FunctionalSymbolDsl } from './program.d.ts'

type LiteGraphNodeOutput = {
    name: string
    type: string | number
    links?: string | null | number[]
}

type LiteGraphNodeInput = {
    name: string
    type: string | number
    link: string | null | number
    label?: string
}

interface LiteGraphNode {
    id: number
    type: string
    pos: number[]
    size: Record<string, number> | number[]
    flags: any
    mode: number
    outputs?: LiteGraphNodeOutput[]
    inputs?: LiteGraphNodeInput[]
    properties: Record<string, any>
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

type LiteGraphSpec = {
    last_node_id: number
    last_link_id: number
    nodes: LiteGraphNode[]
    links: LiteGraphLinks
    groups: any[]
    config: Record<string, any>
    version: number
}

const graph: LiteGraphSpec = {
    'last_node_id': 6,
    'last_link_id': 5,
    'nodes': [{
        'id': 3,
        'type': 'basic/time',
        'pos': [312, 145],
        'size': { '0': 140, '1': 46 },
        'flags': {},
        'mode': 0,
        'outputs': [{ 'name': 'in ms', 'type': 'number', 'links': null }, {
            'name': 'in sec',
            'type': 'number',
            'links': [1],
        }],
        'properties': {},
    }, {
        'id': 4,
        'type': 'basic/watch',
        'pos': [864, 156],
        'size': { '0': 140, '1': 26 },
        'flags': {},
        'mode': 0,
        'inputs': [{ 'name': 'value', 'type': 0, 'link': 2, 'label': '5.000' }],
        'properties': {},
    }, {
        'id': 6,
        'type': 'events/counter',
        'pos': [864, 229],
        'size': { '0': 140, '1': 66 },
        'flags': {},
        'mode': 0,
        'inputs': [{ 'name': 'inc', 'type': -1, 'link': 4 }, { 'name': 'dec', 'type': -1, 'link': null }, {
            'name': 'reset',
            'type': -1,
            'link': null,
        }],
        'outputs': [{ 'name': 'change', 'type': -1, 'links': null }, {
            'name': 'num',
            'type': 'number',
            'links': null,
        }],
        'properties': {},
    }, {
        'id': 2,
        'type': 'graph/subgraph',
        'pos': [573, 168],
        'size': { '0': 140, '1': 86 },
        'flags': {},
        'mode': 0,
        'inputs': [
            { 'name': 'enabled', 'type': 'boolean', 'link': null },
            { 'name': 'foo', 'type': '', 'link': 1 },
            { 'name': 'EV', 'type': -1, 'link': 3 },
        ],
        'outputs': [{ 'name': 'faa', 'type': 0, 'links': [2] }, { 'name': 'EV', 'type': -1, 'links': [4] }],
        'properties': { 'enabled': true },
        'subgraph': {
            'last_node_id': 7,
            'last_link_id': 6,
            'nodes': [{
                'id': 3,
                'type': 'graph/output',
                'pos': [1119, 139],
                'size': [180, 60],
                'flags': {},
                'mode': 0,
                'inputs': [{ 'name': '', 'type': 0, 'link': 2 }],
                'properties': { 'name': 'faa', 'type': 0 },
            }, {
                'id': 4,
                'type': 'math/floor',
                'pos': [872, 194],
                'size': [112, 28],
                'flags': {},
                'mode': 0,
                'inputs': [{ 'name': 'in', 'type': 'number', 'link': 1 }],
                'outputs': [{ 'name': 'out', 'type': 'number', 'links': [2] }],
                'properties': {},
            }, {
                'id': 2,
                'type': 'graph/input',
                'pos': [440, 149],
                'size': [180, 60],
                'flags': {},
                'mode': 0,
                'outputs': [{ 'name': '', 'type': '', 'links': [1] }],
                'properties': { 'name': 'foo', 'type': '' },
            }, {
                'id': 5,
                'type': 'graph/input',
                'pos': [460, 282],
                'size': [180, 60],
                'flags': {},
                'mode': 0,
                'outputs': [{ 'name': '', 'type': -1, 'links': [4] }],
                'properties': { 'name': 'EV', 'type': -1 },
            }, {
                'id': 6,
                'type': 'graph/output',
                'pos': [1054, 293],
                'size': [180, 60],
                'flags': {},
                'mode': 0,
                'inputs': [{ 'name': '', 'type': -1, 'link': 5 }],
                'properties': { 'name': 'EV', 'type': -1 },
            }, {
                'id': 7,
                'type': 'events/delay',
                'pos': [742, 300],
                'size': { '0': 140, '1': 26 },
                'flags': {},
                'mode': 0,
                'inputs': [{ 'name': 'event', 'type': -1, 'link': 4 }],
                'outputs': [{ 'name': 'on_time', 'type': -1, 'links': [5] }],
                'properties': { 'time_in_ms': 1000 },
            }],
            'links': [[1, 2, 0, 4, 0, 'number'], [2, 4, 0, 3, 0, 0], [4, 5, 0, 7, 0, -1], [5, 7, 0, 6, 0, -1]],
            'groups': [],
            'config': {},
            'version': 0.4,
        },
    }, {
        'id': 5,
        'type': 'events/timer',
        'pos': [311, 240],
        'size': { '0': 140, '1': 26 },
        'flags': {},
        'mode': 0,
        'outputs': [{ 'name': 'on_tick', 'type': -1, 'links': [3] }],
        'properties': { 'interval': 2000, 'event': 'tick' },
        'boxcolor': '#222',
    }],
    'links': [[1, 3, 1, 2, 1, 0], [2, 2, 0, 4, 0, 0], [3, 5, 0, 2, 2, -1], [4, 2, 1, 6, 0, -1]],
    'groups': [],
    'config': {},
    'version': 0.4,
}

function getExecutableDsl(liteGraphSpec: LiteGraphSpec): FunctionalProgramDsl {
    const topLambdaId = getSmallRandomId()
    const nodeMap: Record<string, LiteGraphNode> = {}
    for (const node of liteGraphSpec.nodes) {
        nodeMap[node.id.toString()] = node
    }

    const symbolMap: Record<string, FunctionalSymbolDsl> = {}
    for (const node of liteGraphSpec.nodes) {
        const id = node.id.toString()
        const symbol: FunctionalSymbolDsl = {
            id: id,
            label: id,
            type: node.type,
            inputs: {},
            outputs: {},
        }
        symbolMap[id] = symbol
    }

    for (const link of liteGraphSpec.links) {
        const sourceId = link[1].toString()
        const sourcePort = link[2] as number

        const destinationId = link[3].toString()
        const destinationPort = link[4] as number

        const sourceNode = nodeMap[sourceId]
        const destinationNode = nodeMap[destinationId]
        const destinationInput = destinationNode.inputs![destinationPort]
        const sourceOutput = sourceNode.outputs![sourcePort as number]

        symbolMap[destinationId].inputs[destinationInput.name] = {
            type: 'symbol',
            symbolId: sourceId.toString(),
            value: sourceOutput.name,
        }
        // symbolMap[destinationId].inputs[destinationNode.inputs.]
    }

    const lambda: FunctionalSymbolDsl = {
        id: topLambdaId,
        label: 'baseProgram',
        type: 'lambda',
        inputs: {},
        outputs: {},
        children: {
            in: [[]],
            out: [],
            symbols: [],
        },
    }
    return { symbols: [] }
}
