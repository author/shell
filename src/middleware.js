const last = a => a[a.length - 1]
const reduce = a => a.slice(0, -1)

export default class Middleware {
  constructor () { Object.defineProperty(this, '_data', { enumerable: false, value: [] }) }

  get size () { return this._data.length }

  get data () { return this._data }

  use (method) {
    const methodBody = method.toString()
    if (methodBody.indexOf('[native code]') < 0) {
      this._data.push(methodBody)
    }

    this.run = ((stack) => (...args) => stack(...reduce(args), () => {
      const next = last(args)
      method.apply(this, [...reduce(args), next.bind.apply(next, [null, ...reduce(args)])])
    }))(this.run)
  }

  run (...args) {
    last(args).apply(this, reduce(args))
  }
}
