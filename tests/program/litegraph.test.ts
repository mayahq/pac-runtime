import { getProgramDsl } from '../../src/program/litegraph.ts'
import { liteGraphExample } from './data/litegraphDsl.ts'

Deno.test('LiteGraph to execution DSL conversion', () => {
    const result = getProgramDsl(liteGraphExample)
    console.log('result', JSON.stringify(result, null, 4))
})
