import 'source-map-support/register.js'
import test from 'tape'
import { Command, Shell, Formatter } from '../../.node/index.js'
// import fs from 'fs'
// import path from 'path'

test('Sanity Check - Shell', t => {
  const shell = new Shell({
    name: 'test'
  })

  t.ok(shell instanceof Shell, 'Basic shell instantiates correctly.')
  t.ok(Object.getOwnPropertySymbols(globalThis).filter(s => globalThis[s] instanceof Shell).length === 1, 'The shell is discoverable.')
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
  }).catch(e => {
    t.fail(e.message)
    t.end()
  })
})

test('Output Formatting', t => {
  const shell = new Shell({
    name: 'test'
  })

  const cmd = new Command({
    name: 'cmd',
    alias: 'c',
    flags: {
      test: {
        alias: 't',
        description: 'test description'
      },
      more: {
        aliases: ['m', 'mr'],
        description: 'This is a longer description that should break onto more than one line, or perhaps even more than one extra line with especially poor grammar and spellling.'
      },
      none: {
        description: 'Ignore me. I do not exist.'
      }
    }
  })

  shell.add(cmd)

  const formatter = new Formatter(cmd)
  formatter.width = 80

  t.ok(formatter instanceof Formatter, 'Basic formatter instantiates correctly.')
  // fs.writeFileSync('./test.txt', Buffer.from(formatter.help))
  // console.log(formatter.help)
  t.ok(formatter.help === `test cmd|c [FLAGS]

Flags:

  --test      [-t]            test description                                   
  --more      [-m, -mr]       This is a longer description that should break onto
                              more than one line, or perhaps even more than one  
                              extra line with especially poor grammar and        
                              spellling.                                         
  --none                      Ignore me. I do not exist.                         `, 'Correctly generated default help message.')
  t.end()
})

test('Subcommand Config', t => {
  let ok = false
  const cfg = {
    name: 'account',
    description: 'Perform operations on a user account.',
    handler (meta, cb) {
      console.log('TODO: Output account details')
    },
    commands: [
      {
        name: 'create',
        description: 'Create a user account.',
        arguments: '<email>',
        flags: {
          name: {
            alias: 'n',
            description: 'Account display name'
          },
          phone: {
            alias: 'p',
            description: 'Account phone number'
          },
          avatar: {
            alias: 'a',
            description: 'Account avatar image URL'
          }
        },

        handler (meta, cb) {
          ok = true
        }
      }
    ]
  }

  const shell = new Shell({
    name: 'test',
    commands: [cfg]
  })

  shell.exec('account create').then(r => {
    t.ok(ok, 'Configuring subcommands does not throw an error')
  }).catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Default command help (regression test)', t => {
  const shell = new Shell({
    name: 'test',
    version: '1.0.0',
    disableHelp: true,
    commands: [
      {
        name: 'account',
        description: 'Perform operations on a user account.',
        handler: (meta, cb) => {},
        commands: [
          {
            name: 'create',
            description: 'Create a user account.',
            arguments: '<email>'
          }
        ]
      }
    ]
  })

  shell.exec('account')

  t.pass('Ran without error.')
  t.end()
})

test('Basic Introspection', t => {
  const shell = new Shell({
    name: 'test',
    version: '1.0.0',
    disableHelp: true,
    commands: [
      {
        name: 'account',
        description: 'Perform operations on a user account.',
        handler: (meta, cb) => { },
        commands: [
          {
            name: 'create',
            description: 'Create a user account.',
            arguments: '<email>'
          }
        ]
      }
    ]
  })

  t.ok(typeof shell.data === 'object', 'Generates a data object representing the shell.')
  t.end()
})

test('Flag Default Configuration', t => {
  const cmd = new Command({
    name: 'cmd',
    alias: 'c',
    flags: {
      test: {
        alias: 't',
        description: 'test description'
      },
      more: {
        aliases: ['m', 'mr'],
        description: 'This is a longer description that should break onto more than one line, or perhaps even more than one extra line with especially poor grammar and spellling.'
      },
      none: {
        description: 'Ignore me. I do not exist.'
      }
    }
  })

  let f = cmd.getFlagConfiguration('test')
  t.ok(
    f.aliases[0] === 't' &&
    f.description === 'test description' &&
    f.required === false &&
    f.type === 'string' &&
    f.options === null,
    'Returned default configuration items for a named flag.'
  )

  f = cmd.getFlagConfiguration('t')
  t.ok(
    f.aliases[0] === 't' &&
    f.description === 'test description' &&
    f.required === false &&
    f.type === 'string' &&
    f.options === null,
    'Returned default configuration items for an alias of a flag.'
  )

  t.end()
})
