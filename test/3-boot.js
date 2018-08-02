'use strict';

const path = require('path');

const chai = require('chai');

const Mirket = require('../');

const expect = chai.expect;

describe.skip('3) Mirket Boot', function() {
  let kernel = null;

  beforeEach(function() {
    kernel = new Mirket({
      rootPath: path.resolve(__dirname, '..'),
    });
  });

  it('should boot 1', function(done) {
    kernel.boot()
      .then((resolvedKernel) => {
        expect(resolvedKernel.id).to.eq(kernel.id);

        done();
      });
  });

  it('should boot 2', function(done) {
    (async (innerKernel) => {
      await innerKernel.boot();
      expect(innerKernel.id).to.eq(kernel.id);

      done();
    })(kernel);
  });

  it('should boot 3', function(done) {
    const onBooted = (eventKernel) => {
      expect(eventKernel.id).to.eq(kernel.id);

      done();
    };
    kernel.once('booted', onBooted);
    kernel.boot(); // nothing after this
    // Do NOT do anything on `kernel` after the line below, except
    // `.then(...)` */
  });

  it('should boot 4', function(done) {
    kernel.boot((err, callbackKernel) => {
      expect(callbackKernel.id).to.eq(kernel.id);

      done();
    });
  });

  // TODO Boot method #5 - other file // seems like bad idea
  /* kernel.boot('./b'); */
  /**
   * b.js
   * `
   *  module.exports = (kernel) => {
   *    // Resolve `foo` out of the container
   *    const foo = kernel.foo;
   *
   *    //
   *  };
   * `
   */

  //
});
