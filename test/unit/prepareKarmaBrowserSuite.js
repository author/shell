import fs from 'fs'
import path from 'path'
// Rollup is used from the build package instead of requiring 2 copies of rollup to be installed in node_modules.
import multi from '../../build/node_modules/@rollup/plugin-multi-entry/dist/index.js'
import rollup from '../../build/node_modules/rollup/dist/rollup.js'
import MagicString from 'magic-string'
import diff from 'diff'

const config = JSON.parse(fs.readFileSync('../build/config.json'))
const pkg = JSON.parse(fs.readFileSync('../package.json'))
const testpkg = JSON.parse(fs.readFileSync('./package.json'))
const file = path.resolve(path.join(config.testOutput, '.testsuite', 'browser-test.js'))

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
external.push('tape')

const matcher = /import\s+(?:.*as\s+)?(\{.*\}|[\S]+)\s.*from\s+['"].*\/\.node\/index\.js['"]/
const tests = new Set(process.argv.filter((val, i, args) => i > 0 && /-+test/i.test(args[i - 1])).map(i => i.toLowerCase()))
const input = tests.size === 0 ? ['./unit/0*-*/*-*.js'] : Array.from(tests)

export default function importExtractor() {
  return {
    name: 'import-extractor', // this name will show up in warnings and errors
    load (id) {
      if (fs.existsSync(id)) {
        console.log(`Including ${id}`)
        const input = fs.readFileSync(id).toString()
        const ms = new MagicString(input)
        const output = input
          .replace(/(import\s+.*\s+['"].*\/)\.node\/index\.js(['"])/gi, `$1.browser/${pkg.name.split('/').pop()}-${pkg.version}.min.js$2`)
          .replace(/import\s+['"]source-map-support\/register.*/gi, '') // Not supported by browserify

        const changes = diff.diffChars(input, output)
        if (changes && changes.length > 0) {
          let idx = 0

          changes.forEach(part => {
            if (part.added) {
              ms.prependLeft(idx, part.value)
              idx -= part.count
            } else if (part.removed) {
              ms.remove(idx, idx + part.count)
            }

            idx += part.count
          })
        }

        return { code: output, map: ms.generateMap({ hires: true })}
      }
      return null
    }
    // , buildEnd () {}
  };
}

async function build () {
  const bundle = await rollup.rollup({
    input,
    external,
    plugins: [
      importExtractor(),
      multi(),
    ]
  })

  // const { output } = await bundle.generate(outputOptions)

  await bundle.write(outputOptions)

  // The setTimeout is used to force Karma to wait for the code to be loaded by the prep script.
  // const content = fs.readFileSync(file).toString()
  // fs.writeFileSync(file, `setTimeout(function () {\n${content}\n}, 600)`)
  // console.log(`Wrote "${file}" to disk.`)
}

build()
