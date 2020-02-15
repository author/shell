const last = a => a[a.length - 1]
const reduce = a => a.slice(0, -1)

export default class Middleware {
  constructor () { this.size = 0 }

  use (method) {
    this.size++
    this.run = ((stack) => (...args) => stack(...reduce(args), () => {
      const next = last(args)
      method.apply(this, [...reduce(args), next.bind.apply(next, [null, ...reduce(args)])])
    }))(this.run)
  }

  run (...args) {
    last(args).apply(this, reduce(args))
  }
}
