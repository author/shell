import Middleware from './middleware.js'
import Formatter from './format.js'
import Shell from './shell.js'
import Command from './command.js'

export default class Base {
  #url = null
  #support = null
  #formattedDefaultHelp
  #description
  #customUsage
  #customHelp
  #arguments = new Set()
  #autohelp = true
  #processors = new Map()
  #commands = new Map()
  #width = 80
  #name = 'Unknown'
  #middleware = new Middleware()
  #trailer = new Middleware()
  #commonflags = {}
  #display = {
    // These are all null, representing they're NOT configured.
    Default: null,
    Options: null,
    MultipleValues: null,
    Required: null
  }
  #hasCustomDefaultHandler = false
  #defaultHandler = function (meta) {
    if (this.parent !== null && this.parent.hasCustomDefaultHandler) {
      return this.parent.defaultHandler(...arguments)
    } else if (this.shell && this.shell !== null && this.shell.hasCustomDefaultHandler) {
      return this.shell.defaultHandler(...arguments)
    }

    if (this.#autohelp) {
      console.log(this.help)
    }
  }

  constructor(cfg = {}) {
    if (typeof cfg !== 'object') {
      throw new Error('Invalid command configuration. Expected an object.')
    }

    if (!cfg.hasOwnProperty('name')) {
      throw new Error('Invalid command configuration. A "name" attribute is required.')
    }

    if (cfg.hasOwnProperty('help')) {
      this.#customHelp = cfg.help
    }

    if (cfg.hasOwnProperty('usage')) {
      this.#customUsage = cfg.usage
    }

    if (cfg.hasOwnProperty('disablehelp') && !cfg.hasOwnProperty('disableHelp')) {
      cfg.disableHelp = cfg.disablehelp
    }

    if (cfg.hasOwnProperty('disableHelp') && cfg.disableHelp === true) {
      this.#autohelp = false
    }

    if (typeof cfg.help === 'function' || typeof cfg.help === 'string') {
      this.help = cfg.help
    }

    if (typeof cfg.usage === 'function' || typeof cfg.usage === 'string') {
      this.usage = cfg.usage
    }

    if (cfg.hasOwnProperty('defaultHandler') && cfg.defaultHandler.toString() !== this.#defaultHandler.toString()) {
      this.defaultHandler = cfg.defaultHandler
    }

    if (typeof cfg.arguments === 'string') {
      cfg.arguments = cfg.arguments.split(/\s+|\t+|\,+|\;+/).map(arg => arg.trim())
    }

    if (Array.isArray(cfg.arguments)) {
      this.#arguments = new Set(cfg.arguments)
    }

    if (typeof cfg.url === 'string') {
      this.#url = cfg.url
    }

    if (typeof cfg.support === 'string') {
      this.#support = cfg.support
    }

    this.#name = (cfg.name || 'unknown').trim().split(/\s+/)[0]
    this.#description = cfg.description || null

    if (Array.isArray(cfg.commands)) {
      cfg.commands.forEach(cmd => this.add(cmd))
    } else if (typeof cfg.commands === 'object') {
      for (const key in cfg.commands) {
        let data = cfg.commands[key]
        data.name = key
        this.add(data)
      }
    }

    if (cfg.hasOwnProperty('middleware')) {
      console.warn('The "middleware" attribute has been replaced with the "use" attribute.')
      cfg.use = cfg.middleware
      delete cfg.middleware
    }

    if (!cfg.hasOwnProperty('commonflag')) {
      if (cfg.hasOwnProperty('commonFlag')) {
        cfg.commonflag = cfg.commonFlag
      } else if (cfg.hasOwnProperty('commonflags')) {
        cfg.commonflag = cfg.commonflags
      } else if (cfg.hasOwnProperty('commonFlag')) {
        cfg.commonflag = cfg.commonFlag
      } else if (cfg.hasOwnProperty('commonFlags')) {
        cfg.commonflag = cfg.commonFlags
      }
    }

    if (cfg.hasOwnProperty('commonflag')) {
      if (typeof cfg.commonflag !== 'object') {
        throw new Error('The "commonflag" configuration attribute must be an object.')
      }
    }

    Object.defineProperties(this, {
      __processors: {
        enumerable: false,
        get() {
          return this.#processors
        }
      },
      __commands: {
        enumerable: false,
        get() {
          return this.#commands
        }
      },
      __width: {
        enumerable: false,
        get() {
          return this.#width
        },
        set (v) {
          this.#width = v || 80
        }
      },
      __commonflags: {
        enumerable: false,
        get () {
          return this.#commonflags
        },
        set (value) {
          this.#commonflags = value
        }
      },
      arguments: {
        enumerable: false,
        get () {
          return this.#arguments
        }
      },
      initializeMiddleware: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: code => {
          if (typeof code === 'string') {
            this.use(Function('return ' + code)())
          } else if (typeof code === 'function') {
            this.use(code)
          } else {
            throw new Error('Invalid middleware: ' + code.toString())
          }
        }
      },
      initializeTrailer: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: code => {
          if (typeof code === 'string') {
            this.trailer(Function('return ' + code)())
          } else if (typeof code === 'function') {
            this.trailer(code)
          } else {
            throw new Error('Invalid trailer: ' + code.toString())
          }
        }
      },
      initializeHelpAnnotations: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: cfg => {
          if (cfg.hasOwnProperty('describeDefault') && typeof cfg.describeDefault === 'boolean') {
            this.#display.Default = cfg.describeDefault
          }
          if (cfg.hasOwnProperty('describeOptions') && typeof cfg.describeOptions === 'boolean') {
            this.#display.Options = cfg.describeOptions
          }
          if (cfg.hasOwnProperty('describeMultipleValues') && typeof cfg.describeMultipleValues === 'boolean') {
            this.#display.MultipleValues = cfg.describeMultipleValues
          }
          if (cfg.hasOwnProperty('describeRequired') && typeof cfg.describeRequired === 'boolean') {
            this.#display.Required = cfg.describeRequired
          }
        }
      }
    })

    this.updateHelp()
  }

  // @readonly
  get name () {
    return this.#name || 'Unknown'
  }

  // @readonly
  get description () {
    return this.#description || this.usage || ''
  }

  // @readonly
  get url () {
    return this.URL
  }

  // @readonly
  get URL () {
    let uri = (this.#url || '').trim()

    if (uri.length === 0) {
      if (this.hasOwnProperty('parent')) {
        return this.parent.URL
      } else if (this instanceof Command) {
        return this.shell.URL
      }
    }

    return uri
  }

  // @readonly
  get support () {
    let support = (this.#support || '').trim()

    if (support.length === 0) {
      if (this.hasOwnProperty('parent')) {
        return this.parent.support
      } else if (this instanceof Command) {
        return this.shell.support
      }
    }

    return support
  }

  get autohelp() {
    return this.#autohelp
  }

  set autohelp (value) {
    if (typeof value !== 'boolean') {
      return
    }
    this.#autohelp = value
    this.#processors.forEach(cmd => cmd.autohelp = value)
  }

  updateHelp () {
    this.#formattedDefaultHelp = new Formatter(this)
    this.#formattedDefaultHelp.width = this.#width
  }

  describeHelp (attr, prop) {
    if (this.#display[prop] !== null) {
      return this.#display[prop]
    }

    if (this instanceof Command) {
      if (this.shell && this.shell !== null && this.shell[attr] !== null) {
        return this.shell[attr]
      }
      
      if (this.parent !== null) {
        return this.parent[attr]
      }
    }

    return true
  }

  get describeDefault () {
    return this.describeHelp('describeDefault', 'Default')
  }

  get describeOptions () {
    return this.describeHelp('describeOptions', 'Options')
  }

  get describeMultipleValues () {
    return this.describeHelp('describeMultipleValues', 'MultipleValues')
  }

  get describeRequired () {
    return this.describeHelp('describeRequired', 'Required')
  }

  get usage() {
    if (this.#customUsage !== null) {
      return typeof this.#customUsage === 'function' ? this.#customUsage() : this.#customUsage
    }

    return this.#formattedDefaultHelp.usage
  }

  set usage (value) {
    if (typeof value === 'string' && value.trim().length === 0) {
      value = null
    }

    this.#customUsage = value

    this.updateHelp()
  }

  get help () {
    if (this.#customHelp) {
      return typeof this.#customHelp === 'function' ? this.#customHelp(this) : this.#customHelp
    }

    if (!this.autohelp) {
      return ''
    }

    return this.#formattedDefaultHelp.help
  }

  set help (value) {
    if (typeof value === 'string' && value.trim().length === 0) {
      value = null
    }

    this.#customHelp = value

    this.updateHelp()
  }

  // @private
  set defaultHandler (value) {
    if (typeof value === 'function') {
      this.#defaultHandler = value
      this.#hasCustomDefaultHandler = true
      this.#processors.forEach(cmd => cmd.defaultProcessor = value)
    } else {
      throw new Error(`Invalid default method (must be a function, not "${typeof value}").`)
    }
  }

  get defaultHandler () {
    return this.#defaultHandler
  }

  // @private
  get hasCustomDefaultHandler () {
    return this.#hasCustomDefaultHandler
  }

  get data () {
    const commands = {}

    Array.from(this.#processors.values()).forEach(cmd => {
      let data = cmd.data
      const name = data.name
      delete data.name
      commands[name] = data
    })

    return commands
  }

  get middleware() {
    return this.#middleware
  }

  get trailers () {
    return this.#trailer
  }

  get commands() {
    return this.#processors
  }

  getCommand(name = null) {
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

  remove() {
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

  use () {
    for (const arg of arguments) {
      if (typeof arg !== 'function') {
        throw new Error(`All "use()" arguments must be valid functions.\n${arg.toString().substring(0, 50)} ${arg.toString().length > 50 ? '...' : ''}`)
      }

      this.#middleware.use(arg)
    }

    this.#processors.forEach(subCmd => subCmd.use(...arguments))
  }

  trailer () {
    this.#trailer = this.#trailer || new Middleware()

    for (const arg of arguments) {
      if (typeof arg !== 'function') {
        throw new Error(`All "trailer()" arguments must be valid functions.\n${arg.toString().substring(0, 50)} ${arg.toString().length > 50 ? '...' : ''}`)
      }

      this.#trailer.use(arg)
    }

    this.#processors.forEach(subCmd => subCmd.trailer(...arguments))
  }

  add () {
    for (let command of arguments) {
      if (!(command instanceof Command)) {
        if (typeof command === 'object') {
          command = new Command(command)
        } else {
          throw new Error('Invalid argument. Only "Command" instances may be added to the processor.')
        }
      }

      command.autohelp = this.autohelp

      if (this instanceof Shell) {
        command.shell = this
      } else if (this instanceof Command) {
        command.parent = this
      }

      this.#processors.set(command.OID, command)
      this.#commands.set(command.name, command.OID)

      command.aliases.forEach(alias => this.#commands.set(alias, command.OID))
    }
  }
}
