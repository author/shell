import 'source-map-support/register.js'
import test from 'tape'
import { Shell, Middleware } from '../../.node/index.js'

test('Sync Middleware', t => {
  const mw = new Middleware()

  mw.use((m, next) => { count++; next() })
  mw.use((m, next) => { count++; next() })
  mw.use((m, next) => { count++; next() })

  let count = 0
  mw.run({ test: true }, () => {
    t.ok(count === 3, `Ran 3 middleware operations. Recognized ${count}.`)
    t.end()
  })
})

test('Async Middleware w/ Final Method', t => {
  const mw = new Middleware()

  mw.use((m, next) => { count++; next() })
  mw.use((m, next) => setTimeout(() => { count++; next() }, 10))
  mw.use((m, next) => { count++; next() })

  let count = 0
  mw.run({ test: true }, () => {
    count++
    t.ok(count === mw.size + 1, `Ran ${mw.size + 1} total middleware operations (w/ final op) with one async operation. Recognized ${count}.`)
    t.end()
  })
})

test('Async Middleware w/o Final Method', t => {
  const mw = new Middleware()

  mw.use(next => { count++; next() })
  mw.use(next => {
    setTimeout(() => { count++; next() }, 10)
  })
  mw.use(next => { count++; next() })

  let count = 0

  mw.run()
  setTimeout(() => {
    t.ok(count === mw.size, `Ran ${mw.size} total middleware operations (w/o final op) with one async operation. Recognized ${count}.`)
    t.end()
  }, 300)
})

test('Basic Shell & Command Middleware', t => {
  let ok = false

  const shell = new Shell({
    name: 'test',
    commands: [{
      name: 'a',
      handler () {},
      commands: [{
        name: 'b',
        use: [(meta, next) => { count++; next() }],
        handler () {},
        commands: [{
          name: 'c',
          handler () {
            ok = true
          }
        }]
      }]
    }]
  })

  shell.use((meta, next) => { count++; next() })

  let count = 0
  shell.exec('a b c')

  t.ok(count === 2, `Expected 2 middleware operations to run. Recognized ${count}.`)
  t.ok(ok, 'Handler executes at the end.')
  t.end()
})

test('Command Specific Middleware', t => {
  let ok = false

  const shell = new Shell({
    name: 'test',
    commands: [{
      name: 'a',
      handler () { },
      commands: [{
        name: 'b',
        use: [(meta, next) => { count++; next() }],
        handler () { },
        commands: [{
          name: 'c',
          handler () {
            ok = true
          }
        }]
      }]
    }]
  })

  shell.useWith(['a b'], (meta, next) => { count++; next() })

  let count = 0
  shell.exec('a b c').then(r => {
    t.ok(count === 2, `Expected 2 middleware operations to run. Recognized ${count}.`)
    t.ok(ok, 'Handler executes at the end.')
    t.end()
  })
})

test('Basic Trailers', t => {
  let ok = false
  let after = 0

  const shell = new Shell({
    name: 'test',
    commands: [{
      name: 'a',
      handler () { },
      commands: [{
        name: 'b',
        use: [(meta, next) => { next() }],
        handler () { },
        commands: [{
          name: 'c',
          handler () {
            ok = true
          },
          trailer: [
            (meta, next) => { after++; next() },
            meta => {
              t.ok(after === 1, `Expected 1 trailer to run. Recognized ${after}.`)
              t.pass('Ran trailer.')
              t.end()
            }
          ]
        }]
      }]
    }]
  })

  shell.exec('a b c')
})

// test('Regression Test: Middleware Duplication', t => {
//   let count = 0

//   const shell = new Shell({
//     name: 'Metadoc CLI',
//     version: '1.0.0',
//     use: [
//       (meta, next) => {
//         console.log('A')
//         count++
//         next()
//       }
//     ],
//     commands: [
//       {
//         name: 'account',
//         description: 'Perform operations on a user account.',
//         handler: (meta, cb) => { },
//         commands: [
//           {
//             name: 'create',
//             description: 'Create a user account.',
//             arguments: '<email>',
//             use: [(d, next) => {
//               console.log('C')
//               count++
//               next()
//             }],
//             commands: [
//               {
//                 name: 'bleh',
//                 handler () { },
//                 commands: [{
//                   name: 'more',
//                   handler (meta) { }
//                 }]
//               }
//             ],
//             handler: (meta, cb) => { }
//           }
//         ]
//       }
//     ]
//   })

//   shell.use((meta, next) => {
//     setTimeout(() => {
//       console.log('B')
//       count++
//       next()
//     }, 10)
//   })

//   shell.exec('account create bleh').then(r => {
//     setTimeout(() => {
//       t.ok(count === 3, `Ran each middleware operation once. Expected 3 operations, recognized ${count}.`)
//     }, 300)
//   }).catch(e => t.fail(e.message))
//     .finally(() => t.end())
// })
