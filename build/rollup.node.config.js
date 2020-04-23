import path from 'path'
import fs from 'fs'
import config from './lib/config.js'
import Build from './lib/build.js'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'

// Install source map support
import { install } from 'source-map-support'
install()

// Add custom functionality
const build = new Build()

// Identify source file
const input = path.resolve(`../${build.pkg.main || '../src/index.js'}`)

// Configure metadata for the build process.
const rootdir = config.nodeOutput // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations

// 1. Clean prior builds
fs.rmdirSync(rootdir, { recursive: true })

let terserCfg = config.terser
terserCfg.module = true
// terserCfg.mangle = { properties: true }
// console.log(terserCfg)

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
  }),
  terser(terserCfg)
]

// 2. Build Node Production Package: Standard (Minified/Munged)
const onwarn = build.ignoreCircularDependency('../src/command.js', '../src/shell.js', '../src/format.js', '../src/base.js')
outdir += `/node-${build.name}`
configuration.push({
  input,
  plugins,
  onwarn,
  output: {
    banner: config.banner,
    file: `${outdir}/${build.name}-${build.version}.min.js`,
    format: 'esm',
    sourcemap: true
  },
  external: config.external
})

// 3. Build production legacy edition (commonjs/require format)
configuration.push({
  input,
  plugins,
  onwarn,
  output: {
    banner: config.banner,
    file: `${outdir}-legacy/${build.name}-${build.version}.min.js`,
    format: 'cjs',
    sourcemap: true
  },
  external: config.external
})

export default configuration
