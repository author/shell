// import 'source-map-support/register.js'
import test from 'tape'
import Command from '../command.js'
import Shell from '../shell.js'

test('Sanity Check', t => {
  const mirror = new Command({
    name: 'mirror',
    description: 'Search metadoc for all the things.',
    alias: 'search',
    handler: (input, cb) => {
      console.log(`Mirroring input: ${input}`)

      cb && cb()
    }
  })

  t.ok(mirror instanceof Command, 'Command initialized successfully.')

  const CLI = new Shell({
    name: 'test',
    description: 'test',
    commands: [
      mirror,
      {
        name: 'find',
        description: 'Search metadoc for all the things.',
        alias: 'search',
        flags: {
          x: {
            type: 'string',
            required: true
          }
        },
        handler (data, cb) {
          console.log(data)
          console.log(`Mirroring input: ${data.input}`)

          cb && cb()
        }
        // Subcommands are supported
        // , commands: [...]
      }
    ]
  })

  t.ok(CLI instanceof Shell, 'Shell initialized successfully.')
  t.end()
})
