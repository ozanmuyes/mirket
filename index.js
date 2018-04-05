/**
 * TODO Mirket description
 *
 * References;
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 * - http://2ality.com/2015/02/es6-classes-final.html
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 * - https://www.keithcirkel.co.uk/metaprogramming-in-es6-part-3-proxies/
 * - https://www.keithcirkel.co.uk/metaprogramming-in-es6-symbols/
 */

global.Promise = require('bluebird');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Singleton Kernel instance
global.mirket = {
  defaultConfig: {
    // `rootPath` is necessary
    providersPath: 'providers',
    //
  },
  singleton: null,
  //
};

// See https://blog.tompawlak.org/generate-random-values-nodejs-javascript#3-generate-random-values-using-node-js-crypto-module
const randomValueHex = (len = 32) =>
  crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex')
    .slice(0, len);

class Kernel {
  constructor(config) {
    const argType = typeof config;

    switch (argType) {
      case 'undefined':
      case 'null':
        throw new Error('Configuration object must be given.');

      case 'object': {
        if (Array.isArray(config)) {
          throw new TypeError('Configuration parameter must be either null or object, array given.');
        }

        break; // Continue to merge
      }

      default:
        throw new TypeError(`Configuration parameter must be either null or object, ${argType} given.`);
    }

    // Check required configuration here
    //
    if (!config.rootPath || config.rootPath === '') {
      throw new Error('Project root path must be given.');
    }

    //

    // NOTE Set instance properties here
    //
    // Private-ish???
    // TODO Maybe use Symbol for `this.config`
    //      See https://www.keithcirkel.co.uk/metaprogramming-in-es6-symbols#2-a-place-to-put-metadata-values-in-an-object
    this.config = { ...global.mirket.defaultConfig, ...config };
    this.providers = [
      /**
       * {
       *  filename: null|String, // `null` for anonymous providers
       *  path: null|String, // `null` for anonymous providers
       *  bootFn: null|Function,
       *  registerFn: null|Function,
       * }
       */
    ];
    //

    // Public
    //
    this.id = randomValueHex();
    this.container = new Map();
    this.isBooted = false;
    //
  }

  register(providerObj) {
    const processedObj = {
      filename: null,
      path: null,
      bootFn: null, // TODO Maybe empty arrow function
      registerFn: null, // TODO Maybe empty arrow function
    };

    if (Object.prototype.hasOwnProperty.call(providerObj, 'register')) {
      if (typeof providerObj.register === 'function') { // TODO Consider 'async function'
        processedObj.registerFn = providerObj.register;
      } else {
        // TODO Output warning - register property of the provider is not a function
      }
    }

    if (Object.prototype.hasOwnProperty.call(providerObj, 'boot')) {
      if (typeof providerObj.boot === 'function') { // TODO Consider 'async function'
        processedObj.bootFn = providerObj.boot;
      } else {
        // TODO Output warning - boot property of the provider is not a function
      }
    }

    this.providers.push(processedObj);
  }

  boot(callback = null) { // Return promise if `callback === null` otherwise call it (discouraged)
    const inst = this; // `this` is the Proxy
    // TODO Try to bypass Proxy handler, directly use the Kernel instance

    // Process providers' path
    //
    // FIXME Activate below
    /* if (inst.config.providersPath && typeof inst.config.providersPath === 'string' && inst.config.providersPath !== '') {
      // TODO Also check if the path exists
      const providersAbsolutePath = path.join(inst.config.rootPath, inst.config.providersPath);
      let providerPath = '';

      fs.readdir(providersAbsolutePath) // TODO Use `readdir`s callback
        .forEach((providerFilename) => {
          if (/[^index|_]\.js$/.test(providerFilename)) {
            providerPath = path.join(providersAbsolutePath, providerFilename);
            // eslint-disable-next-line global-require, import/no-dynamic-require
            inst.providers[providerFilename] = require(providerPath);
          }
        });
    } */

    // Make an array of register functions via providers
    //
    const providerRegisterFns = [];
    const registersReducer = (accumulator, current) => {
      if (current.registerFn !== null) { // See `Kernel#register` for nullity check
        accumulator.push(current.registerFn);
      }
    };
    inst.providers.reduce(registersReducer, providerRegisterFns);

    // Make an array of boot functions via providers
    //
    const providerBootFns = [];
    const bootsReducer = (accumulator, current) => {
      if (current.bootFn !== null) { // See `Kernel#register` for nullity check
        accumulator.push(current.bootFn);
      }
    };
    inst.providers.reduce(bootsReducer, providerBootFns);

    // Prepare functions to be passed 'register' functions of providers
    //
    // NOTE Each singleton MUST have it's unique identifier set upon binding OR see the note written with red pen
    // NOTE Each binding MUST have it's unique identifier set upon instantiation
    // NOTE Do NOT touch instance bindings
    const bindingFns = {
      bind: () => { /* set a factory function on the container */ },
      singleton: (alias, instance) => {
        // TODO Check for 'alias' uniqueness

        // See https://stackoverflow.com/a/46179203/250453
        // FIXME Check if shallow clone
        const clone = { ...instance };
        Object.defineProperty(clone, 'id', { // TODO Maybe use another name (e.g. 'containerId') to avoid collision
          // No 'configurable', 'enumerable', 'writable' by default
          value: randomValueHex(),
        });

        inst.container.set(alias, clone);

        return null;
      },
      instance: (alias, instance) => {
        inst.container.set(alias, instance);

        return null;
      },
    };

    // Call every `registerFn` (with `bind`, `singleton`, `instance` functions) async
    // MAYBE do this before `boot`
    providerRegisterFns.forEach(async (current) => {
      // TODO With this can we return Promises from register functions of providers?
      await current.call(null, bindingFns);
    });

    // Call every `bootFn` (with `container') async
    providerBootFns.forEach(async (current) => {
      await current.call(null, inst);
    });


    // TODO If `callback` is null return promise, otherwise call the callback
    //      Resolve (or call callback) with WHAT???

    // FIXME Doesn't wait for `providerRegisterFns` and `providerBootFns` to finish
    inst.isBooted = true;
    return Promise.resolve(); // OR call the `callback`
  }

  _resolve(alias) { // Function for Proxy handler
    // NOTE `this` here is the Proxy target (the Kernel instance), NOT the Proxy
    //      since this function is invoked by `kernelProxyHandler.get()` below

    // NOTE This function should be sync; NO returning Promise
    //      OR do NOT resolve via Proxy `get` (see `kernelProxyHandler.get()`)

    return this.container.get(alias);
  }
  resolve(alias) { // Function for Kernel instance beholder
    // NOTE `this` here is the Proxy

    return this.container.get(alias);
  }
}

// TODO Maybe App class here

const kernelProxyHandler = {
  get: (target, property, receiver) => {
    /**
     * Get a property of the target (Kernel instance in this case)
     */

    // An existing property requested
    //
    if (Reflect.has(target, property)) {
      return Reflect.get(target, property, receiver);
    }

    // Resolve request
    //
    return target._resolve(property);
  },
  //
};

const exportedProxyHandler = {
  /* eslint-disable new-cap */
  construct(target, args) {
    /**
     * Initialize a Kernel instance
     *
     * const Mirket = require('./'); // this file
     * const kernel1 = new Mirket({ ...config }); // an instance of the Kernel above
     *                 ^^^--- this invoke `construct`
     * const kernel2 = new Mirket({ ...config }); // another instance
     */

    // NOTE `target` is the proxy target (Kernel class in this case),
    //      `args` is an array which contains arguments (`{ ...config }` in this case)

    const kernelInst = new target(args[0]);
    return new Proxy(kernelInst, kernelProxyHandler);
  },
  apply: (target, thisArg, args) => {
    /**
     * Initialize a Kernel instance as singleton
     *
     * const kernel = require('../')({ ...config }); // an instance of the Kernel above
     *                              ^--- this or;
     * const Mirket = require('../'); // Mirket is the Proxy which this handler (`exportedProxyHandler`) used
     * const kernel = Mirket({ ...config });
     *                      ^--- this invokes `apply`
     */

    if (global.mirket.singleton) {
      throw new Error('A singleton kernel has already been instantiated.');
    }

    const kernelInst = new target(args[0]);
    global.mirket.singleton = new Proxy(kernelInst, kernelProxyHandler);

    return global.mirket.singleton;
  },
  /* eslint-enable new-cap */

  // TODO Move below to class definiton - proxy is only for the export;
  //      since an instance is created we are done with the proxy (unless
  //      of course won't instantiate another Kernel instance)
  /**
   * Get a default configuration value
   */
  get: (target, property) => global.mirket.defaultConfig[property],
  /**
   * Set a default configuration value
   * TODO DOC Existing instances won't be effected but further instance(s) will read the new value
   */
  set: (target, property, value) => {
    // FIXME Check if property in question is exists on `global.mirket.defaultConfig`

    global.mirket.defaultConfig[property] = value;
  },
};

module.exports = new Proxy(Kernel, exportedProxyHandler);
