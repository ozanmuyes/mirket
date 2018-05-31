const esprima = require('esprima');

const defaultConfig = {
  // rootPath: undefined,
  providersPath: 'app/providers',
  //
};

function parseBindingFn(fn) {
  const fnInfo = {
    hasInjectionParam: false,
    injections: [],
    acceptArgs: false,
  };

  const pb0 = (esprima.parseScript(fn.toString())).body[0].expression;

  if (pb0.params.length > 0) {
    if (pb0.params[0].type === 'ObjectPattern') {
      fnInfo.hasInjectionParam = true;

      pb0.params[0].properties.forEach((property) => {
        fnInfo.injections.push(property.key.name);
      });

      if (pb0.params.length > 1) {
        fnInfo.acceptArgs = true;
      }
    } else {
      fnInfo.acceptArgs = true;
    }
  }

  return fnInfo;
}

class Mirket {
  constructor(config) {
    this.config = Object.assign({}, defaultConfig, config);
    this.container = new Map();
    //

    if (this.config.providersPath !== '') {
      // TODO Auto-register service providers
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
      valueType: typeof inst, // TODO Set to 'array' instead of 'object' if `inst` _is_ array
      value: inst,
      //
    });
  }

  make(alias, args = []) {
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

        const injections = {};
        if (resolved.fnInfo.hasInjectionParam) {
          resolved.fnInfo.injections.forEach((injectionAlias) => {
            injections[injectionAlias] = this.make(injectionAlias);
          });
        }
        const params = resolved.fnInfo.hasInjectionParam
          ? [injections, ...args]
          : args;
        const result = resolved.fn.apply(null, params);

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
}

module.exports = userConfig => new Mirket(userConfig);
