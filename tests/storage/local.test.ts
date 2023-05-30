import { assertEquals } from '../../test_deps.ts'
import { LocalStorage } from '../../src/storage/local.ts'
import { stdpath } from '../../test_deps.ts'
import { ProcedureDsl, ProgramDsl } from '../../src/program/hybrid.d.ts'

const __dirname = new URL(import.meta.url).pathname

const testProc: ProcedureDsl = {
    id: '123',
    type: 'http',
    inputs: {},
    pulseNext: {},
}

Deno.test('Local storage for programs', async (t) => {
    const local = new LocalStorage({
        basePath: stdpath.join(__dirname, '../../../temp'),
    })
    const program: ProgramDsl = {
        procedures: { '123': testProc },
    }
    const workerId = 'abcxyz'

    await t.step('set', async () => {
        await local.set(workerId, program)
        const content = JSON.parse(
            await Deno.readTextFile(
                stdpath.join(local.basePath, `${workerId}.json`),
            ),
        )
        assertEquals(Object.keys(content.procedures).length, 1)
        assertEquals(content.procedures['123'].type, 'http')
    })

    await t.step('get', async () => {
        const program = await local.get(workerId)
        assertEquals(Object.keys(program.procedures).length, 1)
        assertEquals(program.procedures['123'].type, 'http')
    })

    await Deno.remove(`${local.basePath}/${workerId}.json`)
})
