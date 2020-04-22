import { Parser } from '../node_modules/@author.io/arg/index.js'
import Middleware from './middleware.js'
import Shell from './shell.js'
import Formatter from './format.js'

const STRIP_EQUAL_SIGNS = /(\=+)(?=([^'"\\]*(\\.|['"]([^'"\\]*\\.)*[^'"\\]*['"]))*[^'"]*$)/g
const SUBCOMMAND_PATTERN = /^([^"'][\S\b]+)[\s+]?([^-].*)$/i
const FLAG_PATTERN = /((?:"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|\/[^\/\\]*(?:\\[\S\s][^\/\\]*)*\/[gimy]*(?=\s|$)|(?:\\\s|\S))+)(?=\s|$)/g
const METHOD_PATTERN = /^([\w]+\s?)\(.*\)\s?{/i

export default class Command {
  #formattedDefaultHelp
  #pattern
  #oid
  #name
  #description
  #aliases = new Set()
  #customUsage
  #customHelp
  #fn
  #flagConfig = null
  #subcommands = new Map()
  #processors = new Map()
  #autohelp = true
  #parent = null
  #shell = null
  #middleware = new Middleware()
  #hasCustomDefaultHandler = false
  #defaultHandler = data => console.log(this.help)
  #updateHelp = () => {
    this.#formattedDefaultHelp = new Formatter(this)
    this.#formattedDefaultHelp.width = this.shell === null ? 80 : this.shell.tableWidth
  }

  constructor (cfg = {}) {
    if (typeof cfg !== 'object') {
      throw new Error('Invalid command configuration. Expected an object.')
    }

    if (!cfg.hasOwnProperty('name')) {
      throw new Error('Invalid command configuration. A "name" attribute is required.')
    }

    if (cfg.hasOwnProperty('handler')) {
      if (typeof cfg.handler === 'string') {
        cfg.handler = Function('return (' + cfg.handler.replace('function anonymous', 'function') + ').call(this)').call(globalThis)
      }

      if (typeof cfg.handler !== 'function') {
        throw new Error('Invalid command configuration. A "handler" function is required.')
      }

      if (cfg.hasOwnProperty('help')) {
        this.help = cfg.help
      }

      if (cfg.hasOwnProperty('usage')) {
        this.usage = cfg.usage
      }
    }

    if (cfg.hasOwnProperty('middleware') && Array.isArray(cfg.middleware)) {
      cfg.middleware.forEach(code => this.use(Function(code)))
    }

    this.#name = cfg.name.trim().split(/\s+/)[0]
    this.#fn = cfg.handler
    this.#oid = Symbol(((cfg.name || cfg.usage) || cfg.pattern) || 'command')
    this.#pattern = cfg.pattern || /[\s\S]+/i
    this.#customUsage = cfg.usage || null
    this.#customHelp = cfg.help || null
    // this.aliases = cfg.aliases
    this.#description = cfg.description || null

    if (cfg.alias && !cfg.aliases) {
      cfg.aliases = Array.isArray(cfg.alias) ? cfg.alias : [cfg.alias]
      delete cfg.alias
    }

    if (cfg.aliases) {
      if (!Array.isArray(cfg.aliases)) {
        throw new Error('The alias property only accepts an array.')
      }
 
      this.#aliases = new Set(cfg.aliases)
    }

    if (cfg.flags) {
      if (typeof cfg.flags !== 'object') {
        throw new Error(`Invalid flag configuration (expected and object, received ${typeof cfg.flags}).`)
      }

      for (const [key, value] of Object.entries(cfg.flags)) {
        if (value.hasOwnProperty('alias')) {
          value.aliases = value.aliases || []
          
          if (Array.isArray(value.alias)) {
            value.aliases = Array.from(new Set(...value.aliases, ... value.alias))
            if (value.aliases.filter(a => typeof a !== 'string') > 0) {
              throw new Error(`${key} flag aliases must be strings. Type failure on: ${value.aliases.filter(a => typeof a !== 'string').join(', ')}.`)
            }
          } else if (typeof value.alias === 'string') {
            value.aliases.push(value.alias)
          } else {
            throw new Error(`Aliases must be strings, not ${typeof value.alias} (${key} flag).`)
          }

          delete value.alias
        }
      }

      this.#flagConfig = cfg.flags
    }

    if (typeof cfg.autohelp === 'boolean') {
      this.#autohelp = cfg.autohelp
    }

    if (typeof cfg.defaultHandler === 'function') {
      this.defaultHandler = cfg.defaultHandler
    }

    if (Array.isArray(cfg.commands)) {
      cfg.commands.forEach(cmd => this.add(cmd))
    }

    if (Array.isArray(cfg.subcommands)) {
      cfg.subcommands.forEach(cmd => this.add(cmd))
    }

    const attributes = new Set([
      'commands',
      'subcommands',
      'defaultHandler',
      'autohelp',
      'flags',
      'alias',
      'aliases',
      'description',
      'help',
      'usage',
      'pattern',
      'name',
      'handler',
      'middleware'
    ])

    const unrecognized = Object.keys(cfg).filter(attribute => !attributes.has(attribute))

    if (unrecognized.length > 0) {
      throw new Error(`Unrecognized shell configuration attribute(s): ${unrecognized.join(', ')}`)
    }

    Object.defineProperties(this, {
      __flagConfig: {
        enumerable: false,
        get () {
          const flags = new Map()
          Object.keys(this.#flagConfig).forEach(key => flags.set(key, this.#flagConfig[key]))
          flags.delete('help')
          return flags
        }
      }
    })

    this.#updateHelp()
  }

  get data () {
    const commands = {}

    Array.from(this.#processors.values()).forEach(cmd => {
      let data = cmd.data
      const name = data.name
      delete data.name
      commands[name] = data
    })

    let handler = (this.#fn || this.#defaultHandler).toString()
    if (METHOD_PATTERN.test(handler)) {
      handler = handler.replace(METHOD_PATTERN.exec(handler)[1], 'function ')
    }

    let flags = this.#flagConfig || {}
    
    for (let [key, value] of Object.entries(flags)) {
      value.aliases = value.aliases || []

      if (value.hasOwnProperty('alias')) {
        if (value.aliases.indexOf(value.alias) < 0) {
          value.aliases.push(value.alias)
        }
      }

      delete value.alias
    }

    const data = {
      name: this.#name,
      description: this.description,
      help: this.help,
      usage: this.usage,
      aliases: Array.from(this.#aliases),
      flags,
      handler,
      commands,
      middleware: this.#middleware.data
    }

    for (let [key, value] of Object.entries(data.flags)) {
      delete value.alias
    }

    return data
  }

  // @private
  set defaultHandler (value) {
    if (typeof value === 'function') {
      this.#defaultHandler = value
      this.#hasCustomDefaultHandler = true
      this.#processors.forEach(cmd => cmd.defaultProcessor = value)
    } else {
      throw new Error(`Invalid default method (must be a function, not ${typeof cfg.defaultHandler}).`)
    }
  }

  // @private
  get hasCustomDefaultHandler () {
    return this.#hasCustomDefaultHandler
  }

  set parent (cmd) {
    if (cmd instanceof Command) {
      this.#parent = cmd
    } else {
      throw new Error(`Cannot set parent of "${this.name}" command to anything other than another command. To make this command a direct descendent of the main shell, use the shell attribute instead.`)
    }
  }

  set shell (shell) {
    if (!shell) {
      throw new Error(`Cannot set shell of ${this.name} command to a non-Shell object.`)
    }
    if (shell instanceof Shell) {
      this.#shell = shell
    } else {
      throw new Error(`Expected a Shell object, received a "${typeof shell}" object.`)
    }
  }

  get shell () {
    if (!this.#shell) {
      if (this.#parent) {
        return this.#parent.shell
      }

      return null
    }

    return this.#shell
  }

  get autohelp() {
    return this.#autohelp
  }

  set autohelp(value) {
    if (typeof value !== 'boolean') {
      return
    }
    this.#autohelp = value
    this.#processors.forEach(cmd => cmd.autohelp = value)
  }

  get subcommands () {
    return this.#processors
  }

  get name () {
    return this.#name
  }

  get description () {
    return this.#description || ''
  }

  get commandroot () {
    if (this.#parent) {
      return `${this.#parent.commandroot} ${this.#name}`.trim()
    }

    if (this.#shell) {
      return `${this.#shell.name} ${this.#name}`.trim()
    }

    return this.#name
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
      return typeof this.#customHelp === 'function' ? this.#customHelp() : this.#customHelp
    }

    this.#updateHelp()

    return this.#formattedDefaultHelp.help
  }

  set help (value) {
    this.#customHelp = value
  }

  set aliases (value) {
    if (!value) {
      this.#aliases = []
      return
    }

    if (typeof value === 'object') {
      switch (value.constructor.name.toLowerCase()) {
        case 'map':
          value = Array.from(value.keys())
          break
        case 'set':
          value = Array.from(value)
          break
        case 'object':
          value = Object.keys(value).filter(item => typeof item === 'string')
          break
        case 'array':
          break
        case 'string':
          value = value.split(/\s+/)[0]
          break
        default:
          throw new Error('Invalid alias value. Use an array of strings.')
      }
    }

    this.#aliases = Array.from(new Set(value)) // This conversion deduplicates the value
  }

  get aliases () {
    return Array.from(this.#aliases) || []
  }

  get OID () {
    return this.#oid
  }

  getCommand (name) {
    return this.#subcommands.get(name)
  }

  addFlag (name, cfg) {
    if (typeof name !== 'string') {
      if (!cfg.hasOwnProperty('name')) {
        throw new Error('Invalid flag name (should be a string).')
      } else {
        name = cfg.name
      }
    }

    this.#flagConfig = this.#flagConfig || {}
    this.#flagConfig[name] = cfg
  }

  removeFlag (name) {
    delete this.#flagConfig[name]
  }

  supportsFlag (name) {
    return this.#flagConfig.hasOwnProperty(name)
  }

  add (command) {
    if (!(command instanceof Command)) {
      if (typeof command === 'object') {
        command = new Command(command)
      } else {
        throw new Error('Invalid argument. Only "Command" instances may be added to the processor.')
      }
    }

    command.parent = this
    command.autohelp = this.#autohelp

    this.#processors.set(command.OID, command)
    this.#subcommands.set(command.name, command.OID)

    command.aliases.forEach(alias => this.#subcommands.set(alias, command.OID))
  }

  remove () {
    for (const cmd of arguments) {
      if (typeof cmd === 'symbol') {
        this.#processors.delete(cmd)
        this.#subcommands.forEach(oid => oid === cmd && this.#subcommands.delete(oid))
      }

      if (typeof cmd === 'string') {
        const OID = this.#subcommands.get(cmd)
        if (OID) {
          this.remove(OID)
        }
      }
    }
  }

  use () {
    for (const arg of arguments) {
      if (typeof arg !== 'function') {
        throw new Error(`All "use()" arguments must be valid functions.\n${ arg.toString().substring(0, 50) } ${ arg.toString().length > 50 ? '...' : '' }`)
      }

      this.#middleware.use(arg)
    }

    this.#processors.forEach(subCmd => subCmd.use(...arguments))
  }

  deepParse (input) {
    let meta = this.parse(input)

    if (this.#subcommands.size === 0) {
      return meta
    }

    if (meta.input.trim().length === 0) {
      return meta
    }

    let args = meta.input.split(/\s+/)
    let subcmd = this.#subcommands.get(args.shift())

    if (!subcmd) {
      return meta
    }

    return this.#processors.get(subcmd).deepParse(args.join(' '))
  }

  parse (input) {
    // Parse the command input for flags
    const data = { command: this.#name, input: input.trim() }

    let flagConfig = this.#flagConfig || {}

    if (!flagConfig.hasOwnProperty('help')) {
      flagConfig.help = {
        description: `Display ${ this.#name } help.`,
        aliases: ['h'],
        default: false,
        type: 'boolean'
      }
    }

    let source = input.replace(STRIP_EQUAL_SIGNS, '').trim() + ' '
    const flags = Array.from(FLAG_PATTERN[Symbol.matchAll](source), x => x[0])
    const parser = new Parser(flags, flagConfig)

    let recognized = parser.data

    parser.unrecognizedFlags.forEach(arg => delete recognized[arg])

    data.flags = { recognized, unrecognized: parser.unrecognizedFlags }
    data.valid = parser.valid
    data.violations = parser.violations

    data.parsed = {}
    if (Object.keys(parser.data.flagSource).length > 0) {
      for (const [key, src] of Object.entries(parser.data.flagSource)) {
        data.parsed[src.name] = src.inputName
      }
    }

    data.help = {
      requested: recognized.help
    }

    if (recognized.help) {
      data.help.message = this.help
    }

    Object.defineProperties(data, {
      flag: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: name => {
          try {
            return parser.data.flagSource[name].value
          } catch (e) {
            return undefined
          }
        }
      },
      command: {
        enumerable: true,
        get: () => this
      },
      shell: {
        enumerable: true,
        get: () => this.shell
      }
    })

    Object.defineProperty(data.help, 'default', {
      enumerable: true,
      get: () => this.help
    })

    return data
  }

  async run (input, callback) {
    let fn = (this.#fn || this.#defaultHandler).bind(this)
    let data = typeof input === 'string' ? this.parse(input) : input
    const parsed = SUBCOMMAND_PATTERN.exec(input)

    arguments[0] = this.deepParse(input)

    // A possible subcommand was input
    if (parsed) {
      let cmd = parsed[1]
      let args = parsed.length > 2 ? parsed[2] : ''
      let command = null
      let subcommand = this.#subcommands.get(cmd)

      if (!subcommand) {
        for (const [name, id] of this.#subcommands) {
          const subcmd = this.#processors.get(id)

          if (subcmd.aliases.indexOf(cmd)) {
            subcommand = subcmd
            break
          }
        }
      }

      // If the prospective subcommand is not recognized, run the main processor
      if (!subcommand) {
        return await (new Promise((resolve, reject) => {
          try {
            if (this.#autohelp && data.help.requested) {
              console.log(this.help)
              resolve()
            } else {
              try {
                this.#middleware.use(fn)
                resolve(() => this.#middleware.run(data, () => callback && callback()))
              } catch (ee) {
                reject(ee)
              }
            }
          } catch (e) {
            reject(e)
          }
        }))
      }

      const processor = this.#processors.get(subcommand)

      if (this.#autohelp) {
        if (data.help.requested) {
          if (processor) {
            return console.log(processor.help)
          } else {
            return console.log(this.help)
          }
        }
      }

      if (!processor) {
        return new Promise((resolve, reject) => reject(new Error(`${ this.#name } "${cmd}" command not found.`)))
      }

      if (this.#middleware.size > 0) {
        this.#middleware.use(async meta => await Command.reply(fn(meta, callback)))
        return this.#middleware.run(...arguments, () => {})
      }

      return Command.reply(await processor.run(args, callback()))
    }

    // No subcommand was recognized
    if (this.#middleware.size > 0) {
      this.#middleware.use(async meta => await Command.reply(fn(meta, callback)))
      return this.#middleware.run(...arguments, () => {})
    }

    return Command.reply(fn(data, callback))
  }

  static stderr (err) {
    if (err instanceof Error) {
      return new Promise((resolve, reject) => reject(err))
    }

    return new Promise((resolve, reject) => reject(err))
  }

  static reply (callback) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof callback === 'function') {
          callback()
        }
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }
}
