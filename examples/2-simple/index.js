'use strict';

const mirket = require('../../')({
  rootPath: __dirname,
  providersPath: 'app/providers',
});

/* const debug = mirket.make('debug', 'index');
debug('fin'); */

mirket.boot();

require('./app');

// ----- STA - OVERRIDE `require` -----
/* const Module = require('module');

(function mutateModuleWrap(originalModuleWrap) {
  Module.wrap = function modifiedModuleWrap(script) {
    const injectedCode =
`function make(alias) {
  return global.kernel.make(alias);
}
`;
    return originalModuleWrap(injectedCode + script);
  };
}(Module.wrap)); */
// ----- FIN - OVERRIDE `require` -----
