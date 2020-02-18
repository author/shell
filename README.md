# @author.io/shell ![Version](https://img.shields.io/github/v/tag/author/shell?label=Latest&style=for-the-badge)

![Build Status](https://travis-ci.org/author/shell.svg?branch=master) using the  [cross-runtime template](https://github.com/author/template-cross-runtime).

This is a super-lightweight framework for building text-based programs, like [CLI](https://en.wikipedia.org/wiki/Command-line_interface) applications.

## Uses

There are two types of text-based apps:

1. **Single Purpose** (_a_ command)
    These are tools which may have multiple configuration options, but ultimately only do one thing. Examples include [node-tap](https://node-tap.org/), [mocha](https://mochajs.org/), [standard](https://standardjs.com/), prettier, etc.

    For example, node-tap can be run on a file, using syntax like `tap [options] [<files>]`. Ultimately, this utility serves one purpose. It just runs a configured tap process.
    <br/>

1. **Multipurpose** (a shell for _multiple_ commands)
    Other tools do more than configure a script. Consider npm, which has several subcommands (like `install`, `uninstall`, `info`, etc). Subcommands often behave like their own single purpose tool, with their own unique flags, and even subcommands of their own. Docker is a good example of this, which has an entire series of management subcommands.

#### Is this library overkill?

This framework is designed to support multipurpose CLI tools. At it's core, it provides a clean, easily-understood, repeatable organizational pattern for building maintainable multipurpose CLI applications.

This framework provides a very minimal layer of overhead, which is a necessity for multipurpose tools. This overhead is unnecessary in single purpose tools. For single purpose commands, use the [@author.io/arg](https://github.com/author/arg) for flag parsing. `@author.io/arg` is embedded in this framework, making `@author.io/shell` _capable_ of creating single purpose tools, but unnecessary.

**Think about how your tooling evolves...**

Sometimes single purpose tools grow into multipurpose tools over time. Tools which start out using the `@author.io/arg` library can easily be transitioned into multipurpose apps using `@author.io/shell`. After all, they use the same code, just nicely separated by purpose.

## Installation & Usage

### For Node

`npm install @author.io/node-shell`

Please note, you'll need a verison of Node that support ESM Modules. In Node 12, this feature is behind the `--experimental-modules` flag. It is available in Node 13+ without a flag, but your `package.json` file must have the `"type": "module"` attribute.

If you need to use the older CommonJS format (i.e. `require`), run `npm install @author.io/node-shell-legacy` instead.

### For Browsers

**CDN**

```javascript
import { Shell, Command } from 'https://cdn.pika.dev/@author.io/browser-shell/v1'
```

Also available from [jsdelivr](https://www.jsdelivr.com/?query=%40author.io%2Fshell) and [unpkg](https://unpkg.com/@author.io/browser-shell).

**npm options**

If you wish to bundle this library in your build process, use the version most appropriate to your target runtimes:

- `npm install @author/shell` (source)
- `npm install @author/browser-shell` (Minified ES Module)
- `npm install @author/browser-shell-es6` (IIFE Minified Module - globally accessible)

### Debugging

Each distribution has a corresponding `-debug` version that should be installed _alongside_ the main module (the debugging is an add-on module). For example, `npm install @author.io/node-shell-debug --save-dev` would install the debugging code for Node.

## Basic Examples

There is a complete working example of a CLI app (with a mini tutorial) in the examples directory.

_This example imports the library for Node. Simply swap the Node import for the appropriate browser import if you're building a web utility. Everything else is the same for both Node and browser environments._ 

```javascript
import { Shell, Command } from '@author.io/node-shell'

// Define a command
const ListCommand = new Command({
  name: 'list',
  description: 'List the contents of the directory.',
  alias: 'ls',
  // Any flag parsing options from the @author.io/arg library can be configured here.
  // See https://github.com/author/arg#configuration-methods for a list.
  flags: {
    l: {
      description: 'Long format'.
      type: 'boolean',
      default: false
    },
    rootDir: {
      description: 'The root directory to list.',
      aliases: ['input', 'in', 'src'],
      single: true
    }
  },
  handler (args, callback) {
    // ... this is where your command actually runs ...
    
    // Data comes from @author.io/arg lib. It looks like:
    // {
    //   command: 'list',
    //   input: 'whatever user typed after "list"',
    //   flags: {
    //     recognized: {}, 
    //     unrecognized: [
    //       'whatever',
    //       'user',
    //       'typed'
    //     ]
    //   },
    //   valid: false,
    //   violations: [],
    //   flag (name) { return String }
    // }
    console.log(data)

    // Execution callbacks are optional. If a callback is passed from the 
    // execution context to this handler, it will run after the command 
    // has finished processing 
    // (kind of like "next" in Express).
    // Promises are also supported.
    callback && callback()
  }
})

const shell = new Shell({
  name: 'myapp',
  version: '1.0.0',
  description: 'My demo app.',
  commands: [
    // These can be instances of Command...
    list,
    
    // or just the configuration of a Command
    {
      name: 'find',
      description: 'Search metadoc for all the things.',
      alias: 'search',
      flags: {
        x: {
          type: 'string',
          required: true
        }
      },
      handler: (data, cb) => {
        console.log(data)
        console.log(`Mirroring input: ${data.input}`)

        cb && cb()
      }
      // Subcommands are supported
      // , commands: [...]
    }
  ]
})

// Run a command
shell.exec('find "some query"')

// Run a command using a promise.
shell.exec('find "some query"').then(() => console.log('Done!))

// Run a command using a callback (the callback is passed to the command's handler function)
shell.exec('find "some query"', () => console.log('Handled!'))

// Run a command, pass a callback to the handler, and use a promise to determine when everything is done.
shell.exec('find "some query"', () => console.log('Handled!')).then(() => console.log('Done!))

// Output the shell's default messages
console.log(shell.help)
console.log(shell.usage)
console.log(shell.description)
```

## Custom Handlers

Each command has a handler function, which is responsible for doing something. This command receives a reference to the parsed flags.

```json
{
  command: 'commandname',
  input: 'whatever user typed after "commandname"',
  flags: {
    recognized: {}, 
    unrecognized: [
      'whatever',
      'user',
      'typed'
    ]
  },
  flag (name) { return String },
  valid: false,
  violations: []
}
```

- **command** is the command name.
- **input** is the string typed in after the command (flags)
- **flags** contains the parsed flags from the [@author.io/arg](https://github.com/author/arg) library.
- **`flag()`** is a special method for retrieving the value of any flag (recognized or unrecognized). See below.
- **valid** indicates whether the input conforms to the parsing rules.
- **violations** is an array of strings, where each string represents a violation of the parsing rules.

_The `flag()` method_ is a shortcut to help developers create more maintainable and understandable code. Consider the following example that does **not** use the flag method:

```javascript
const cmd = new Command({
  name: 'demo',
  flags: {
    a: { type: String },
    b: { type: String }
  },
  handler: metadata => {
    console.log(`A is "${metadata.flags.recognized.a}"`)
    console.log(`B is "${metadata.flags.recognized.b}"`)
  }
})
```

Compare the example above to this cleaner version:

```javascript
const cmd = new Command({
  name: 'demo',
  flags: {
    a: { type: String },
    b: { type: String }
  },
  handler: metadata => {
    console.log(`A is "${metadata.flag('a')}"`)
    console.log(`B is "${metadata.flag('b')}"`)
  }
})
```

While the differences aren't extreme, it abstracts the need to know whether a flag is recognized or not (or even exists).
