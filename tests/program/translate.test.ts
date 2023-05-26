import { ProgramDsl } from '../../src/program/hybrid.d.ts'
import {
    createDepthMap,
    createLeafInputMap,
    createOutInMap,
    createParentMap,
    getLeafInputs,
} from '../../src/program/translate.ts'
import { simpleTranslateTestDsl } from './data/translateDsl.ts'
import { assertEquals } from '../../test_deps.ts'

Deno.test('Program translation', async (t) => {
    // await t.step('Creation of out-in map', async () => {
    //     const result = createOutInMap(Object.values(simpleTranslateTestDsl.procedures))

    //     // Testing support for pulse fan-out
    //     assertEquals(result['3'].output1[0], '4')
    //     assertEquals(result['3'].output1[1], '5')

    //     // Testing for multi-pulse outputs
    //     assertEquals(result['3'].output2[0], '6')

    //     // Testing for recursive input port resolution
    //     assertEquals(result['8'].output1[0], '6')

    //     console.log(result)
    // })

    // await t.step('Getting leaf inputs of a procedure', async () => {
    //     const result = await getLeafInputs(simpleTranslateTestDsl.procedures['2'].children!.procedures['4'])
    //     console.log('result', result)
    // })

    // await t.step('Creation of leaf-input map', async () => {
    //     const result = createLeafInputMap(simpleTranslateTestDsl)
    //     console.log(result)
    // })

    // await t.step('Creation of depth map', async () => {
    //     const result = createDepthMap(Object.values(simpleTranslateTestDsl.procedures))
    //     console.log('depthMap', result)
    // })

    await t.step('Creation of parent map', async () => {
        const result = createParentMap(Object.values(simpleTranslateTestDsl.procedures))
        console.log('parentMap', result)
    })
})
