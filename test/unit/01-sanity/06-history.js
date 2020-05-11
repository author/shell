import 'source-map-support/register.js'
import test from 'tape'
import { Shell } from '../../.node/index.js'

test('Basic History', t => {
  const sh = new Shell({
    name: 'test',
    maxhistory: 3,
    commands: [{
      name: 'cmd',
      handler () { }
    }]
  })

  sh.exec('cmd a')
  sh.exec('cmd b')
  sh.exec('cmd c')

  t.ok(sh.history().length === 3, `Received a history of 3 items. Recognized ${sh.history().length}`)

  sh.exec('cmd d')
  t.ok(sh.history().length === 3 &&
    sh.history()[0].input === 'cmd d' &&
    sh.history()[2].input === 'cmd b',
    `Received a history of 3 items, respecting maximum history levels. Recognized ${sh.history().length}`
  )

  let c = sh.priorCommand()
  t.ok(c === 'cmd d', `Recognized prior command (cmd d). Returned ${c}`)
  c = sh.nextCommand()
  t.ok(c === undefined, 'Next command returns undefined when it does not exist.')
  c = sh.priorCommand(1)
  t.ok(c === 'cmd c', `Recognized 2 prior commands (cmd b). Returned ${c}`)
  c = sh.nextCommand()
  t.ok(c === 'cmd d', 'Next command returns proper command when it exists.' + `cmd d = ${c}`)

  t.end()
})
