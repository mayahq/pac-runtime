import { ProgramDsl } from '../program/hybrid.d.ts'
// import { ProgramDSL } from '../program/program.ts'

export interface Storage {
    get: (workerId: string) => Promise<ProgramDsl>
    set: (workerId: string, prog: ProgramDsl) => Promise<void>
}
