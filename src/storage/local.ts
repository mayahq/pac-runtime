import { stdpath } from "../../deps.ts";
import { Storage } from "./typings.d.ts";
import { Program } from "../program.ts";


type LocalStorageInitArgs = {
    basePath: string;
}

export class LocalStorage implements Storage {
    basePath: string;

    constructor({ basePath }: LocalStorageInitArgs) {
        this.basePath = basePath
    }

    async get(workerId: string) {
        const text = await Deno.readTextFile(stdpath.join(this.basePath, `${workerId}.json`))
        const program = JSON.parse(text)
        return program
    }

    async set(workerId: string, prog: Program) {
        await Deno.writeTextFile(stdpath.join(this.basePath, `${workerId}.json`), JSON.stringify(prog))
    }
}