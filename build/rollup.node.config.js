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
const rootdir = config.nodeOutput // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations

// 1. Clean prior builds
fs.rmdirSync(rootdir, { recursive: true })

// Identify plugins
const plugins = [
  ngn.only('node'),
  ngn.applyVersion(ngn.version),
  babel({
    presets: [['@babel/preset-env', { targets: { node: true } }]],
    plugins: [
      ['@babel/plugin-proposal-class-properties', { 'loose': false }],
      ['@babel/plugin-proposal-private-methods', { 'loose': false }]
    ],
    externalHelpersWhitelist: ['classPrivateFieldSet', 'classPrivateFieldGet', 'classPrivateMethods']
  }),
  terser({
    module: true,
    mangle: {
      properties: true
    },
    compress: {
      drop_console: true,
      passes: 8,
      warnings: true,
      ecma: 6
    }
  })
]

// 2. Build Node Production Package: Standard (Minified/Munged)
outdir += '/node-ngn'
configuration.push({
  input,
  plugins,
  output: {
    // banner: config.banner,
    file: `${outdir}/${ngn.name}-${ngn.version}.min.js`,
    format: 'esm',
    sourcemap: true
  },
  external: config.external
})

// 3. Build production legacy edition (commonjs/require format)
configuration.push({
  input,
  plugins,
  output: {
    // banner: config.banner,
    file: `${outdir}-legacy/${ngn.name}-${ngn.version}.min.js`,
    format: 'cjs',
    sourcemap: true
  },
  external: config.external
})

export default configuration
