# @author.io/shell
![Version](https://img.shields.io/github/v/tag/author/shell?label=Latest&style=for-the-badge)

This is a super-lightweight framework for building text-based programs, like [CLI](https://en.wikipedia.org/wiki/Command-line_interface) applications. See the [installation guide](#installation) to jumpstart your CLI.

---
This library is now supported by this [Chrome CLI Devtools Extension](https://chrome.google.com/webstore/detail/cli/okpglddgmnblhbdpdcmodmacgcibgfkf):

![Devtools Extension](https://lh3.googleusercontent.com/WKZpJavmX4RRPyaVBFe6Vn88ZXJbjy9FCP_Mwyxo1JrWY78a9_Rh9c-sy4TawzIKy8xUmnXoxes=w640-h400-e365)

You can see the library in use (in browsers and Node.js) in this [OpenJS World 2020 talk](https://youtu.be/dw7ABwvFtdM) (The Benefits of a "CLI First" Development Strategy).

---

## Uses

There are two types of text-based apps:

1. **Single Purpose** (_a_ command)
    These are tools which may have multiple configuration options, but ultimately only do one thing. Examples include [node-tap](https://node-tap.org/), [mocha](https://mochajs.org/), [standard](https://standardjs.com/), prettier, etc.

    For example, node-tap can be run on a file, using syntax like `tap [options] [<files>]`. Ultimately, this utility serves one purpose. It just runs a configured tap process.
    <br/>

1. **Multipurpose** (a shell for _multiple_ commands)
    Other tools do more than configure a script. Consider npm, which has several subcommands (like `install`, `uninstall`, `info`, etc). Subcommands often behave like their own single purpose tool, with their own unique flags, and even subcommands of their own. Docker is a good example of this, which has an entire series of management subcommands.

#### Is this "framework" overkill?

**tl;dr** Use this library to create multipurpose tools. Use [@author.io/arg](https://github.com/author/arg) to create single purpose tools.

<details>
<summary>Detailed Explanation</summary>
<br/>

This framework was designed to support multipurpose CLI tools. At the core, it provides a clean, easily-understood, repeatable pattern for building maintainable multipurpose CLI applications.

Multipurpose tools require a layer of organizational overhead to help isolate different commands and features. This overhead is unnecessary in single purpose tools. Single purpose tools just need argument parsing, which the [@author.io/arg](https://github.com/author/arg) does very well.

`@author.io/arg` is embedded in this framework, making `@author.io/shell` _capable_ of creating single purpose tools, but it's merely unnecessary overhead for single purpose commands.
</details>
<br/>

**Think about how your tooling evolves...**

Sometimes single purpose tools grow into multipurpose tools over time. Tools which start out using the `@author.io/arg` library can be transitioned into multipurpose tools using `@author.io/shell` (with reasonable ease). After all, they use the same code, just nicely separated by purpose.

## Differentiating Features

1. Supports **middleware** (express-style).
1. Supports **postware** (middleware that runs after a command).
1. **Customizable **help/usage** screens.
1. Produces **introspectable** JSON. Load a JSON config, have a working CLI.
1. Reusable **plugin** system.
1. Dynamically add/remove commands.
1. Track command execution **history**.
1. Define **universal flags** once, reuse in all commands.

<details>
<summary><b>Also has better source & distribution code</b></summary>

1. Cross-runtime (browser, node, deno)
1. Separation of Concerns: Arg parsing and text formatting are separate microlibs.
1. Modern ES Module syntax
1. 40+ unit tests

</details>

## Basic Examples

See the [Installation Guide](#installation) when you're ready to get started.

There is a complete working example of a CLI app (with a mini tutorial) in the examples directory.

_This example imports the library for Node. Simply swap the Node import for the appropriate browser import if you're building a web utility. Everything else is the same for both Node and browser environments._

```javascript
import { Shell, Command } from '@author.io/shell'

// Define a command
const ListCommand = new Command({
  name: 'list',
  description: 'List the contents of the directory.',
  disableHelp: false, // Set to true to turn off default help messages for the entire shell (you can still provide your own). Defaults to false.
  // arguments are listed after the command in the default help screen. Ex: "dir list path"
  arguments: 'path', // Can be space/comma/tab/semicolon delimited or an array.
  alias: 'ls',
  // Any flag parsing options from the @author.io/arg library can be configured here.
  // See https://github.com/author/arg#configuration-methods for a list.
  flags: {
    long: {
      alias: 'l',
      description: 'Long format'.
      type: 'boolean',
      default: false
    },
    rootDir: {
      description: 'The root directory to list.',
      aliases: ['input', 'in', 'src'],
      single: true,
      // validate: RegExp/Function (see github.com/author/arg)
    }
  },
  handler (metadata, callback) {
    // ... this is where your command actually does something ...

    // Data comes from @author.io/arg lib. It looks like:
    // {
    //   command: <Command>,
    //   input: 'whatever user typed after "command"',
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
    //   flag (name) { return String },
    //   data (getter)
    // }
    console.log(metadata)

    // A single flag's value can be retrieved with this helper method.
    console.log(metadata.flag('long'))

    // Any unrecognized flags can be retrieved by index number (0-based)
    console.log(metadata.flag(0)) // The first unrecognized flag... returns null if it doesn't exist

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
  // This middleware runs before all command handlers.
  use: [
    (meta, next) => { ...; next() }
  ],
  // Trailers are like "post-middleware" that run after command handlers.
  trailer: [
    (meta, next) => { ...; next() }
    (meta, next) => { console.log('All done!') }
  ],
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

```javascript
{
  command: <Command>,
  input: 'Raw string of flags/arguments passed to the command',
  flags: {
    recognized: {},
    unrecognized: [
      'whatever',
      'user',
      'typed'
    ]
  },
  flag (name) { return <Value> },
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
- **data** _(getter)_ returns a key/value object with all of the known flags, as well as an _attempt_ to map any unrecognized flags with known argument names. (See basic example for argument example)

<details>
<summary><b>Understanding flag()</b></summary>
<br/>

The `flag()` method is a shortcut to help developers create more maintainable and understandable code. Consider the following example that does **not** use the flag method:

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
    console.log(`A is "${metadata.flag('a')}"`) // <-- Here
    console.log(`B is "${metadata.flag('b')}"`) // <-- and here
  }
})
```

While the differences aren't extreme, it abstracts the need to know whether a flag is recognized or not (or even exists). If a `flag()` is executed for a non-existant flag, it will return `null`.
</details>

<details>
<summary><b>Understanding <i>data</i></b></summary>
The `data` attribute supplied to handlers in the metadata argument contains the values for known flags, and _**attempts to map unknown arguments** to configured argument names_.

For example,

```javascript
const shell = new Shell({
  name: 'account',
  commands: [{
    name: 'create',
    arguments: 'email displayName',
    handler (meta) {
      console.log(meta.data)
    }
  }]
})

shell.exec('create me@domain.com "John Doe" test1 test2')
```

_Output:_

```json
{
  "email": "me@domain.com",
  "displayName": "John Doe",
  "unknown1": "test1",
  "unknown2": "test2
}
```

If there is a name conflict, the output will contain an array of values. For example:

```javascript
const shell = new Shell({
  name: 'account',
  commands: [{
    name: 'create',
    arguments: 'email displayName',
    flags: {
      email: {
        alias: 'e'
      }
    },
    handler (meta) {
      console.log(meta.data)
    }
  }]
})

shell.exec('create me@domain.com -e bob@other.com')
```

_Output:_

```json
{
  "email": ["bob@other.com", "me@domain.com"],
  "displayName": "John Doe",
}
```

> Notice the values from the known flags are _first_.
</details>

### Custom Handler Data References

When building JavaScript applications, it may be desirable to pass data references to the `exec` method, making them available to handlers. For example:

```javascript
const sh = new Shell({
  name: 'test',
  commands: [{
    name: 'run',
    async handler (meta) {
      return meta.reference.test // reference data
    }
  }]
})

const ref = { test: true }
const result = await sh.exec('run', { reference: ref })
```

In the command above, the reference data (second to last line) is passed to the `exec()` method using a special object as the second argument. This object is made available in the handler using the `meta.reference` attribute.

If a callback needs to be defined, the second argument of the `exec` method must have an attribute called `callback`, i.e.:

```javascript
const ref = {
  test: true
}

const result = await sh.exec('run', {
  reference: ref,
  callback: function () {...}
})
```

The callback method is _not_ available in the `meta.reference`, but the callback will be executed when `exec()` is executed.

## Plugins

Plugins expose functions, objects, and primitives to shell handlers.

_Example:_

Consider an example where information is retrieved from a remote API. To do this, an HTTP request library may be necessary to make the request and parse the results. In this example, the axios library is defined as a plugin. The plugin is accessible in the metadata passed to each handler, as shown below.

<details>
  <summary>Why would you do this?</summary>
  <p>
  Remember, the shell library can produce JSON (See the Introspection/Metadata Generation section). JSON is a <i>string</i> format for storing data. The output will contain a stringified version of all the handler functions. This can be used as the configuration for another instance of a shell. In other words, you can maintain a runtime-agnostic configuration. You could use _mostly_ the same configuration for the browser, Node, Deno, Vert.x, or another JavaScript runtime. However; the modules/packages like the HTTP request module may or may not work in each runtime.
  </p>
  <p>
  Plugins allow developers to write handlers that are completely "self contained". It is then possible to modify the plugin configuration for each runtime without modifying every handler in the shell.
  </p>
</details>
<br/>

```javascript
import axios from 'axios'

const sh = new Shell({
  name: 'info',
  plugins: {
    httprequest: axios // replace this with any compatible library
  },
  commands: [{
    name: 'person',
    flags: {
      name: {
        description: 'Name of the person you want info about.',
        required: true
      }
    },
    handler (meta) {
      meta.plugins.httprequest({
        method: 'get',
        url: `http://api.com/person/${meta.flag('name')}`
      }).then(console.log).catch(console.error)
    }
  }, {
    name: 'group',
    flags: {
      name: {
        description: 'Name of the group you want info about.',
        required: true
      }
    },
    handler (meta) {
      meta.plugins.httprequest({
        method: 'get',
        url: `http://api.com/group/${meta.flag('name')}`
      }).then(console.log).catch(console.error)
    }
  }]
})
```

Commands will inherit plugins from the shell and any parent commands. It is possible to "override" a plugin in any specific command.

<details>
<summary>Override Example</summary>

```javascript
const sh = new Shell({
  name: 'test',
  plugins: {
    test: value => {
      return value + 1
    }
  },
  commands: [{
    name: 'cmd',
    plugins: {
      test: value => {
        return value + 10
      }
    },
    handler(meta) {
      console.log(meta.test(1)) // Outputs 11
    }
  }]
})
```

</details>

## Universal Flags
_Common flags are automatically applied to multiple commands._

Sometimes a CLI app has multiple commands/subcommands that need the same flag associated with each command/subcommand. For example, if a `--note` flag were needed on every command, it would be a pain to copy/paste the config into every single command. Common flags resolve this by automatically applying to all commands from the point where the common flag is configured (i.e. the point where inheritance/nesting begins).

<details>
<summary>Apply a common flag to ALL commands</summary>
To include the same flag on all commands, add a common flag to the shell.

```javascript
const shell = new Shell({
  name: 'mycli',
  commmonflags: {
    note: {
      alias: 'n',
      description: 'Save a note about the operation.'
    }
  },
  commands: [{
    name: 'create',
    flag: {
      writable: {
        alias: 'w',
        description: 'Make it writable.'
      }
    },
    ...
  }, {
    name: 'read',
    ...
  }]
})

shell.exec('create --help')
shell.exec('read --help')
```

<b>create output:</b>
```sh
mycli create

Flags:
  note      [-n]          Save a note about the operation.
  writable  [-w]          Make it writable.
```

<b>read` output:</b>
```sh
mycli read

Flags:
  note      [-n]          Save a note about the operation.
```
</details>

<details>
<summary>Apply a common flag to a specific command/subcommands</summary>

```javascript
const shell = new Shell({
  name: 'mycli',
  commands: [{
    name: 'create',
    commmonflags: {
      note: {
        alias: 'n',
        description: 'Save a note about the operation.'
      }
    },
    flag: {
      writable: {
        alias: 'w',
        description: 'Make it writable.'
      }
    },
    commands: [...]
    ...
  }, {
    name: 'read',
    description: 'Read a directory.',
    ...
  }]
})

shell.exec('create --help')
shell.exec('read --help')
```

_`create` output:_
```sh
mycli create

Flags:
  note      [-n]          Save a note about the operation.
  writable  [-w]          Make it writable.
```

_`read` output:_
```sh
mycli read

  Read a directory.

```
</details>

#### Filtering Universal Flags

Universal/common flags accept a special attribute named `ignore`, which will prevent the flags from being applied to specific commands. This should be used sparingly.

<details>
<summary><b>Cherry-picking example</b></summary>
<br/>

```javascript
const shell = new Shell({
  name: 'mycli',
  commmonflags: {
    ignore: 'info', // This can also be an array of string. Fully qualified subcommands will also be respected.
    note: {
      alias: 'n',
      description: 'Save a note about the operation.'
    }
  },
  commands: [{
    name: 'create',
    handler () {}
  }, {
    name: 'read',
    handler () {}
  }, {
    name: 'update',
    handler () {}
  }, {
    name: 'delete',
    handler () {}
  }, {
    name: 'info',
    handler () {}
  }]
})
```

Any command, except `info`, will accepts/parse the `note` flag.

</details>

## Middleware

When a command is called, it's handler function is executed. Sometimes it is desirable to pre-process one or more commands. The shell middleware feature supports "global" middleware and "assigned" middleware.

### Global Middleware

This middleware is applied to all handlers, unilaterally. It is useful for catching syntax errors in commands, preprocessing data, and anything else you may want to do before the actual handler is executed.

For example, the following middleware checks the input to determine if all of the appropriate flags have been set. If not, the violations are displayed and the handler is never run. If everything is correct, the `next()` method will continue processing.

```javascript
shell.use(function (metadata, next) {
  if (!metadata.valid) {
    metadata.violations.forEach(violation => console.log(violation))
  } else {
    next()
  }
})
```

No matter which command the user inputs, the global middleware methods are executed.

### Assigned Middleware

This middleware is assigned to one or more commands. For example:

```javascript
shell.useWith('demo', function (metadata, next) {
  if (metadata.flag('a') === null) {
    console.log('No "a" flag specified. This may slow down processing.')
  }

  next()
})
```

The code above would only run when the user inputs the `demo` command (or any `demo` subcommand).

#### Command-Specific Assignments

It is possible to assign middleware to more than one command at a time, and it is possible to target subcommands. For example:

```javascript
shell.useWith(['demo', 'command subcommand'], function (metadata, next) {
  if (metadata.flag('a') === null) {
    console.log('I hope you know what you are doing!')
  }

  next()
})
```

Notice the array as the first argument of the `useWith` method. This middleware would be assigned to `demo` command, all `demo` subcommands, the `subcommand` of `command`, and all subcommands of `subcommand`. If this sounds confusing, just know that middleware is applied to commands, including nested commands.

Assigned middleware can also be applied directly to a `Command` class. For example,

```javascript
const cmd = new Command({
  name: 'demo',
  flags: {
    a: { type: String },
    b: { type: String }
  },
  handler: metadata => {
    console.log(metadata)
  }
})

cmd.use(function (metadata, next) {
  console.log(`this middleware is specific to the "${cmd.name}" command`)
  next()
})
```

#### Command-Exclusion Assignments

Sometimes middleware needs to be applied to all but a few commands. The `useExcept` method supports these needs. It is basically the opposite of `useWith`. Middleware is applied to all commands/subcommands _except_ those specified.

For example:

```javascript
const shell = new Shell({
  ...,
  commands: [{
    name: 'add',
    handler (meta) {
      ...
    }
  }, {
    name: 'subtract',
    handler (meta) {
      ...
    }
  }, {
    name: 'info',
    handler (meta) {
      ...
    }
  }]
})

shell.useExcept(['info], function (meta, next) {
  console.log(`this middleware is only applied to some math commands`)
  next()
})
```

In this example, the console statement would be displayed for all commands except the `info` command (and any info subcommands).

### Built-in "Middleware"

Displaying help and version information is built-in (overridable).

**Help**

Appending `--help` to anything will display the help content for the shell/command/subcommand. This will respect any custom usage/help configurations that may be defined.

**Shell Version**

A `version` command is available on the shell. For example:

```sh
$ cmd version
1.0.0
```

The following common flag variations map to the version command, producing the same output:

```sh
$ cmd --version
1.0.0

$ cmd -v
1.0.0
```

This can be overridden by creating a command called `version`, the same way any other command is created.

```javascript
const v = new Command({
  name: 'version',
  handler (meta) {
    console.log(this.shell.version)
  }
})

shell.add(v)
```

### Middleware Libraries

One development goal of this framework is to remain as lightweight and unopinionated as possible. Another is to be as simple to use as possible. These two goals often conflict with each other (the more features you add, the heavier it becomes). In an attempt to find a comfortable balance, some additional middleware libraries are available for those who want a little extra functionality.

1. [@author.io/shell-middleware](https://github.com/author/shell-middleware)
1. Submit a PR to add yours here.

### Trailers
_(Postware/Afterware)_

Trailers operate just like middleware, but they execute _after_ the command handler is executed.

```javascript
const shell = new Shell({
  name: 'mycli',
  trailer: [
    function () { console.log('Done!' ) }
  ],
  command: [{
    name: 'dir',
    handler () {
      console.log('ls -l')
    },
    // Subcommands
    commands: [{
      name: 'perm',
      description: 'Permissions',
      handler () {
        console.log('Display permissions for a directory.')
      }
    }]
  }]
})

// Execute the "dir" command
shell.exec('dir')

// Execute the "perm" subcommand
shell.exec('dir perm')
```

_`dir` command output:_
```sh
ls -l
Done!
```

_`dir perm` subcommand output:_
```sh
Display permissions for a directory.
Done!
```

### Customized Help/Usage Messages

**Customizing Flag Appearance:**

The `Shell` and `Command` classes can both accept several boolean attributes to customize the description of each flag within a command. Each of these is `true` by default.

1. `describeDefault`: Display the default flag value.
1. `describeOptions`: List the valid options for a flag.
1. `describeMultipleValues`: Appends `Can be used multiple times.` to the flag description
1. `describeRequired`: Prepends `Required.` to the flag description whenever a flag is required.

<details>
<summary>Example</summary>
<br/>

```javascript
const c = new Command({
  name: '...',
  flags: {
    name: {
      alias: 'nm',
      required: true,
      default: 'Rad Dev',
      allowMultipleValues: true,
      options: ['Mr Awesome', 'Mrs Awesome', 'Rad Dev'],
      description: 'Specify a name.'
    }
  }
})
```

The help message for this flag would look like:

```sh
Flags:
  -name       ['nm']          Required. Specify a name. Options: Mr
                              Awesome, Mrs Awesome, Rad Dev. Can be
                              used multiple times. (Default Rad Dev)
```
</details>
<br/>

**Customizing the Entire Message:**

This library uses a vanilla dependency (i.e. no-subdependencies) called [@author.io/table](https://github.com/author/table) to format the usage and help messages of the shell. The `Table` library can be used to create your own custom screens, though most users will likely want to stick with the defaults. If you want to customize messages, the following example can be used as a starting point. The configuration options for the table can be found in the README of its repository.

```javascript
import { Shell, Command, Table } from '@author.io/shell'

const shell = new Shell(...)
shell.usage = '...'
shell.help = () => {
  const rows = [
    ['Command', 'Alias Names'],
    ['...', '...']
  ]

  const table = new Table(rows)

  return shell.usage + '\n' + table.output
}
```

**The `usage` and/or `help` attributes of an individual `Command` can also be set:**

```javascript
import { Shell, Command, Table } from '@author.io/shell'

const cmd = new Command(...)
cmd.usage = '...'
cmd.help = () => {
  const rows = [
    ['Flags', 'Alias Names'],
    ['...', '...']
  ]

  const table = new Table(rows)

  return cmd.usage + '\n' + table.output
}
```

There is also a `Formatter` class that helps combine usage/help messages internally. This class is exposed for those who want to dig into the inner workings, but it should be considered as more of an example than a supported feature. Since it is an internal class, it may change without warning (though we'll try to keep the methods consistent across releases).

### Introspection/Metadata Generation

A JSON metadoc can be produced from the shell:

```javascript
console.log(shell.data)
```

Simple CLI utilities can also be loaded entirely from a JSON file by passing the object into the shell constructor as the only argument. The limitation is no imports or hoisted variables/methods will be recognized in a shell which is loaded this way.

### Autocompletion/Input Hints

This library can use a _command hinting_ feature, i.e. a shell `hint()` method to return suggestions/hints about a partial command. This feature was part of the library through the `v1.5.x` release lifecycle. In `v.1.6.0+`, this feature is no longer a part of the core library. It is now available as the [author/shell-hints plugin](https://github.com/author/shell-hints).

Consider the following shell:

```javascript
import HintPlugin from 'https://cdn.pika.dev/@author.io/browser-shell-hints'

const shell = new Shell({
  name: 'mycli',
  command: [{
    name: 'dir',
    handler () {
      console.log('ls -l')
    },
    // Subcommands
    commands: [{
      name: 'perm',
      description: 'Permissions',
      handler () {
        console.log('Display permissions for a directory.')
      }
    }, {
      name: 'payload',
      description: 'Payload',
      handler () {
        console.log('Display payload/footprint for a directory.')
      }
    }]
  }]
})

HintPlugin.apply(shell) // <-- Adds the hint method.

// Help us figure out what we can do!
console.log(shell.hint('dir p'))
```

_Output:_

```sh
{
  commands: ['perm', 'payload'],
  flags: []
}
```

The hint matches "**dir p**ermission" and "**dir p**ayload", but does not match any flags.

If no options/hints are available, `null` is returned.

While this add-on provides input hints that could be used for suggestions/completions, it does **not** generate autocompletion files for shells like bash, zsh, fish, powershell, etc.

> There are many variations of autocompletion for different shells, which are not available in browsers (see our Devtools extension for browser completion).

If you wish to generate your own autocompletion capabilities, use the `shell.data` attribute to retrieve data for the shell (see prior section). For terminals, consider using the shell metadata with a module like [omlette](https://github.com/f/omelette) to produce autocompletion for your favorite terminal app. For browser-based CLI apps, consider using our devtools extension for an autocompletion experience.

## Installation

### Node.js

<details>
<summary>Modern (ES Modules)</summary>
<br/>

```sh
npm install @author.io/shell --save
```

Please note, you'll need a verison of Node that supports ES Modules. In Node 12, this feature is behind the `--experimental-modules` flag. It is available in Node 13+ without a flag, but the `package.json` file must have the `"type": "module"` attribute. This feature is generally available in [Node 14.0.0](https://nodejs.org) and above.
</details>

<details>
<summary><del>Legacy (CommonJS/require)</del></summary>
<br/>

<b>DEPRECATED</b>

<del>If you need to use the older CommonJS format (i.e. `require`), run `npm install @author.io/shell-legacy` instead.</del>
</details>

### Browsers

**CDN**

```javascript
import { Shell, Command } from 'https://cdn.pika.dev/@author.io/shell'
```

Also available from [jsdelivr](https://www.jsdelivr.com/package/npm/@author.io/shell/index.js) and [unpkg](https://unpkg.com/@author.io/shell/index.js).

### Debugging

Each distribution has a corresponding `-debug` version that should be installed _alongside_ the main module (the debugging is an add-on module). For example, `npm install @author.io/shell-debug --save-dev` would install the debugging code for Node. In the browser, appending the debug library adds sourcemaps.

### Related Modules

1. [@author.io/table](https://github.com/author/table) - Used to generate the default usage/help messages for the shell and subcommands.

**Sponsors (as of 2020)**

<table cellpadding="10" cellspacing="0" border="0">
  <tr>
    <td><a href="https://metadoc.io"><img src="https://github.com/coreybutler/staticassets/raw/master/sponsors/metadoclogobig.png" width="200px"/></a></td>
    <td><a href="https://butlerlogic.com"><img src="https://github.com/coreybutler/staticassets/raw/master/sponsors/butlerlogic_logo.png" width="200px"/></a></td>
  </tr>
</table>
