import Command from './command.js'
import Middleware from './middleware.js'
import Formatter from './format.js'

const COMMAND_PATTERN = /^(\w+)\s+([\s\S]+)?/i

export default class Shell {
  #formattedDefaultHelp
  #processors = new Map()
  #commands = new Map()
  #middleware = new Middleware()
  #middlewareGroups = new Map()
  #history = []
  #maxHistoryItems
  #name
  #description
  #version
  #customHelp = null
  #customUsage = null
  #cursor = 0
  #autohelp = true
  #tabWidth
  #tableWidth
  #hasCustomDefaultHandler = false
  #runtime = globalThis.hasOwnProperty('window')
    ? 'browser'
    : (
        globalThis.hasOwnProperty('process')
        && globalThis.process.release
        && globalThis.process.release.name
          ? globalThis.process.release.name
          : 'unknown'
      )
  #defaultHandler = (data, cb) => {
    if (data.help && data.help.requested) {
      console.log(data.help.message)
    }

    cb && cb(data)
  }
  #updateHelp = () => { 
    this.#formattedDefaultHelp = new Formatter(this)
    this.#formattedDefaultHelp.width = this.#tableWidth
  }

  constructor (cfg = { maxhistory: 100 }) {
    this.#name = cfg.name || 'unknown'
    this.#description = cfg.description || null
    this.#version = cfg.version || '1.0.0'
    this.#maxHistoryItems = cfg.maxhistory || cfg.maxHistoryItems || 100

    this.#tabWidth = cfg.hasOwnProperty('tabWidth') ? cfg.tabWidth : 4
    this.#tableWidth = cfg.hasOwnProperty('tableWidth') ? cfg.tableWidth : 70

    if (cfg.hasOwnProperty('autohelp')) {
      this.#autohelp = cfg.autohelp
    }

    if (cfg.hasOwnProperty('defaultHandler') && cfg.defaultHandler.toString() !== this.#defaultHandler.toString()) {
      this.defaultHandler = cfg.defaultHandler
    }

    if (Array.isArray(cfg.commands)) {
      cfg.commands.forEach(cmd => this.add(cmd))
    } else if (typeof cfg.commands === 'object') {
      for (const key in cfg.commands) {
        let data = cfg.commands[key]
        data.name = key
        this.add(data)
      }
    }

    if (cfg.hasOwnProperty('middleware') && Array.isArray(cfg.middleware)) {
      cfg.middleware.forEach(code => this.use(Function('return ' + code)()))
    }

    if (cfg.hasOwnProperty('help') && cfg.help !== this.help) {
      this.#customHelp = cfg.help
    }

    if (cfg.hasOwnProperty('usage') && cfg.usage !== this.usage) {
      this.#customUsage = cfg.usage
    }

    Object.defineProperty(this, '__commandMap', {
      enumerable: false,
      get () {
        return this.#processors
      }
    })
  }

  get data () {
    const commands = {}

    Array.from(this.#processors.values()).forEach(cmd => {
      let data = cmd.data
      const name = data.name
      delete data.name
      commands[name] = data
    })

    return {
      name: this.name,
      description: this.description,
      version: this.version,
      commands,
      middleware: this.#middleware.data,
      help: this.help,
      usage: this.usage,
      defaultHandler: this.#defaultHandler.toString(),
      authohelp: this.#autohelp,
      runtime: this.#runtime,
      maxHistoryItems: this.#maxHistoryItems
    }
  }

  get version () {
    return this.#version || 'Unknown'
  }

  get name () {
    return this.#name || 'Unknown'
  }

  get description () {
    return this.#description || ''
  }

  set tableWidth(value) {
    this.#tableWidth = value
  }

  get tableWidth () {
    return this.#tableWidth || 80
  }

  get autohelp () {
    return this.#autohelp
  }

  // @private
  set defaultHandler(value) {
    if (typeof value === 'function') {
      this.#defaultHandler = value
      this.#hasCustomDefaultHandler = true
      this.#processors.forEach(cmd => cmd.defaultProcessor = value)
    } else {
      throw new Error(`Invalid default method (must be a function, not ${typeof cfg.defaultHandler}).`)
    }
  }

  // @private
  get hasCustomDefaultHandler() {
    return this.#hasCustomDefaultHandler
  }

  set autohelp (value) {
    if (typeof value !== 'boolean') {
      return
    }
    this.#autohelp = value
    this.#commands.forEach(cmd => cmd.autohelp = value)
  }

  get name () {
    return this.#name
  }

  get description () {
    return this.#description || this.usage
  }

  get usage () {
    if (this.#customUsage !== null) {
      return typeof this.#customUsage === 'function' ? this.#customUsage() : this.#customUsage
    }

    this.#updateHelp()

    return this.#formattedDefaultHelp.usage
  }

  set usage (value) {
    this.#customUsage = value
  }

  get help () {
    if (this.#customHelp) {
      return typeof this.#customHelp === 'function' ? this.#customHelp(this) : this.#customHelp
    }

    this.#updateHelp()

    return this.#formattedDefaultHelp.help
  }

  set help (value) {
    this.#customHelp = value
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

  add () {
    for (let command of arguments) {
      if (typeof command === 'object' && !(command instanceof Command)) {
        command = new Command(command)
      }

      if (!(command instanceof Command)) {
        throw new Error('Invalid argument. Only "Command" instances may be added to the processor.')
      }

      if (!command.hasCustomDefaultHandler) {
        command.defaultHandler = this.#defaultHandler
      }

      command.autohelp = this.#autohelp
      command.shell = this

      this.#processors.set(command.OID, command)
      this.#commands.set(command.name, command.OID)

      command.aliases.forEach(alias => this.#commands.set(alias, command.OID))
    }
  }

  getCommand (name=null) {
    if (!name) {
      return null
    }

    let names = name.split(/\s+/i)
    let cmd = this.#commands.get(names.shift())
    if (cmd) {
      cmd = this.#processors.get(cmd)
      for (const nm of names) {
        cmd = cmd.getCommand(nm)
      }
    }

    return cmd instanceof Command ? cmd : null
  }

  use () {
    for (const arg of arguments) {
      if (typeof arg !== 'function') {
        throw new Error(`All "use()" arguments must be valid functions.\n${arg.toString().substring(0,50)}${arg.toString().length > 50 ? '...' : ''}`)
      }

      this.#middleware.use(arg)
    }
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

  remove () {
    for (const cmd of arguments) {
      if (typeof cmd === 'symbol') {
        this.#processors.delete(cmd)
        this.#commands.forEach(oid => oid === cmd && this.#commands.delete(oid))
      }

      if (typeof cmd === 'string') {
        const OID = this.#commands.get(cmd)
        if (OID) {
          this.remove(OID)
        }
      }
    }
  }

  async exec (input, callback) {
    this.#history.shift({ input, time: new Date().toLocaleString()})

    if (this.#history.length > this.#maxHistoryItems) {
      this.#history.pop()
    }

    let parsed = COMMAND_PATTERN.exec(input + ' ')

    if (parsed === null) {
      return Command.stderr(this.help)
    }

    parsed = parsed.filter(item => item !== undefined)

    let cmd = parsed[1]
    let args = parsed.length > 2 ? parsed[2] : ''
    let command = null

    const action = this.#commands.get(cmd)

    if (!action) {
      return Command.stderr(this.help)
    }

    const processor = this.#processors.get(action)

    if (!processor) {
      return Command.stderr('Command not found.')
    }

    // Apply command-specific middleware (configured via useWith)
    processor.commandroot.replace(new RegExp('^' + this.#name, 'i'), '')
      .trim()
      .split(/\s+/)
      .reduce((cmdpath, name) => {
        cmdpath.push(name)
        const fns = this.#middlewareGroups.get(cmdpath.join(' '))
        if (fns) {
          processor.use(...fns)
        }
      }, [])

    if (this.#middleware.size === 0) {
      return await Command.reply(await processor.run(args, callback))
    }

    arguments[0] = processor.deepParse(args)

    return this.#middleware.run(
      ...arguments,
      async () => await Command.reply(await processor.run(args)))
  }
}
