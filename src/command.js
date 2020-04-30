import { Parser } from '../node_modules/@author.io/arg/index.js'
import Shell from './shell.js'
import Base from './base.js'

// const STRIP_EQUAL_SIGNS = /(\=+)(?=([^'"\\]*(\\.|['"]([^'"\\]*\\.)*[^'"\\]*['"]))*[^'"]*$)/g
const SUBCOMMAND_PATTERN = /^([^"'][\S\b]+)[\s+]?([^-].*)$/i
const FLAG_PATTERN = /((?:"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|\/[^\/\\]*(?:\\[\S\s][^\/\\]*)*\/[gimy]*(?=\s|$)|(?:\\\s|\S))+)(?=\s|$)/g
const METHOD_PATTERN = /^([\w]+\s?)\(.*\)\s?{/i

export default class Command extends Base {
  #pattern
  #oid
  #aliases = new Set()
  #fn
  #flagConfig = null
  #parent = null
  #shell = null
  
  constructor (cfg = {}) {
    if (cfg.hasOwnProperty('handler')) {
      if (typeof cfg.handler === 'string') {
        cfg.handler = Function('return (' + cfg.handler.replace('function anonymous', 'function') + ').call(this)').call(globalThis)
      }

      if (typeof cfg.handler !== 'function') {
        throw new Error('Invalid command configuration. A "handler" function is required.')
      }
    }

    super(cfg)

    if (cfg.hasOwnProperty('middleware') && Array.isArray(cfg.middleware)) {
      cfg.middleware.forEach(code => this.use(Function(code)))
    }

    this.defaultHandler = (data, cb) => {
      if (data.help && data.help.requested) {
        console.log(data.help.message)
      }

      cb && cb(data)
    }

    this.#fn = cfg.handler
    this.#oid = Symbol(((cfg.name || cfg.usage) || cfg.pattern) || 'command')
    this.#pattern = cfg.pattern || /[\s\S]+/i
    
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

    if (Array.isArray(cfg.subcommands)) {
      this.add(...cfg.subcommands)
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
      'middleware',
      'arguments'
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
          if (this.#flagConfig !== null) {
            Object.keys(this.#flagConfig).forEach(key => flags.set(key, this.#flagConfig[key]))
            flags.delete('help')
          }

          return flags
        }
      }
    })

    this.__width = this.shell === null ? 80 : this.shell.tableWidth || 80

    this.updateHelp()
  }

  get data () {
    const commands = super.data

    let handler = (this.#fn || this.defaultHandler).toString()
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
      name: this.name,
      description: this.description,
      help: this.help,
      usage: this.usage,
      aliases: Array.from(this.#aliases),
      flags,
      handler,
      commands,
      middleware: this.middleware.data
    }

    for (let [key, value] of Object.entries(data.flags)) {
      delete value.alias
    }

    return data
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
      this.__width = this.shell === null ? 80 : shell.tableWidth
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

  get commandroot () {
    if (this.#parent) {
      return `${this.#parent.commandroot} ${this.name}`.trim()
    }

    if (this.#shell) {
      return `${this.#shell.name} ${this.name}`.trim()
    }

    return this.name
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

  deepParse (input) {
    let meta = this.parse(input)

    if (this.__commands.size === 0) {
      return meta
    }

    if (meta.input.trim().length === 0) {
      return meta
    }

    let args = meta.input.split(/\s+/)
    let subcmd = this.__commands.get(args.shift())

    if (!subcmd) {
      return meta
    }

    return this.__processors.get(subcmd).deepParse(args.join(' '))
  }

  parse (input) {
    // Parse the command input for flags
    const data = { command: this.name, input: input.trim() }

    let flagConfig = this.#flagConfig || {}

    if (!flagConfig.hasOwnProperty('help')) {
      flagConfig.help = {
        description: `Display ${ this.name } help.`,
        // aliases: ['h'],
        default: false,
        type: 'boolean'
      }
    }

    // let source = input.replace(STRIP_EQUAL_SIGNS, '').trim() + ' '

    const flags = Array.from(FLAG_PATTERN[Symbol.matchAll](input), x => x[0])
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
            if (typeof name === 'number') {
              return Array.from(parser.unrecognizedFlags)[name]
            } else {
              return parser.data.flagSource[name].value
            }
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
    let fn = (this.#fn || this.defaultHandler).bind(this)
    let data = typeof input === 'string' ? this.parse(input) : input
    const parsed = SUBCOMMAND_PATTERN.exec(input)

    arguments[0] = this.deepParse(input)
    
    // A possible subcommand was input
    if (parsed) {
      let cmd = parsed[1]
      let args = parsed.length > 2 ? parsed[2] : ''
      let command = null
      let subcommand = this.__commands.get(cmd)

      if (!subcommand) {
        for (const [name, id] of this.__commands) {
          const subcmd = this.__processors.get(id)

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
            if (this.autohelp && data.help.requested) {
              console.log(this.help)              
              resolve()
            } else {
              try {
                this.middleware.use(fn)
                resolve(() => this.middleware.run(data, () => callback && callback()))
              } catch (ee) {
                reject(ee)
              }
            }
          } catch (e) {
            reject(e)
          }
        }))
      }

      const processor = this.__processors.get(subcommand)

      if (this.autohelp) {
        if (data.help.requested) {
          if (processor) {
            return console.log(processor.help)
          } else {
            return console.log(this.help)
          }
        }
      }

      if (!processor) {
        return new Promise((resolve, reject) => reject(new Error(`${ this.name } "${cmd}" command not found.`)))
      }

      if (this.middleware.size > 0) {
        this.middleware.use(async meta => await Command.reply(fn(meta, callback)))
        return this.middleware.run(...arguments, () => {})
      }

      return Command.reply(await processor.run(args, callback))
    }

    // No subcommand was recognized
    if (this.middleware.size > 0) {
      this.middleware.use(async meta => await Command.reply(fn(meta, callback)))
      return this.middleware.run(...arguments, () => {})
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
