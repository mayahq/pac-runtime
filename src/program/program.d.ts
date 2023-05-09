type SymbolMetadata = {
    position: {
        x: number;
        y: number;
        z: number;
    };
    prefix?: string;
    step_id?: string;
    tmp_id?: string;
}

export type Symbol = {
    id: string;
    name: string;
    type: string;
    properties?: {
        [key: string]: unknown
    };
    wires: string[][];
    description?: string[];
    children?: {
        wires: {
            in: string[][];
            out: string[][];
        },
        symbols: Symbol[]
    };
    metadata?: SymbolMetadata
}