import { Application, Router } from "../../deps.ts"
import { Comms } from "./comms.ts";

type RuntimeInitArgs = {
    app: Application;
    id: string;
}

export class Runtime {
    app: Application;
    id: string;
    dynamicRouter: Router;
    comms: Comms;

    constructor({ app, id }: RuntimeInitArgs) {
        this.app = app
        this.id = id

        this.dynamicRouter = new Router()
        this.dynamicRouter.prefix('/program')
        this.comms = new Comms({ app })
    }

    init() {
        this.comms.init()
        this.app.listen({ port: 9023 })
    }
}