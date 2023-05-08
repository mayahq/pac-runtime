import { Router } from '../../deps.ts'

const router = new Router()
router.prefix('/program')

router.post('/deploy', async (ctx) => {
    await console.log(ctx)
    return 
})

export default router