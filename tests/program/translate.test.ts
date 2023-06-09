import {
    createLeafInputMap,
    createOutInMap,
    createParentMap,
    getFirstProcId,
    getLastProcId,
    getLeafInputs,
    getProgramDsl,
    TranslateError,
} from '../../src/program/translate.ts'
import { simpleTranslateTestDsl } from '../data/translateDsl.ts'
import { liteGraphCyclic, liteGraphWorkingExample } from '../data/litegraphDsl.ts'

import { assertArrayIncludes, assertEquals, assertThrows } from '../../test_deps.ts'
import { ProcedureRecursiveInput, PulseProcedureInput } from '../../src/program/hybrid.d.ts'

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

Deno.test('LiteGraph to execution DSL conversion', async (t) => {
    await t.step('Simple flat LiteGraph DSL', async () => {
        const result = getProgramDsl(liteGraphWorkingExample)
        // All the top-level nodes are present in the final result
        assertEquals(Object.keys(result.procedures).length, 4)

        // Recursive Eval inputs are translated correctly
        assertEquals((result.procedures['3'].inputs['input'] as ProcedureRecursiveInput).id, '2')

        // All recursive eval outputs are merged into one and inputs are namespaced correctly
        assertEquals((result.procedures['3'].inputs['input'] as ProcedureRecursiveInput).value, 'result.output.myValue')

        // The pulseNext key is set correctly
        assertEquals((result.procedures['3'].pulseNext['result'][0] as PulseProcedureInput).procedureId, '4')
    })
})

Deno.test('Edge procedure detection for program eval', async (t) => {
    await t.step('Finding starting procedure', async (t) => {
        await t.step('Returns correct procedure ID when possible', () => {
            const id = getFirstProcId(liteGraphWorkingExample)
            assertEquals(id, '1')
        })

        await t.step('Errors out when determining first procedure is impossible', () => {
            assertThrows(
                () => getFirstProcId(liteGraphCyclic),
                TranslateError,
            )
        })
    })

    await t.step('Finding the ending procedure', async (t) => {
        await t.step('Returns correct procedure ID when possible', () => {
            const id = getLastProcId(liteGraphWorkingExample)
            assertEquals(id, '4')
        })

        await t.step('Errors out when determining last procedure is impossible', () => {
            assertThrows(
                () => getLastProcId(liteGraphCyclic),
                TranslateError,
            )
        })
    })
})
