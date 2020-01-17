import path from 'path'
import fs from 'fs'
import config from './config.js'
import NgnPlugin from './rollup-plugin-ngn.js'
import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'

// Install source map support
import { install } from 'source-map-support'
install()

// Identify source file
const input = path.resolve('../src/main.js')

// Add NGN rollup support
const ngn = new NgnPlugin()

// Configure metadata for the build process.
const rootdir = path.join(config.testOutput, '.browser') // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations

// Pre-process: Check if the build actually needs to be updated.
if (fs.existsSync(outdir)) {
  // a. Check the timestamp of the last build file and determine if it is outdated.
  const lastbuildtime = fs.statSync(outdir).mtime.getTime()

  // b. Check all source files for last modification dates
  const updatedfiles = ngn.walk(path.dirname(input)).filter(filepath => {
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

// Identify standard plugins
const globalplugins = [
  ngn.only('browser'),
  ngn.applyVersion(ngn.version)
]

// 2. Build Browser Production Package: Standard (Minified/Munged)
ngn.supportedBrowsers().forEach(edition => {
  console.log(`Generating ${edition} browser code.`)
  const plugins = globalplugins.slice()

  process.env.BROWSERSLIST_ENV = edition
  plugins.push(babel({
    presets: [['@babel/env']],
    plugins: [
      ['@babel/plugin-transform-flow-strip-types'],
      ['@babel/plugin-proposal-class-properties', { 'loose': false }],
      ['@babel/plugin-proposal-private-methods', { 'loose': false }]
    ]
    // externalHelpersWhitelist: ['classPrivateFieldSet', 'classPrivateFieldGet']
  }))

  // toplevel: true,
  //   output: {
  //   ascii_only: true
  // },
  // compress: {
  //   pure_funcs: ['makeMap']
  // }

  plugins.push(terser({
    module: true,
    // mangle: {
    //   toplevel: true
    //   // properties: {
    //   //   keep_fnames: true
    //   // }
    // },
    // output: {
    //   ascii_only: true
    // },
    compress: {
      module: true,
      keep_fnames: true,
      keep_classnames: true,
      drop_console: true,
      passes: 10,
      warnings: true
    }
  }))

  configuration.push({
    input,
    plugins,
    output: {
      // banner: config.banner,
      file: `${outdir}/${ngn.name}-${ngn.version}${edition !== 'current' ? '-' + edition : ''}.min.js`,
      format: edition === 'current' ? 'esm' : 'iife',
      sourcemap: true,
      name: 'NGN' // namespace applied to window object
    }
  })

  if (edition === 'current') {
    configuration.push({
      input,
      plugins,
      output: {
        // banner: config.banner,
        file: `${outdir}/${ngn.name}-${ngn.version}-global.min.js`,
        format: 'iife',
        sourcemap: true,
        name: 'NGN' // namespace applied to window object
      }
    })
  }
})

export default configuration
