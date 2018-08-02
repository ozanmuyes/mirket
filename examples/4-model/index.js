'use strict';

const fs = require('fs');
const path = require('path');

// Preliminary setup
//
const bluebird = require('bluebird');

bluebird.setScheduler(process.nextTick);
global.Promise = bluebird;

// eslint-disable-next-line import/no-extraneous-dependencies
const Mocha = require('mocha');


const kernel = require('../../')({
  rootPath: __dirname,
  providersPath: 'providers',
});

kernel.paths = {
  models: 'database/models',
  migrations: 'database/migrations',
  seeders: 'database/seeders',
  //
};

kernel.boot();


// Start test suites
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically
//
const testDir = path.join(__dirname, 'test');
const mocha = new Mocha();

// Add each .js file in the test directory to the mocha instance.
//
fs.readdirSync(testDir)
  .filter(file => file.substr(-3) === '.js') // Only keep the .js files)
  .forEach((file) => {
    mocha.addFile(path.join(testDir, file));
  });

// Run the tests.
//
mocha.run((failures) => {
  // exit with non-zero status if there were failures
  process.exitCode = failures
    ? -1
    : 0;
});
