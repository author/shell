import test from 'tappedout'
import { Shell } from '@author.io/shell'

// The range error was caused by the underlying table library.
// When a default help message was generated, a negative column
// width (representing "infinite" width) was not being converted
// to the width of the content, causing a method to execute infinitely.
test('Extending shell creates RangeError for data attribute', t => {
  class CLIClient extends Shell {
    exec (input, cb) {
      console.log(input)
      super.exec(...arguments)
    }
  }

  const sh = new CLIClient({
    name: 'test',
    commands: [{
      name: 'cmd',
      handler () {}
    }]
  })

  t.ok(sh.data.name === 'test', 'Extended shell still provides underlying data.')
  t.end()
})

test('Metadata duplication of flag values when multiple values are allowed', t => {
  const sh = new Shell({
    name: 'dev',
    version: '1.0.0',
    description: 'Control the manual test suite.',

    commands: [{
      name: 'run',
      description: 'Run a specific test. Runs all known test files if no file is specified with a flag.',
      flags: {
        file: {
          alias: 'f',
          description: 'The file to load/execute.',
          allowMultipleValues: true
        }
      },
      handler (meta) {
        t.expect('a.js', meta.data.file[0], 'First value is correct')
        t.expect('b.js', meta.data.file[1], 'Second value is correct')
        t.expect(2, meta.data.file.length, 'Only two unique flag values provided.')
        t.end()
      }
    }]
  })

  sh.exec('run -f a.js -f b.js').catch(t.fail)
})

test('Properly parsing input values with spaces', t => {
  const sh = new Shell({
    name: 'test',
    commands: [{
      name: 'run',
      flags: {
        connection: {
          alias: 'c'
        }
      },
      handler(meta) {
        t.expect('a connection', meta.data.connection, 'Support flag values with spaces')
        t.end()
      }
    }]
  })

  sh.exec('run -c "a connection"').catch(t.fail)
})
