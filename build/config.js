import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('../package.json'))
const banner =
  `// NGN v${pkg.version}\n` +
  `// Copyright (c) 2018-${new Date().getFullYear()} ${pkg.author.name}\n` +
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
