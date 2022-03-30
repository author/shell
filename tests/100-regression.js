import test from 'tappedout'
import { Shell, Command } from '@author.io/shell'

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

test('Recognize flags with quotes', t => {
  const input = 'run --connection "a connection" --save'
  const sh = new Shell({
    name: 'test',
    commands: [{
      name: 'run',
      flags: {
        connection: {
          alias: 'c',
          description: 'connection string',
          type: 'string'
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

test('Accept arrays with values containing spaces', t => {
  const input = 'run --connection "a connection" --save'
  const sh = new Shell({
    name: 'test',
    commands: [{
      name: 'run',
      flags: {
        connection: {
          alias: 'c',
          description: 'connection string',
          type: 'string'
        }
      },
      handler(meta) {
        t.expect('a connection', meta.data.connection, 'Support flag values with spaces')
        t.end()
      }
    }]
  })

  const argv = ["run", "-c", "a connection", "--save"]
  sh.exec(argv).catch(t.fail)
})

test('Exec method should return promise value', async t => {
  const sh = new Shell({
    name: 'test',
    commands: [{
      name: 'run',
      async handler(meta) {
        return meta.input
      }
    }]
  })

  const argv = ['run', 'example']
  const result = await sh.exec(argv).catch(t.fail)

  t.expect(result, 'example', 'returns command promise results')
  t.end()
})

test('Exec method should return callback value', async t => {
  const sh = new Shell({
    name: 'test',
    commands: [{
      name: 'run',
      async handler(meta) {
        return meta.input
      }
    }]
  })

  const argv = ['run', 'other']
  sh.exec(argv, data => {
    t.expect(data, 'other', 'returns command callback results')
    t.end()
  })
})

test('Shell level middleware should execeute before command level middleware', t => {
  let status = []
  const cmd = new Command({
    name: 'run',
    async handler(meta) {
      return meta.input
    }
  })

  cmd.use(async function(meta, next) {
    status.push('2')
    next()
  })

  const sh = new Shell({
    name: 'test',
    use: [
      (meta, next) => {
        status.push('1')
        next()
      }
    ],
    commands: [cmd]
  })

  sh.exec(['run', 'other'], data => {
    t.expect(2, status.length, 'corrent number of middleware functions executed')
    t.expect('1,2', status.join(','), 'middleware runs in correct order')
    t.end()
  })
})
