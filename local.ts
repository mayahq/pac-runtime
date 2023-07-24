import { loadEnv } from './src/utils/misc.ts'
loadEnv()

import { LocalStorage } from './src/storage/local.ts'
import { stdpath } from './deps.ts'
import { Runtime } from './src/runtime/runtime.ts'

const __dirname = stdpath.dirname(new URL(import.meta.url).pathname)


const storage = new LocalStorage({
    basePath: stdpath.join(__dirname, 'temp'),
})

const runtime = new Runtime({
    id: 'abcxyz',
    mayaRuntimeToken: 'bruh',
    ownerId: 'dusnat',
    environment: 'LOCAL',
    autoShutdownBehaviour: 'NEVER',
    maxIdleTime: 1800000,
    storage: storage,
})

runtime.init()
