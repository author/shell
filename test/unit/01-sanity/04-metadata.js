import 'source-map-support/register.js'
import test from 'tape'
import { Shell } from '../../.node/index.js'

test('Map unnamed argument', t => {
  const shell = new Shell({
    name: 'account',
    commands: [{
      name: 'create',
      arguments: 'email',
      handler (meta) {
        t.ok(meta.data.hasOwnProperty('email'), 'Automapped data exists.')
        t.ok(meta.data.email === 'me@domain.com', `Attribute named email expected a value of "me@domain.com". Received "${meta.data.email}".`)
      }
    }]
  })

  shell.exec('create me@domain.com')
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Map unnamed arguments', t => {
  const shell = new Shell({
    name: 'account',
    commands: [{
      name: 'create',
      arguments: 'email displayName',
      handler (meta) {
        t.ok(meta.data.hasOwnProperty('email'), 'Automapped email data exists.')
        t.ok(meta.data.email === 'me@domain.com', `Attribute named email expected a value of "me@domain.com". Received "${meta.data.email}".`)
        t.ok(meta.data.hasOwnProperty('displayName'), 'Automapped displayName data exists.')
        t.ok(meta.data.displayName === 'John Doe', `Attribute named displayName expected a value of "John Doe". Received "${meta.data.displayName}".`)
      }
    }]
  })

  shell.exec('create me@domain.com "John Doe"')
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Map extra unnamed arguments as unknown', t => {
  const shell = new Shell({
    name: 'account',
    commands: [{
      name: 'create',
      arguments: 'email displayName',
      handler (meta) {
        t.ok(meta.data.hasOwnProperty('email'), 'Automapped email data exists.')
        t.ok(meta.data.email === 'me@domain.com', `Attribute named email expected a value of "me@domain.com". Received "${meta.data.email}".`)
        t.ok(meta.data.hasOwnProperty('displayName'), 'Automapped displayName data exists.')
        t.ok(meta.data.displayName === 'John Doe', `Attribute named displayName expected a value of "John Doe". Received "${meta.data.displayName}".`)
        t.ok(meta.data.hasOwnProperty('unknown1'), 'Automapped unknown property to generic name.')
        t.ok(meta.data.unknown1 === 'test1', `Unknown attribute expected a value of "test1". Received "${meta.data.unknown1}".`)
        t.ok(meta.data.hasOwnProperty('unknown2'), 'Automapped extra unknown property to generic name.')
        t.ok(meta.data.unknown2 === 'test2', `Extra unknown attribute expected a value of "test2". Received "${meta.data.unknown2}".`)
      }
    }]
  })

  shell.exec('create me@domain.com "John Doe" test1 test2')
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Map unnamed/unsupplied arguments as undefined', t => {
  const shell = new Shell({
    name: 'account',
    commands: [{
      name: 'create',
      arguments: 'email displayName',
      handler (meta) {
        t.ok(meta.data.hasOwnProperty('email'), 'Automapped email data exists.')
        t.ok(meta.data.email === 'me@domain.com', `Attribute named email expected a value of "me@domain.com". Received "${meta.data.email}".`)
        t.ok(meta.data.hasOwnProperty('displayName'), 'Automapped displayName attribute exists.')
        t.ok(meta.data.displayName === undefined, `Attribute named displayName expected a value of "undefined". Received "${meta.data.displayName}".`)
      }
    }]
  })

  shell.exec('create me@domain.com')
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Map unnamed arguments when duplicate names are supplied', t => {
  const shell = new Shell({
    name: 'account',
    commands: [{
      name: 'create',
      flags: {
        email: {
          alias: 'e'
        }
      },
      arguments: 'email displayName',
      handler (meta) {
        t.ok(meta.data.hasOwnProperty('email'), 'Automapped email data exists.')
        t.ok(Array.isArray(meta.data.email) && meta.data.email[1] === 'me@domain.com' && meta.data.email[0] === 'bob@other.com', `Attribute named email expected a value of "['me@domain.com', 'bob@other.com']". Received "[${meta.data.email.map(i => '\'' + i + '\'').reverse().join(', ')}]".`)
        t.ok(meta.data.displayName === undefined, `Attribute named displayName expected a value of "undefined". Received "${meta.data.displayName}".`)
      }
    }]
  })

  shell.exec('create me@domain.com -e bob@other.com')
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})
