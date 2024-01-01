const fs = require('fs')

const result = require('../.result/result.json')

const allTests = result.length;
const successGroup = {}
const allGroup = {}

for (const r of result) {
  const { scenario } = r
  if (!allGroup[scenario]) {
      allGroup[scenario] = 1
  } else {
      allGroup[scenario] ++
  }
  if (!successGroup[scenario]) {
      successGroup[scenario] = 0
  }
  if (r.result.pass) {
      successGroup[scenario]++
  }
}

console.log('success', successGroup)
console.log('all', allGroup)

fs.mkdirSync('./.result/badge/', { recursive: true })

function makeBadge(type, all, success) {
  return {
      'schemaVersion': 1,
      'label': `Test262(${type})`,
      'message': `${(success/all*100).toFixed(2)}% ${success}/${all}`,
      'color': 'green'
  }
}

function sum(arr) {
  return arr.reduce((s, i) => s + i, 0)
}

fs.writeFileSync('./.result/badge/all.json', JSON.stringify(makeBadge(
  'all',
  sum(Object.values(allGroup)),
  sum(Object.values(successGroup))
)))

for (const scenario of Object.keys(allGroup)) {
  fs.writeFileSync(`./.result/badge/${scenario}.json`, JSON.stringify(makeBadge(
    scenario,
    allGroup[scenario],
    successGroup[scenario] || 0,
  )))
}
