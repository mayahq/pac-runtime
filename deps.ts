export { Application, Router } from 'https://deno.land/x/oak@v12.4.0/mod.ts'
export * as stdpath from 'https://deno.land/std@0.186.0/path/mod.ts'
export { load as loadEnv } from 'https://deno.land/std@0.186.0/dotenv/mod.ts'
export { default as axios } from 'npm:axios'
import { AxiosInstance as AInstance } from 'npm:axios'
export type AxiosInstance = AInstance
