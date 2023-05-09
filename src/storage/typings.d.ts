import { ProgramDSL } from '../program/program.ts'

export interface Storage {
    get: (workerId: string) => Promise<ProgramDSL>
    set: (workerId: string, prog: ProgramDSL) => Promise<void>
}
