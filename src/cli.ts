import { Runtime } from './runtime'
import { parseScript } from './parser'
import * as fs from 'fs'
import { isExceptionValue, toHostValue } from './value'
import { initTest262 } from './test262'
import yargs from 'yargs'
import { enableLog } from './log'
// import { enableLog } from "./log";

yargs(process.argv.slice(2))
  .command(
    'run <file>',
    'Run file',
    (yargs) =>
      yargs
        .option('test262', {
          type: 'boolean',
          desc: 'Enable test262 mode',
        })
        .option('bc-log', {
          type: 'boolean',
          desc: 'Enable bytecode running code',
        })
        .positional('file', {
          type: 'string',
          desc: 'Which file to run',
        }),
    (argv) => {
      const { file, test262: isTest262 } = argv

      if (argv['bc-log']) {
        enableLog(true)
      }

      const script = fs.readFileSync(file!, 'utf8')
      const isolute = new Runtime()
      const context = isolute.newContext()

      if (isTest262) {
        initTest262(context)
      }

      const fn = parseScript(context, script)
      const ret = context.run(fn)
      if (isExceptionValue(ret)) {
        console.log(toHostValue(isolute.currentException!))
        process.exit(1)
      }
    }
  )
  .demandCommand().argv
