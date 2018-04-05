const path = require('path');

const chai = require('chai');

const Mirket = require('../');

const assert = chai.assert;
const expect = chai.expect;

describe('Mirket Register and Bindings', function() {
  this.timeout(0); // TODO Remove after debugging test(s)

  let kernel = null;

  beforeEach(function() {
    kernel = new Mirket({
      rootPath: path.resolve(__dirname, '..'),
    });
  });

  it('should resolve `undefined` when no registration', function(done) {
    expect(kernel.isBooted).to.be.false;

    kernel.boot().then(() => {
      expect(kernel.isBooted).to.be.true;

      const foo = kernel['foo']; // eslint-disable-line dot-notation
      expect(foo).to.eq(undefined);

      done();
    });
  });

  it('should resolve instance binding', function(done) {
    // Register an anonymous provider
    kernel.register({
      register: ({ instance }) => {
        instance('foo', 'bar');
      },
      boot: (kernelForBoot) => { // TODO Move this to another test case
        const foo = kernelForBoot.resolve('foo');
        expect(foo).to.eq('bar');
      },
    });

    expect(kernel.isBooted).to.be.false;

    kernel.boot().then(() => {
      expect(kernel.isBooted).to.be.true;

      const foo = kernel['foo']; // eslint-disable-line dot-notation
      expect(foo).to.eq('bar');

      done();
    });
  });
  // TODO Write test cases for instance bindings (imperatives; int, string, object, array, etc. but not for function)

  it('should resolve singleton binding (object)', function(done) {
    const obj = {
      bar: 'baz',
      qux: 'quux',
    };

    // Register an anonymous provider
    kernel.register({
      register: ({ singleton }) => {
        singleton('foo', obj);
      },
    });

    expect(kernel.isBooted).to.be.false;
    assert.isUndefined(obj.id, 'Singleton mutates original value while cloning.');

    kernel.boot().then(() => {
      expect(kernel.isBooted).to.be.true;

      const foo = kernel['foo']; // eslint-disable-line dot-notation
      expect(foo).to.eql(obj);
      expect(foo.id).not.to.be.undefined;

      done();
    });
  });

  it('should resolve singleton binding (array)', function(done) {
    const arr = ['bar', 'baz', 'qux'];

    // Register an anonymous provider
    kernel.register({
      register: ({ singleton }) => {
        singleton('foo', arr);
      },
    });

    expect(kernel.isBooted).to.be.false;
    assert.isUndefined(arr.id, 'Singleton mutates original value while cloning.');

    kernel.boot().then(() => {
      expect(kernel.isBooted).to.be.true;

      const foo = kernel['foo']; // eslint-disable-line dot-notation
      expect(foo).to.eql(arr);
      expect(foo.id).not.to.be.undefined;

      done();
    });
  });

  // TODO `it('should resolve singleton binding (function)');`

  // TODO Write test for returning Promise from `register` and `boot` functions
});
