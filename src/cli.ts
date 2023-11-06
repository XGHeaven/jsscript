import { Context } from "./context"
import { Runtime } from "./runtime"
import { parseFile } from "./parser"

const file = process.argv[2]

if (file) {
  const script = require('fs').readFileSync(file, 'utf8')
  const isolute = new Runtime()
  const context = new Context(isolute)
  context.execute(parseFile(script))
}
