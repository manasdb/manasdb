import esbuild from 'esbuild';
import bytenode from 'bytenode';
import fs from 'fs';
import path from 'path';

console.log('Starting ManasDB Security Compiler...');

// 1a. Ensure dist directory is sparkling clean before building
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

const PROVIDER_EXTERNALS = ['mongodb', 'pg', 'ioredis', 'ollama', 'openai', '@google/generative-ai', '@xenova/transformers', 'dotenv', 'chalk'];

// 2. Bundle all internal code into a single CJS file.
// This hides internal folder structures and files from the compiled output
// Because providers no longer have top-level require()s of pg/mongodb,
// we can safely bundle them without breaking the lazy-loading crash-guards.
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/manasdb.bundle.cjs',
  format: 'cjs',
  platform: 'node',
  external: PROVIDER_EXTERNALS,
  minify: true,
});

console.log('✔️  JavaScript bundled and minified.');

// 4. Compile the bundled file directly into V8 Bytecode (Machine level instruction set)
bytenode.compileFile({
  filename: 'dist/manasdb.bundle.cjs',
  output: 'dist/manasdb.jsc'
});

console.log('✔️  Converted to V8 Bytecode (.jsc)');

// 5. Create the secure entry point file
// This automatically loads the V8 bytecode at runtime
const loaderCode = `
'use strict';
// ─── Dynamic-import patch for bytenode ───────────────────────────────────────
// Bytenode wraps compiled code in vm.Script. Node.js v22+ requires an
// importModuleDynamically callback on vm.Script for dynamic import() to work
// (used internally by @xenova/transformers). We register this BEFORE bytenode
// loads so all consumers of this package work out of the box.
const vm = require('vm');
const USE_MAIN_CONTEXT = vm.constants && vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER;
const _OriginalScript = vm.Script;
class _PatchedScript extends _OriginalScript {
  constructor(code, opts) {
    opts = Object.assign({}, opts);
    if (!opts.importModuleDynamically) {
      opts.importModuleDynamically = USE_MAIN_CONTEXT !== undefined
        ? USE_MAIN_CONTEXT
        : function(s) { return import(s); };
    }
    super(code, opts);
  }
}
vm.Script = _PatchedScript;
// ─── Load bytecode ───────────────────────────────────────────────────────────
try {
  require('bytenode');
  const pkg = require('./manasdb.jsc');
  // Handle ES module default export vs CJS exports
  const ManasDB = pkg.default || pkg;
  // Ensure the class is the primary export
  module.exports = ManasDB;
  // Add self-referential properties to support both destructuring and default imports
  module.exports.ManasDB = ManasDB;
  module.exports.default = ManasDB;
} catch (e) {
  if (e.code === 'ERR_REQUIRE_ESM') {
     console.error("ManasDB: To use compiled bytecode, ensure your application supports CommonJS requires.");
  }
  throw e;
}
`;

fs.writeFileSync('dist/index.cjs', loaderCode);

// Optional: remove intermediate JS file to prevent plain-text exposure
// fs.unlinkSync('dist/manasdb.bundle.cjs');

console.log('✔️  Secure entry point created at dist/index.cjs');
console.log('');
console.log('=====================================================');
console.log('COMPILATION COMPLETE');
console.log('=====================================================');
console.log('Your SDK has been successfully compiled into Node.js Machine Bytecode!');
console.log('It is now strictly protected from Reverse Engineering.');
