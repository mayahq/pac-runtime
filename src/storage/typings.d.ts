import { Program } from "../program.ts";

export interface Storage {
    get: (workerId: string) => Promise<Program>;
    set: (workerId: string, prog: Program) => Promise<void>;
}