# CLI example

To try this out:

1. Clone the repo
1. Navigate to the `examples/cli` directory in your terminal/console.
1. Run `npm link`. This will make the command available globally.

> Notice that there are no dependencies in the package.json file for this example app. That's because this example is part of the module. In all other apps, you would need to run `npm install @author.io/shell -S` to make it work.

Next, start using it. 

> The name of the shell is defined in the package.json file (`bin` attribute).

```sh
examples/cli> dir
```

You should see the following output:

```sh
dir 1.0.0
A simple file system utility.

  - list    [ls]         : List files of a directory. Optionally specify a
                           long format.
  - export               : Export a file representation of a directory.
                           Has an additional subcommand.
  - mkdir   [md, m]      : Make a new directory.
```

### Try the list Command

```sh
examples/cli> dir list
```
_Output:_
```sh
README.md, index.js, package-lock.json, package.json
```

#### Same command, as an alias & a flag:

```sh
examples/cli> dir ls -l
```
_`-l` is the "long format" flag defined in the list command (see index.js)._

_Output:_
```sh
- README.md
- index.js
- package-lock.json
- package.json
```

### Explore Another Command

```sh
dir md -R /path/to/dir
```

```sh
...make a directory...
{
  command: 'mkdir',
  input: '-R /path/to/dir',
  flags: {
    recognized: { p: true },
    unrecognized: [ '/path/to/dir' ]
  },
  valid: true,
  violations: [],
  help: { requested: false }
}
```

**Notice the help attribute**. A help flag is automatically created for every command (can be overridden), which can be detected in the help attribute. In the example above, no help was requested.

Run the same command again with the help flag:
```sh
dir md -R /path/to/dir --help
```

_Output:_

```sh
dir mkdir <md, m>  [OPTIONS]

  Make a new directory.

Options:

  -p [-R]     : Recursively create the directory if it does not
                already exist.
```

By default, a help message like the one above will be logged out to the console. However; this can be disabled by setting `autohelp: false` in the shell configuration. When automatic help is turned off, the help objects are still passed to handler functions, giving developers full control.

_With `autohelp: false`_

```sh
{
  command: 'mkdir',
  input: '-R /path/to/dir -h',
  flags: { recognized: { p: true }, unrecognized: [ '/path/to/dir' ] },
  valid: true,
  violations: [],
  help: {
    requested: true,
    message: 'dir mkdir <md, m>  [OPTIONS]\n' +
      '\n' +
      '  Make a new directory.\n' +
      '\n' +
      'Options:\n' +
      '\n' +
      '  -p [-R]     : Recursively create the directory if it does not\n' +
      '                already exist.\n'
  }
}
```

> **TRY IT YOURSELF:** Change the source code of the `mkdir` command to do something meaningful. For example, use Node's recursive directory creation option (see [the docs](https://nodejs.org/dist/latest-v13.x/docs/api/fs.html#fs_fs_mkdir_path_options_callback)) to make new directories.

### Subcommands

There is an example subcommand called `json`, which is part of the `export` family of commands.

In this app, running the main command, `export`, isn't supposed to do anything. It shows the help message:

```sh
dir export
```

_Output:_
```sh
dir export [OPTIONS]

  Export a file representation of a directory.

Options:

  json:       Generate a JSON representation of the directory. 
```

The `json` **subcommand** is a little more interesting. It is supposed to display the file system as a JSON object.

```sh
dir export json
```

_Outputs:_

```sh
{
  "/.../@author.io/shell/examples/cli": [
    "README.md",
    "index.js",
    "package-lock.json",
    "package.json"
  ]
}
```

You can see all of the subcommand features by applying the `--help` flag to the command:

```sh
dir export json -help
```

_Outputs:_

```sh
dir export json [OPTIONS]

  Generate a JSON representation of the directory.

Options:

  -array [-a]     : Generate an array. This is a pretty long message
                    for such a short explanation. Kinda Rube
                    Goldbergish.
```

Notice there is an `array` flag for the `json` subcommand.

```sh
dir export json -a
```

_Outputs:_

```sh
[ 'README.md', 'index.js', 'package-lock.json', 'package.json' ]
```

