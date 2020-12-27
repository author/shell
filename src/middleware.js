export default class Middleware {
  constructor () {
    Object.defineProperties(this, {
      _data: { enumerable: false, configurable: false, value: [] },
      go: { enumerable: false, configurable: false, writable: true, value: (...args) => { args.pop().apply(this, args) } }
    })
  }

  get size () { return this._data.length }

  get data () { return this._data }

  use (method) {
    const methodBody = method.toString()
    if (methodBody.indexOf('[native code]') < 0) {
      this._data.push(methodBody)
    }

    this.go = (stack => (...args) => {
      const next = args.pop()
      stack(...args, () => {
        method.apply(this, [...args, next.bind(null, ...args)])
      })
    })(this.go)
  }

  run () {
    const args = Array.from(arguments)
    if (args.length === 0 || typeof args[args.length - 1] !== 'function') {
      args.push(() => {})
    }

    this.go(...args)
  }
}
