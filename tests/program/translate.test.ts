import { createLeafInputMap, createOutInMap, createParentMap, getLeafInputs } from '../../src/program/translate.ts'
import { simpleTranslateTestDsl } from './data/translateDsl.ts'
import { assertArrayIncludes, assertEquals } from '../../test_deps.ts'

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
    })

    await t.step('Getting leaf inputs of a procedure', async () => {
        const result4 = await getLeafInputs(simpleTranslateTestDsl.procedures['2'].children!.procedures['4'])
        assertEquals(result4[0], '7')

        const result2 = await getLeafInputs(simpleTranslateTestDsl.procedures['2'])
        assertEquals(result2.length, 2)
        assertArrayIncludes(result2, ['3', '7'])
    })

    await t.step('Creation of leaf-input map', async () => {
        const result = createLeafInputMap(simpleTranslateTestDsl)

        // Testing for multi-nested procedure outputs
        assertEquals(result['8'].output1[0], '6')

        // Testing for multi-port outputs
        assertEquals(result['3'].output1.length, 2)

        // Testing for cyclic pulse outputs
        assertEquals(result['5'].out1.length, 2)
        assertArrayIncludes(result['5'].out1, ['3', '7'])
    })

    await t.step('Creation of parent map', async () => {
        const result = createParentMap(Object.values(simpleTranslateTestDsl.procedures))
        assertEquals(result['1'], '')
        assertEquals(result['7'], '4')
        assertEquals(result['4'], '2')
    })
})
