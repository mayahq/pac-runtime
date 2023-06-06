export { Application, Router } from 'https://deno.land/x/oak@v12.4.0/mod.ts'
export type { RouterContext, RouterMiddleware } from 'https://deno.land/x/oak@v12.4.0/mod.ts'
export { oakCors } from 'https://deno.land/x/cors/mod.ts'

export * as stdpath from 'https://deno.land/std@0.186.0/path/mod.ts'
export { load as loadEnv } from 'https://deno.land/std@0.186.0/dotenv/mod.ts'
export { default as axios } from 'npm:axios'
export { default as lodash } from 'npm:lodash'
export { compile, match, parse, pathToRegexp } from 'npm:path-to-regexp'
export type { MatchFunction } from 'npm:path-to-regexp'

import { AxiosInstance as AInstance } from 'npm:axios'
export type AxiosInstance = AInstance
export { default as AsyncLock } from 'npm:async-lock'
