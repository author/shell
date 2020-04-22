import path from 'path'
import fs from 'fs'
import config from './lib/config.js'
import Build from './lib/build.js'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'

// Install source map support
import { install } from 'source-map-support'
install()

// Add our own functionality
const build = new Build()

// Identify source file
const input = path.resolve(`../${build.pkg.main || '../src/index.js'}`)

// Configure metadata for the build process.
const rootdir = config.browserOutput // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations

if (build.isUnnecessaryBuild(input, outdir)) {
  process.exit(0)
}

// 1. Clean prior builds
fs.rmdirSync(rootdir, { recursive: true })

// Identify standard plugins
const globalplugins = [
  build.only('browser')
]

// 2. Build Browser Production Package: Standard (Minified/Munged)
const onwarn = build.ignoreCircularDependency('../src/command.js', '../src/shell.js', '../src/format.js')
outdir += `/browser-${build.name}`
build.supportedBrowsers().forEach(edition => {
  console.log(`Generating ${edition} browser code.`)
  const plugins = globalplugins.slice()

  process.env.BROWSERSLIST_ENV = edition
  plugins.push(babel({
    presets: [['@babel/env']],
    plugins: [
      ['@babel/plugin-transform-flow-strip-types'],
      ['@babel/plugin-proposal-class-properties'/*, { 'loose': false } */],
      ['@babel/plugin-proposal-private-methods'/*, { 'loose': false } */]
    ]
  }))

  let terserCfg = config.terser
  terserCfg.module = edition === 'current'

  plugins.push(terser(terserCfg))

  configuration.push({
    input,
    plugins,
    onwarn,
    output: {
      banner: config.banner,
      file: `${outdir}/${build.name}-${build.version}${edition !== 'current' ? '-' + edition : ''}.min.js`,
      format: edition === 'current' ? 'esm' : 'iife',
      sourcemap: true,
      name: build.name // namespace applied to window object
    }
  })

  if (edition === 'current') {
    plugins.pop()
    terserCfg.module = false
    terserCfg.compress.module = false
    plugins.push(terser(terserCfg))
    configuration.push({
      input,
      plugins,
      onwarn,
      output: {
        banner: config.banner,
        file: `${outdir}/${build.name}-${build.version}-global.min.js`,
        format: 'iife',
        sourcemap: true,
        name: build.name // namespace applied to window object
      }
    })
  }
})

export default configuration
