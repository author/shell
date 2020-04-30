import 'source-map-support/register.js'
import test from 'tape'
import { Command, Shell, Formatter } from '../../.node/index.js'

// test('Sanity Check - Shell', t => {
//   const shell = new Shell({
//     name: 'test'
//   })

//   t.ok(shell instanceof Shell, 'Basic shell instantiates correctly.')

//   t.end()
// })

// test('Sanity Check - Command', t => {
//   const mirror = new Command({
//     name: 'mirror',
//     description: 'Search metadoc for all the things.',
//     alias: 'search',
//     handler: (input, cb) => {
//       console.log(`Mirroring input: ${input}`)

//       cb && cb()
//     }
//   })

//   t.ok(mirror instanceof Command, 'Command initialized successfully.')

//   const CLI = new Shell({
//     name: 'test',
//     description: 'test',
//     commands: [
//       mirror,
//       {
//         name: 'test',
//         description: 'Test command which has no custom handler.'
//       }
//     ]
//   })

//   t.ok(CLI instanceof Shell, 'Shell initialized with commands successfully.')

//   CLI.exec('test').then(data => {
//     t.pass('Default handler fires.')
//     t.end()
//   }).catch(e => {
//     console.log(e)
//     t.fail(e.message)
//     t.end()
//   })
// })

// test('Output Formatting', t => {
//   const shell = new Shell({
//     name: 'test'
//   })

//   const cmd = new Command({
//     name: 'cmd',
//     alias: 'c',
//     flags: {
//       test: {
//         alias: 't',
//         description: 'test description'
//       },
//       more: {
//         aliases: ['m', 'mr'],
//         description: 'This is a longer description that should break onto more than one line, or perhaps even more than one extra line with especially poor grammar and spellling.'
//       },
//       none: {
//         description: 'Ignore me. I do not exist.'
//       }
//     }
//   })

//   shell.add(cmd)

//   const formatter = new Formatter(cmd)
//   formatter.width = 80

//   t.ok(formatter instanceof Formatter, 'Basic formatter instantiates correctly.')
//   console.log(formatter.help)
//   t.end()
// })

// test('Subcommand Config', t => {
//   const cfg = {
//     name: 'account',
//     description: 'Perform operations on a user account.',
//     handler (meta, cb) {
//       console.log('TODO: Output account details')
//     },
//     commands: [
//       {
//         name: 'create',
//         description: 'Create a user account.',
//         arguments: '<email>',
//         flags: {
//           name: {
//             alias: 'n',
//             description: 'Account display name'
//           },
//           phone: {
//             alias: 'p',
//             description: 'Account phone number'
//           },
//           avatar: {
//             alias: 'a',
//             description: 'Account avatar image URL'
//           }
//         },

//         handler (meta, cb) {
//           console.log(meta)
//         }
//       }
//     ]
//   }

//   const shell = new Shell({
//     name: 'test',
//     commands: [cfg]
//   })

//   shell.exec('account create')
//   t.pass('Configuring subcommands does not throw an error')
//   t.end()
// })

test('Default command help (regression test)', t => {
  const shell = new Shell({
    name: 'test',
    version: '1.0.0',
    disableHelp: true,
    // defaultHandler: () => console.log('yo'),
    commands: [
      {
        name: 'account',
        description: 'Perform operations on a user account.',
        handler: (meta, cb) => {
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
            }
            // handler: (meta, cb) => {
            //   // console.log(meta);
            // }
          }
        ]
      },
      {
        name: 'find',
        description: 'Search Metadoc for all the things.',
        alias: 'search',
        handler: (meta, cb) => {
        },
        flags: {
          maxresults: {
            type: 'string',
            single: true
          }
        }
      },
      {
        name: 'load',
        description: 'Load a metadoc.',
        handler: (meta, cb) => {
        }
      },
      {
        name: 'logout',
        alias: 'signout',
        handler: (meta, cb) => {
          console.log(meta)
          cb && cb()
        }
      }
    ]
  })

  shell.exec('account create --help')
  // console.log('---------')
  // shell.exec('blah')
  t.pass('ok')
  t.end()
})
