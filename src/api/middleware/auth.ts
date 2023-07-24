import { Middleware } from '../../../deps.ts'
import validate from "../../runtime/auth.ts";
import { getEnvVariableOrCrash } from '../../utils/misc.ts';

const environment = getEnvVariableOrCrash('RUNTIME_ENVIRONMENT', 'LOCAL')

export const authMiddleware: Middleware = async (ctx, next) => {
    if (environment === 'LOCAL') {
        ctx.state.user = {
            id: 'mayahq',
            profileSlug: 'mayahq',
            access: [{
                exp: 919191,
                permissions: 'ADMIN',
                slug: 'mayahq',
                tier: 'PREMIUM',
                trialDays: 15
            }]
        }
        return next()
    }

    const authHeader = ctx.request.headers.get('Authorization')
    const apiKey = ctx.request.headers.get('x-api-key')

    if (!authHeader && !apiKey) {
        ctx.response.status = 401
        return
    }

    let result
    if (authHeader) {
        result = await validate({
            token: authHeader.split(' ')[1]
        })
    } else {
        result = await validate({
            key: apiKey as string
        })
    }

    if (result.status === 200) {
        ctx.state.user = result.data.user
        return next()
    } else {
        ctx.response.status = result.status
        return
    }
}