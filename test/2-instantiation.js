'use strict';

const path = require('path');

const chai = require('chai');

const Mirket = require('../');

const assert = chai.assert;
const expect = chai.expect;

describe.skip('2) Mirket Instantiation', function() {
  const config = {
    rootPath: path.resolve(__dirname, '..'),
  };

  it('should instantiate', function() {
    expect(global.mirket).not.to.be.undefined;
    expect(global.mirket.singleton).to.be.null;

    // Instantiate a kernel
    const kernel = new Mirket(config);

    expect(kernel).not.to.be.null;
    expect(global.mirket.singleton).to.be.null;
  });

  it('should throw error if configurations wasn\'t set', function() {
    // eslint-disable-next-line no-new
    assert.throws(function() { new Mirket(); }, Error, 'Configuration object must be given.');
  });

  it('should throw error if project root wasn\'t set', function() {
    // eslint-disable-next-line no-new
    assert.throws(function() { new Mirket({}); }, Error, 'Project root path must be given');
  });

  //
});
