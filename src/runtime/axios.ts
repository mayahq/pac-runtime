import { axios } from '../../deps.ts'
import { Runtime } from './runtime.ts'

export function getAxiosInstance(runtime: Runtime) {
    const instance = axios.create({
        headers: {
            'maya-api-key': runtime.mayaRuntimeToken,
        },
    })

    instance.interceptors.request.use((config) => {
        console.log('A request is being made [ai]:', config.url, config.method, config.data)
        return config
    })

    instance.interceptors.response.use(
        r => r,
        error => {
            if (error.response) {
                console.log('There was an axios error in axiosInstance:', error.response.status, error.response.config, error.response.data)
            }

            return Promise.reject(error)
        }
    )
    return instance
}
