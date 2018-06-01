/* eslint-disable global-require */

const mirket = require('../../forExample')({
  rootPath: __dirname,
  providersPath: 'app/providers',
});

global.kernel = mirket;

/* const debug = mirket.make('debug', 'index');
debug('fin'); */

if (mirket.boot()) {
  require('./app');
}

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
