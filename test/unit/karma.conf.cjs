// Karma configuration
const fs = require('fs')
const config = JSON.parse(fs.readFileSync('../build/config.json'))
const pkg = JSON.parse(fs.readFileSync('../package.json'))
// const babelify = require('babelify')

module.exports = function (config) {
  config.set({
    // browserDisconnectTimeout: 120000,
    // browserDisconnectTolerance: 10,
    // browserNoActivityTimeout: 120000,

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
    reporters: ['tap-pretty'],

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
    browsers: ['Chrome'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    // autoWatch: true,

    // Concurrency level
    // how many browser should be started simultanous
    concurrency: Infinity
  })
}
