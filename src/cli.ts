import { Context } from "./context"
import { Runtime } from "./runtime"
import { parseFile, parseScript } from "./parser"
import * as fs from 'fs'
import { isExceptionValue, toHostValue } from "./value"

const file = process.argv[2]

if (file) {
  const script = fs.readFileSync(file, 'utf8')
  const isolute = new Runtime()
  const context = isolute.newContext()
  const fn = parseScript(context, script)
  const ret = context.run(fn);
  if (isExceptionValue(ret)) {
    throw toHostValue(isolute.currentException!)
  } else {
    console.log(toHostValue(ret))
  }
}
