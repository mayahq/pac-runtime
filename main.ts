import app from './src/api/index.ts';

const PORT = 9023

console.log('Server listening on port', PORT)
app.listen({ port: PORT })