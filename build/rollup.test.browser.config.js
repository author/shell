import path from 'path'
import fs from 'fs'
import config from './lib/config.js'
import Build from './lib/build.js'
import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'

// Install source map support
import { install } from 'source-map-support'
install()

// Add our own functionality
const build = new Build()

// Identify source file
const input = path.resolve(`../${build.pkg.main}`)

// Configure metadata for the build process.
const rootdir = path.join(config.testOutput, '.browser') // Main output directory
let outdir = rootdir // Active output directory
let configuration = [] // Rollup Configurations

// Pre-process: Check if the build actually needs to be updated.
if (build.isUnnecessaryBuild(input, outdir)) {
  process.exit(0)
}

// 1. Clean prior builds
// fs.rmdirSync(rootdir, { recursive: true })

// Identify standard plugins
const globalplugins = [
  build.only('browser')
]

// 2. Build Browser Production Package: Standard (Minified/Munged)
const onwarn = build.ignoreCircularDependency('../src/command.js', '../src/shell.js', '../src/format.js')
build.supportedBrowsers().forEach(edition => {
  console.log(`Generating ${edition} browser code.`)
  const plugins = globalplugins.slice()

  process.env.BROWSERSLIST_ENV = edition
  plugins.push(babel({
    presets: [['@babel/env']],
    plugins: [
      ['@babel/plugin-transform-flow-strip-types'],
      ['@babel/plugin-proposal-class-properties', { loose: false }],
      ['@babel/plugin-proposal-private-methods', { loose: false }]
    ]
  }))

  let terserCfg = config.terser
  terserCfg.module = edition === 'current'
  terserCfg.compress.module = edition === 'current'

  plugins.push(terser(terserCfg))

  configuration.push({
    input,
    plugins,
    onwarn,
    output: {
      exports: 'named',
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
        exports: 'named',
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
