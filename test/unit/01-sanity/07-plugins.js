import 'source-map-support/register.js'
import test from 'tape'
import { Shell } from '../../.node/index.js'

test('Basic Plugins', t => {
  const sh = new Shell({
    name: 'test',
    plugins: {
      test: (value) => {
        return value += 1
      }
    },
    commands: [{
      name: 'cmd',
      handler (meta) {
        t.ok(typeof meta.plugins === 'object', `meta.plugins should be an object. Recognized as ${typeof meta.plugins}.`)
        t.ok(typeof meta.plugins.test === 'function', `Expected test plugin to be a function, recognized ${typeof meta.plugins.test}.`)
        t.ok(meta.plugins.test(1) === 2, 'Plugin executes properly.')

        t.end()
      }
    }]
  })

  sh.exec('cmd').catch(t.fail)
})

test('Inherited Plugins', t => {
  const sh = new Shell({
    name: 'test',
    plugins: {
      test: (value) => {
        return value += 1
      }
    },
    commands: [{
      name: 'cmd',
      plugins: {
        ten: 10
      },
      handler(meta) {
        t.ok(typeof meta.plugins === 'object', `meta.plugins should be an object. Recognized as ${typeof meta.plugins}.`)
        t.ok(typeof meta.plugins.ten === 'number', `Expected test plugin to be a number, recognized ${typeof meta.plugins.ten}.`)
        t.ok(meta.plugins.test(1) === 2, 'Shell plugin (global) executes properly.')

        t.end()
      }
    }]
  })

  sh.exec('cmd').catch(t.fail)
})

test('Overriding Plugins', t => {
  const sh = new Shell({
    name: 'test',
    plugins: {
      test: (value) => {
        return value += 1
      }
    },
    commands: [{
      name: 'cmd',
      plugins: {
        test: (value) => {
          return value += 10
        }
      },
      handler(meta) {
        t.ok(meta.plugins.test(1) === 11, 'Overridden shell plugin (global) executes properly.')
        t.ok(meta.shell.plugins.test(1) === 2, 'Original shell plugin (overridden) executes properly when executed from shell.')
        t.end()
      }
    }]
  })

  sh.exec('cmd').catch(t.fail)
})

test('Overriding Plugins', t => {
  const sh = new Shell({
    name: 'test',
    plugins: {
      test: (value) => {
        return value += 1
      }
    },
    commands: [{
      name: 'cmd',
      plugins: {
        test: (value) => {
          return value += 10
        }
      },
      commands: [{
        name: 'sub',
        plugins: {
          test: (value) => {
            return value += 100
          }
        },
        handler(meta) {
          t.ok(meta.plugins.test(1) === 101, 'Overridden command plugin executes properly.')
          t.ok(meta.command.parent.plugins.test(1) === 11, 'Original parent command plugin executes properly.')
          t.ok(meta.shell.plugins.test(1) === 2, 'Original shell plugin (overridden) executes properly when executed from shell.')
          t.end()
        }
      }]
    }]
  })

  sh.exec('cmd sub').catch(t.fail)
})
