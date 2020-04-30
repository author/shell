import Command from './command.js'
import Base from './base.js'

const COMMAND_PATTERN = /^(\w+)\s+([\s\S]+)?/i

export default class Shell extends Base {
  #middlewareGroups = new Map()
  #history = []
  #maxHistoryItems
  #version
  #cursor = 0
  #tabWidth
  #runtime = globalThis.hasOwnProperty('window')
    ? 'browser'
    : (
        globalThis.hasOwnProperty('process')
        && globalThis.process.release
        && globalThis.process.release.name
          ? globalThis.process.release.name
          : 'unknown'
      )
  
  constructor (cfg = { maxhistory: 100 }) {
    super(cfg)

    if (cfg.hasOwnProperty('middleware') && Array.isArray(cfg.middleware)) {
      cfg.middleware.forEach(code => this.use(Function('return ' + code)()))
    }

    this.#version = cfg.version || '1.0.0'
    this.#maxHistoryItems = cfg.maxhistory || cfg.maxHistoryItems || 100
    this.#tabWidth = cfg.hasOwnProperty('tabWidth') ? cfg.tabWidth : 4
  }

  get data () {
    const commands = super.data

    return {
      name: this.name,
      description: this.description,
      version: this.version,
      commands,
      middleware: this.middleware.data,
      help: this.help,
      usage: this.usage,
      defaultHandler: this.defaultHandler.toString(),
      authohelp: this.autohelp,
      runtime: this.#runtime,
      maxHistoryItems: this.#maxHistoryItems
    }
  }

  get version () {
    return this.#version || 'Unknown'
  }

  set tableWidth(value) {
    this.__width = value
  }

  get tableWidth () {
    return this.__width
  }

  history (count = null) {
    if (this.#history.length === 0) {
      return []
    }

    return this.#history.slice(0, count)
  }

  priorCommand (count = 0) {
    if (count < 0) {
      return this.nextCommand(abs(count))
    }

    this.#cursor += count

    if (this.#cursor >= this.#history.length) {
      this.#cursor = this.#history.length - 1
    }

    return this.#history[this.#cursor]
  }

  nextCommand (count = 1) {
    if (count < 0) {
      return this.priorCommand(abs(count))
    }

    this.#cursor -= count
    if (this.#cursor < 0) {
      this.#cursor = 0
    }

    return this.#history[this.#cursor]
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

    commands.forEach(cmd => this.#middlewareGroups.set(cmd, (this.#middlewareGroups.get(cmd) || []).concat(fns)))
  }

  async exec (input, callback) {
    this.#history.shift({ input, time: new Date().toLocaleString()})

    if (this.#history.length > this.#maxHistoryItems) {
      this.#history.pop()
    }

    let parsed = COMMAND_PATTERN.exec(input + ' ')

    if (parsed === null) {
      if (input.indexOf('version') !== -1 || input.indexOf('-v') !== -1) {
        return console.log(this.version)
      }
      
      return Command.stderr(this.help)
    }

    parsed = parsed.filter(item => item !== undefined)

    let cmd = parsed[1]
    let args = parsed.length > 2 ? parsed[2] : ''
    let command = null

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

    // Apply command-specific middleware (configured via useWith)
    processor.commandroot.replace(new RegExp('^' + this.name, 'i'), '')
      .trim()
      .split(/\s+/)
      .reduce((cmdpath, name) => {
        cmdpath.push(name)
        const fns = this.#middlewareGroups.get(cmdpath.join(' '))
        if (fns) {
          processor.use(...fns)
        }
      }, [])

    if (args.trim().toLowerCase() === '--help') {
      if (!this.autohelp) {
        return await Command.reply()
      }
    }

    if (this.middleware.size === 0) {
      return await Command.reply(await processor.run(args, callback))
    }

    arguments[0] = processor.deepParse(args)

    return this.middleware.run(
      ...arguments,
      async () => await Command.reply(await processor.run(args)))
  }
}
