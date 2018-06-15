// See https://stackoverflow.com/questions/35211056/how-to-change-the-node-js-module-wrapper
// This file is to test how to wrap `require` function and also inject some
// code to `require`d modules

const Module = require('module');

global.mirket = {
  resolve(alias) {
    console.log(`resolving ${alias}...`);
  },
};

(function mutateModuleWrap(originalModuleWrap) {
  Module.wrap = function modifiedModuleWrap(script) {
    const injectedCode = `;
/*const originalRequire = require;
require = function modifiedRequire(id) {
  if (
    !(id.startsWith('./') || id.startsWith('../')) &&
    !(["${Module.builtinModules.join('","').toString()}"].includes(id)) &&
    global.mirket && typeof global.mirket.resolve === 'function'
  ) {
    return global.mirket.resolve(id);
  }

  return originalRequire(id);
}*/
function make(alias) {
  return global.mirket.resolve(alias);
}
`;
    return originalModuleWrap(injectedCode + script);
  };
}(Module.wrap));

require('./mod1');
