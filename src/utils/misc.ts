import { config } from '../../deps.ts'

export function getSmallRandomId(): string {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 100000).toString(36)}`
}

export function getEnvVariableOrCrash(varname: string, defaultVal?: string): string {
    const val = Deno.env.get(varname)
    if (!val) {
        if (defaultVal !== undefined) {
            return defaultVal
        }
        throw new Error(`Required environment variable missing: ${varname}`)
    }

    return val
}

export function loadEnv() {
    const env = config()
    Object.entries(env).forEach(([k, v]) => Deno.env.set(k, v))
}

export function isUrl(url: string) {
    try {
        new URL(url)
        return true
    } catch (_) {
        return false
    }
}
