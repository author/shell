import fs from 'fs'
import path from 'path'
import rollup from 'rollup'
import multi from '@rollup/plugin-multi-entry'

const config = JSON.parse(fs.readFileSync('../build/config.json'))
const pkg = JSON.parse(fs.readFileSync('../package.json'))
const testpkg = JSON.parse(fs.readFileSync('./package.json'))
const file = path.resolve(path.join(config.testOutput, '.testsuite', 'browser-test.js'))

// if (fs.existsSync(path.dirname(file))) {
//   // a. Check the timestamp of the last build file and determine if it is outdated.
//   const lastbuildtime = fs.statSync(file).mtime.getTime()

//   // b. Check all source files for last modification dates
//   let updatedfiles = []
//   fs.readdirSync('./')
//     .filter(item => fs.statSync(path.resolve(item)).isDirectory() && /[0-9]+-[^0-9]+/.test(item))
//     .forEach(dir => {
//       updatedfiles = updatedfiles.concat(fs.readdirSync(dir).filter(item => fs.statSync(path.resolve(path.join(dir, item))).mtime.getTime() > lastbuildtime))
//     })

//   if (updatedfiles.length === 0) {
//     console.log('Build is unnecessary (no changes since last build).')
//     process.exit(0)
//   }
//   console.log(updatedfiles)
// }

fs.rmdirSync(path.dirname(file), { recursive: true })
fs.mkdirSync(path.dirname(file))

const outputOptions = {
  file,
  format: 'cjs'
}

const external = config.external
external.push('.node/index.js')
external.push('./.node/index.js')
external.push('../.node/index.js')
external.push('../../.node/index.js')
// external.push('.browser/index.js')
// external.push('./.browser/index.js')
// external.push('../.browser/index.js')
// external.push('../../.browser/index.js')

const tests = new Set(process.argv.filter((val, i, args) => i > 0 && /-+test/i.test(args[i - 1])).map(i => i.toLowerCase()))
const input = tests.size === 0 ? ['./0*-*/*-*.js'] : Array.from(tests)

console.log('\nTest Files:', Array.from(tests).join(', '))

async function build () {
  const bundle = await rollup.rollup({
    input,
    external,
    plugins: [multi()]
  })

  // const { output } = await bundle.generate(outputOptions)

  await bundle.write(outputOptions)

  // Override the sourcemapping to work w/ CJS
  const content = /* `import NGN from './.browser/ngn-${pkg.version}.min.js'\n` + */fs.readFileSync(file)
    .toString()
    .replace("require('source-map-support/register.js');", '\n') // Not supported by browserify
    .replace(/var NGN\s+=\s+_interop.*require.*\n?/i, '') // Remove NGN reference so it can be included from the appropriate build file at runtime.
    .replace(/const\s+(.*)\s+?=\s+?JSON.parse\(fs.readFileSync\(.*endpoints/gi, 'const $1 = __ENDPOINTS__;') // This replacement is done to add the appropriate endpoints from package.json. Browserify cannot resolve the file at runtime, so it must be prebuilt (see prep script below).

  // .replace(/(var NGN\s+=\s+_interop.*require\(['|"])(.*)(['|"].*\n?)/, `$1./.browser/ngn-${pkg.version}.min.js$3`)
  // .replace('.node/index.js', `.browser/ngn-${pkg.version}.min.js`)
  // .replace("require('source-map-support/register.js');", "var sourcemap = require('source-map-support');\nsourcemap.install();\n")

  // The setTimeout is used to force Karma to wait for NGN to be loaded by the prep script.
  fs.writeFileSync(file, `setTimeout(function () {\n${content}\n}, 600)`)
}

build()

fs.writeFileSync('./.testsuite/test-prep.js', `
import NGN from '../.browser/ngn-${pkg.version}.min.js'
window.NGN = NGN;
window.__ENDPOINTS__ = ${JSON.stringify(testpkg.endpoints)};
`)
