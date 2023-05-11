import { Runtime } from './src/runtime/runtime.ts'
import { getEnvVariableOrCrash } from './src/utils/misc.ts'

const id = getEnvVariableOrCrash('RUNTIME_ID', 'abc123')
const mayaRuntimeToken = getEnvVariableOrCrash('RUNTIME_TOKEN', 'badtoken')
const ownerId = getEnvVariableOrCrash('OWNER_ID', 'randomOwner')
const environment = getEnvVariableOrCrash('RUNTIME_ENVIRONMENT', 'STAGING')

const runtime = new Runtime({
    id,
    mayaRuntimeToken,
    ownerId,
    environment: environment
})

console.log('Server listening on port', 9023)
runtime.init()
