import path from 'path'
import fs from 'fs'
import Build from '../../build/lib/build.js'
import browserify from 'browserify'
import { execSync } from 'child_process'

const build = new Build()
const pkg = JSON.parse(fs.readFileSync('../package.json').toString())
const name = pkg.name.split('/').pop()
const sources = fs.readdirSync(path.resolve('./.browser')).filter(i => path.extname(i).split('.').pop() === 'js')
const options = sources.map(src => `<option value="./${src}">import ${name} from './${src}'</option>`)
options.sort((a, b) => {
  if (a.replace(/[^\S0-9]/gi, '') > b.replace(/[^\S0-9]/gi, '')) {
    return -1
  } else {
    return 1
  }
})

if (pkg.main) {
  options.push(`<option value="./${pkg.main}">import ${name} from './${pkg.main}' (Raw Source)</option>`)
}

const content = fs.readFileSync('./assets/index.html')
  .toString()
  .replace(/\{\{script\}\}/g, `./${name}.min.js`)
  .replace(/\{\{NAMESPACE\}\}/g, name)
  .replace(/\{\{OPTIONS\}\}/gi, options.join('\n            '))

if (!fs.existsSync(path.resolve('./.testsuite'))) {
  fs.mkdirSync(path.resolve('./.testsuite'), { recursive: true })
}

fs.writeFileSync('./.testsuite/index.html', content)
sources.forEach(jsfile => {
  fs.copyFileSync(`./.browser/${jsfile}`, `./.testsuite/${jsfile}`)
  fs.copyFileSync(`./.browser/${jsfile}.map`, `./.testsuite/${jsfile}.map`)
})

const cwd = process.cwd()
const out = path.join(process.cwd(), '.testsuite')
build.walk('../src').forEach(file => {
  const input = path.resolve(file)
  const output = path.dirname(input).replace(path.join(cwd, '..'), out)
  if (fs.statSync(input).isFile() && !fs.existsSync(output)) {
    fs.mkdirSync(output)
  }

  const content = fs.readFileSync(input)
    .toString()
    .replace(/([\t ]*\/\* ?node-only ?\*\/)[\s\S]*?(\/\* ?end-node-only ?\*\/[\t ]*\n?)/gim, '')
    // .replace(/<#(\s+)?REPLACE_VERSION(\s+)?#>/gi, pkg.version)

  fs.writeFileSync(input.replace(path.join(cwd, '..'), out), content)
})

// Add the libraries from the test suite
if (fs.existsSync(path.resolve('./.testsuite/browser-test.js'))) {
  const content = fs.readFileSync('./.testsuite/browser-test.js').toString()
  const importStatements = content.match(/_interop[\S]+\(require\(['"]([\S]+)['"]/g)
  const names = new Set()
  importStatements.forEach(i => i.match(/_interop[\S]+\(require\(['"]([\S]+)['"]/).slice(1).forEach(name => names.add(name)))

  if (names.size > 0) {
    // TODO: Use the browserify API to bundle
    // const bundle = fs.createWriteStream(path.resolve('./.testsuite/bundle.js'))
    const cmd = `./node_modules/browserify/bin/cmd.js -r ${Array.from(names).join('-r ')} > "${path.resolve('./.testsuite/bundle.js')}"`
    execSync(cmd, { stdio: 'inherit' })
    // console.log(bundle)
    // browserify(Array.from(names)).bundle().on('data', chunk => bundle.write(chunk)).on('end', () => console.log('done'))
    console.log(`Generated browser references for: ${Array.from(names).join(', ')}.`)
  }
}
