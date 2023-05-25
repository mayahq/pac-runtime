import { ProgramDsl } from '../../src/program/hybrid.d.ts'
import { createLeafInputMap, createOutInMap } from '../../src/program/translate.ts'
import { simpleTranslateTestDsl } from './data/translateDsl.ts'
import { assertEquals } from '../../test_deps.ts'

Deno.test('Program translation', async (t) => {
    await t.step('Creation of out-in map', async () => {
        const result = createOutInMap(Object.values(simpleTranslateTestDsl.procedures))

        // Testing support for pulse fan-out
        assertEquals(result['3'].output1[0], '4')
        assertEquals(result['3'].output1[1], '5')

        // Testing for multi-pulse outputs
        assertEquals(result['3'].output2[0], '6')

        // Testing for recursive input port resolution
        assertEquals(result['8'].output1[0], '6')

        console.log(result)
    })

    await t.step('Creation of leaf-input map', async () => {
        const result = createLeafInputMap(simpleTranslateTestDsl)
        console.log(result)
    })
})
