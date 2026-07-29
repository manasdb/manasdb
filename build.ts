import esbuild from 'esbuild';
import bytenode from 'bytenode';
import fs from 'fs';

console.log('Starting ManasDB Security Compiler...');

if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

const PROVIDER_EXTERNALS = ['mongodb', 'pg', 'ioredis', 'ollama', 'openai', '@google/generative-ai', '@xenova/transformers', 'dotenv', 'chalk'];

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/manasdb.bundle.cjs',
  format: 'cjs',
  platform: 'node',
  external: PROVIDER_EXTERNALS,
  minify: true,
});

console.log('✔️  TypeScript bundled and minified.');

bytenode.compileFile({
  filename: 'dist/manasdb.bundle.cjs',
  output: 'dist/manasdb.jsc'
});

console.log('✔️  Converted to V8 Bytecode (.jsc)');

const loaderCode = `
'use strict';
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
try {
  require('bytenode');
  const pkg = require('./manasdb.jsc');
  const ManasDB = pkg.default || pkg;
  module.exports = ManasDB;
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

console.log('✔️  Secure entry point created at dist/index.cjs');
console.log('');
console.log('=====================================================');
console.log('COMPILATION COMPLETE');
console.log('=====================================================');
console.log('Your SDK has been successfully compiled into Node.js Machine Bytecode!');
console.log('It is now strictly protected from Reverse Engineering.');
