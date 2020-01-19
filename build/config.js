import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('../package.json'))
const banner =
  `// ${pkg.name} v${pkg.version}\n` +
  `// Copyright (c) 2019-${new Date().getFullYear()} ${pkg.author.name}\n` +
  `// Released under the ${pkg.license} License.`

const data = JSON.parse(fs.readFileSync('./config.json'))

const config = {
  // source: '../src',
  nodeOutput: data.nodeOutput,
  browserOutput: data.browserOutput,
  testOutput: data.testOutput,
  npmPrefix: data.npmPrefix,
  external: data.external,
  banner
}

export { config as default }
