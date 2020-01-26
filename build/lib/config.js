import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('../package.json'))
const banner =
  `// ${pkg.name} v${pkg.version}\n` +
  `// Copyright (c) ${new Date().getFullYear()} ${pkg.author.name||pkg.author||process.env.USER||''}\n` +
  `// Released under the ${pkg.license||'"Unlicense"'} License.`

const data = JSON.parse(fs.readFileSync('./config.json'))

let npmorg = data.npmOrganization.trim().length === 0
  ? pkg.name.split('/').length > 1 ? pkg.name.split('/').shift() : data.npmOrganization
  : data.npmOrganization.trim()

const config = {
  nodeOutput: data.nodeOutput,
  browserOutput: data.browserOutput,
  testOutput: data.testOutput,
  npmOrganization: npmorg,
  external: data.external,
  banner,
  terser: data.terser || {
    compress: {
      keep_fnames: true,
      keep_classnames: true,
      drop_console: true,
      passes: 8,
      warnings: true
    }
  }
}

config.terser.output = config.terser.output || {}
config.terser.output.preamble = config.banner
export { config as default }
