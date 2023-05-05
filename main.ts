import app from "./src/app.ts";

const PORT = 9023
app.listen(PORT, () => {
  console.log('server listening on', PORT)
})