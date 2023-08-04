import { assertEquals } from '../../test_deps.ts'
import { ProgramHook, PulseEventDetail } from '../../src/program/hybrid.d.ts'
import { Program } from '../../src/program/hybrid.ts'
import { liteGraphWorkingExample } from '../data/litegraphDsl.ts'
import runtimeMock from '../data/runtimeMock.ts'
import subflowDsl from '../data/subflowDsl.ts'

Deno.test('Program execution', async (t) => {
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

    await t.step('Hybrid execution works', async (t) => {
        await t.step('Basic execution', async () => {
            const program = Program.from(liteGraphWorkingExample)
            await program.deploy(runtimeMock)

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

            assertEquals((pulse as any).result.output.myValue, 36)
        })

        await t.step('Subflow execution', async () => {
            const initialEvent = new CustomEvent('pulse', {
                detail: {
                    pulse: {},
                    metadata: {
                        sender: '0',
                        timestamp: Date.now(),
                    },
                    destination: 'lkwm6c486457840',
                },
            })

            const program = Program.from(subflowDsl)
            await program.deploy(runtimeMock)
            
            const pulse = await new Promise(resolve => {
                const listener: EventListener = (e: Event) => {
                    const event = e as CustomEvent
                    const data: PulseEventDetail = event.detail

                    if (data.destination === 'lkwm8ry274632824') { // The final debug node
                        resolve(data.pulse)
                        program.hub.removeEventListener('pulse', listener)
                    }
                }

                program.hub.addEventListener('pulse', listener)
                program.hub.dispatchEvent(initialEvent)
            })

            assertEquals((pulse as any).value, 21)
        })
        
    })


    await t.step('The onProcedureDone hook works', async () => {
        const program = Program.from(liteGraphWorkingExample)

        const result: any = await new Promise((resolve) => {
            const handler: ProgramHook = (val: any, procId: string, _portName?: string) => {
                if (procId !== '4') {
                    return
                }

                resolve(val)
                program.removeHook('onProcedureDone', handler)
            }

            program.addHook('onProcedureDone', handler)
            program.deploy(runtimeMock)
                .then(() => {
                    program.hub.dispatchEvent(e)
                })
        })

        assertEquals(result?.result?.output?.myValue, 72)
    })
})

// Deno.test('Program eval', async () => {
//     const resultFor4 = await Program.eval(
//         liteGraphWorkingExample,
//         {},
//         undefined,
//         '3', // Inject into 3
//         '4', // Terminate when 4 outputs
//     )
//     assertEquals(resultFor4?.result?.result?.output?.myValue, 72)

//     const resultFor3 = await Program.eval(
//         liteGraphWorkingExample,
//         {},
//         undefined,
//         '3', // Inject into 3
//         '3', // Terminate when 3 outputs
//     )
//     assertEquals(resultFor3?.result?.result?.output?.myValue, 36)
// })
