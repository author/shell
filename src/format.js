import Table from '../node_modules/@author.io/table/src/index.js'
import Command from './command.js'
import Shell from './shell.js'

class Formatter {
  #data = null
  #tableWidth = 80
  #colAlign = [] // Defaults to ['l', 'l', 'l']
  #colWidth = ['15%', '20%', '65%']

  constructor (data) {
    this.#data = data
  }

  set width (value) {
    this.#tableWidth = value < 20 ? 20 : value
  }

  set columnWidths (value) {
    this.#colWidth = value
  }

  set columnAlignment (value) {
    this.#colAlign = value
  }

  get usage () {
    const desc = this.#data.description.trim()
    
    if (this.#data instanceof Command) {
      const aliases = this.#data.aliases
      const out = [`${this.#data.commandroot}${aliases.length > 0 ? '|' + aliases.join('|') : ''}${this.#data.__flagConfig.size > 0 ? ' [FLAGS]' : ''}${this.#data.arguments.size > 0 ? ' ' + Array.from(this.#data.arguments).map(i => '<' + i + '>').join(' ') : ''}`]
      
      if (this.#data.__processors.size > 0) {
        out[out.length - 1] += (this.#data.arguments.size > 0 || this.#data.__flagConfig.size > 0 ? ' |' : '') + ' [COMMAND]'
      }

      if (desc.trim().length > 0 && out !== desc) {
        out.push(new Table([[desc.trim().replace(/\n/gi, '\n  ')]], null, null, this.#tableWidth, [2, 0, 1, 1]).output)
      }

      return out.join('\n')
    } else if (this.#data instanceof Shell) {
      return `${this.#data.name}${this.#data.__processors.size > 0 ? ' [COMMAND]' : ''}\n${desc.trim().length > 0 ? new Table([[desc.trim().replace(/\n/gi, '\n  ')]], null, null, this.#tableWidth, [2, 0, 1, 1]).output : ''}${this.#data.arguments.size > 0 ? ' ' + Array.from(this.#data.arguments).map(i => '[' + i + ']').join(' ') : ''}\n`.trim()
    }

    return ''
  }

  get subcommands () {
    const rows = Array.from(this.#data.__processors.values()).map(cmd => {
      let nm = [cmd.name].concat(cmd.aliases)
      return [nm.join('|'), cmd.description]
    })

    let result = []

    if (rows.length > 0) {
      const table = new Table(rows, this.#colAlign, ['25%', '75%'], this.#tableWidth, [2])
      result.push(`\nCommands:\n`)
      result.push(table.output)
    }

    return result.join('\n')
  }

  get help () {
    const usage = this.usage.trim()
    
    if (this.#data instanceof Command) {
      const flags = this.#data.__flagConfig
      const rows = []

      if (flags.size > 0) {
        flags.forEach((cfg, flag) => {
          let aliases = Array.from(cfg.aliases||cfg.alias||[])
          aliases = aliases.length === 0 ? '' : '[' + aliases.map(a => `-${a}`).join(', ') + ']'
          
          let dsc = [cfg.description || '']

          if (cfg.hasOwnProperty('options') && this.#data.describeOptions) {
            dsc.push(`Options: ${cfg.options.join(', ')}.`)
          }
          
          if (cfg.hasOwnProperty('allowMultipleValues') && cfg.allowMultipleValues === true && this.#data.describeMultipleValues) {
            dsc.push('Can be used multiple times.')
          }

          if (cfg.hasOwnProperty('default') && this.#data.describeDefault) {
            dsc.push(`(Default: ${cfg.default.toString()})`)
          }

          if (cfg.hasOwnProperty('required') && cfg.required === true && this.#data.describeRequired) {
            dsc.unshift('Required.')
          }

          dsc = dsc.join(' ').trim()
          
          rows.push(['-' + flag, aliases || '', dsc || ''])
        })
      }

      const table = new Table(rows, this.#colAlign, this.#colWidth, this.#tableWidth, [2, 0, usage.length > 0 ? 1 : 0, 0])
      
      let subcommands = '\n' + this.subcommands
      if (subcommands.trim().length === 0) {
        subcommands = ''
      }
      return usage + (flags.size > 0 ? '\n\nFlags:\n' + table.output : '') + subcommands
    } else if (this.#data instanceof Shell) {
      return [usage, this.subcommands].join('\n')
    }

    return ''
  }
}

export { Formatter as default, Formatter, Table }