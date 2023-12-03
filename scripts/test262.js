const os = require('os')
const child = require('child_process')
const fs = require('fs')

const cpuSize = os.availableParallelism?.() ?? os.cpus?.()?.length ?? 1

console.log('Runned with cpu', cpuSize)

const args = [
  '--hostType', 'engine262',
  '--hostPath', './bin/jsscript',
  '--hostArgs="--test262"',
  '-t', `${cpuSize}`,
  '-r', 'json',
  '--reporter-keys', 'result,attrs,file,scenario,relative',
  ...process.argv.slice(2)
]

console.log('Running with args', args)

const c = child.spawn('test262-harness', args, {
  encoding: 'utf8',
  stdio: 'pipe'
})

fs.mkdirSync('./.result/', { recursive: true });
const writable = fs.createWriteStream('./.result/result.json')
c.stdout.pipe(writable)
c.on('close', code => process.exit(code))

setInterval(() => {
  // every 5s to report progress
  console.log('Running...', `Writen ${writable.bytesWritten} Bytes`)
}, 30000)
