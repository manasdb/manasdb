
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
