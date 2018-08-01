'use strict';

const assert = require('assert');

const mirket = require('../../')({
  rootPath: __dirname,
  providersPath: 'app/providers',
});

assert(typeof global.kernel === 'undefined');

mirket.on('router::registered', (payload) => {
  console.log('Routes registered;', payload, 'Everything is OK');
});

mirket.boot();
