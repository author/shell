import path from 'path'
import fs from 'fs'
import config from './lib/config.js'
import Build from './lib/build.js'
import babel from 'rollup-plugin-babel'

// Install source map support
import 'source-map-support/register.js'

// Add our own functionality
const build = new Build()

// Identify source file
const input = path.resolve(`../${build.pkg.main}`)

// Configure metadata for the build process.
const rootdir = path.resolve(path.join(config.testOutput, '.node')) // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations
let output = `${outdir}/index.js`

// Pre-process: Check if the build actually needs to be updated.
if (build.isUnnecessaryBuild(input, output)) {
  process.exit(0)
}

// 1. Clean prior builds
if (fs.existsSync(rootdir)) {
  console.log('Cleaning directory:', rootdir)
  fs.rmdirSync(rootdir, { recursive: true })
}

// Identify plugins
const plugins = [
  build.only('node'),
  babel({
    presets: [['@babel/preset-env', { targets: { node: true } }]],
    plugins: [
      ['@babel/plugin-proposal-class-properties', { 'loose': false }],
      ['@babel/plugin-proposal-private-methods', { 'loose': false }]
    ]
  })
]

// 2. Build Node Production Package: Standard (Minified/Munged)
configuration.push({
  input,
  plugins,
  output: {
    exports: 'named',
    banner: config.banner,
    file: output,
    format: 'esm',
    sourcemap: true,
    name: build.name
  },
  external: config.external
})

export default configuration
