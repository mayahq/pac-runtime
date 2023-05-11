export function getSmallRandomId(): string {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 100000).toString(36)}`
}

export function getEnvVariableOrCrash(varname: string, defaultVal?: string): string {
    const val = Deno.env.get(varname)
    if (!val) {
        if (defaultVal) {
            return defaultVal
        }
        throw new Error(`Required environment variable missing: ${varname}`)
    }

    return val
}
