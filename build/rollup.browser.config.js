import path from 'path'
import fs from 'fs'
import config from './config.js'
import NgnPlugin from './rollup-plugin-ngn.js'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'

// Install source map support
import { install } from 'source-map-support'
install()

// Identify source file
const input = path.resolve('../src/main.js')

// Add NGN rollup support
const ngn = new NgnPlugin()

// Configure metadata for the build process.
const rootdir = config.browserOutput // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations

// 1. Clean prior builds
fs.rmdirSync(rootdir, { recursive: true })

// Identify standard plugins
const globalplugins = [
  ngn.only('browser'),
  ngn.applyVersion(ngn.version)
]

// 2. Build Browser Production Package: Standard (Minified/Munged)
outdir += '/browser-ngn'
ngn.supportedBrowsers().forEach(edition => {
  console.log(`Generating ${edition} browser code.`)
  const plugins = globalplugins.slice()

  process.env.BROWSERSLIST_ENV = edition
  plugins.push(babel({
    // presets: [['@babel/env', { targets: { node: true } }]],
    plugins: [
      ['@babel/plugin-transform-flow-strip-types'],
      ['@babel/plugin-proposal-class-properties'/*, { 'loose': false } */],
      ['@babel/plugin-proposal-private-methods'/*, { 'loose': false } */]
    ]
    // externalHelpersWhitelist: ['classPrivateFieldSet', 'classPrivateFieldGet']
  }))

  plugins.push(terser({
    module: true,
    mangle: {
      properties: true
    },
    compress: {
      drop_console: true,
      passes: 2,
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
