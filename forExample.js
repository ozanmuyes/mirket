const fs = require('fs');
const path = require('path');

const esprima = require('esprima');

const defaultConfig = {
  // rootPath: undefined,
  providersPath: 'app/providers',
  //
};

function getParamsPositionally(params, startFrom = 0) {
  const fnInfoArgs = [];

  for (let i = startFrom; i < params.length; i += 1) {
    switch (params[i].type) {
      case 'Identifier':
        fnInfoArgs.push(params[i].name);
        break;

      case 'AssignmentPattern':
        fnInfoArgs.push(params[i].left.name);
        break;

      default:
        // TODO
    }
  }

  return fnInfoArgs;
}

function parseBindingFn(fn) {
  const fnInfo = {
    isConstructor: false,
    hasInjectionParam: false,
    injections: [],
    acceptArgs: false,
    args: [], // argument names (positional, by index)
  };

  const pb0 = (esprima.parseScript(fn.toString())).body[0];
  let targetFn = null;

  if (pb0.type === 'ClassDeclaration') {
    for (let i = 0; i < pb0.body.body.length; i += 1) {
      if (pb0.body.body[i].kind === 'constructor') {
        targetFn = pb0.body.body[i].value;
        break;
      }
    }

    if (targetFn === null) {
      throw new Error(`Trying to bind a class without a constructor ('${pb0.id.name}')`);
    }

    fnInfo.isConstructor = true;
  } else {
    targetFn = pb0.expression;
  }

  if (targetFn.params.length > 0) {
    if (targetFn.params[0].type === 'ObjectPattern') {
      fnInfo.hasInjectionParam = true;

      targetFn.params[0].properties.forEach((property) => {
        fnInfo.injections.push(property.key.name);
      });

      if (targetFn.params.length > 1) {
        fnInfo.acceptArgs = true;
        fnInfo.args = getParamsPositionally(targetFn.params, 1);
      }
    } else {
      fnInfo.acceptArgs = true;
      fnInfo.args = getParamsPositionally(targetFn.params);
    }
  }

  return fnInfo;
}

/**
 * Array-aware type getter.
 * If `v` is an array instead of 'object'
 * returns 'array'. Other JS types will
 * be returned as-is.
 *
 * @param {Object} v The object to get type of.
 */
function getTypeOf(v) {
  const type = typeof v;

  if (type === 'object' && Array.isArray(v)) {
    return 'array';
  }

  return type;
}

function createPosargs(argsObj, /** @type Array */ argsPositions) {
  const result = [];

  argsPositions.forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(argsObj, name)) {
      result.push(argsObj[name]);
    } else {
      result.push(null);
    }
  });

  return result;
}

class Mirket {
  constructor(config) {
    this.config = Object.assign({}, defaultConfig, config);
    this.providers = [];
    this.container = new Map();
    //

    if (this.config.providersPath !== '') {
      // TODO Auto-register service providers
      this.registerProviders();
    }

    //
  }

  _bind(alias, fn, isSingleton = false) {
    if (typeof fn !== 'function') {
      throw new Error(`Cannot bind an instance with '${isSingleton ? 'singleton' : 'bind'}', use 'instance' instead.`);
    }
    if (fn.constructor.name === 'AsyncFunction') {
      throw new Error(`Factory function of '${isSingleton ? 'singleton' : 'bind'}' cannot be asynchronous.`);
    }

    this.container.set(alias, {
      isSingleton,
      isInstance: false,
      alias,
      timesMade: 0,
      fnInfo: parseBindingFn(fn),
      fn,
      cached: null,
      //
    });
  }

  bind(alias, fn) {
    this._bind(alias, fn);
  }

  singleton(alias, fn) {
    this._bind(alias, fn, true);
  }

  instance(alias, inst) {
    if (typeof inst === 'function') {
      throw new Error('Cannot bind a function with \'instance\', use \'instance\' or \'singleton\' instead.');
    }

    this.container.set(alias, {
      isSingleton: false,
      isInstance: true,
      alias,
      valueType: getTypeOf(inst),
      value: inst,
      //
    });
  }

  make(alias, ...args) {
    const resolved = this.container.get(alias);

    if (typeof resolved === 'undefined') {
      throw new Error(`Trying to 'make' an unbound alias ('${alias}').`);
    }

    switch (true) {
      case (resolved.isSingleton && !resolved.isInstance): {
        // `singleton()`ed

        if (resolved.cached !== null) {
          return resolved.cached;
        }
      }

      // eslint-disable-next no-fallthrough
      case (!resolved.isInstance): {
        // `bind()`ed

        // FIXME Refactor the block below
        const injections = {};
        if (resolved.fnInfo.hasInjectionParam) {
          resolved.fnInfo.injections.forEach((injectionAlias) => {
            injections[injectionAlias] = this.make(injectionAlias);
          });
        }
        const posargs = (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]))
          ? createPosargs(args[0], resolved.fnInfo.args)
          : args;
        const params = resolved.fnInfo.hasInjectionParam
          ? [injections, ...posargs]
          : posargs;
        const result = (resolved.fnInfo.isConstructor)
          // See https://stackoverflow.com/a/8843181/250453
          ? new (Function.prototype.bind.apply(resolved.fn, [null, ...params])) // eslint-disable-line new-parens
          : resolved.fn.apply(null, params);
        resolved.timesMade += 1;

        if (resolved.isSingleton) {
          resolved.cached = result;
        }

        return result;
      }

      case (resolved.isInstance): {
        // `instance()`d

        return resolved.value;
      }

      default:
        // This MUST NOT be the case
        throw new Error(`Internal Error: An alias ('${alias}') has been bound with an unknown method (not with 'bind', 'singleton' nor 'instance').`);
    }
  }

  _register(provider, filename = '') {
    // NOTE From 'experiment_registering.js::register'

    const providerRecord = {
      type: (filename === '' ? 'anonymous' : 'file'),
      name: filename,
      wantsToBeDeferred: false,
      hasBindings: false,
      bindings: {
        // aliasFoo: { bindType: 'instance', alias: 'aliasFoo' }
      },
      hasBootFn: false,
      bootFn: {
        parsed: null,
        isAsync: false,
        hasInjectionParam: false,
        injections: [/* alias1, alias2, ... */],
        wantsContainer: false,
        fn: null, // The boot function itself
      },
    };

    if (provider.name && typeof provider.name === 'string' && provider.name.length > 0) {
      providerRecord.name = provider.name;
    }

    if (provider.defer && typeof provider.defer === 'boolean' && provider.defer === true) {
      providerRecord.wantsToBeDeferred = true;
    }

    // Call `register`
    if (provider.register && typeof provider.register === 'function') {
      if (provider.register.constructor.name === 'AsyncFunction') {
        throw new Error(`Register method of the provider ('${provider.name}') cannot be asynchronous.`);
      }

      provider.register.call(null, {
        // Proxy functions to populate `providerRecord.bindings`
        bind: (alias, fn) => {
          providerRecord.hasBindings = true;
          providerRecord.bindings[alias] = { bindType: 'bind', alias };

          this.bind.call(this, alias, fn);
        },
        singleton: (alias, fn) => {
          providerRecord.hasBindings = true;
          providerRecord.bindings[alias] = { bindType: 'singleton', alias };

          this.singleton.call(this, alias, fn);
        },
        instance: (alias, inst) => {
          providerRecord.hasBindings = true;
          providerRecord.bindings[alias] = { bindType: 'instance', alias };

          this.instance.call(this, alias, inst);
        },
      });
    }

    if (provider.boot && typeof provider.boot === 'function') {
      providerRecord.hasBootFn = true;
      providerRecord.bootFn.fn = provider.boot;

      // NOTE Here we say this is a proper function to Esprima
      //      since it throws error if the function string like;
      //      `boot() { ... }`
      // TODO Try 'tolerant' config, see http://esprima.readthedocs.io/en/latest/syntactic-analysis.html
      let bootFnStr = provider.boot.toString();
      /* if (/^(\w+)\(([\w,\s]*)\)\s{0,1}\{(?!\w+)/.test(bootFnStr)) { */
      if (/^(\w+)\(([\w,\s\{\}]*)\)\s{0,1}\{(?!\w+)/.test(bootFnStr)) {
        bootFnStr = `function ${bootFnStr}`;
      }
      let pb0 = (esprima.parseScript(bootFnStr)).body[0];
      if (pb0.type !== 'FunctionDeclaration' && pb0.expression) {
        pb0 = pb0.expression;
      }

      providerRecord.bootFn.isAsync = pb0.async;

      // NOTE As of now considering only first 2 parameters
      if (pb0.params.length > 0) {
        switch (pb0.params[0].type) {
          case 'ObjectPattern': {
            providerRecord.bootFn.hasInjectionParam = true;

            pb0.params[0].properties.forEach((injection) => {
              providerRecord.bootFn.injections.push(injection.value.name);
            });

            break;
          }

          case 'Identifier': {
            if (pb0.params[0].name === 'container') {
              providerRecord.bootFn.wantsContainer = true;
            }

            break;
          }

          default:
            break;
        }
      }
      if (pb0.params.length > 1 && pb0.params[1].type === 'Identifier') {
        providerRecord.bootFn.wantsContainer = true;
      }

      providerRecord.bootFn.parsed = pb0;
    }

    // Store the record
    this.providers.push(providerRecord);
  }

  registerProviders() {
    const providerFiles = fs.readdirSync(path.join(this.config.rootPath, this.config.providersPath));

    providerFiles.forEach((providerFilename) => {
      // TODO If some will be omitted depending on any filename condition
      //      do it here (i.e. regex pattern matching, etc.)

      // eslint-disable-next-line global-require, import/no-dynamic-require
      this._register(require(path.join(this.config.rootPath, this.config.providersPath, providerFilename)), path.parse(providerFilename).name);
    });
  }

  // Synchronous
  boot() {
    //
  }
}

module.exports = userConfig => new Mirket(userConfig);
