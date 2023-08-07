import { Buffer } from "https://deno.land/std@0.185.0/io/buffer.ts"
import { ExecutionCache, ExecutionCacheSession } from "../../src/runtime/cache.ts"
import { assertEquals } from "../../test_deps.ts"

Deno.test('Execution cache works', async (t) => {
    const testInput = {
        name: 'dusnat',
        age: 22,
        idiot: true,
        sayHello: () => null,
        randumBuffer: new Buffer([1,2,3,4])
    }
    const testOutput = {
        portName: '',
        result: {
            status: 'rejected'
        }
    }
    const sessionId = 'abc123'

    await t.step('Arbitrary objects can be assigned unique identifiers by reference', () => {
        const execCacheSession = new ExecutionCacheSession({
            sessionId: 'abcxyz'
        })

        // Non-serialisable object
        const testObj = {
            name: 'dusnat',
            sayHello: () => {
                console.log('hello dusnat')
            }
        }

        const uniqueId1 = execCacheSession.getUniqueIdForObject(testObj)
        const uniqueId2 = execCacheSession.getUniqueIdForObject(testObj)

        assertEquals(uniqueId1, uniqueId2)
    })

    await t.step('Cache set works', () => {
        const execCache = new ExecutionCache()
        const cacheKey = execCache.set(sessionId, 'myProc', testInput, testOutput)
        const cached = execCache.store[sessionId].store['myProc'].get(cacheKey)

        assertEquals(cached, testOutput)
    })

    await t.step('Cache get works', async (t) => {
        const execCache = new ExecutionCache()
        execCache.set(sessionId, 'myProc', testInput, testOutput)
        
        await t.step('with referential equality', async (t) => {
            const cached = execCache.get(sessionId, 'myProc', testInput)
            assertEquals(cached, testOutput)
        })
        
        await t.step('with level-one shallow equality', async (t) => {
            const cached = execCache.get(sessionId, 'myProc', {...testInput})
            assertEquals(cached, testOutput)
        })
    })
})