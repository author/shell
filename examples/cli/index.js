#!/usr/bin/env node --experimental-modules

import fs from 'fs'
import path from 'path'
import { Command, Shell } from '../../src/index.js'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json')))

const shell = new Shell({
  name: Object.keys(pkg.bin)[0],
  description: pkg.description,
  version: pkg.version,
  // autohelp: false,
  defaultMethod (data) {
    console.log(data)
  },
  commands: [{
    name: 'list',
    alias: 'ls',
    description: 'List files of a directory. Optionally specify a long format.',
    flags: {
      l: {
        description: 'Long format.',
        type: Boolean,
        default: false
      }
    },
    handler: (data) => {
      let dir = process.cwd()

      if (data.flags.unrecognized.length > 0) {
        dir = path.resolve(data.flags.unrecognized[0])
      }

      const out = fs.readdirSync(dir)
        .map(item => {
          if (data.flags.recognized.l) {
            return ((fs.statSync(path.join(dir, item)).isDirectory() ? '>' : '-') + ' ' + item).trim()
          }

          return item
        })
        .join(data.flags.recognized.l ? '\n' : ', ')

      console.log(out)
    }
  }, new Command({
    name: 'export',
    description: 'Export a file representation of a directory.',
    // Uncomment this to see how it works
    // handler (data) {
    //   console.log(data)
    //   console.log(this.help)
    // },
    commands: [{
      name: 'json',
      description: 'Generate a JSON representation of the directory.',
      flags: {
        array: {
          alias: 'a',
          type: 'boolean',
          default: false,
          description: 'Generate an array. This is a pretty long message for such a short explanation. Kinda Rube Goldbergish.'
        }
      },
      handler (data) {
        if (data.help.requested) {
          return console.log(this.help)
        }

        let dir = process.cwd()

        if (data.flags.unrecognized.length > 0) {
          dir = path.resolve(data.flags.unrecognized[0])
        }

        const contents = fs.readdirSync(dir)

        if (data.flags.recognized.array) {
          return console.log(contents)
        }

        const result = Object.defineProperty({}, dir, {
          enumerable: true,
          value: contents
        })

        console.log(JSON.stringify(result, null, 2))
      }
    }]
  })]
})

shell.add(new Command({
  name: 'mkdir',
  aliases: ['md', 'm'],
  description: 'Make a new directory.',
  flags: {
    p: {
      type: 'boolean',
      default: false,
      description: 'Recursively create the directory if it does not already exist.',
      alias: 'R'
    }
  },
  handler (data) {
    console.log('...make a directory...')
    console.log(data)
  }
}))


shell.add(new Command({
  name: 'doc',
  description: 'Output the metadoc of this shell.',
  handler () {
    console.log(shell.data)
  }
}))

shell.use((data, next) => {
  console.log('This middleware runs on every command.')
  next()
})

const cmd = process.argv.slice(2).join(' ').trim()
// console.log(cmd)
shell.exec(cmd).catch(e => console.log(e.message || e))
