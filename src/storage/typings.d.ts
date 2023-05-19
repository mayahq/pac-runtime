import { FunctionalProgramDsl } from '../program/program.d.ts'
// import { ProgramDSL } from '../program/program.ts'

export interface Storage {
    get: (workerId: string) => Promise<FunctionalProgramDsl>
    set: (workerId: string, prog: FunctionalProgramDsl) => Promise<void>
}
