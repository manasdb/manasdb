
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
