import esbuild from 'esbuild';
import bytenode from 'bytenode';
import fs from 'fs';
import path from 'path';

console.log('Starting ManasDB Security Compiler...');

// 1. Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// 2. Bundle all internal code into a single CJS file
// This hides internal folder structures and files from the compiled output
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/manasdb.bundle.cjs',
  format: 'cjs', // Bytenode works best with CommonJS
  platform: 'node',
  // Exclude node_modules from being compiled into the binary
  external: [
    'mongodb', 
    'ollama', 
    'openai', 
    '@google/generative-ai', 
    '@xenova/transformers',
    'dotenv',
    'chalk'
  ],
  minify: true // 3. Minify variable names and remove whitespace Before Bytecode Compilation
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
// ManasDB Secure Entry Point
try {
  require('bytenode');
  module.exports = require('./manasdb.jsc');
} catch (e) {
  if (e.code === 'ERR_REQUIRE_ESM') {
     console.error("ManasDB: To use compiled bytecode, ensure your application supports CommonJS requires.");
  }
  throw e;
}
`;

fs.writeFileSync('dist/index.cjs', loaderCode);

// Optional: remove intermediate JS file to prevent plain-text exposure
fs.unlinkSync('dist/manasdb.bundle.cjs');

console.log('✔️  Secure entry point created at dist/index.cjs');
console.log('');
console.log('=====================================================');
console.log('COMPILATION COMPLETE');
console.log('=====================================================');
console.log('Your SDK has been successfully compiled into Node.js Machine Bytecode!');
console.log('It is now strictly protected from Reverse Engineering.');
