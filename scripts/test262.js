const os = require('os')
const child = require('child_process')
const fs = require('fs')

const cpuSize = os.availableParallelism?.() ?? os.cpus?.()?.length ?? 1

const args = [
    '--hostType', 'engine262',
    '--hostPath', './bin/jsscript',
    '-t', `${cpuSize}`,
    '-r', 'json',
    '--reporter-keys', 'result,attrs,file,scenario,relative',
    ...process.argv.slice(2)
]

const c = child.spawn('test262-harness', args, {
    encoding: 'utf8',
    stdio: 'pipe'
})

fs.mkdirSync('./.result/', { recursive: true });
c.stdout.pipe(fs.createWriteStream('./.result/result.json'))
c.on('close', code => process.exit(code))
