import { Parser } from '../node_modules/@author.io/arg/index.js'
import Shell from './shell.js'
import Base from './base.js'
import { METHOD_PATTERN, FLAG_PATTERN, STRIP_QUOTE_PATTERN } from './utility.js'

export default class Command extends Base {
  #pattern
  #oid
  #aliases = new Set()
  #fn
  #flagConfig = {}
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

    if (cfg.hasOwnProperty('use') && Array.isArray(cfg.use)) {
      cfg.use.forEach(code => this.initializeMiddleware(code))
    }

    if (cfg.hasOwnProperty('trailer') && Array.isArray(cfg.trailer)) {
      cfg.trailer.forEach(code => this.initializeTrailer(code))
    }

    this.initializeHelpAnnotations(cfg)

    this.#fn = cfg.handler
    this.#oid = Symbol(((cfg.name || cfg.usage) || cfg.pattern) || 'command')
    this.#pattern = cfg.pattern || /[\s\S]+/i
    
    if (cfg.alias && !cfg.aliases) {
      cfg.aliases = typeof cfg.alias === 'string' ? [cfg.alias] : (Array.isArray(cfg.alias) ? cfg.alias : Array.from(cfg.alias))
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
      'plugins',
      'defaultHandler',
      'disableHelp',
      'describeDefault',
      'describeOptions',
      'describeMultipleValues',
      'describeRequired',
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
      'use',
      'arguments',
      'commonflag',
      'commonflags',
      'trailer',
      'url',
      'support'
    ])

    const unrecognized = Object.keys(cfg).filter(attribute => !attributes.has(attribute))

    if (unrecognized.length > 0) {
      throw new Error(`Unrecognized configuration attribute(s): ${unrecognized.join(', ')}`)
    }

    Object.defineProperties(this, {
      __commonFlags: {
        enumerable: false,
        get () {
          let flags = this.__commonflags //Object.assign({}, this.__commonflags, this.#flagConfig)
          
          if (this.parent !== null) {
            flags = Object.assign(flags, this.parent.__commonFlags)
          }

          return Object.assign({}, this.shell !== null ? this.shell.__commonflags : {}, flags)
        }
      },
      __flagConfig: {
        enumerable: false,
        get () {
          let flags = new Map(Object.entries(Object.assign(this.__commonFlags, this.#flagConfig || {})))
          flags.delete('help')
          return flags
        }
      },
      getTerminalCommand: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: input => {
          let args = input.trim().split(/\t+|\s+/)
          let cmd = this

          while (args.length > 0) {
            const arg = args[0]
            const subcmd = cmd.getCommand(arg)
            if (subcmd) {
              cmd = subcmd
              args.shift()
            } else {
              break
            }
          }

          return {
            command: cmd,
            arguments: args.join(' ')
          }
        }
      }
    })

    this.__commonflags = cfg.commonflags || {}

    this.__width = this.shell === null ? 80 : this.shell.tableWidth || 80

    this.updateHelp()
  }

  get data () {
    const commands = super.data

    let handler = (this.#fn || this.defaultHandler).toString()
    if (METHOD_PATTERN.test(handler)) {
      handler = handler.replace(METHOD_PATTERN.exec(handler)[1], 'function ')
    }

    let flags = Object.assign(this.__commonFlags, this.#flagConfig || {})
    
    for (let [key, value] of Object.entries(flags)) {
      value.aliases = value.aliases || []

      if (value.hasOwnProperty('alias')) {
        if (value.aliases.indexOf(value.alias) < 0) {
          value.aliases.push(value.alias)
        }
      }

      delete value.alias
    }

    // Apply any missing default values to flags.
    Object.keys(flags).forEach(name => flags[name] = Object.assign(this.getFlagConfiguration(name), flags[name]))

    const data = {
      name: this.name,
      description: this.description,
      help: this.help,
      usage: this.usage,
      aliases: Array.from(this.#aliases),
      flags,
      handler,
      commands,
      disableHelp: !this.autohelp,
      use: this.middleware.data,
      trailer: this.trailers.data
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

  get parent () {
    return this.#parent
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

  get plugins () {
    return Object.assign({}, this.shell.plugins, this.parent ? this.parent.plugins : {}, super.plugins)
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

    this.#flagConfig[name] = cfg
  }

  removeFlag (name) {
    delete this.#flagConfig[name]
  }

  getFlagConfiguration (name) {
    let flag = this.__flagConfig.get(name)
    if (!flag) {
      for (let [f, cfg] of this.__flagConfig) {
        if ((cfg.aliases && cfg.aliases.indexOf(name) >= 0) || (cfg.alias && cfg.alias === flag)) {
          flag = cfg
          break
        }
      }
      
      if (!flag) {
        return null
      }
    }

    return {
      description: flag.description,
      required: flag.hasOwnProperty('required') ? flag.required : false,
      aliases: flag.aliases || [flag.alias].filter(i => i !== null),
      type: flag.type === undefined ? 'string' : (typeof flag.type === 'string' ? flag.type : flag.type.name.toLowerCase()),
      options: flag.hasOwnProperty('options') ? flag.options : null,
      allowMultipleValues: flag.hasOwnProperty('allowMultipleValues') ? flag.allowMultipleValues : false
    }
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

    let flagConfig = Object.assign(this.__commonFlags, this.#flagConfig || {})

    if (!flagConfig.hasOwnProperty('help')) {
      flagConfig.help = {
        description: `Display ${ this.name } help.`,
        // aliases: ['h'],
        default: false,
        type: 'boolean'
      }
    }

    const flags = Array.from(FLAG_PATTERN[Symbol.matchAll](input), x => x[0])
// console.log(flags, flagConfig)    
    const parser = new Parser(flags, flagConfig)
    const pdata = parser.data
    const recognized = {}

    parser.recognizedFlags.forEach(flag => recognized[flag] = pdata[flag])
    parser.unrecognizedFlags.forEach(arg => delete recognized[arg])
 
    data.flags = { recognized, unrecognized: parser.unrecognizedFlags }
    data.valid = parser.valid
    data.violations = parser.violations
    
    data.parsed = {}
    if (Object.keys(pdata.flagSource).length > 0) {
      for (const [key, src] of Object.entries(pdata.flagSource)) {
        data.parsed[src.name] = src.inputName
      }
    }

    data.help = {
      requested: recognized.help
    }

    if (recognized.help) {
      data.help.message = this.help
    }

    const args = Array.from(this.arguments)
    
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
              return pdata.flagSource[name].value
            }
          } catch (e) {
            if (this.arguments.has(name)) {
              return Array.from(parser.unrecognizedFlags)[args.indexOf(name)]
            }

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
      },
      data: {
        enumerable: true,
        get () {
          let uf = parser.unrecognizedFlags
          let result = Object.assign({}, recognized)
          delete result.help
          
          args.forEach((name, i) => {
            let value = uf[i]
            let normalizedValue = Object.keys(pdata).filter(key => key.toLowerCase() === value)
            normalizedValue = (normalizedValue.length > 0 ? normalizedValue.pop() : value)

            if (normalizedValue !== undefined) {
              normalizedValue = normalizedValue.trim()

              if (STRIP_QUOTE_PATTERN.test(normalizedValue)) {
                normalizedValue = normalizedValue.substring(1, normalizedValue.length - 1)
              }
            }

            if (result.hasOwnProperty(name)) {
              result[name] = Array.isArray(result[name]) ? result[name]: [result[name]]
              result[name].push(normalizedValue)
            } else {
              result[name] = normalizedValue
            }
          })

          if (uf.length > args.length) {
            uf.slice(args.length)
              .forEach((flag, i) => {
                let name = `unknown${i + 1}`
                while (result.hasOwnProperty(name)) {
                  let number = name.substring(7)
                  name = 'unknown' + (parseInt(number) + 1)
                }

                result[name] = flag
              })
          }

          return result
        }
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
    const data = typeof input === 'string' ? this.parse(input) : input

    arguments[0] = this.deepParse(input)
    arguments[0].plugins = this.plugins

    if (this.shell !== null) {
      const parentMiddleware = this.shell.getCommandMiddleware(this.commandroot.replace(new RegExp(`^${this.shell.name}`, 'i'), '').trim())
    
      if (parentMiddleware.length > 0) {
        this.middleware.use(...parentMiddleware)
      }
    }

    let trailers = this.trailers

    if (arguments[0].help && arguments[0].help.requested) {
      console.log(this.help)
      
      if (trailers.size > 0) {
        trailers.run(arguments[0])
      }

      return
    }

    // No subcommand was recognized
    if (this.middleware.size > 0) {
      this.middleware.run(arguments[0], async meta => await Command.reply(fn(meta, callback)))
      
      if (trailers.size > 0) {
        trailers.run(arguments[0])
      }

      return
    }

    // Command.reply(fn(arguments[0], callback))
    data.plugins = this.plugins
    Command.reply(fn(data, callback))

    if (trailers.size > 0) {
      trailers.run(arguments[0])
    }
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
