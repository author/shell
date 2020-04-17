#!/usr/bin/env node --experimental-modules
import fs from 'fs'
import path from 'path'
import { Command, Shell } from '../../src/index.js'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'dir.json')))
const shell = new Shell(config)
const cmd = process.argv.slice(2).join(' ').trim()
shell.exec(cmd).catch(e => console.log(e.message || e))
