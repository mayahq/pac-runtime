import { resolve } from 'https://deno.land/std@0.185.0/path/win32.ts'
import { axios } from '../../deps.ts'
import { getEnvVariableOrCrash } from '../utils/misc.ts'
import { Runtime } from './runtime.ts'

type PollFunction = (...args: any[]) => Promise<boolean>

function checkStatus(): Promise<boolean> {
    return new Promise((resolve) => {
        console.log('Checking SSL')
        const username = getEnvVariableOrCrash('OWNER_USERNAME', 'dusnat')
        const environment = getEnvVariableOrCrash('RUNTIME_ENVIRONMENT', 'LOCAL')
        const id = getEnvVariableOrCrash('RUNTIME_ID', 'abcxyz')
        
        if (environment === 'LOCAL') {
            return true
        }
    
        const baseUrl = environment === 'STAGING' ? 'dev.mayalabs.io' : 'mayalabs.io'
        const runtimeUrl = `https://rt-${id}.${username}.${baseUrl}/health?timestamp=${Date.now()}`
        
        axios.get(runtimeUrl)
            .then(() => resolve(true))
            .catch((e) => {
                console.log('status:', e.response.status)
                resolve(false)
            })
        // try {
        //     await axios.get(runtimeUrl)
        //     return true
        // } catch (e) {
        //     console.log('here', e?.response?.status)
        //     return false
        // }
    })
}

const poll = (pollFn: PollFunction, interval = 1000, timeout = 60_000) => {
    let timeElapsed = 0
    return new Promise((resolve, reject) => {
        const intervalInstance = setInterval(() => {
            pollFn().then(result => {
                if (result) {
                    clearInterval(intervalInstance)
                    return resolve(true)
                }
    
                timeElapsed += interval
    
                if (timeout && timeElapsed > timeout) {
                    clearInterval(intervalInstance)
                    return reject(new Error('Timeout'))
                }
            })
        }, interval)
    })
}

export const waitForRuntimeSSL = async (runtime: Runtime) => {
    console.log('wait for SSL called')
    await poll(checkStatus)
    console.log('Runtime is available on public internet')
    const environment = getEnvVariableOrCrash('RUNTIME_ENVIRONMENT', 'LOCAL')

    if (environment === 'LOCAL') {
        return
    }

    await runtime.axiosInstance({
        url: `${runtime.appBackendBaseUrl}/v2/worker/update-status`,
        method: 'put',
        data: {
            workerId: runtime.id,
            status: 'RUNNING'
        }
    })
}