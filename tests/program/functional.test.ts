import { assertEquals } from '../../test_deps.ts'
import { FProgram } from '../../src/program/functional.ts'
import { FunctionalProgramDsl } from '../../src/program/program.d.ts'
import { stdpath } from '../../deps.ts'

const functionType = '/Users/dushyant/Maya/newModules/stdlib/symbols/function/function.ts'
const emptyChildren = {
    in: [[]],
    out: [],
    symbols: [],
}

const __dirname = new URL(import.meta.url).pathname

Deno.test('Functional paradigm program execution', async (t) => {
    const dsl: FunctionalProgramDsl = JSON.parse(
        Deno.readTextFileSync(stdpath.join(__dirname, '../data/linearFunctionalDsl.json')),
    )
    const simpleBranchedDsl: FunctionalProgramDsl = JSON.parse(
        Deno.readTextFileSync(stdpath.join(__dirname, '../data/branchedFunctionalDsl.json')),
    )

    await t.step('Simple linear program', async () => {
        const program = new FProgram({ dsl: dsl, rootNodeId: 'f3' })
        await program.deploy()
        const result = await program.run()

        assertEquals(result.output, 4)
    })

    await t.step('Simple branched program', async () => {
        const program = new FProgram({ dsl: simpleBranchedDsl, rootNodeId: 'f3' })
        await program.deploy()
        const result = await program.run()

        assertEquals(result.output, 6)
    })
})
