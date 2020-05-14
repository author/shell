import Command from './command.js'
import Base from './base.js'
import { Parser } from '../node_modules/@author.io/arg/index.js'
import { COMMAND_PATTERN } from './utility.js'

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
  // Sort hints by string match
  #hintsort = (matchString, a, b) => {
    const ai = a.toLowerCase().indexOf(matchString.toLowerCase())
    const bi = b.toLowerCase().indexOf(matchString.toLowerCase())
    return ai < bi ? -1 : (ai > bi ? 1 : 0)
  }
  
  constructor (cfg = { maxhistory: 100 }) {
    super(cfg)

    this.initializeHelpAnnotations(cfg)

    this.__commonflags = cfg.commonflags || {}

    if (cfg.hasOwnProperty('use') && Array.isArray(cfg.use)) {
      cfg.use.forEach(code => this.initializeMiddleware(code))
    }

    if (cfg.hasOwnProperty('trailer') && Array.isArray(cfg.trailer)) {
      cfg.trailer.forEach(code => this.initializeTrailer(code))
    }

    this.#version = cfg.version || '1.0.0'
    this.#maxHistoryItems = cfg.maxhistory || cfg.maxHistoryItems || 100
    this.#tabWidth = cfg.hasOwnProperty('tabWidth') ? cfg.tabWidth : 4
  
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

  hint (cmd) {
    cmd = cmd.toLowerCase()
    let response = null
    let args = cmd.match(COMMAND_PATTERN)
    let match = args === null ? cmd : args[1].toLowerCase()
    let commands = Array.from(this.__commands.keys()).filter(name => name.toLowerCase().indexOf(match) >= 0)

    if (args) {
      args = args.slice(1)
      match = args[0]
      
      switch (args.length) {
        case 1:
          break
        
        default:
          if ((['version', 'help']).indexOf(match) >= 0) {
            break
          }

          let command = this.__commands.get(match)
          if (!command) {
            break
          }

          command = this.__processors.get(command).getTerminalCommand(cmd.replace(new RegExp(`^${match}\\s+`, 'i'), ''))
          const subcmd = command.command
          const flags = subcmd.__flagConfig

          match = command.arguments.toLowerCase()

          response = {
            commands: Array.from(subcmd.__commands.keys())
              .filter(name => name.toLowerCase().indexOf(match) >= 0
                || subcmd.__processors.get(subcmd.__commands.get(name)).aliases
                  .filter(a => a.toLowerCase().indexOf(match) >= 0).length > 0).sort((a, b) => this.#hintsort(match, a, b)
              ),
            flags: Array.from(flags.entries()).filter(keypair => {
              const flag = keypair.pop()
              const name = keypair.pop()
              
              return name.toLowerCase().indexOf(match) >= 0
                || (flag.aliases || []).filter(a => a.toLowerCase().indexOf(match) >= 0).length > 0
                || (flag.alias || '').toLowerCase().indexOf(match) >= 0
            }).sort((a, b) => this.#hintsort(match, a, b))
          }

          break
      }
    }
    
    if (response === null && commands.length > 0) {
      response = {
        commands: commands.sort((a, b) => this.#hintsort(match, a, b)),
        flags: []
      }
    }

    if (response !== null) {
      response.input = cmd
      response.commands = response.commands.filter(c => c.toLowerCase() !== match).map(c => {
        return {
          name: c, 
          match: [
            c.indexOf(match),
            c.indexOf(match) + (match.length - 1)
          ]
        } 
      })

      response.flags = response.flags.filter(f => f.toLowerCase() !== match).map(f => {
        return {
          name: f,
          match: [
            f.indexOf(match),
            f.indexOf(match) + (match.length - 1)
          ]
        }
      })

      if (response.commands.length === 0 && response.flags.length === 0) {
        return null
      }
    }

    return response
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

    return count === null ? this.#history.slice() : this.#history.slice(0, count)
  }

  priorCommand (count = 0) {
    if (this.#history.length === 0) {
      return null
    }
    
    if (count < 0) {
      return this.nextCommand(abs(count))
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
      return this.priorCommand(abs(count))
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

  async exec (input, callback) {
    this.#history.unshift({ input, time: new Date().toLocaleString()})

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

    let processor = this.__processors.get(action)

    if (!processor) {
      return Command.stderr('Command not found.')
    }

    const term = processor.getTerminalCommand(args)
    return await Command.reply(await term.command.run(term.arguments, callback))
  }

  getCommandMiddleware (cmd) {
    let results = []
    cmd.split(/\s+/).forEach((c, i, a) => {
      let r = this.#middlewareGroups.get(a.slice(0, i + 1).join(' '))
      r && results.push(r.flat(Infinity))
    })

    return results.flat(Infinity)
  }

  // Clear the terminal
  clear () {
    console.clear()
    // .write('\x1b[0f') // regular clear
    // .write('\x1b[2J') // full clear
    // .write('\033[0;0f') //ubuntu
  }
}
