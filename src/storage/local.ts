import { stdpath } from '../../deps.ts'
import { Storage } from './typings.d.ts'
import { LiteGraphSpec } from '../program/hybrid.d.ts'

type LocalStorageInitArgs = {
    basePath: string
}

export class LocalStorage implements Storage {
    basePath: string
    summary: any

    constructor({ basePath }: LocalStorageInitArgs) {
        this.basePath = basePath
        this.summary = {
            basePath,
        }
    }

    async get(workerId: string) {
        try {
            const text = await Deno.readTextFile(
                stdpath.join(this.basePath, `${workerId}.json`),
            )
            const program = JSON.parse(text)
            return program
        } catch (e) {
            console.log('Error getting program:', e)
            await this.set(workerId, { nodes: [], links: [] })
            return {
                symbols: [],
            }
        }
    }

    async set(workerId: string, prog: LiteGraphSpec) {
        await Deno.writeTextFile(
            stdpath.join(this.basePath, `${workerId}.json`),
            JSON.stringify(prog),
        )
    }
}
