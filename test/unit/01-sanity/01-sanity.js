import 'source-map-support/register.js'
import test from 'tape'
import { Command, Shell } from '../../.node/index.js'

test('Sanity Check - Shell', t => {
  const shell = new Shell({
    name: 'test'
  })

  t.ok(shell instanceof Shell, 'Basic shell instantiates correctly.')

  t.end()
})

test('Sanity Check - Command', t => {
  const mirror = new Command({
    name: 'mirror',
    description: 'Search metadoc for all the things.',
    alias: 'search',
    handler: (input, cb) => {
      console.log(`Mirroring input: ${input}`)

      cb && cb()
    }
  })
  console.log('>>', mirror.xdata)
  t.ok(mirror instanceof Command, 'Command initialized successfully.')

  const CLI = new Shell({
    name: 'test',
    description: 'test',
    commands: [
      mirror,
      {
        name: 'test',
        description: 'Test command which has no custom handler.'
      }
    ]
  })

  t.ok(CLI instanceof Shell, 'Shell initialized with commands successfully.')

  CLI.exec('test').then(data => {
    t.pass('Default handler fires.')
    t.end()
  }).catch(e => t.fail(e.message))
})
