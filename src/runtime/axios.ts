import { axios } from '../../deps.ts'
import { Runtime } from './runtime.ts'

export function getAxiosInstance(runtime: Runtime) {
    const instance = axios.create({
        headers: {
            'maya-api-key': runtime.mayaRuntimeToken,
        },
    })
    return instance
}
