import { Router } from '../../deps.ts'
import { getProgramStorage } from '../storage/index.ts'

const router = new Router()
router.prefix('/program')

router.post('/deploy', async (ctx) => {
    const storage = getProgramStorage()
    const reqBody = await ctx.request.body().value
    const program = reqBody.program

    await storage.set('abcxyz', program)
    ctx.response.status = 200
    ctx.response.body = { message: 'Program successfully deployed' }
})

router.post('/stop', (ctx) => {
    ctx.response.status = 200
    ctx.response.body = { message: 'Program successfully stopped '}
})

router.get('/', async (ctx) => {
    const storage = getProgramStorage()
    const program = await storage.get('abcxyz')
    ctx.response.status = 200
    ctx.response.body = { program: program }
})

export default router