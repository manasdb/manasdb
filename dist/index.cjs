
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
