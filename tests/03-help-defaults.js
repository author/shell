import test from 'tappedout'
import { Shell, Middleware } from '@author.io/shell'

// import fs from 'fs'

let msg = ''
const cfg = () => {
  return {
    name: 'mycli',
    description: 'My command line.',
    commands: [{
      name: 'a',
      description: 'A fine letter.',
      handler () { },
      commands: [{
        name: 'b',
        description: 'Beautiful commands.',
        handler () { },
        commands: [{
          name: 'c',
          description: 'Choices are great.',
          handler (meta) {
            msg = meta.command.help
            // msg = meta.help.message
          }
        }]
      }]
    }]
  }
}

test('Request help via flag', t => {
  const c = cfg()
  const shell = new Shell(c)

  shell.exec('a b c --help')
    .then(r => {
      // fs.writeFileSync('./test.txt', Buffer.from(msg))
      t.ok(shell.getCommand('a b c').help === `mycli a b c

  Choices are great.`, 'Displayed correct default help message')
    })
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Default help when no handler exists', t => {
  const c = cfg()
  delete c.commands[0].commands[0].commands[0].handler
  const shell = new Shell(c)

  shell.exec('a b c')
    .then(r => {
      t.ok(shell.getCommand('a b c').help === `mycli a b c

  Choices are great.`, 'Displayed correct default help message when no handler exists')
    })
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Display custom help when defined', t => {
  const c = cfg()
  c.commands[0].commands[0].commands[0].help = () => 'custom help is awesome'
  const shell = new Shell(c)

  shell.exec('a b c')
    .then(r => {
      t.ok(msg === 'custom help is awesome', 'Displayed custom help message')
    })
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Disabled help', t => {
  const c = cfg()
  c.disableHelp = true
  const shell = new Shell(c)

  shell.exec('a b c --help')
    .then(r => {
      // fs.writeFileSync('./test.txt', Buffer.from(msg))
      t.ok(shell.getCommand('a b c').help.trim() === '', `Expected no help message. Received "${msg}"`)
    })
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})

test('Display custom help when defined', t => {
  const c = cfg()
  const shell = new Shell(c)

  shell.exec('--help')
    .then(r => {
      t.pass('Passing --help directly to shell does not fail.')
    })
    .catch(e => t.fail(e.message))
    .finally(() => t.end())
})
