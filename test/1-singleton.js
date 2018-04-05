/* eslint-disable global-require */

const path = require('path');

const chai = require('chai');

const assert = chai.assert;
const expect = chai.expect;

function removeMirketFromRequire() {
  const resolved = require.resolve('../');

  // If Mirket was `require`d before for any other test file
  if (Object.prototype.hasOwnProperty.call(require.cache, resolved)) {
    delete require.cache[resolved];
    delete global.mirket;
  }
}

describe.skip('Mirket Singleton Instantiation', function() {
  const config = {
    rootPath: path.resolve(__dirname, '..'),
    providersPath: 'app/providers', // relative to `rootPath` (advised)
    // providersPath: '/home/USER/Code/...', // absolute path (discouraged)
    //
  };

  beforeEach(removeMirketFromRequire);

  it('should set singleton on global', function() {
    expect(global.mirket).to.be.undefined;

    // Instantiate the singleton
    const kernel = require('../')(config);

    expect(global.mirket).not.to.be.undefined;
    expect(global.mirket.singleton).not.to.be.null;
    expect(global.mirket.singleton.id).to.eq(kernel.id);
  });

  it('should throw error due to previously instantiated singleton', function() {
    // Instantiate the singleton
    require('../')(config);
    // Try to instantiate another singleton
    assert.throws(function() { require('../')(config); }, Error, 'A singleton kernel has already been instantiated.');
  });
});
