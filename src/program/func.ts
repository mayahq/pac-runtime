import { getSmallRandomId } from '../utils/misc.ts'

type SymbolType = {
    id: string
    type: string
    wires: string[][]
    properties: any
}

interface OutputType {
    metaType: 'branch' | 'symbol' | 'subflow' | 'goto'
    inputNodeIds: string[]
    dsl: SymbolType[]
}

type FuncArgs = {
    type: string
    id?: string
    output?: OutputType | OutputType[] | null
    branches?: OutputType[]
    symbolId?: string
    properties?: Record<string, any>
}

export function convertToSymbolProperty(property: any) {
    if (typeof property === 'string') {
        for (const prefix of ['msg.', 'flow.', 'global.']) {
            if (property.startsWith(prefix)) {
                return { type: prefix.replace('.', ''), value: property.replace(prefix, '') }
            }
        }
        return {
            type: 'str',
            value: property,
        }
    } else if (typeof property === 'boolean') {
        return { type: 'bool', value: property }
    } else if (typeof property === 'number') {
        return { type: 'num', value: property }
    } else if (typeof property === 'object') {
        if (property.type && property.value !== undefined) {
            return property
        } else {
            return {
                type: 'json',
                value: property,
            }
        }
    }
}

function Func({ type, id = '', properties = {}, output = null, branches, symbolId }: FuncArgs): OutputType {
    const symbolProperties: Record<string, any> = {}
    Object.keys(properties).forEach((key) => {
        const property = properties[key]
        symbolProperties[key] = convertToSymbolProperty(property)
    })
    const self: SymbolType = {
        id: id || getSmallRandomId(),
        type: type,
        wires: [[]],
        properties: symbolProperties,
    }

    if (type === 'branch') {
        const inputNodeIds: string[] = []
        branches!.forEach((s) => s.inputNodeIds.forEach((id) => inputNodeIds.push(id)))

        const dsl: SymbolType[] = []
        branches!.forEach((s) => s.dsl.forEach((symbol) => dsl.push(symbol)))

        return {
            metaType: 'branch',
            inputNodeIds: inputNodeIds,
            dsl: dsl,
        }
    } else if (type === 'goto') {
        return {
            metaType: 'goto',
            inputNodeIds: [symbolId as string],
            dsl: [],
        }
    }

    let dsl = [self]
    if (output !== null) {
        if (Array.isArray(output)) {
            self.wires = output.map((o) => o.inputNodeIds)
            output.forEach((o) => {
                dsl = [...dsl, ...o.dsl]
            })
        } else {
            dsl = [...dsl, ...output.dsl]
            self.wires = [output.inputNodeIds]
        }
    }

    return {
        metaType: 'symbol',
        inputNodeIds: [self.id],
        dsl: dsl,
    }
}

export default Func
