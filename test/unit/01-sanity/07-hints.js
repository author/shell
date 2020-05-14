import 'source-map-support/register.js'
import test from 'tape'
import { Shell } from '../../.node/index.js'

test('Basic Hinting', t => {
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
  t.ok(
    typeof sh.hint('cm') === 'object' &&
    sh.hint('cm').commands[0].name === 'cmd' &&
    sh.hint('cm').commands[0].match[0] === 0 &&
    sh.hint('cm').commands[0].match[1] === 1,
    'Received a hint object for a valid partial root command.')
  t.end()
})

test('Single Command Hints', t => {
  const clib = new Shell({
    name: 'admin',
    version: '1.0.1',

    commands: [{
      name: 'info',
      description: 'info',
      handler () { }
    }]
  })

  console.log(clib.hint('i'))
  t.pass('ok')
  t.end()
})
