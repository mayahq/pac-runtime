import { LiteGraphNodeInput, LiteGraphNodeOutput, LiteGraphSpec } from '../../../src/program/hybrid.d.ts'

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

const functionPath = `File:///Users/dushyant/Maya/newModules/stdlib/symbols/function/function.ts`

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
                evalOut('output'),
                pulseOut('output'),
            ],
        },
        {
            id: 2,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 6 } }'),
                procIn('input', 'myValue'),
                pulse(),
            ],
            outputs: [
                evalOut('output'),
                pulseOut('output'),
            ],
        },
        {
            id: 3,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 2 } }'),
                pulseIn('input', 'myValue'),
                pulse(),
            ],
            outputs: [
                pulseOut('output'),
                pulseOut('output'),
            ],
        },
        {
            id: 4,
            type: functionPath,
            inputs: [
                typedIn('body', 'return { output: { myValue: input * 2 } }'),
                pulseIn('input', 'output.myValue'),
                pulse(),
            ],
            outputs: [
                evalOut('output'),
                pulseOut('output'),
            ],
        },
    ],
    links: [
        [1, 1, 0, 2, 1, -1],
        [2, 2, 0, 3, 1, -1],
        [3, 3, 1, 4, 1, -1],
    ],
}

// export const liteGraphWithSubflows: LiteGraphSpec = {
//     nodes: [
//         {
//             id: 1,
//             type: functionPath,
//             inputs: [
//                 typedIn('body', 'return { output: { myValue: 1 } }'),
//                 typedIn('input', ''),
//                 pulse(),
//             ],
//             outputs: [
//                 evalOut('output'),
//                 pulseOut('output'),
//             ],
//         },
//         {
//             id: 2,
//             type: functionPath,
//             inputs: [
//                 typedIn('body', 'return { output: { myValue: input * 2 } }'),
//                 procIn('input', 'myValue'),
//                 pulse(),
//             ],
//             outputs: [
//                 evalOut('output'),
//                 pulseOut('output'),
//             ],
//         },
//         {
//             id: 3,
//             type: 'graph/subgraph',
//             inputs: [
//                 pulse(),
//             ],
//             outputs: [
//                 evalOut('output'),
//                 pulseOut('output'),
//             ],
//             subgraph: {
//                 nodes: [
//                     {
//                         id: 17,
//                         type: 'graph/input',
//                         properties: { name: 'input' },
//                         outputs: [{ name: 'input', type: 'basepulse' }],
//                     },
//                     {
//                         id: 3,
//                         type: functionPath,
//                         inputs: [
//                             typedIn('body', 'return { output: { myValue: input * 2 } }'),
//                             procIn('input', 'myValue'),
//                             pulse(),
//                         ],
//                         outputs: [
//                             evalOut('output'),
//                             pulseOut('output'),
//                         ],
//                     },
//                     {
//                         id: 4,
//                         type: functionPath,
//                         inputs: [
//                             typedIn('body', 'return { output: { myValue: input * 2 } }'),
//                             procIn('input', 'myValue'),
//                             pulse(),
//                         ],
//                         outputs: [
//                             evalOut('output'),
//                             pulseOut('output'),
//                         ],
//                     },
//                     {
//                         id: 5,
//                         type: 'graph/subgraph',
//                         inputs: [
//                             pulse(),
//                         ],
//                         outputs: [
//                             evalOut('output'),
//                             pulseOut('output'),
//                         ],
//                         subgraph: {
//                             nodes: [
//                                 {
//                                     id: 6,
//                                     type: 'graph/input',
//                                     properties: { name: 'input' },
//                                     outputs: [{ name: 'input', type: 'basepulse' }],
//                                 },
//                                 {
//                                     id: 7,
//                                     type: functionPath,
//                                     inputs: [
//                                         typedIn('body', 'return { output: { myValue: input * 2 } }'),
//                                         pulseIn('input', 'output.myValue'),
//                                         pulse(),
//                                     ],
//                                     outputs: [
//                                         evalOut('output'),
//                                         pulseOut('output'),
//                                     ],
//                                 },
//                                 {
//                                     id: 8,
//                                     type: functionPath,
//                                     inputs: [
//                                         typedIn('body', 'return { output: { myValue: input * 2 } }'),
//                                         pulseIn('input', 'output.myValue'),
//                                         pulse(),
//                                     ],
//                                     outputs: [
//                                         evalOut('output'),
//                                         pulseOut('output'),
//                                     ],
//                                 },
//                                 {
//                                     id: 9,
//                                     type: 'graph/output',
//                                     properties: { name: 'output' },
//                                     inputs: [{ name: 'output', type: 'basepulse', link: null }],
//                                 },
//                             ],
//                             links: [
//                                 [1, 6, 0, 7, 2, -1],
//                                 [2, 7, 2, 8, 2, -1],
//                                 [3, 8, 2, 9, 0, -1],
//                             ],
//                         },
//                     },
//                     {
//                         id: 18,
//                         type: 'graph/output',
//                         properties: { name: 'output' },
//                         outputs: [{ name: 'output', type: 'basepulse' }],
//                     },
//                 ],
//                 links: [
//                     [1, 17, 0, 3, 1, -1],
//                     [2, 3, 0, 4, 1, -1],
//                     [3, 4, ]
//                 ],
//             },
//         },
//     ],
//     links: [],
// }
