// TODO Use this file to construct missing functionality of Mirket

const SortedArray = require('sorted-array');

/**
 * @typedef {Object} Provider
 * @property {string} [name='']
 * @property {boolean} [defer=false]
 * @property {Function} [register]
 * @property {Function} [boot]
 */

/**
 * @typedef {Object} Binding
 * @property {string} bindType
 *           Indicates how this binding was bound to the container. Either 'bind',
 *           'singleton' or 'instance'.
 * @property {string} alias
 *           The name of the binding. This also known as 'alias' and will be used
 *           for resolving the binding from container.
 */

/**
 * @typedef {Object} BootFnInformation
 * @property {Object} parsed
 *           AST of the function.
 * @property {boolean} isAsync
 *           Indicates whether the function async or not.
 * @property {boolean} hasInjectionParam
 *           Indicates whether the function requires injection or not. What
 *           this means is resolving bindings out of the container by their
 *           aliases and then sending them as the first parameter to the
 *           function.
 * @property {string[]} injections
 *           The list of aliases that will be injected to the function.
 * @property {boolean} wantsContainer
 *           Indicates whether the function wants the container instance to
 *           be passed as an argument or not. After that the function may
 *           manually resolve bindings and/or make new bindings.
 * @property {Function} fn
 *           The reference to the boot function.
 */

/**
 * @typedef {Object} ProviderRecord
 * @property {string} type
 *           Indicates how the provider registered. Either 'anonymous' or 'file'.
 * @property {string} name
 *           If anonymous type of provider reflects the provider's `name`
 *           property, if file type of provider either provider's `name`
 *           property (if defined) or the filename of the provider.
 * @property {boolean} wantsToBeDeferred=false
 *           Indicates that the provider is willing to be deferred
 *           while booting the kernel. This is useful to execute
 *           execute booting code near end of booting process.
 *           Set to `false` as default.
 * @property {Array.<Binding>} bindings
 *           List of the bindings that the register function of the provider
 *           binds to the container.
 * @property {boolean} hasBootFn
 *           Indicates whether boot function defined by the provider or not.
 * @property {BootFnInformation} bootFn
 *           Information about the boot function of the provider.
 */

// ----------------------------------------------------------------------

// -----
// eslint-disable-next-line no-underscore-dangle
const _container = new Map([
  ['aliasFoo', { message: 'foo' }],
  ['aliasBar', { message: 'bar' }],
  /* ['aliasBaz', { message: 'baz' }], */ // See `providerRecord32`
]);
function hasAliasBound(aliases) {
  const arr = (Array.isArray(aliases))
    ? aliases
    : [aliases];

  return arr.every(alias => _container.has(alias));
}
function resolve(aliases) {
  if (Array.isArray(aliases)) {
    const resolvedsObj = {};

    aliases.forEach((alias) => {
      resolvedsObj[alias] = _container.get(alias);
    });

    return resolvedsObj;
  }

  return _container.get(aliases);
}
// -----

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

  const bindingsDifference = (existing.bindings.length - qd.bindings.length);
  if (bindingsDifference < 0) {
    priorityQd += (bindingsDifference * -2);
  } else {
    priorityExisting += (bindingsDifference * 2);
  }

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


/** @type {ProviderRecord} */
const providerRecord0 = {
  name: 'providerRecord0', // NOTE Debug purposes only
  wantsToBeDeferred: true,
  bindings: [],
  hasBootFn: false,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: true,
    injections: ['aliasFoo', 'aliasBar'],
    wantsContainer: false,
    fn: null,
  },
};

/** @type {ProviderRecord} */
const providerRecord1 = {
  name: 'providerRecord1', // NOTE Debug purposes only
  wantsToBeDeferred: false, // was true
  bindings: [],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: true,
    injections: ['aliasFoo', 'aliasBaz'],
    wantsContainer: false,
    fn: ({ aliasFoo: foo, aliasBaz }) => { // Support for destructuring assignment
      console.log(`provider1 boot with 'aliasFoo' being '${JSON.stringify(foo)}' and 'aliasBaz' being '${JSON.stringify(aliasBaz)}'.`);
    },
  },
};

/** @type {ProviderRecord} */
const providerRecord2 = {
  name: 'providerRecord2', // NOTE Debug purposes only
  wantsToBeDeferred: false,
  bindings: [],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: false,
    injections: [],
    wantsContainer: true,
    fn: (container) => {
      console.log(`provider2 boot with 'container' being '${container}'.`);
    },
  },
};

/** @type {ProviderRecord} */
const providerRecord3 = {
  name: 'providerRecord3', // NOTE Debug purposes only
  wantsToBeDeferred: true,
  bindings: [],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: false,
    injections: [],
    wantsContainer: false,
    fn: () => {
      console.log('provider3 boot.');
    },
  },
};

/** @type {ProviderRecord} */
const providerRecord32 = {
  name: 'providerRecord32', // NOTE Debug purposes only
  wantsToBeDeferred: true,
  bindings: [{ bindType: 'instance', alias: 'aliasBaz' }],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: false,
    injections: [],
    wantsContainer: true,
    fn: (ctr) => {
      ctr.set('aliasBaz', { message: 'baz' });

      console.log('provider32 has bind \'aliasBaz\' and boot.');
    },
  },
};

/** @type {ProviderRecord} */
const providerRecord4 = {
  name: 'providerRecord4', // NOTE Debug purposes only
  wantsToBeDeferred: false,
  bindings: [],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: false,
    injections: [],
    wantsContainer: false,
    fn: () => {
      console.log('provider4 boot.');
    },
  },
};

/** @type {ProviderRecord} */
const providerRecord5 = {
  name: 'providerRecord5', // NOTE Debug purposes only
  wantsToBeDeferred: true,
  bindings: [],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: true,
    injections: ['aliasFoo'],
    wantsContainer: false,
    fn: ({ aliasFoo }) => {
      console.log(`provider5 boot with 'aliasFoo' being '${JSON.stringify(aliasFoo)}'.`);
    },
  },
};

/** @type {ProviderRecord} */
const providerRecord6 = {
  name: 'providerRecord6', // NOTE Debug purposes only
  wantsToBeDeferred: true,
  bindings: [],
  hasBootFn: true,
  bootFn: {
    parsed: null,
    isAsync: false,
    hasInjectionParam: true,
    injections: ['aliasBar'],
    wantsContainer: false,
    fn: ({ aliasBar }) => {
      console.log(`provider6 boot with 'aliasBar' being '${JSON.stringify(aliasBar)}'.`);
    },
  },
};

//

// Simulate `kernel.boot`
//
console.log(`booting started @ ${Date.now()}`);

const providerRecords = [
  providerRecord0,
  providerRecord1,
  providerRecord2,
  providerRecord3,
  providerRecord32,
  providerRecord4,
  providerRecord5,
  providerRecord6,
  //
];

const sorted = new SortedArray(
  providerRecords.filter(providerRecord => providerRecord.hasBootFn),
  providerRecordComparator,
);


const postponeds = [];
/**
 * Try to boot given provider.
 *
 * @param {ProviderRecord} providerRecord
 */
function bootProvider(providerRecord) {
  // TODO Resolve bindings that are injected
  //      If cannot resolve "all of them" then
  //      put the current record back.

  /* eslint-disable no-lonely-if */
  if (providerRecord.bootFn.hasInjectionParam) {
    if (hasAliasBound(providerRecord.bootFn.injections)) {
      if (providerRecord.bootFn.wantsContainer) {
        // FIXME Instead of sending `_container` send `{ instance: fn, singleton: fn, bind: fn }`
        //       to keep track of what that bootFn has bind, also no `resolve` fn will be passed
        //       in favour of injection.
        providerRecord.bootFn.fn.call(null, resolve(providerRecord.bootFn.injections), _container);
      } else {
        providerRecord.bootFn.fn.call(null, resolve(providerRecord.bootFn.injections));
      }
    } else {
      postponeds.push(providerRecord);
      console.log(`${providerRecord.name} has been postponed due to unbound alias(es) (one of '${providerRecord.bootFn.injections.join("', '")}').`);
    }
  } else {
    if (providerRecord.bootFn.wantsContainer) {
      // FIXME Instead of sending `_container` send `{ instance: fn, singleton: fn, bind: fn }`
      //       to keep track of what that bootFn has bind, also no `resolve` fn will be passed
      //       in favour of injection.
      providerRecord.bootFn.fn.call(null, _container);
    } else {
      providerRecord.bootFn.fn.call(null);
    }
  }
  /* eslint-enable no-lonely-if */
}

sorted.array.forEach(bootProvider);

// FIXME Fix below
let postponedsPassCount = 0;
const postponedsMaxPassCount = 3;

while (postponeds.length > 0) {
  if (postponedsPassCount === postponedsMaxPassCount) {
    console.log('Maximum pass count has been reached for postponed providers. Boot failed.');

    break;
  }
  postponedsPassCount += 1;

  // TODO Iterate `postponeds` array and try to `boot` them again
  bootProvider(postponeds.shift());
}
if (!postponeds.length) {
  console.log(`booting done @ ${Date.now()}`);
}
