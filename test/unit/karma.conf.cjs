// Karma configuration
const fs = require('fs')
const config = JSON.parse(fs.readFileSync('../build/config.json'))
const pkg = JSON.parse(fs.readFileSync('../package.json'))
const BrowsersList = require('../../build/node_modules/browserslist')
// const babelify = require('babelify')

let local = !process.env.hasOwnProperty('CI')
if (process.env.hasOwnProperty('LOCAL')) {
  if (process.env.LOCAL.trim().toLowerCase() === 'false') {
    local = false
  }
}

if (process.env.hasOwnProperty('SAUCE_USERNAME') && process.env.hasOwnProperty('SAUCE_ACCESS_KEY')) {
  local = false
}

let browsers = {}
if (!local) {
  const opts = {}
  if (process.env.BROWSERSLIST_CONFIG) {
    opts.path = process.env.BROWSERSLIST_CONFIG
  }

  if (process.env.BROWSERSLIST_ENV) {
    opts.env = process.env.BROWSERSLIST_ENV
  }

  BrowsersList(null, opts)
    .forEach(item => {
      if (item.indexOf('-')) {
        let browser = item.split('-').shift().split(' ')
        let version = /([0-9]+\.?([0-9]+)?)/.exec(browser[1])

        if (version && browser[0].trim().toLowerCase() !== 'samsung') {
          let label = `sl_${browser[0]}_${browser[1]}`.toLowerCase()
          browsers[label] = {
            base: 'SauceLabs',
            browserName: browser[0],
            version: version[1]
          }

          if (browser[0].indexOf('_') > 0) {
            browser = browser[0].split('_')
            switch (browser[0].trim().toLowerCase()) {
              case 'ios':
                browsers[label].platformName = 'iOS'
                break

              case 'and':
              case 'android':
                browsers[label].platformName = 'Android'
                break
            }
            browser[0] = browser[1]
          }

          switch (browser[0].toLowerCase()) {
            case 'edge':
              browsers[label].browserName = 'MicrosoftEdge'
              if (browser[1] === '17') {
                browsers[label].version = '17.17134'
              }
              break
            case 'saf':
              browsers[label].browserName = 'Safari'
              break
            case 'chr':
              browsers[label].browserName = 'Chrome'
              break
            case 'uc':
              // Unsupported in SauceLabs
              delete browsers[label]
          }

          if (browsers[label] && !browsers[label].platformName) {
            browsers[label].platformName = 'macOS 10.14'
          }
        }
      }
    })
}

// console.log(browsers)
// process.exit(0)

for (const browser in browsers) {
  console.log(`Queued tests for ${browsers[browser].browserName} ${browsers[browser].version} on ${browsers[browser].platformName || 'default OS'}.`)
}

if (!local) {
  console.log('Testing remotely.')
}

module.exports = function (config) {
  config.set({
    // browserDisconnectTimeout: 10000,
    // browserDisconnectTolerance: 1,
    // browserNoActivityTimeout: 10000,
    processKillTimeout: 30000,

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'source-map-support', 'tap'],

    browserify: {
      debug: true
      // transform: babelify.configure({
      //   presets: ['@babel/preset-env']
      // })
    },

    // list of files / patterns to load in the browser
    files: [
      { pattern: '../.browser/*.js', included: true, served: true, type: 'module' },
      { pattern: '../.browser/*.js.map', included: false, served: true, type: 'js' },
      '../.testsuite/browser-test.js'
      // { pattern: '.testsuite/*.js', included: true, nocache: true }
    ],

    // list of files to exclude
    exclude: [
      '../.browser/*-global.*',
      '../.browser/*-es*.*'
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '../.browser/*.min.js': ['sourcemap'],
      '../.testsuite/browser-test.js': ['browserify']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['tap-pretty', 'saucelabs'],

    tapReporter: {
      prettify: require('tap-spec'), // default 'standard TAP' output
      separator: '****************************'
    },
    // specReporter: {
    //   maxLogLines: 15, // limit number of lines logged per test
    //   suppressErrorSummary: false, // do not print error summary
    //   suppressFailed: false, // do not print information about failed tests
    //   suppressPassed: false, // do not print information about passed tests
    //   suppressSkipped: true, // do not print information about skipped tests
    //   showSpecTiming: false, // print the time elapsed for each spec
    //   failFast: true
    // },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_ERROR,

    // enable / disable watching file and executing tests whenever any file changes
    // autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: local ? ['Chrome'] : Object.keys(browsers),
    customLaunchers: local ? null : browsers,

    sauceLabs: {
      testName: pkg.name
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    // autoWatch: true,

    // Concurrency level
    // how many browser should be started simultanous
    concurrency: 1
    // concurrency: Infinity
  })
}
