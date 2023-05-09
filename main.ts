import app from './src/api/index.ts';
import { Runtime } from './src/runtime/runtime.ts';

const runtime = new Runtime({ app: app, id: 'abcxyz' })

console.log('Server listening on port', 9023)
runtime.init()
