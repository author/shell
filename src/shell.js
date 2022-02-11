import Command from './command.js'
import Base from './base.js'
import { COMMAND_PATTERN } from './utility.js'

export default class Shell extends Base {
  #middlewareGroups = new Map()
  #history = []
  #maxHistoryItems
  #version
  #cursor = 0
  #tabWidth
  #runtime = globalThis.hasOwnProperty('window') // eslint-disable-line no-prototype-builtins
    ? 'browser'
    : (
      globalThis.hasOwnProperty('process') && // eslint-disable-line no-prototype-builtins
      globalThis.process.release &&
      globalThis.process.release.name
        ? globalThis.process.release.name
        : 'unknown'
    )

  constructor (cfg = { maxhistory: 100 }) {
    super(cfg)

    this.initializeHelpAnnotations(cfg)

    this.__commonflags = cfg.commonflags || {}

    if (cfg.hasOwnProperty('use') && Array.isArray(cfg.use)) { // eslint-disable-line no-prototype-builtins
      cfg.use.forEach(code => this.initializeMiddleware(code))
    }

    if (cfg.hasOwnProperty('trailer') && Array.isArray(cfg.trailer)) { // eslint-disable-line no-prototype-builtins
      cfg.trailer.forEach(code => this.initializeTrailer(code))
    }

    this.#version = cfg.version || '1.0.0'
    this.#maxHistoryItems = cfg.maxhistory || cfg.maxHistoryItems || 100
    this.#tabWidth = cfg.hasOwnProperty('tabWidth') ? cfg.tabWidth : 4 // eslint-disable-line no-prototype-builtins

    // This sets a global symbol that dev tools can find.
    globalThis[Symbol('SHELL_INTEGRATIONS')] = this
  }

  get data () {
    const commands = super.data

    return {
      name: this.name,
      description: this.description,
      version: this.version,
      commands,
      use: this.middleware.data,
      trailer: this.trailers.data,
      help: this.help,
      usage: this.usage,
      defaultHandler: this.defaultHandler.toString(),
      disableHelp: !this.autohelp,
      runtime: this.#runtime,
      maxHistoryItems: this.#maxHistoryItems
    }
  }

  get version () {
    return this.#version || 'Unknown'
  }

  set tableWidth (value) {
    this.__width = value
  }

  get tableWidth () {
    return this.__width
  }

  history (count = null) {
    if (this.#history.length === 0) {
      return []
    }

    return count === null ? this.#history.slice() : this.#history.slice(0, count)
  }

  priorCommand (count = 0) {
    if (this.#history.length === 0) {
      return null
    }

    if (count < 0) {
      return this.nextCommand(Math.abs(count))
    }

    count = count % this.#history.length

    this.#cursor += count

    if (this.#cursor >= this.#history.length) {
      this.#cursor = this.#history.length - 1
    }

    return this.#history[this.#cursor].input
  }

  nextCommand (count = 1) {
    if (this.#history.length === 0) {
      return null
    }

    if (count < 0) {
      return this.priorCommand(Math.abs(count))
    }

    count = count % this.#history.length

    this.#cursor -= count
    if (this.#cursor < 0) {
      this.#cursor = 0
      return undefined
    }

    return this.#history[this.#cursor].input
  }

  useWith (commands) {
    if (arguments.length < 2) {
      throw new Error('useWith([\'command\', \'command\'], fn) requires two or more arguments.')
    }

    commands = typeof commands === 'string' ? commands.split(/\s+/) : commands

    if (!Array.isArray(commands) || commands.filter(c => typeof c !== 'string').length > 0) {
      throw new Error(`The first argument of useWith must be a string or array of strings. Received ${typeof commands}`)
    }

    const fns = Array.from(arguments).slice(1)

    commands.forEach(cmd => this.#middlewareGroups.set(cmd.trim(), (this.#middlewareGroups.get(cmd.trim()) || []).concat(fns)))
  }

  useExcept (commands) {
    if (arguments.length < 2) {
      throw new Error('useExcept([\'command\', \'command\'], fn) requires two or more arguments.')
    }

    commands = typeof commands === 'string' ? commands.split(/\s+/) : commands

    if (!Array.isArray(commands) || commands.filter(c => typeof c !== 'string').length > 0) {
      throw new Error(`The first argument of useExcept must be a string or array of strings. Received ${typeof commands}`)
    }

    const fns = Array.from(arguments).slice(1)
    const all = new Set(this.commandlist.map(i => i.toLowerCase()))

    commands.forEach(cmd => {
      all.delete(cmd)
      for (const c of all) {
        if (c.indexOf(cmd) === 0) {
          all.delete(c)
        }
      }
    })

    this.useWith(Array.from(all), ...fns)
  }

  async exec (input, callback) {
    // Optionally apply reference data. Only for advanced use
    // in applications (not strict CLIs).
    let reference
    if (typeof callback === 'object') {
      if (!callback.hasOwnProperty('reference') && !callback.hasOwnProperty('callback')) { // eslint-disable-line no-prototype-builtins
        throw new Error('exec method data references require a reference and/or callback attribute - recognized: ' + Object.keys(callback).join(', '))
      }
      reference = callback.reference
      callback = callback.callback
    }

    // The array check exists because people are passing process.argv.slice(2) into this
    // method, often forgetting to join the values into a string.
    if (Array.isArray(input)) {
      input = input.map(i => {
        if (i.indexOf(' ') >= 0 && !/^[\"\'].+ [\"\']$/.test(i)) { // eslint-disable-line no-useless-escape
          return `"${i}"`
        } else {
          return i
        }
      }).join(' ')
    }

    this.#history.unshift({ input, time: new Date().toLocaleString() })

    if (this.#history.length > this.#maxHistoryItems) {
      this.#history.pop()
    }

    let parsed = COMMAND_PATTERN.exec(input + ' ')

    if (parsed === null) {
      if (input.indexOf('version') !== -1 || input.indexOf('-v') !== -1) {
        return console.log(this.version)
      } else if (input.indexOf('help') !== -1) {
        return console.log(this.help)
      }

      return Command.stderr(this.help)
    }

    parsed = parsed.filter(item => item !== undefined)

    const cmd = parsed[1]
    const args = parsed.length > 2 ? parsed[2] : ''
    // const command = null

    const action = this.__commands.get(cmd)

    if (!action) {
      if (cmd.toLowerCase() === 'version') {
        return console.log(this.version)
      }

      return Command.stderr(this.help)
    }

    const processor = this.__processors.get(action)

    if (!processor) {
      return Command.stderr('Command not found.')
    }

    const term = processor.getTerminalCommand(args)

    if (typeof callback === 'function') {
      return callback(await Command.reply(await term.command.run(term.arguments, callback, reference))) // eslint-disable-line standard/no-callback-literal
    }

    return await Command.reply(await term.command.run(term.arguments, callback, reference))
  }

  getCommandMiddleware (cmd) {
    const results = []
    cmd.split(/\s+/).forEach((c, i, a) => {
      const r = this.#middlewareGroups.get(a.slice(0, i + 1).join(' '))
      r && results.push(r.flat(Infinity))
    })

    return results.flat(Infinity)
  }

  clearHistory () {
    this.#history = []
  }

  // Clear the terminal
  clear () {
    this.#history = []
    console.clear()
    // .write('\x1b[0f') // regular clear
    // .write('\x1b[2J') // full clear
    // .write('\033[0;0f') //ubuntu
  }
}
