import { LiteGraphSpec } from '../program/hybrid.d.ts'
// import { ProgramDSL } from '../program/program.ts'

export interface Storage {
    summary: any;
    get: (workerId: string) => Promise<LiteGraphSpec>
    set: (workerId: string, prog: LiteGraphSpec) => Promise<void>
}
