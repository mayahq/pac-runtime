import { AutoShutdownBehaviour, Runtime } from './src/runtime/runtime.ts'
import { getEnvVariableOrCrash } from './src/utils/misc.ts'
import { loadEnv } from './deps.ts'

await loadEnv({
    export: true,
    allowEmptyValues: true,
})

const id = getEnvVariableOrCrash('RUNTIME_ID', 'abc123')
const mayaRuntimeToken = getEnvVariableOrCrash('RUNTIME_TOKEN', 'badtoken')
const ownerId = getEnvVariableOrCrash('OWNER_ID', 'randomOwner')
const environment = getEnvVariableOrCrash('RUNTIME_ENVIRONMENT', 'STAGING')
const autoShutdownBehaviour = getEnvVariableOrCrash('AUTO_SHUTDOWN_BEHAVIOUR', 'BY_LAST_USE')
const maxIdleTime = getEnvVariableOrCrash('MAX_IDLE_TIME', '1800000')

const runtime = new Runtime({
    id,
    mayaRuntimeToken,
    ownerId,
    environment,
    autoShutdownBehaviour: (autoShutdownBehaviour as AutoShutdownBehaviour),
    maxIdleTime: parseInt(maxIdleTime),
})

console.log('Server listening on port', 9023)
runtime.init()
