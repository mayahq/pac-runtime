import { assertEquals } from '../../test_deps.ts'
import Func, { convertToSymbolProperty } from '../../src/program/func.ts'

Deno.test('Func primitive', async (t) => {
    await t.step('Symbol property translation [convertToSymbolProperty]', async () => {
        const prefixedProperty = convertToSymbolProperty('msg.tabs[0].id')
        assertEquals(prefixedProperty.type, 'msg')
        assertEquals(prefixedProperty.value, 'tabs[0].id')

        const numberProperty = convertToSymbolProperty(3)
        assertEquals(numberProperty.type, 'num')
        assertEquals(numberProperty.value, 3)

        const jsonProperty = convertToSymbolProperty({ name: 'dushyant', age: 22 })
        assertEquals(jsonProperty.type, 'json')
        assertEquals(jsonProperty.value.name, 'dushyant')

        const rawProperty = convertToSymbolProperty({ type: 'bool', value: false })
        assertEquals(rawProperty.type, 'bool')
        assertEquals(rawProperty.value, false)
    })

    await t.step('Func primitive generates correct DSL', async () => {
        const func = Func({
            type: 'http',
            id: '1',
            output: Func({
                type: 'switch',
                id: '2',
                properties: {
                    name: 'msg.payload.name',
                    age: 22,
                    city: 'global.city',
                },
                output: [
                    Func({
                        type: 'branch',
                        branches: [
                            Func({ type: 'http', id: '3', output: Func({ type: 'goto', symbolId: '1' }) }),
                            Func({ type: 'click', id: '4', output: null }),
                        ],
                    }),
                    Func({
                        type: 'branch',
                        branches: [
                            Func({ type: 'http', id: '5', output: Func({ type: 'goto', symbolId: '1' }) }),
                            Func({ type: 'click', id: '6', output: null }),
                        ],
                    }),
                ],
            }),
        })

        const dsl = func.dsl

        // Test number of nodes in DSL
        assertEquals(dsl.length, 6)

        // Test property generation
        const switchSymbol = dsl.find((symbol) => symbol.id === '2')
        assertEquals(switchSymbol?.properties.name.type, 'msg')
        assertEquals(switchSymbol?.properties.name.value, 'payload.name')

        // Test GOTO statement
        const branchHttpSymbol = dsl.find((symbol) => symbol.id === '3')
        assertEquals(branchHttpSymbol?.wires[0][0], '1')
    })
})
