import { stdpath } from "../../deps.ts";
import { LocalStorage } from "./local.ts";
import { Storage } from './typings.d.ts'


export function getProgramStorage(): Storage {
    const currentFilePath = new URL(import.meta.url).pathname
    const local = new LocalStorage({
        basePath: stdpath.join(currentFilePath, '../../../temp')
    })
    console.log(local.basePath)
    return local
}