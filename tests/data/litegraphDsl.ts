import { LiteGraphNodeInput, LiteGraphNodeOutput, LiteGraphSpec } from './../../src/program/hybrid.d.ts'

function typedIn(name: string, value: any): LiteGraphNodeInput {
    return {
        name: name,
        type: typeof value,
        value: value,
        link: null,
    }
}

function procIn(name: string, value: string): LiteGraphNodeInput {
    return {
        name,
        type: 'procedure',
        value,
        link: null,
    }
}

function pulseIn(name: string, value: string): LiteGraphNodeInput {
    return {
        name,
        value,
        type: 'pulse',
        link: null,
    }
}

function pulse(): LiteGraphNodeInput {
    return {
        name: 'pulse',
        type: 'basepulse',
        link: null,
    }
}

function evalOut(name: string): LiteGraphNodeOutput {
    return {
        name,
        type: 'eval',
        linkType: 'eval',
    }
}

function pulseOut(name: string) {
    return {
        name,
        type: 'basepulse',
        linkType: 'pulse',
    }
}

// const functionPath = `File:///Users/dushyant/Maya/newModules/stdlib/symbols/function/function.ts`
const functionPath = `gh:mayahq/stdlib/function`

export const liteGraphWorkingExample: LiteGraphSpec = {
    nodes: [
        {
            id: 1,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: 3 } }'),
                typedIn('input', ''),
                pulse(),
            ],
            outputs: [
                evalOut('result'),
                pulseOut('result'),
            ],
        },
        {
            id: 2,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 6 } }'),
                procIn('input', 'output.myValue'),
                pulse(),
            ],
            outputs: [
                evalOut('result'),
                pulseOut('result'),
            ],
        },
        {
            id: 3,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 2 } }'),
                procIn('input', 'output.myValue'),
                pulse(),
            ],
            outputs: [
                pulseOut('result'),
                pulseOut('result'),
            ],
        },
        {
            id: 4,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 2 } }'),
                pulseIn('input', 'result.output.myValue'),
                pulse(),
            ],
            outputs: [
                evalOut('result'),
                pulseOut('result'),
            ],
        },
    ],
    links: [
        [1, 1, 0, 2, 1, -1],
        [2, 2, 0, 3, 1, -1],
        [3, 3, 1, 4, 2, -1],
    ],
}

// console.log(JSON.stringify(liteGraphWorkingExample, null, 4))

export const liteGraphCyclic = {
    nodes: [
        {
            id: 1,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: 3 } }'),
                typedIn('input', ''),
                pulse(),
            ],
            outputs: [
                evalOut('result'),
                pulseOut('result'),
            ],
        },
        {
            id: 2,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 6 } }'),
                procIn('input', 'output.myValue'),
                pulse(),
            ],
            outputs: [
                evalOut('result'),
                pulseOut('result'),
            ],
        },
    ],
    links: [
        [1, 1, 1, 2, 2, -1],
        [2, 2, 1, 1, 2, -1],
    ],
}
