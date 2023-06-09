import { assertEquals } from '../../test_deps.ts'
import { LocalStorage } from '../../src/storage/local.ts'
import { stdpath } from '../../test_deps.ts'
import { liteGraphWorkingExample } from '../data/litegraphDsl.ts'

const __dirname = new URL(import.meta.url).pathname

Deno.test('Local storage for programs', async (t) => {
    const local = new LocalStorage({
        basePath: stdpath.join(__dirname, '../../../temp'),
    })

    const workerId = 'abcxyz'

    await t.step('set', async () => {
        await local.set(workerId, liteGraphWorkingExample)
        const content = JSON.parse(
            await Deno.readTextFile(
                stdpath.join(local.basePath, `${workerId}.json`),
            ),
        )
        assertEquals(content.nodes.length, 4)
    })

    await t.step('get', async () => {
        const program = await local.get(workerId)
        assertEquals(program.nodes.length, 4)
    })

    await Deno.remove(`${local.basePath}/${workerId}.json`)
})
