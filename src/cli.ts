import { Runtime } from './runtime'
import { parseScript } from './parser'
import * as fs from 'fs'
import { isExceptionValue, toHostValue } from './value'
import { initTest262 } from './test262'
// import { enableLog } from "./log";

let file = process.argv[2]

let isTest262 = false

if (file === '--test262') {
  isTest262 = true
  file = process.argv[3]
}

if (file) {
  const script = fs.readFileSync(file, 'utf8')
  const isolute = new Runtime()
  const context = isolute.newContext()

  if (isTest262) {
    initTest262(context)
  }

  const fn = parseScript(context, script)
  const ret = context.run(fn)
  if (isExceptionValue(ret)) {
    throw toHostValue(isolute.currentException!)
  }
}
