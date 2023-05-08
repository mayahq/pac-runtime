import { Application, Router } from "../../deps.ts"

type RuntimeInitArgs = {
    app: Application;
    id: string;
}

export class Runtime {
    app: Application;
    id: string;

    constructor({ app, id }: RuntimeInitArgs) {
        this.app = app
        this.id = id
    }

    init() {
        this.app.listen({ port: 9023 })
    }
}