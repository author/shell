import fs from 'fs'
import path from 'path'
import stripCode from 'rollup-plugin-strip-code'
import replace from 'rollup-plugin-replace'

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
    this.fullname = pkg.name
    this.manifest = null
  }

  get name () {
    if (this.pkg.name) {
      return this.pkg.name.split('/').pop()
    }

    return 'unknown'
  }

  get version () {
    return this.pkg.version || '0.0.1'
  }

  get pkg () {
    if (this.manifest === null) {
      this.pkg = path.resolve('../package.json')
    }

    return this.manifest
  }

  set pkg (pkgpath) {
    let file = path.resolve(pkgpath)
    let content = fs.readFileSync(file).toString()
    this.manifest = JSON.parse(content)
  }

  get version () {
    return pkg.version
  }

  get NODEONLY () {
    return NODEONLY
  }

  get BROWSERONLY () {
    return BROWSERONLY
  }

  get homepage () {
    const pkg = this.pkg

    if (pkg.homepage) {
      return pkg.homepage
    }

    if (pkg.repository) {
      if (pkg.repository.url) {
        return pkg.repository.url
      } else {
        let match = /([\S]+):([\S]+)[\/\\]([\S]+)/i.exec(git.repository)
        if (match !== null && match.length > 3) {
          return `https://${match[1]}.com/${match[2]}/${match[3]}`
        }
      }
    }

    if (pkg.bugs) {
      return pkg.bugs
    }

    if (pkg.author && pkg.author.url) {
      return pkg.author.url
    }

    return `https://npmjs.com/package/${pkg.name}`
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
    version = version || this.pkg.version

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

  isUnnecessaryBuild (input, output) {
    if (!input || !fs.existsSync(input) || !fs.existsSync(output)) {
      return false
    }

    // a. Check the timestamp of the last build file and determine if it is outdated.
    const lastbuildtime = fs.statSync(output).mtime.getTime()

    // b. Check all source files for last modification dates
    const updatedfiles = this.walk(path.dirname(input)).filter(filepath => {
      return fs.statSync(path.resolve(filepath)).mtime.getTime() > lastbuildtime
    })

    if (fs.statSync(__filename).mtime.getTime() > lastbuildtime) {
      console.log('Build is unnecessary (no changes since last build).')
      return true
    }

    return false
  }
}
