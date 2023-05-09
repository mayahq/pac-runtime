import { Runtime } from './src/runtime/runtime.ts';

const runtime = new Runtime({ id: 'abcxyz' })

console.log('Server listening on port', 9023)
runtime.init()
