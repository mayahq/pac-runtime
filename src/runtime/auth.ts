import { axios } from "../../deps.ts"
import { getEnvVariableOrCrash } from "../utils/misc.ts"

const environment = getEnvVariableOrCrash('RUNTIME_ENVIRONMENT', 'LOCAL')
const ownerId = getEnvVariableOrCrash('OWNER_ID', '')

let AUTH_SERVICE_URL = 'https://authservice.dev.mayalabs.io'
if (environment !== 'LOCAL') {
    AUTH_SERVICE_URL = 'http://authservice.default:9000'
}

type ValidateArgs = {
    key?: string
    token?: string
}

type AccessData = {
    exp: number
    permissions: string
    slug: string
    tier: 'PREMIUM' | 'FREE'
    trialDays: number
}

type AuthServiceResponse = {
    user: {
        id: string
        profileSlug: string
        access: AccessData[]
    }
}

export type ValidateSuccessResult = {
    status: 200
    data: AuthServiceResponse
}

type ValidateFailResult = {
    status: 500 | 403 | 401
    data: {
        message: string
    }
}

export type ValidateResult = ValidateSuccessResult | ValidateFailResult

export default async function validate({ key, token }: ValidateArgs): Promise<ValidateResult> {
    if (!key && !token) {
        return {
            status: 500,
            data: {
                message: 'Neither key nor token specified for authentication.'
            }
        }
    }

    let userResponse: AuthServiceResponse

    try {
        if (token) {
            const response = await axios({
                url: `${AUTH_SERVICE_URL}/auth/validate`,
                method: 'post',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
    
            userResponse = response.data
        } else {
            const response = await axios({
                url: `${AUTH_SERVICE_URL}/auth/validate`,
                method: 'post',
                headers: {
                    'x-api-key': key
                }
            })
    
            userResponse = response.data
        }

        const hasAccess = userResponse.user.access.some(acc => acc.slug === ownerId) || userResponse.user.id === ownerId
        if (!hasAccess) {
            return {
                status: 403,
                data: {
                    message: 'User does not have access to this worker.'
                }
            }
        }

        return {
            status: 200,
            data: userResponse
        }
    } catch (e) {
        if (!e.response || e.response.status !== 401) {
            return {
                status: 500,
                data: {
                    message: 'An unknown error occured while authenticating.'
                }
            }
        }

        return {
            status: 401,
            data: {
                message: 'Invalid credentials.'
            }
        }
    }
}