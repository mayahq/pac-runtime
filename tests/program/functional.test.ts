import { assertEquals } from '../../test_deps.ts'
import { FProgram } from '../../src/program/functional.ts'
import { AsyncLock } from '../../test_deps.ts'
import { FunctionalProgramDsl } from '../../src/program/program.d.ts'

const functionType = '/Users/dushyant/Maya/newModules/stdlib/symbols/function/function.ts'
const emptyChildren = {
    in: [[]],
    out: [],
    symbols: [],
}

const dsl: FunctionalProgramDsl = {
    symbols: [
        {
            id: 'f1',
            label: 'f1',
            type: functionType,
            inputs: {
                body: {
                    type: 'string',
                    value: 'console.log(`hey`); return { output: 1 };',
                },
                input: {
                    type: 'string',
                    value: 'bruh',
                },
            },
            outputs: {},
            children: emptyChildren,
        },
        {
            id: 'f2',
            label: 'f2',
            type: functionType,
            inputs: {
                body: {
                    type: 'string',
                    value: 'console.log(`hehe`); return { output: input * 2 }',
                },
                input: {
                    type: 'symbol',
                    symbolId: 'f1',
                    value: 'output',
                },
            },
            outputs: {},
            children: emptyChildren,
        },
        {
            id: 'f3',
            label: 'f3',
            type: functionType,
            inputs: {
                body: {
                    type: 'string',
                    value: 'console.log(`hehe`); return { output: input * 2 }',
                },
                input: {
                    type: 'symbol',
                    symbolId: 'f2',
                    value: 'output',
                },
            },
            outputs: {},
            children: emptyChildren,
        },
    ],
}

Deno.test('Functional paradigm program execution', async (t) => {
    await t.step('Simple linear program', async () => {
        const program = new FProgram({ dsl: dsl, rootNodeId: 'f3' })
        await program.deploy()
        const result = await program.run()

        console.log('result', result)
    })
})
