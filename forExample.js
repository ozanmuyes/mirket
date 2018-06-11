/* eslint-disable no-underscore-dangle */

const fs = require('fs');
const path = require('path');

const esprima = require('esprima');
const SortedArray = require('sorted-array');

const defaultConfig = {
  // rootPath: undefined, // Absolute path of project root - MUST be defined
  providersPath: 'app/providers',
  kernelNameOnGlobal: 'kernel',
  postponedsMaxPassCount: 3,
  autoRegisterProviders: true,
  setOnBoxEvenIfSet: false,
  //
};

/** @type Proxy */
let singletonProxy = null;

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
  // TODO Consider adding support for `foo({ bar, baz } = { ... })
  //                                                    ^^^

  const fnInfo = {
    isConstructor: false,
    hasInjectionParam: false,
    injections: [],
    acceptsArgs: false,
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
      throw new Error(`Trying to bind (via 'bind' or 'singleton') a class without a constructor ('${pb0.id.name}').`);
    }

    fnInfo.isConstructor = true;
  } else if (pb0.expression) {
    targetFn = pb0.expression;
  } else {
    targetFn = pb0;
  }

  if (targetFn.params.length > 0) {
    if (targetFn.params[0].type === 'ObjectPattern') {
      fnInfo.hasInjectionParam = true;

      targetFn.params[0].properties.forEach((property) => {
        if (property.key.type === 'Literal') {
          fnInfo.injections.push(property.key.value);
        } else { // TODO Find out what is else?
          fnInfo.injections.push(property.key.name);
        }
      });

      if (targetFn.params.length > 1) {
        fnInfo.acceptsArgs = true;
        fnInfo.args = getParamsPositionally(targetFn.params, 1);
      }
    } else {
      fnInfo.acceptsArgs = true;
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
      result.push(null); // TODO Figure out `null` or `undefined`
    }
  });

  /* Check if the `argsObj` is named or not, that is it might be
   * the one and only argument of the function which is the type
   * of object. E.g.
   * `
   *  // app/providers/router.js
   *  const router = require('find-my-way');
   *  singleton('router', router);
   *
   *  // app/index.js
   *  const router = make('router', {
   *    ignoreTrailingSlash: true,
   *    // ...
   *  });
   * `
   * In the example the line in the 'app/index.js' didn't read
   * `
   *  const router = make('router', {
   *    opts: {                       <-- here,
   *      ignoreTrailingSlash: true,
   *      // ...
   *    },                            <-- and here omitted
   *  });
   * `
   */
  // FIXME Here will work only if one parameter was passed and it is object of type
  if (result.length === 1 && result[0] === null && argsPositions.length === 1) {
    result[0] = argsObj;
  }

  return result;
}

/**
 * Compares two provider records considering various aspects
 * to decide their priorities as each other.
 *
 * @param {ProviderRecord} qd Queued item
 * @param {ProviderRecord} existing Existing item
 */
function providerRecordComparator(qd, existing) {
  if (!qd.wantsToBeDeferred && existing.wantsToBeDeferred) {
    // `qd` should come before
    /* console.log(`${qd.name} comes first, then ${existing.name}`); */
    return -1;
  } else if (qd.wantsToBeDeferred && !existing.wantsToBeDeferred) {
    // `existing` should come first
    /* console.log(`${existing.name} comes first, then ${qd.name}`); */
    return 1;
  }
  /**
   * otherwise either each one of them wants to be deferred or
   * doesn't want to be deferred, but in the end this won't
   * effect the priority between each other.
   */

  let priorityQd = 0;
  let priorityExisting = 0;

  const bindingsDifference = ((existing.bindings.length || 0) - (qd.bindings.length || 0));
  if (bindingsDifference < 0) {
    priorityQd += (bindingsDifference * -2);
  } else if (bindingsDifference > 0) {
    priorityExisting += (bindingsDifference * 2);
  } // else (bindingsDifference === 0) then no action to take

  // `hasInjectionParam` effects negatively
  //
  if (qd.bootFn.hasInjectionParam) {
    priorityQd -= 2;
  }
  if (existing.bootFn.hasInjectionParam) {
    priorityExisting -= 2;
  }

  if (qd.bootFn.hasInjectionParam && existing.bootFn.hasInjectionParam) {
    if (qd.bootFn.injections.length < existing.bootFn.injections.length) {
      priorityQd += 1;
    } else if (qd.bootFn.injections.length > existing.bootFn.injections.length) {
      priorityExisting += 1;
    }
    // no need to take any action - they have same amount of injections, BUT;
    // TODO Consider bound/unbound aliases
  }

  // TODO Consider this provider's bindings - if binds something prioritize this

  // `wantsContainer` effects negatively
  // TODO Change this to positive effecting since the `container` argument
  //      will only be used to 'bind' things. And if boot binds something
  //      it MUST have higher priority.
  //
  if (qd.bootFn.wantsContainer) {
    priorityQd -= 1;
  }
  if (existing.bootFn.wantsContainer) {
    priorityExisting -= 1;
  }

  // TODO Test here when comparing 'migrations' with 'commands'
  if (qd.bootFn.wantedBindingMethods.length > 0) {
    priorityQd += 1;

    qd.bootFn.wantedBindingMethods.forEach((methodName) => {
      switch (methodName) { // FIXME [MANUALNAME_INJECTABLE]
        case 'bind':
        case 'singleton':
        case 'instance':
          priorityQd += 1;
          break;

        case 'make':
        case 'callInKernelContext':
          priorityQd -= 1;
          break;

        // neutrals
        case 'paths':
        default: break;
      }
    });
  }
  if (existing.bootFn.wantedBindingMethods.length > 0) {
    priorityExisting += 1;

    existing.bootFn.wantedBindingMethods.forEach((methodName) => {
      switch (methodName) { // FIXME [MANUALNAME_INJECTABLE]
        case 'bind':
        case 'singleton':
        case 'instance':
        case 'paths':
          priorityExisting += 1;
          break;

        case 'make':
        case 'callInKernelContext':
          priorityExisting -= 1;
          break;

        default: break;
      }
    });
  }
  /* const wantedBindingDifference =
    existing.bootFn.wantedBindingMethods.length - existing.bootFn.wantedBindingMethods.length;
  if (wantedBindingDifference < 0) {
    priorityQd += 1;
  } else if (wantedBindingDifference > 0) {
    priorityExisting += 1;
  } */

  // Finalize sorting
  //
  if (priorityQd > priorityExisting) {
    // `qd` should come before
    /* console.log(`${qd.name} comes first, then ${existing.name}`); */
    return -1;
  } else if (priorityExisting > priorityQd) {
    // `priorityExisting` should stay first
    /* console.log(`${existing.name} comes first, then ${qd.name}`); */
    return 1;
  }

  // `priorityExisting` should stay first
  /* console.log(`${existing.name} comes first, then ${qd.name}`); */
  return 1;
}

function getCallerFile() {
  const originalFunc = Error.prepareStackTrace;

  let callerFile;
  try {
    const err = new Error();

    // eslint-disable-next-line func-names
    Error.prepareStackTrace = function (_, stack) { return stack; };

    const currentFile = err.stack.shift().getFileName();

    while (err.stack.length) {
      callerFile = err.stack.shift().getFileName();

      if (currentFile !== callerFile) {
        break;
      }
    }
  } catch (e) {
    //
  }

  Error.prepareStackTrace = originalFunc;

  return callerFile;
}

function getCallerInfo() {
  const originalFunc = Error.prepareStackTrace;

  let gotCallerInfo = false;
  let callerInfo = {
    filename: undefined,
    //
  };
  let caller;
  try {
    const err = new Error();

    // eslint-disable-next-line func-names
    Error.prepareStackTrace = function (_, stack) { return stack; };

    // NOTE This one for itself (`getCallerInfo()`)
    err.stack.shift();
    // NOTE This one for it's (`getCallerInfo()`'s) caller
    err.stack.shift();
    do {
      caller = err.stack.shift();
      callerInfo = {
        filename: caller.getFileName(),
        functionName: caller.getFunctionName(),
        lineNumber: caller.getLineNumber(),
        position: caller.getPosition(),
        //
      };
    } while (callerInfo.filename === undefined);
    /* caller = err.stack.shift();
    callerInfo = {
      filename: caller.getFileName(),
      //
    };

    while (err.stack.length) {
      callerInfo = err.stack.shift().getFileName();

      if (callerInfo.filename !== undefined) {
        break;
      }
    } */
  } catch (e) {
    //
  }

  Error.prepareStackTrace = originalFunc;

  return callerInfo;
}

// TODO This method SHOULD be called somewhere else too (i.e. `boot()` on 'migrations' provider)
function staticallyAnalyze(fn) {
  const report = {
    isAsync: false,
    hasInjectionParam: false,
    injections: [/* alias1, alias2, ... */],
    wantsContainer: false,
    wantedBindingMethods: [],
    // fn, // The function itself
  };

  // NOTE Here we say this is a proper function to Esprima
  //      since it throws error if the function string like;
  //      `boot() { ... }`
  let bootFnStr = fn.toString();
  if (/^(\w+)\(([\w,\s{}:]*)\)\s{0,1}\{(?!\w+)/.test(bootFnStr)) {
    bootFnStr = `function ${bootFnStr}`;
  }
  let pb0 = (esprima.parseScript(bootFnStr)).body[0];
  if (pb0.type !== 'FunctionDeclaration' && pb0.expression) {
    pb0 = pb0.expression;
  }

  report.isAsync = pb0.async;

  // TODO Loop here at most 2 times (hence the note above)
  //      Therefore we can enter the if statement's body below (~:335)
  const maxArgumentCountToProcess = (pb0.params.length < 2 ? pb0.params.length : 2);
  let i = 0;
  while (i < maxArgumentCountToProcess) {
    if (pb0.params[i].type === 'ObjectPattern') {
      // First argument is defined as `{ ... }`

      // Extract property names
      //
      const propertyNames = pb0.params[i].properties.map((property) => {
        // TODO Figure out the checks below is really necessary - if not simplify this arrow function
        if (property.computed) {
          throw new Error(`Computed property names (${property.key.name}) are not supported.`);
        }
        if (property.method) {
          throw new Error(`Methods (${property.key.name}) are not supported.`);
        }

        return property.key.name;
      });

      // FIXME [MANUALNAME_INJECTABLE]: Manual update required here to sustain consistency
      // See https://stackoverflow.com/a/1885569/250453
      const containerLikeIntersection = [
        'bind',
        'singleton',
        'instance',
        'make',
        'callInKernelContext',
        'paths',
        // Add Mirket methods that can be injected to the `boot()` of a provider
      ].filter(value => propertyNames.indexOf(value) !== -1);

      // NOTE Maybe here we can validate each type of argument's number in the list,
      //      e.g. if argument list is like this; `({ binding1 }, container, { instance })
      //      do NOT send the container as the 2nd or 3rd argument.
      if (containerLikeIntersection.length > 0) {
        // NOTE Just one container-related method name (e.g. 'bind', 'singleton', 'instance')
        //      is enough to say that it want the container.
        report.wantsContainer = true;
        report.wantedBindingMethods.push(...containerLikeIntersection);

        // TODO Figure out what to do with others?
      } else {
        report.hasInjectionParam = true;
        report.injections.push(...propertyNames);
      }
    }

    i += 1;
  }

  return report;
}

class Mirket {
  constructor(config) {
    if (typeof config.rootPath !== 'string' || !path.isAbsolute(config.rootPath)) {
      throw new Error('Root path must be set to an absolute path pointing to the project root on the filesystem.');
    }

    this.config = Object.assign({}, defaultConfig, config);
    this.providers = [];
    this.container = new Map();
    this.box = new Map(); // to store app specific settings - user land
    this.pathsProxy = new Proxy(new Map([['root', this.config.rootPath]]), {
      get(/** @type Map */ target, property) {
        return target.get(property);
      },
      set(/** @type Map */ target, property, value) {
        if (property === 'root') { // TODO Test this
          throw new Error("Cannot change the 'root' path on the kernel.");
        }

        const processedPath = value.trim().replace(/\/+$/, '');

        // Convert given path to absolute path and store that absolute path
        //
        if (processedPath[0] === '.') { // relative to caller file
          target.set(property, path.resolve(path.dirname(getCallerFile()), processedPath));
        } else if (processedPath[0] === '/') { // absolute path
          target.set(property, processedPath);
        } else { // relative to project root
          target.set(property, path.resolve(target.get('root'), processedPath));
        }
      },
    });
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

  instance(alias, inst, fromProviderBootFn = false) {
    // [KAOS:STRCTLACTNM]
    if (fromProviderBootFn === false && typeof inst === 'function') {
      throw new Error('Cannot bind a function with \'instance\', use \'bind\' or \'singleton\' instead.');
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
          // FIXME Use `_makeMany()` here
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
          ? new (Function.prototype.bind.apply(resolved.fn, [null, ...params])) // eslint-disable-line new-parens, max-len
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

  _makeMany(/** @type Array */ aliases) {
    const resolveds = {};

    aliases.forEach((alias) => {
      resolveds[alias] = this.make(alias);
    });

    return resolveds;
  }

  _registerProvider(provider, filename = '') {
    // NOTE From 'experiment_registering.js::register'

    if (provider.disable && provider.disable === true) {
      return;
    }

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
        // isAsync: false,
        // hasInjectionParam: false,
        // injections: [/* alias1, alias2, ... */],
        // wantsContainer: false,
        // wantedBindingMethods: [],
        // fn: null, // The boot function itself
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

      const bindFnsProxyTarget = {
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

          this.instance.call(this, alias, inst, true);
        },
      };
      const bindFnsProxyHandler = {
        get: (target, property, receiver) => {
          if (Reflect.has(target, property)) {
            return Reflect.get(target, property, receiver);
          }

          throw new Error(`Register functions of providers ('${providerRecord.name}') cannot make an alias ('${property}') out of container, use 'boot' method instead.`);
        },
      };

      provider.register.call(null, new Proxy(bindFnsProxyTarget, bindFnsProxyHandler));
    }

    if (provider.boot && typeof provider.boot === 'function') {
      providerRecord.hasBootFn = true;
      providerRecord.bootFn = staticallyAnalyze(provider.boot);
      providerRecord.bootFn.fn = provider.boot;
    }

    // Store the record
    this.providers.push(providerRecord);
  }

  _processProvidersPath() {
    // TODO read dirs, filter and return absolute paths

    const providerPathArr = (Array.isArray(this.config.providersPath))
      ? this.config.providersPath
      : [this.config.providersPath];
    const records = [];

    const filter = (filename) => {
      if (filename[0] === '_') {
        return false;
      }

      //

      return true;
    };

    providerPathArr.forEach((filePath) => {
      const absolutePath = (path.isAbsolute(filePath))
        ? filePath
        : path.join(this.config.rootPath, filePath);
      const stat = fs.statSync(absolutePath);

      if (stat.isDirectory()) {
        fs.readdirSync(absolutePath)
          .filter(filter)
          .forEach((filename) => {
            records.push({
              absolutePath: `${absolutePath}/${filename}`,
              filename: filename.replace('.js', ''),
            });
          });
      } else {
        const filename = path.basename(absolutePath, '.js');

        if (filter(filename)) {
          records.push({
            absolutePath,
            filename,
            //
          });
        }
      }
    });

    return records;
  }

  registerProviders() {
    /** @type Array */
    const providerFileRecords = this._processProvidersPath();

    providerFileRecords.forEach((providerFileRecord) => {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      this._registerProvider(require(providerFileRecord.absolutePath), providerFileRecord.filename);
    });
  }

  _hasAliasesBound(aliases) {
    // NOTE From 'experiment_boot-ordering.js::hasAliasBound'

    const arr = (Array.isArray(aliases))
      ? aliases
      : [aliases];

    return arr.every(alias => this.container.has(alias));
  }

  _callInKernelContext(fn) {
    const record = staticallyAnalyze(fn);

    const result = this._executeBootFn(fn, record.injections, record.wantsContainer);
    return result;
  }

  _executeBootFn(/** @type Function */ bootFn, injections = [], wantsContainer = false) {
    const args = [];

    if (injections.length > 0) {
      args.push(this._makeMany(injections));
    }

    if (wantsContainer === true) {
      args.push({
        bind: this.bind.bind(this),
        singleton: this.singleton.bind(this),
        instance: (alias, inst) => { this.instance.call(this, alias, inst, true); },
        make: this.make.bind(this),
        paths: this.pathsProxy,
        callInKernelContext: this._callInKernelContext.bind(this),
      });
    }

    return bootFn.call(null, ...args);
  }

  /* eslint-disable comma-dangle */
  _bootProvider(providerRecord) {
    // NOTE From 'experiment_boot-ordering.js::bootProvider'

    // NOTE This function is to map `providerRecord` to `_executeBootFn()` arguments

    // TODO Resolve bindings that are injected
    //      If cannot resolve "all of them" then
    //      put the current record back.

    if (providerRecord.bootFn.hasInjectionParam) {
      if (this._hasAliasesBound(providerRecord.bootFn.injections)) {
        if (providerRecord.bootFn.wantsContainer) {
          this._executeBootFn(
            providerRecord.bootFn.fn,
            providerRecord.bootFn.injections,
            providerRecord.bootFn.wantsContainer
          );
        } else {
          this._executeBootFn(providerRecord.bootFn.fn, providerRecord.bootFn.injections);
        }
      } else {
        return false; // this provider to be 'postponed'
      }
    } else if (providerRecord.bootFn.wantsContainer) {
      this._executeBootFn(providerRecord.bootFn.fn, [], true);
    } else {
      this._executeBootFn(providerRecord.bootFn.fn);
    }

    return true; // this provider booted successfully
  }
  /* eslint-enable comma-dangle */

  // Synchronous (blocking)
  boot() {
    const sorted = new SortedArray(
      this.providers.filter(providerRecord => providerRecord.hasBootFn),
      providerRecordComparator,
    );
    const postponeds = [];

    sorted.array.forEach((providerRecord) => {
      if (!this._bootProvider(providerRecord)) {
        postponeds.push(providerRecord);
      }
    });

    let postponedsPassCount = 0;

    while (postponeds.length > 0) {
      if (postponedsPassCount === this.config.postponedsMaxPassCount) {
        throw new Error(`Maximum pass count has been reached for postponed provider${postponeds.length > 1 ? 's' : ''} ('${postponeds.map(p => p.name).join("', '")}'). Boot failed.`);
      }
      postponedsPassCount += 1;

      // Iterate `postponeds` array and try to `boot` them again
      const len = postponeds.length;
      let providerRecord;
      for (let i = 0; i < len; i += 1) {
        providerRecord = postponeds.shift();

        if (!this._bootProvider(providerRecord)) {
          postponeds.push(providerRecord);
        }
      }
    }

    if (singletonProxy !== null) {
      global[this.config.kernelNameOnGlobal] = singletonProxy;
      global.make = this.make.bind(this);
    }

    return (postponeds.length === 0);
  }

  set(kvps) {
    // FIXME Refactor below, it looks weird
    if (typeof kvps !== 'object') {
      throw new Error('Key value pair(s) to be set on the kernel must be object of type.');
    } else if (kvps === null) {
      throw new Error('Key value pair(s) to be set on the kernel must not be null.');
    } else if (Array.isArray(kvps)) {
      throw new Error('Key value pair(s) to be set on the kernel must be object of type instead of array.');
    }

    Object.keys(kvps).forEach((k) => {
      if (this.config.setOnBoxEvenIfSet === true) {
        this.box.set(k, kvps[k]);
      } else if (!this.box.has(k)) {
        this.box.set(k, kvps[k]);
      }
    });
  }

  dryBoot() {
    const sorted = new SortedArray(
      this.providers.filter(providerRecord => providerRecord.hasBootFn),
      providerRecordComparator,
    );

    const outputLines = [];

    outputLines.push('Sorted boot order:');
    // TODO forEach
    const sortedLen = sorted.array.length;
    for (let i = 0; i < sortedLen; i += 1) {
      outputLines.push(` ${i + 1}) ${sorted.array[i].name}`);
    }

    const callerInfo = getCallerInfo();
    // eslint-disable-next-line prefer-template
    outputLines.push(`\nTo disable dry boot change line ${callerInfo.lineNumber}${callerInfo.functionName === null ? '' : ' of the function ' + callerInfo.functionName} of the file '${callerInfo.filename}' to call only 'boot()' method.`);
    /**
     * filename
     * functionName
     * lineNumber
     * position
     */

    console.log(outputLines.join('\n'));
  }

  // TODO Add public methods here upon added to `get()` of the Mirket
  //      class' proxy handler [MANUALNAME_INSTANCEMTHDS]
}

module.exports = (userConfig) => {
  const singleton = new Mirket(userConfig);

  const proxyHandler = {
    get(/** @type Mirket */ target, property) {
      // First of all try to match a method name
      // FIXME [MANUALNAME_INSTANCEMTHDS]
      if (
        [
          'bind',
          'singleton',
          'instance',
          'make',
          'registerProviders',
          'boot',
          'set',
          'dryBoot',
          //
        ].includes(property)
      ) {
        return target[property].bind(target);
      }

      if (property === 'paths') {
        return target.pathsProxy;
      }

      if (target.box.has(property)) {
        return target.box.get(property);
      }

      if (target.container.has(property)) {
        return target.make(property);
      }

      // TODO Is there any other place to look at to `get` anything out of the kernel?

      return null;
    },
    set(/** @type Mirket */ target, property, value) {
      // If executing `kernel.paths = { ... }`
      if (property === 'paths' && (typeof value === 'object' && !Array.isArray(value))) {
        const callerFile = getCallerFile(); // NOTE This MUST be gathered here

        Object.keys(value).forEach((pathKey) => {
          // eslint-disable-next-line no-param-reassign
          target.pathsProxy[pathKey] = (value[pathKey][0] === '.')
            ? path.resolve(path.dirname(callerFile), value[pathKey])
            : value[pathKey];
        });

        return;
      }

      const valueType = typeof value;

      if (
        valueType === 'undefined' ||
        (valueType === 'object' && value === null)
      ) {
        return;
      } else if (valueType === 'function') { // FIXME This check won't be doing in the `set` method of the class
        throw new Error("Cannot set a function on the kernel. If your intention is to bind something use either 'bind', 'singleton' or 'instance'.");
      }

      // FIXME Refactor below, it looks weird
      //       OR better yet use `set` method of the class
      if (target.config.setOnBoxEvenIfSet === true) {
        target.box.set(property, value);
      } else if (!target.box.has(property)) {
        target.box.set(property, value);
      }
    },
    has(/** @type Mirket */ target, property) {
      return target.container.has(property);
    },
  };

  singletonProxy = new Proxy(singleton, proxyHandler);

  if (singleton.config.providersPath !== '' && singleton.config.autoRegisterProviders === true) {
    singleton.registerProviders();
  }

  return singletonProxy;
};
