import { LiteGraphSpec } from '../program/hybrid.d.ts'
import { Runtime } from '../runtime/runtime.ts'
import { Storage } from './typings.d.ts'

type RemoteStorageInitArgs = {
    runtime: Runtime
}

export class RemoteStorage implements Storage {
    runtime: Runtime
    baseUrl: string
    summary: any

    constructor({ runtime }: RemoteStorageInitArgs) {
        this.runtime = runtime
        this.baseUrl = runtime.appBackendBaseUrl
        this.summary = {
            baseUrl: runtime.appBackendBaseUrl,
        }
    }

    async get(workerId: string): Promise<LiteGraphSpec> {
        try {
            const response = await this.runtime.axiosInstance({
                url: `${this.baseUrl}/v2/worker/program/${workerId}`,
                method: 'get',
            })
            const data = response.data
            console.log('Got program', JSON.stringify(data, null, 4))
            return data.program.dsl
        } catch (e) {
            console.log('what the fuck?????', e.response.status, e.response.data)
            throw e
        }
    }

    async set(workerId: string, prog: LiteGraphSpec) {
        await this.runtime.axiosInstance({
            url: `${this.baseUrl}/v2/worker/program/${workerId}`,
            method: 'put',
            data: {
                program: prog,
            },
        })
    }
}
