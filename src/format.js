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
      const out = [`${this.#data.commandroot}${aliases.length > 0 ? ' <' + aliases.join(', ') + '>' : ''}${this.#data.__flagConfig.size > 0 ? ' [OPTIONS]' : ''}${this.#data.__extraOptions.size > 0 ? ' ' + Array.from(this.#data.__extraOptions).join(', ') : ''}`]
      
      if (desc.trim().length > 0 && out !== desc) {
        out.push(new Table([[desc.trim().replace(/\n/gi, '\n  ')]], null, null, this.#tableWidth, [2, 0, 1, 1]).output)
      }

      return out.join('\n')
    } else if (this.#data instanceof Shell) {
      return `${this.#data.name}${desc.trim().length > 0 ? new Table([[desc.trim().replace(/\n/gi, '\n  ')]], null, null, this.#tableWidth, [2, 0, 1, 1]).output : ''}${this.#data.__processors.size > 0 ? ' [COMMAND]' : ''}${this.#data.__extraOptions.size > 0 ? ' ' + Array.from(this.#data.__extraOptions).join(', ') : ''}\n\n  ${this.#data.description || ''} Version ${this.#data.version}.\n`.trim()
    }

    return ''
  }

  get help () {
    const usage = this.usage.trim()
    
    if (this.#data instanceof Command) {
      const flags = this.#data.__flagConfig
      const rows = []
      
      if (flags.size > 0) {
        flags.forEach((cfg, flag) => {
          let aliases = Array.from(cfg.aliases||[])
          aliases = aliases.length === 0 ? '' : '[' + aliases.map(a => `-${a}`).join(', ') + ']'
          rows.push(['-' + flag, aliases, cfg.description])
        })
      }

      const table = new Table(rows, this.#colAlign, this.#colWidth, this.#tableWidth, [2, 0, usage.length > 0 ? 1 : 0, 0])

      return usage + '\n\nOptions:' + table.output
    } else if (this.#data instanceof Shell) {
      const rows = Array.from(this.#data.__processors.values()).map(cmd => {
        return [cmd.name, (cmd.aliases||[]).length > 0 ? `[${cmd.aliases.join(', ').trim()}]` : '', cmd.description]
      })

      let result = [usage]

      if (rows.length > 0) {
        const table = new Table(rows, this.#colAlign, this.#colWidth, this.#tableWidth, [2])
        result.push(`\nCommands:\n`)
        result.push(table.output)
      }
      
      return result.join('\n')
    }

    return ''
  }
}

export { Formatter as default, Formatter, Table }