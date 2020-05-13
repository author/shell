import 'source-map-support/register.js'
import test from 'tape'
import { Shell } from '../../.node/index.js'

test('Basic History', t => {
  const sh = new Shell({
    name: 'test',
    maxhistory: 3,
    commonflags: {
      universal: {
        alias: 'u',
        description: 'Grand master flash, err, flag.'
      }
    },
    commands: [{
      name: 'cmd',
      flags: {
        main: {
          alias: 'm',
          description: 'Main flag.'
        }
      },
      handler () { console.log('test') },
      commands: [{
        name: 'subcommand',
        description: 'This is a subcommand',
        flags: {
          flaga: {
            alias: 'a',
            description: 'The A team.'
          },
          flagb: {
            alias: 'b',
            description: 'The B team.',
            type: String
          },
          flagc: {
            alias: 'c',
            description: 'The C club.'
          }
        },
        handler () {}
      }, {
        name: 'extra',
        description: 'another cmd',
        handler () {},
        commands: [{
          name: 'more',
          description: 'nested commands',
          handler () {}
        }]
      }]
    }]
  })

  t.ok(typeof sh.hint('cmd ext') === 'object', 'Received a hint object for a valid partial command.')
  t.ok(sh.hint('xcmd ext') === null, 'Received a null value for an invalid partial command.')
  t.ok(typeof sh.hint('cmd') === 'object', 'Received a hint object for a valid full command.')
  t.ok(typeof sh.hint('c') === 'object', 'Received a hint object for a valid partial root command.')
  t.end()
})
