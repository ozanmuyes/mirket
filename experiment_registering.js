/* eslint-disable */

// TODO Use this file to construct missing functionality of Mirket

// NOTE These are Mirket's dependencies
const clone = require('clone');
const esprima = require('esprima');
const TinyQueue = require('tinyqueue');
// NOTE Do NOT `require` any module other
//      than directly related to kernel
//      use providers instead.

// foo
//
const providers = [];
const container = new Map();

// Takes snapshot of an instance (`inst`) (i.e. clones it) and freezes
// it (i.e. immutable).
// If freezing doesn't wanted use `singleton`
// The instance (`inst`) MUST NOT contain circular references
function bindAsInstance(alias, inst, cloneDepth = Infinity) {
  if (container.has(alias)) {
    throw new Error('Container already has a binding with this alias.');
  }

  container.set(alias, Object.freeze(clone(inst, false, cloneDepth)));
}
// TODO `bindAsSingleton`
// TODO `bind`

/**
 * `register` function can be called like these;
 *
 * - With provider object (anonymous registering);
 *   `register({ name: '...', defer: false, register: () => {...}, boot: () => {...} });`
 *
 * - With filename (relative to `providersPath`, omit extension);
 *   `register('database/index');`
 *   `register('database/models');`
 *
 * - With directory path (relative to `providersPath`, can omit trailing slash);
 *   `register('database/');` // registers 'database/index' and 'database/models' (see above)
 *   `register('database');` // same as above
 *   NOTE: If in the `providersPath` directory there is a file named 'database.js' and also
 *         a directory named 'database' then the file is to be registered. To clarify your
 *         intention (registering the directory) add trailing slash (i.e. 'database/').
 *         This is an extreme situation, so most of the time there won't be a need to
 *         adding trailing slash.
 *
 * - With filename array;
 *   `register(['database/index', 'database/models'])`
 *
 * - With directory path array;
 *   `register(['database', 'server'])`
 *
 * - With no parameters (this will register `providersPath` directory);
 *   `register()`
 */
// Register and pre-process a provider (anonymous or file)
function register(provider, filename = '') {
  const providerRecord = {
    type: (filename === '' ? 'anonymous' : 'file'),
    name: filename,
    wantsToBeDeferred: false,
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
      instance: (alias, inst) => {
        providerRecord.bindings[alias] = { bindType: 'instance', alias };

        bindAsInstance(alias, inst);
      },
      // TODO `singleton`
      // TODO `bind`
    });
  }

  if (provider.boot && typeof provider.boot === 'function') {
    providerRecord.hasBootFn = true;
    providerRecord.bootFn.fn = provider.boot;

    const pb0 = (esprima.parseScript(provider.boot.toString())).body[0].expression;

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
  providers.push(providerRecord);
}

async function boot() {
  const q = new TinyQueue([], (n, x) => { // 'n': new, 'x': existing
    let nScore = 0;
    let xScore = 0;

    // TODO See 'experiment_boot-ordering.js'
    if (n.wantsToBeDeferred) {
      nScore += 1;
    }
    if (x.wantsToBeDeferred) {
      xScore += 1;
    }

    return (nScore - xScore);
  });

  providers.forEach((provider) => {
    if (provider.hasBootFn) {
      q.push(provider);

      if (!provider.bootFn.hasInjectionParam && provider.bootFn.wantsContainer) {
        //
      }
    }
  });

  // TODO Iterate through the `q` and call the boot functions
  const container = { // NOTE This will be given to `boot()` of the provider when needed
    singleton: () => {
      // TODO
    },
    // TODO Add other methods to the `container`
  };

  const qa = [];
  while (q.length) {
    qa.push(q.pop());
  }

  let provider;
  for (let i = 0; i < qa.length; i += 1) {
    provider = qa[i];
    const bootParams = [];
    if (provider.bootFn.hasInjectionParam) { // FIXME `resolve` actual injections (iterate the `provider.bootFn.injections`)
      /* bootParams.push({
        aliasFoo: { message: 'foo' },
        aliasBar: { message: 'bar' },
      }); */
      const injections = {};
      provider.bootFn.injections.forEach((alias) => {
        injections[alias] = resolve(alias);
      });
      bootParams.push(injections);
    }
    if (provider.bootFn.wantsContainer) {
      bootParams.push(container);
    }

    if (provider.bootFn.isAsync) {
      await provider.bootFn.fn.apply(null, bootParams);
    } else {
      provider.bootFn.fn.apply(null, bootParams);
    }
  };

  return Promise.resolve();
}

function resolve(alias) { // from the kernel (container)
  // TODO Cache etc.
  const resolved = container.get(alias);

  if (resolved.bindType === 'singleton') {
    if (resolved.valueType === 'function') {
      // TODO Figure out what to do if the value is async OR better yet can be async?
      // TODO Call the function and cache the result
    } else {
      return resolved.value;
    }
  }
}

// bar
//
const provider1 = {
  name: 'provider1',
  register: ({ instance }) => { // NOTE `register` functions can NOT be async
    const obj = {
      message: 'foo',
    };

    instance('aliasFoo', obj);
  },
  boot: ({ aliasFoo, aliasBar }) => { // NOTE `boot` functions may be async
    console.log(`${aliasFoo.message}${aliasBar.message}`); // > foobar
  },
};

const provider2 = {
  name: 'provider2',
  defer: true,
  boot: () => {
    console.log('provider2.boot');
  },
};

const provider3 = {
  name: 'provider3',
  register: ({ instance }) => {
    instance('aliasQux', 'quux');
  },
};

function lateResolver(resolveWith, resolveAfter = 2000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(resolveWith);
    }, resolveAfter);
  });
}

const provider4 = {
  name: 'provider4',
  register: ({ instance }) => {
    const obj = {
      message: 'baz',
    };

    instance('aliasBaz', obj);
  },
  boot: async (container) => {
    const message = await lateResolver('bar', 1000);
    console.log(`provider4: ${message}`);

    const obj = {
      message,
    };

    container.singleton('aliasBar', obj)
  },
};

const provider5 = {
  name: 'provider5',
  boot: ({ foo: aliasFoo }) => {
    console.log('provider5');
    //console.log(foo); // > foo
  },
};

const provider6 = {
  name: 'provider6',
  register: async ({ instance }) => {
    const message = await lateResolver('bar');

    instance('aliasBar', message);
  },
};

//

/**
 * Here is the summary;
 *
 * `provider1` binds an object (`obj`) as an instance binding with 'aliasFoo' alias.
 * Then in booting phase `provider1` wants 'aliasFoo' (which it bound) and
 * 'aliasBar' (which hasn't bound yet). So it's booting will be deferred.
 *
 * //
 */

console.log(`register STA: ${(new Date()).getTime()}`);
// TODO Manually `register` the providers below
register(provider1);
// register(provider6); // NOTE This will throw an error due to async `register()`
register(provider2);
register(provider3);
register(provider4);
register(provider5);
//

// baz
//
boot().then(() => {
  console.log(`FIN: ${(new Date()).getTime()}`);
  console.log('Application booted, and should started listening by now.');
});
console.log(`STA: ${(new Date()).getTime()}`);

/* console.log((new Date()).getTime());
boot();
console.log((new Date()).getTime()); */
