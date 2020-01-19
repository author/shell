import fs from 'fs'
import path from 'path'
import stripCode from 'rollup-plugin-strip-code'
import replace from 'rollup-plugin-replace'
// import utils from '@rollup/pluginutils'

const pkg = JSON.parse(fs.readFileSync('../package.json'))

const NODEONLY = {
  start_comment: 'browser-only',
  end_comment: 'end-browser-only'
}
const BROWSERONLY = {
  start_comment: 'node-only',
  end_comment: 'end-node-only'
}

let supportedBrowsers = null

export default class build {
  constructor (opts = {}) {
    this.name = pkg.name
    this.manifest = null
  }

  get pkg () {
    return pkg
  }

  // set pkg (pkgpath) {
  //   let file = path.resolve(pkgpath)
  //   let content = fs.readFileSync(file).toString()
  //   this.manifest = JSON.parse(content)
  // }

  get version () {
    return pkg.version
  }

  get NODEONLY () {
    return NODEONLY
  }

  get BROWSERONLY () {
    return BROWSERONLY
  }

  supportedBrowsers (sourceFile = './.browserslistrc') {
    if (supportedBrowsers !== null) {
      return supportedBrowsers
    }

    sourceFile = path.join(process.cwd(), sourceFile)

    const match = fs.readFileSync(sourceFile).toString().matchAll(/\[(.*)\]/gim)

    supportedBrowsers = [...match].map(item => item[1])
    return supportedBrowsers
  }

  only (env) {
    return stripCode(env === 'node' ? NODEONLY : BROWSERONLY)
  }

  applyVersion (version) {
    return replace({
      delimiters: ['<#', '#>'],
      REPLACE_VERSION: version
    })
  }

  walk (directory) {
    if (!directory) {
      return []
    }

    // Walk the directory without globbing
    let files = []

    fs.readdirSync(directory).forEach(dir => {
      if (fs.statSync(path.join(directory, dir)).isDirectory()) {
        files = files.concat(this.walk(path.join(directory, dir)))
      } else {
        files.push(path.join(directory, dir))
      }
    })

    return files
  }
}
