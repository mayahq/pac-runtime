import { assertEquals } from '../../test_deps.ts'
import { PulseEventDetail } from '../../src/program/hybrid.d.ts'
import { Program } from '../../src/program/hybrid.ts'
import { liteGraphWorkingExample } from './data/litegraphDsl.ts'

Deno.test('Program execution', async () => {
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

    const pulse = await new Promise((resolve) => {
        const listener: EventListener = (e: Event) => {
            const event = e as CustomEvent
            const data: PulseEventDetail = event.detail

            if (data.destination === '4') {
                resolve(data.pulse)
                program.hub.removeEventListener('pulse', listener)
            }
        }

        program.hub.addEventListener('pulse', listener)
        program.hub.dispatchEvent(e)
    })

    assertEquals((pulse as any).output.myValue, 36)
})
