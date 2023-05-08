import { Application } from "../../deps.ts";
import programRouter from "./program.ts";

const app = new Application()

// Program router
app.use(programRouter.allowedMethods())
app.use(programRouter.routes())

export default app