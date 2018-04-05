// TODO Consider 'dotenv' - PROBABLY NOT rather use a provider

/**
 * TODO Mirket description
 *
 * References;
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
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

    if (!config.rootPath || config.rootPath === '') {
      throw new Error('Project root path must be given.');
    }

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
    // TODO Consider `container`
  }

  register(providerObj) {
    const processedObj = {
      filename: null,
      path: null,
      bootFn: null, // TODO Maybe empty arrow function
      registerFn: null, // TODO Maybe empty arrow function
    };

    if (Object.prototype.hasOwnProperty.call(providerObj, 'register')) {
      if (typeof providerObj.register === 'function') {
        processedObj.registerFn = providerObj.register;
      } else {
        // TODO Output warning
      }
    }

    if (Object.prototype.hasOwnProperty.call(providerObj, 'boot')) {
      if (typeof providerObj.boot === 'function') {
        processedObj.bootFn = providerObj.boot;
      } else {
        // TODO Output warning
      }
    }

    this.providers.push(processedObj);
  }

  boot(callback = null) { // Return promise if `callback === null` otherwise call it (discouraged)
    const inst = this;

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

    // TODO Call every `bootFn` async
    // TODO Call every `registerFn` async

    return new Promise((resolve, reject) => {
      // FIXME Implement actual procedures here
      // TODO Resolve with what??? config + container + bus?

      setTimeout(() => {
        resolve(inst);
      }, 123);
    });
  }
}

// TODO Maybe App class here

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

    return new target(args[0]);
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

    global.mirket.singleton = new target(args[0]);

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
