import { Program } from '../../src/program/hybrid.ts'
import { liteGraphWorkingExample } from './data/litegraphDsl.ts'

Deno.test('Hybrid program works', async () => {
    const program = Program.from(liteGraphWorkingExample)
    await program.deploy()

    const e = new CustomEvent('pulse', {
        detail: {
            pulse: {},
            metadata: {
                sender: '0',
                timestamp: Date.now(),
            },
            destination: '3',
        },
    })

    program.hub.dispatchEvent(e)
    await new Promise((r) => setTimeout(r, 3000))
})
