import { getProgramDsl } from '../../src/program/litegraph.ts'
import { liteGraphWorkingExample } from './data/litegraphDsl.ts'

Deno.test('LiteGraph to execution DSL conversion', () => {
    const result = getProgramDsl(liteGraphWorkingExample)
    console.log('result', JSON.stringify(result, null, 4))
})
