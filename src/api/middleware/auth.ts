import { Middleware } from '../../../deps.ts'
import validate from "../../runtime/auth.ts";

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

export const authMiddleware: Middleware = async (ctx, next) => {
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