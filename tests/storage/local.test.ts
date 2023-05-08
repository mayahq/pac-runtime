import { assertEquals } from "../../test_deps.ts";
import { Local } from "../../src/storage/local.ts";
import { stdpath } from "../../test_deps.ts";

const __dirname = new URL(import.meta.url).pathname

Deno.test('Local storage for programs', async (t) => {
    const local = new Local({ basePath: stdpath.join(__dirname, '../../../temp') })
    const program = {
        symbols: [{ type: 'http' }]
    }
    const workerId = 'abcxyz'

    await t.step('set', async () => {
        await local.set(workerId, program)
        const content = JSON.parse(await Deno.readTextFile(stdpath.join(local.basePath, `${workerId}.json`)))
        assertEquals(content.symbols[0].type, 'http')
    })

    await t.step('get', async () => {
        const program = await local.get(workerId)
        assertEquals(program.symbols[0].type, 'http')
    })

    await Deno.remove(`${local.basePath}/${workerId}.json`)
})