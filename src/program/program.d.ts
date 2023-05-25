type SymbolMetadata = {
    position: {
        x: number
        y: number
        z: number
    }
    prefix?: string
    step_id?: string
    tmp_id?: string
}

export type Symbol = {
    id: string
    name: string
    type: string
    properties?: {
        [key: string]: unknown
    }
    wires: string[][]
    description?: string[]
    children?: {
        wires: {
            in: string[][]
            out: string[][]
        }
        symbols: Symbol[]
    }
    metadata?: SymbolMetadata
}

type PrimitiveType = 'symbol' | 'lambda_input' | 'flow' | 'global' | 'boolean' | 'number' | 'string' | 'json'

export type FunctionalSymbolInput = {
    type: PrimitiveType
    symbolId?: string
    inputPortName?: string
    value: string | number | boolean | Record<string, any>
}

export type FunctionalSymbolOutput = {
    type: PrimitiveType
    name?: string
}

export type FunctionalSymbolDsl = {
    id: string
    label: string
    type: string
    inputs: Record<string, FunctionalSymbolInput>
    outputs: Record<string, FunctionalSymbolOutput>
    children?: {
        // in?: { symbol: string; port: number }[][]
        out: string[]
        symbols: FunctionalSymbolDsl[]
    }
}

export type FunctionalProgramDsl = {
    symbols: FunctionalSymbolDsl[]
}
