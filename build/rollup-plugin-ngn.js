import fs from 'fs'
import path from 'path'
import stripCode from 'rollup-plugin-strip-code'
import replace from 'rollup-plugin-replace'
// import utils from '@rollup/pluginutils'

const NODEONLY = {
  start_comment: 'browser-only',
  end_comment: 'end-browser-only'
}
const BROWSERONLY = {
  start_comment: 'node-only',
  end_comment: 'end-node-only'
}

let supportedBrowsers = null

export default class ngn {
  constructor (opts = {}) {
    this.name = 'ngn'
    this.manifest = null
  }

  get pkg () {
    if (this.manifest === null) {
      this.pkg = '../package.json'
    }

    return this.manifest
  }

  set pkg (pkgpath) {
    let file = path.resolve(pkgpath)
    let content = fs.readFileSync(file).toString()
    this.manifest = JSON.parse(content)
  }

  get version () {
    return this.pkg.version
  }

  get NODEONLY () {
    return NODEONLY
  }

  get BROWSERONLY () {
    return BROWSERONLY
  }

  supportedBrowsers (sourceFile = './.browserslistrc') {
    if (supportedBrowsers !== null) {
      return supportedBrowsers
    }

    sourceFile = path.join(process.cwd(), sourceFile)

    const match = fs.readFileSync(sourceFile).toString().matchAll(/\[(.*)\]/gim)

    supportedBrowsers = [...match].map(item => item[1])
    return supportedBrowsers
  }

  only (env) {
    return stripCode(env === 'node' ? NODEONLY : BROWSERONLY)
  }

  applyVersion (version) {
    return replace({
      delimiters: ['<#', '#>'],
      REPLACE_VERSION: version
    })
  }

  walk (directory) {
    if (!directory) {
      return []
    }

    // Walk the directory without globbing
    let files = []

    fs.readdirSync(directory).forEach(dir => {
      if (fs.statSync(path.join(directory, dir)).isDirectory()) {
        files = files.concat(this.walk(path.join(directory, dir)))
      } else {
        files.push(path.join(directory, dir))
      }
    })

    return files
  }
}

// this.worker = new utils.Worker(require.resolve("./transform.js"), {
//   numWorkers: userOptions.numWorkers
// })
// renderChunk (code, chunk, outputOptions) {
//   if (!filter(chunk.fileName)) {
//     return null;
//   }

//   if (!this.worker) {
//     ;

//     this.numOfBundles = 0;
//   }

//   this.numOfBundles++;

//   // TODO rewrite with object spread after node6 drop
//   const normalizedOptions = Object.assign({}, userOptions, {
//     sourceMap: userOptions.sourcemap !== false,
//     module: outputOptions.format === "es" || outputOptions.format === "esm"
//   });

//   for (let key of ["include", "exclude", "sourcemap", "numWorkers"]) {
//     if (normalizedOptions.hasOwnProperty(key)) {
//       delete normalizedOptions[key];
//     }
//   }

//   const serializedOptions = serialize(normalizedOptions);

//   const result = this.worker
//     .transform(code, serializedOptions)
//     .catch(error => {
//       const { message, line, col: column } = error;
//       console.error(
//         codeFrameColumns(code, { start: { line, column } }, { message })
//       );
//       throw error;
//     });

//   const handler = () => {
//     this.numOfBundles--;

//     if (this.numOfBundles === 0) {
//       this.worker.end();
//       this.worker = 0;
//     }
//   };

//   result.then(handler, handler);

//   return result;
// }
