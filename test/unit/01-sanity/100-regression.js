import 'source-map-support/register.js'
import test from 'tape'
import { Shell } from '../../.node/index.js'

// The range error was caused by the underlying table library.
// When a default help message was generated, a negative column
// width (representing "infinite" width) was not being converted
// to the width of the content, causing a method to execute infinitely.
test('Extending shell creates RangeError for data attribute', t => {
  class CLIClient extends Shell {
    exec (input, cb) {
      console.log(input)
      super.exec(...arguments)
    }
  }

  const sh = new CLIClient({
    name: 'test',
    commands: [{
      name: 'cmd',
      handler () {}
    }]
  })

  t.ok(sh.data.name === 'test', 'Extended shell still provides underlying data.')
  t.end()
})
