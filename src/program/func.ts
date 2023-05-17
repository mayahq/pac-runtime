import { getSmallRandomId } from '../utils/misc.ts'

type SymbolType = {
    id: string
    type: string
    wires: string[][]
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
}

function Func({ type, id = '', output = null, branches, symbolId }: FuncArgs): OutputType {
    const self: SymbolType = {
        id: id || getSmallRandomId(),
        type: type,
        wires: [[]],
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
