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
        t.ok(meta.data.file[0] === 'a.js', 'First value is correct')
        t.ok(meta.data.file[1] === 'b.js', 'Second value is correct')
        t.ok(meta.data.file.length === 2, 'Only two unique flag values provided.')
        t.end()
      }
    }]
  })

  sh.exec('run -f a.js -f b.js').catch(t.fail)
})
