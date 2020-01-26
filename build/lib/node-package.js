import fs from 'fs'
import path from 'path'
import config from './config.js'
import Build from './build.js'

let build = new Build()
let outdir = config.nodeOutput + `/node-${build.name}`
let mapfile = `${outdir}/${build.name}-${build.version}.min.js.map`
let legacymapfile = `${outdir}-legacy/${build.name}-${build.version}.min.js.map`

// Read the package file
let pkgContent = fs.readFileSync('../package.json').toString()
let pkg = JSON.parse(pkgContent)

// ---------------------------------------------
// Create the modern debug package
// ---------------------------------------------
console.log('Creating debug package for modern Node.js')
fs.mkdirSync(`${outdir}-debug`)
fs.renameSync(mapfile, `${outdir}-debug/${build.name}-${build.version}.min.js.map`)

// Update the source map URL
let content = fs.readFileSync(mapfile.replace('.map', ''))
  .toString()
  .replace(/\/+#\s+?sourceMappingURL=/, `//# sourceMappingURL=../node-${build.name}-debug/`)

fs.writeFileSync(mapfile.replace('.map', ''), content)

// Copy modern debug package files
pkg.name = path.join(config.npmOrganization, `node-${build.name}-debug`)
pkg.description = `${pkg.description} (Debug Mappings)`.trim()
pkg.dependencies = {
  'source-map-support': '^0.5.16'
}
pkg.keywords = [build.name, 'debug', 'sourcemap']
delete pkg.scripts
delete pkg.devDependencies
fs.writeFileSync(`${outdir}-debug/package.json`, JSON.stringify(pkg, null, 2))

// Add license
fs.copyFileSync('../LICENSE', `${outdir}-debug/LICENSE`)

// Add README
fs.writeFileSync(`${outdir}-debug/README.md`, `# ${build.name} ${build.version}\n\nPlease see [${build.homepage}](${build.homepage}).\n\nGenerated on ${(new Date())}.`)

// ---------------------------------------------
// Create the legacy debug package
// ---------------------------------------------
console.log('Creating debug package for legacy Node.js')
fs.mkdirSync(`${outdir}-legacy-debug`)
fs.renameSync(legacymapfile, `${outdir}-legacy-debug/${build.name}-${build.version}.min.js.map`)

// Update the source map URL
content = fs.readFileSync(legacymapfile.replace('.map', ''))
  .toString()
  .replace(/\/+#\s+?sourceMappingURL=/, `//# sourceMappingURL=../node-${build.name}-legacy-debug/`)

fs.writeFileSync(legacymapfile.replace('.map', ''), content)

// Copy legacy debug package files
pkg = JSON.parse(pkgContent)
pkg.name = path.join(config.npmOrganization, `node-${build.name}-legacy-debug`)
pkg.description = `${pkg.description} (Legacy Debug Mappings for Common JS)`.trim()
pkg.dependencies = {
  'source-map-support': '^0.5.16'
}
pkg.keywords = [build.name, 'legacy', 'debug', 'sourcemap']
delete pkg.scripts
delete pkg.devDependencies
delete pkg.type
fs.writeFileSync(`${outdir}-legacy-debug/package.json`, JSON.stringify(pkg, null, 2))

// Add license
fs.copyFileSync('../LICENSE', `${outdir}-legacy-debug/LICENSE`)

// Add README
fs.writeFileSync(`${outdir}-legacy-debug/README.md`, `# ${pkg.name} ${pkg.version} (Legacy CommonJS Variant)\n\nPlease see [${build.homepage}](${build.homepage}).\n\nGenerated on ${(new Date())}.`)

// ---------------------------------------------
// Create modern production package for node
// ---------------------------------------------
console.log('Creating production package for modern Node.js')
let prodpkg = Object.assign({}, JSON.parse(pkgContent))
prodpkg.main = 'index.js'
prodpkg.module = 'index.js'
prodpkg.name = path.join(config.npmOrganization, `node-${build.name}`)
delete prodpkg.scripts
prodpkg.dependencies = prodpkg.dependencies || {}
prodpkg.devDependencies = prodpkg.devDependencies || {}
prodpkg.devDependencies[`${prodpkg.name}-debug`] = prodpkg.version
prodpkg.type = 'module'

fs.writeFileSync(`${outdir}/package.json`, JSON.stringify(prodpkg, null, 2))
fs.renameSync(mapfile.replace('.map', ''), `${outdir}/index.js`)

// Add license
fs.copyFileSync('../LICENSE', `${outdir}/LICENSE`)

// Add README
fs.writeFileSync(`${outdir}/README.md`, `# ${prodpkg.name} ${prodpkg.version}\n\nPlease see [${build.homepage}](${build.homepage}).\n\nGenerated on ${new Date()}.`)

// ---------------------------------------------
// Create legacy production package for node
// ---------------------------------------------
console.log('Creating production package for legacy Node.js')
prodpkg = Object.assign({}, JSON.parse(pkgContent))
prodpkg.description += ' (Legacy CommonJS Variant)'
prodpkg.keywords = [build.name, 'legacy', 'debug', 'sourcemap']
prodpkg.main = 'index.js'
prodpkg.name = path.join(config.npmOrganization, `node-${build.name}-legacy`)
delete prodpkg.scripts
delete prodpkg.type
prodpkg.dependencies = prodpkg.dependencies || {}
prodpkg.devDependencies = prodpkg.devDependencies || {}
prodpkg.devDependencies[`${prodpkg.name}-debug`] = prodpkg.version

fs.writeFileSync(`${outdir}-legacy/package.json`, JSON.stringify(prodpkg, null, 2))
fs.renameSync(legacymapfile.replace('.map', ''), `${outdir}-legacy/index.js`)

// Add license
fs.copyFileSync('../LICENSE', `${outdir}-legacy/LICENSE`)

// Add README
fs.writeFileSync(`${outdir}-legacy/README.md`, `# ${prodpkg.name} ${prodpkg.version} (Legacy CommonJS Variant)\n\nPlease see [${build.homepage}](${build.homepage}).\n\nGenerated on ${new Date()}.`)

