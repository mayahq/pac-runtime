import { assertEquals } from "../../test_deps.ts";
import { LocalStorage } from "../../src/storage/local.ts";
import { stdpath } from "../../test_deps.ts";
import { Symbol } from "../../src/program/program.d.ts";

const __dirname = new URL(import.meta.url).pathname

const testSymbol: Symbol = {
    id: '123',
    name: 'http',
    type: 'http',
    wires: [[]],
}

Deno.test('Local storage for programs', async (t) => {
    const local = new LocalStorage({ basePath: stdpath.join(__dirname, '../../../temp') })
    const program = {
        symbols: [testSymbol]
    }
    const workerId = 'abcxyz'

    await t.step('set', async () => {
        await local.set(workerId, program)
        const content = JSON.parse(await Deno.readTextFile(stdpath.join(local.basePath, `${workerId}.json`)))
        assertEquals(content.symbols.length, 1)
        assertEquals(content.symbols[0].type, 'http')
    })

    await t.step('get', async () => {
        const program = await local.get(workerId)
        assertEquals(program.symbols.length, 1)
        assertEquals(program.symbols[0].type, 'http')
    })

    await Deno.remove(`${local.basePath}/${workerId}.json`)
})