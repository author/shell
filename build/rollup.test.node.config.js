import path from 'path'
import fs from 'fs'
import config from './config.js'
import BuildPlugin from './rollup-plugin-build.js'
import babel from 'rollup-plugin-babel'

// Install source map support
import 'source-map-support/register.js'

// Identify source file
const input = path.resolve('../index.js')

// Add build rollup support
const build = new BuildPlugin()

// Configure metadata for the build process.
const rootdir = path.join(config.testOutput, '.node') // Main output directory
const outdir = rootdir // Active output directory
const configuration = [] // Rollup Configurations
const output = `${outdir}/index.js`

// Pre-process: Check if the build actually needs to be updated.
if (fs.existsSync(output)) {
  // a. Check the timestamp of the last build file and determine if it is outdated.
  const lastbuildtime = fs.statSync(output).mtime.getTime()

  // b. Check all source files for last modification dates
  const updatedfiles = build.walk(path.dirname(input)).filter(filepath => {
    return fs.statSync(path.resolve(filepath)).mtime.getTime() > lastbuildtime
  })

  if (fs.statSync(__filename).mtime.getTime() > lastbuildtime) {
    updatedfiles.push(__filename)
  }

  if (updatedfiles.length === 0) {
    console.log('Build is unnecessary (no changes since last build).')
    process.exit(0)
  }
}

// 1. Clean prior builds
fs.rmdirSync(rootdir, { recursive: true })

// Identify plugins
const plugins = [
  build.only('node'),
  build.applyVersion(build.version),
  babel({
    presets: [['@babel/preset-env', { targets: { node: true } }]],
    plugins: [
      ['@babel/plugin-proposal-class-properties', { loose: false }],
      ['@babel/plugin-proposal-private-methods', { loose: false }]
    ]
  })
]

// 2. Build Node Production Package: Standard (Minified/Munged)
configuration.push({
  input,
  plugins,
  output: {
    file: output,
    format: 'esm',
    sourcemap: true,
    name: 'build'
  },
  external: config.external
})

export default configuration
