import { FunctionalProgramDsl } from '../program/program.d.ts'
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

    async get(workerId: string): Promise<FunctionalProgramDsl> {
        const response = await this.runtime.axiosInstance({
            url: `${this.baseUrl}/v2/worker/program/${workerId}`,
            method: 'get',
        })
        const data = response.data
        return data.program.dsl
    }

    async set(workerId: string, prog: FunctionalProgramDsl) {
        await this.runtime.axiosInstance({
            url: `${this.baseUrl}/v2/worker/program/${workerId}`,
            method: 'put',
            data: {
                program: prog,
            },
        })
    }
}
