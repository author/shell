import Command from './command.js'

const COMMAND_PATTERN = /^(\w+)\s+([\s\S]+)?/i

export default class Shell {
  #processors = new Map()
  #commands = new Map()
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
  #hasCustomDefaultMethod = false
  #defaultMethod = data => {
    if (data.help && data.help.requested) {
      console.log(data.help.message)
    }
  }

  constructor (cfg = { maxhistory: 100 }) {
    this.#name = cfg.name || 'unknown'
    this.#description = cfg.description || null
    this.#version = cfg.version || '1.0.0'
    this.#maxHistoryItems = cfg.maxhistory || 100

    this.#tabWidth = cfg.hasOwnProperty('tabWidth') ? cfg.tabWidth : 4
    this.#tableWidth = cfg.hasOwnProperty('tableWidth') ? cfg.tableWidth : 70

    if (cfg.hasOwnProperty('autohelp')) {
      this.#autohelp = cfg.autohelp
    }

    if (cfg.hasOwnProperty('defaultMethod')) {
      this.defaultMethod = cfg.defaultMethod
    }

    if (Array.isArray(cfg.commands)) {
      cfg.commands.forEach(cmd => this.add(cmd))
    }
  }

  set tableWidth(value) {
    this.#tableWidth = value
    this.#processors.forEach(cmd => cmd.tableWidth = value)
  }

  set tabWidth(value) {
    this.#tabWidth = value
    this.#processors.forEach(cmd => cmd.tabWidth = value)
  } 

  get autohelp () {
    return this.#autohelp
  }

  // @private
  set defaultHandler(value) {
    if (typeof value === 'function') {
      this.#defaultMethod = value
      this.#hasCustomDefaultMethod = true
      this.#processors.forEach(cmd => cmd.defaultProcessor = value)
    } else {
      throw new Error(`Invalid default method (must be a function, not ${typeof cfg.defaultMethod}).`)
    }
  }

  // @private
  get hasCustomDefaultMethod() {
    return this.#hasCustomDefaultMethod
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
    if (this.#customUsage) {
      return typeof this.#customUsage === 'function' ? this.#customUsage(this) : this.#customUsage
    }

    return `${this.#name} ${this.#version}\n\n  ${this.#description || ''}\n`.trim()
  }

  set usage (value) {
    this.#customUsage = value
  }

  get help () {
    if (this.#customHelp) {
      return typeof this.#customHelp === 'function' ? this.#customHelp(this) : this.#customHelp
    }

    let mainmsg = [this.usage + '\n']
    
    const help = new Map()
    
    let nameWidth = 0
    let aliasWidth = 0
    let tabWidth = this.#tabWidth
    let maxWidth = this.#tableWidth

    this.#processors.forEach(proc => {
      nameWidth = proc.name.length > nameWidth ? proc.name.length : nameWidth
      aliasWidth = proc.aliases.join(', ').trim().length + proc.aliases.length > aliasWidth ? proc.aliases.join(', ').trim().length + proc.aliases.length : aliasWidth
      
      let summary = proc.description

      let size = proc.subcommands.size
      if (size > 0) {
        summary += ` Has ${ size === 1 ? 'an' : size } additional subcommand${ size !== 1 ? 's' : '' }.`
      }

      help.set(proc.name, {
        description: summary,
        aliases: proc.aliases
      })
    })

    help.forEach((data, name) => {
      let msg = name
      
      // Command name
      while (msg.length < nameWidth) {
        msg += ' '
      }

      // Aliases
      let aliases = data.aliases.map(item => `${item}`).join(', ')
      while (aliases.length < aliasWidth) {
        aliases += ' '
      }
      
      msg += (aliases.trim().length > 0 ? '  [' + aliases.replace(/^(.*[^\s])/i, '$1]$`') : aliases) + '\t'

      // Desc
      let desc = []
      let tabs = msg.match(/\t/gi).length
      let descWidth = maxWidth - (nameWidth + aliasWidth + 10)

      if (data.description && data.description.length > descWidth) {
        let dsc = new String(data.description)
        let match = new RegExp(`(.{0,${descWidth}}[\\s\n])`, 'g')
        
        desc = data.description.match(match)    
        desc.push(dsc.replace(desc.join(''), ''))

        while (desc.length > 1 && desc[desc.length - 1].length + desc[desc.length - 2].length < descWidth) {
          desc[desc.length - 2] += desc.pop()
        }
     
        desc = desc.reverse().map(item => item.trim())
      } else {
        desc.push(data.description)
      }

      if (desc.length > 0) {
        let prefix = ''
        for (let i = 0; i < (nameWidth + aliasWidth + 10 + (tabs * tabWidth)); i++) {
          prefix += ' '
        }

        msg += ' : ' + desc.pop()
        while (desc.length > 0) {
          msg += `\n${prefix}${desc.pop()}`
        }
      }

      mainmsg.push('  - ' + msg)
    })

    let tab = ''
    for (let i = 0; i < tabWidth; i++) {
      tab += ' '
    }

    return mainmsg.join('\n') + '\n'.replace(/\n{2,}$/, '\n').replace(/\t/g, tab)
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

      if (!command.hasCustomDefaultMethod) {
        command.defaultMethod = this.#defaultMethod
      }
      
      command.autohelp = this.#autohelp
      command.shell = this

      this.#processors.set(command.OID, command)
      this.#commands.set(command.name, command.OID)
      
      command.aliases.forEach(alias => this.#commands.set(alias, command.OID))
    }
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

    return await Command.reply(await processor.run(args, callback))
  }
}