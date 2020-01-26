#!/usr/bin/env node --experimental-modules
import fs from 'fs'
import path from 'path'
import Args from '@author.io/arg'
import standard from 'standard'

// Configure argument parser
Args.configure({
  source: {
    default: path.join(process.cwd(), '../unit/**/*.js')
  },
  config: {
    default: path.join(process.cwd(), '../package.json')
  },
  parser: {
    default: ''
  },
  verbose: {
    default: false
  }
})

Args.enforceRules()

// Normalize the source path and identify which linter to use
let scanpath = Args.value('source')
let scanFile = false

if (scanpath.indexOf('*') === -1) {
  const stat = fs.statSync(scanpath)
  if (stat.isDirectory()) {
    scanpath = path.join(scanpath, '../unit/**/*.js')
  } else if (!stat.isFile) {
    throw new Error(`Cannot find or process "${scanpath}"`)
  } else {
    scanFile = true
  }
}

const pkg = JSON.parse(fs.readFileSync(Args.value('config')).toString())
const opts = {
  cwd: path.resolve(Args.value('source')),
  ignore: (pkg.standard ? pkg.standard.ignore : []) || [], // file globs to ignore (has sane defaults)
  globals: (pkg.standard ? pkg.standard.globals : []) || [], // global variables to declare
  // plugins: (pkg.standard ? pkg.standard.plugins : []) || [], // eslint plugins
  parser: Args.value('parser')
}

// Custom standardjs output
const output = (err, result) => {
  if (err) {
    process.stderr.write(err)
  }

  if (result) {
    if (!result.errorCount && !result.warningCount) {
      process.exitCode = 0
      return
    }

    // Are any fixable rules present?
    var isFixable = result.results.some(function (result) {
      return result.messages.some(function (message) {
        return !!message.fix
      })
    })

    if (isFixable) {
      console.error(
        '%s: %s',
        opts.cmd,
        'Run `' + opts.cmd + ' --fix` to automatically fix some problems.'
      )
    }

    result.results.forEach(function (result) {
      result.messages.forEach(function (message) {
        console.log(
          '  %s:%d:%d: %s%s',
          result.filePath, message.line || 0, message.column || 0, message.message,
          Args.value('verbose') ? ' (' + message.ruleId + ')' : ''
        )
      })
    })

    process.exitCode = result.errorCount ? 1 : 0
  }
}

if (scanFile) {
  standard.lintText(fs.readFileSync(scanpath).toString(), opts, output)
} else {
  standard.lintFiles(scanpath, opts, output)
}
