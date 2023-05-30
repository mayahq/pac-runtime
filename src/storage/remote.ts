import { ProgramDsl } from '../program/hybrid.d.ts'
// import { ProgramDSL } from '../program/program.ts'
import { Runtime } from '../runtime/runtime.ts'
import { Storage } from './typings.d.ts'

type RemoteStorageInitArgs = {
    runtime: Runtime
}

export class RemoteStorage implements Storage {
    runtime: Runtime
    baseUrl: string

    constructor({ runtime }: RemoteStorageInitArgs) {
        this.runtime = runtime
        this.baseUrl = runtime.appBackendBaseUrl
    }

    async get(workerId: string): Promise<ProgramDsl> {
        const response = await this.runtime.axiosInstance({
            url: `${this.baseUrl}/v2/worker/program/${workerId}`,
            method: 'get',
        })
        const data = response.data
        return data.program.dsl
    }

    async set(workerId: string, prog: ProgramDsl) {
        await this.runtime.axiosInstance({
            url: `${this.baseUrl}/v2/worker/program/${workerId}`,
            method: 'put',
            data: {
                program: prog,
            },
        })
    }
}
